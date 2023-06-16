const { Groups, GroupMembers, Users, GroupMessages, GroupMessageReadStatuses } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const HttpStatus = require('../config/httpStatus');
const { Op, literal, fn, col } = require("sequelize");
const { saveMessageNotification } = require("./messageNotifications.controller");

module.exports.createGroup = (req, res) => {
    try {
        (async () => {
            let loggedInUserId = req.user.userId;
            let { group_name, group_users } = req.body;
            let groupIcon = (req.file) ? req.file.filename : null;

            let groupObject = {
                name: group_name,
                icon: groupIcon,
                createdBy: loggedInUserId
            };

            let group = await Groups.create(groupObject);

            if (group) {
                let groupId = group.id;
                group_users = group_users + ',' + loggedInUserId;

                if (group_users && group_users.split(",").length > 0) {
                    let userGroup = group_users.split(",").map((userId) => {
                        let element = {
                            groupId,
                            userId: Number(userId)
                        };
                        return element;
                    });

                    let checkUser = userGroup.find(data => data.userId != req.user.userId);

                    if (!checkUser && checkUser == undefined) {
                        userGroup.push({ groupId, userId: req.user.userId });
                    }

                    let isCreated = await GroupMembers.bulkCreate(userGroup);

                    if (isCreated && isCreated.length > 0) {
                        return res.json(apiResponse(HttpStatus.OK, 'Woohoo! Your group has been successfully created', {}, true));
                    } else {
                        return res.json(apiResponse(HttpStatus.OK, 'Oops, something went wrong while adding the members in group.', {}, false));
                    }
                } else {
                    return res.json(apiResponse(HttpStatus.OK, 'Woohoo! Your group has been successfully created', {}, true));
                }
            } else {
                return res.json(apiResponse(HttpStatus.OK, 'Oops, something went wrong while creating the group.', {}, false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.updateGroup = (req, res) => {
    try {
        (async () => {
            let { groupId, groupName } = req.body;
            let groupIcon = (req.file) ? req.file.filename : null;

            let groupObject = {
                name: groupName,
                icon: groupIcon
            };

            let group = await Groups.update(groupObject, {
                where: {
                    id: groupId
                }
            });

            if (group) {
                return res.json(apiResponse(HttpStatus.OK, 'Woohoo! Your group has been successfully updated.', {}, true));
            } else {
                return res.json(apiResponse(HttpStatus.OK, 'Oops, something went wrong while update the group.', {}, false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getAllGroups = (req, res) => {
    try {
        (async () => {
            let loggedInUserId = req.user.userId;

            let getGroups = await GroupMembers.findAll({
                attributes: ['groupId'],
                where: { userId: loggedInUserId }
            });

            if (getGroups && getGroups.length > 0) {
                let groupIds = getGroups.map(data => data.groupId);

                let usersTable = Users.name;
                let groupMessagesTable = GroupMessages.name;
                let groupMessageReadStatusTable = GroupMessageReadStatuses.name;

                let groups = await Groups.findAll({
                    where: { id: { [Op.in]: groupIds } },
                    include: [
                        {
                            model: GroupMembers,
                            attributes: ['userId'],
                            include: [
                                {
                                    model: Users,
                                    attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
                                }
                            ]
                        }
                    ],
                    attributes: [
                        'id',
                        'name',
                        'icon',
                        [
                            literal(`(
                                SELECT CONCAT("firstName",' ',"lastName") FROM "${usersTable}"
                                WHERE "${usersTable}"."id" = "Groups"."createdBy"
                            )`),
                            'createdByUserName'
                        ],
                        [
                            literal(`(
                                SELECT "message" FROM "${groupMessagesTable}"
                                WHERE "Groups"."id" = "${groupMessagesTable}"."groupId"
                                ORDER BY "createdAt" DESC
                                LIMIT 1
                            )`),
                            'lastSentMessage'
                        ],
                        [
                            literal(`(
                                SELECT "createdAt" FROM "${groupMessagesTable}"
                                WHERE "Groups"."id" = "${groupMessagesTable}"."groupId"
                                ORDER BY "createdAt" DESC
                                LIMIT 1
                            )`),
                            'lastSentMessageAt'
                        ],
                        [
                            literal(`(
                                SELECT COUNT(*) FROM "${groupMessageReadStatusTable}"
                                WHERE "${groupMessageReadStatusTable}"."groupId" = "Groups"."id" AND 
                                    "${groupMessageReadStatusTable}"."userId"=${loggedInUserId} AND
                                    "${groupMessageReadStatusTable}"."isReadMessage"=false
                            )`),
                            'totalUnreadMessage'
                        ]
                    ],
                    order: [
                        [literal('"lastSentMessageAt" DESC NULLS LAST')]
                    ],
                });

                return res.json(apiResponse(HttpStatus.OK, 'Success', groups, true));
            } else {
                return res.json(apiResponse(HttpStatus.NOT_FOUND, 'No data', [], false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getGroupDetails = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let { groupId } = data;
                let group = await exports.fetchGroupDetails(groupId);
                resolve(group);
            })();
        } catch (error) {
            console.log(error.message);
            resolve(null)
        }
    });
}

module.exports.removeUserFromGroup = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            (async () => {
                let { groupId, userId, removedByUserId } = data;

                if (groupId && userId) {
                    await exports.addRemoveMemberFromGroupNotification(groupId, 'remove', [userId], removedByUserId);
                    await GroupMembers.destroy({ where: { groupId, userId } });

                    let groupDetails = await exports.fetchGroupDetails(groupId);
                    resolve(groupDetails);
                } else {
                    resolve(false);
                }
            })();
        } catch (error) {
            console.log(error.message)
            resolve(false);
        }
    });
}

module.exports.userLeftGroup = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            (async () => {
                let { groupId, userId } = data;

                let user = await Users.findOne({ where: { id: userId }, attributes: ['firstName', 'lastName'] });
                let userName = `${user.firstName} ${user.lastName}`;

                if (groupId && userId) {
                    await GroupMembers.destroy({ where: { groupId, userId } });
                    let group = await exports.fetchGroupDetails(groupId);

                    if (group && group.GroupMembers && group.GroupMembers.length > 0) {
                        let groupName = group.name;
                        let message = `${userName} has left the ${groupName} group.`;

                        let notificationData = group.GroupMembers.map((element) => {
                            let userId = Number(element.userId);

                            return {
                                groupId: groupId,
                                userId: userId,
                                message: message
                            };
                        }).filter(data => data != undefined);

                        await saveMessageNotification(notificationData);
                    }

                    let groupDetails = await exports.fetchGroupDetails(groupId);
                    resolve(groupDetails);
                } else {
                    resolve(false);
                }
            })();
        } catch (error) {
            console.log(error.message)
            resolve(false);
        }
    });
}

module.exports.fetchGroupDetails = (groupId) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let group = await Groups.findOne({
                    where: { id: groupId },
                    attributes: ['id', 'name', 'icon'],
                    include: [
                        {
                            model: GroupMembers,
                            attributes: ['userId'],
                            include: [
                                {
                                    model: Users,
                                    attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
                                }
                            ]
                        }
                    ]
                });

                resolve(group);
            })();
        } catch (error) {
            resolve(null);
        }
    });
}

module.exports.addMembersInGroup = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let { groupId, group_users, addedByUserId } = data;
                let groupMembers = [];

                if (group_users && group_users.split(",").length > 0) {
                    let allGroupMembers = await GroupMembers.findAll({
                        where: { groupId },
                        attributes: ['userId']
                    });

                    if (allGroupMembers && allGroupMembers.length > 0) {
                        groupMembers = allGroupMembers.map(data => data.userId);
                    }

                    let groupUsers = group_users.split(",");
                    let userGroup = groupUsers.filter((member) => {
                        member = Number(member);
                        if (!groupMembers.includes(member)) {
                            return member;
                        }
                    });

                    userGroup = userGroup.map((member) => {
                        let element = {
                            groupId,
                            userId: Number(member)
                        };
                        return element;
                    });

                    if (userGroup && userGroup.length > 0) {
                        let isCreated = await GroupMembers.bulkCreate(userGroup);

                        if (isCreated && isCreated.length > 0) {
                            let group = await exports.fetchGroupDetails(groupId);

                            await exports.addRemoveMemberFromGroupNotification(groupId, 'add', groupUsers, addedByUserId);
                            resolve(apiResponse(HttpStatus.OK, 'Woohoo! Members have been added successfully', group, true));
                        } else {
                            resolve(apiResponse(HttpStatus.OK, 'Oops, something went wrong while adding the members in group.', {}, false));
                        }
                    } else {
                        resolve(apiResponse(HttpStatus.OK, 'Members already exist in the group.', {}, false));
                    }
                } else {
                    resolve(apiResponse(HttpStatus.OK, 'Required data missing.', {}, false));
                }
            })();
        } catch (error) {
            resolve(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
        }
    });
}

module.exports.addRemoveMemberFromGroupNotification = (groupId, notificationType, userIds, loggedInUserId) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let group = await Groups.findOne({
                    where: { id: groupId },
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: GroupMembers,
                            attributes: ['userId'],
                            include: [
                                {
                                    model: Users,
                                    attributes: ['firstName', 'lastName']
                                }
                            ]
                        }
                    ],
                });

                if (group && group.GroupMembers.length > 0 && userIds && userIds.length > 0) {
                    let groupName = group.name;

                    let user = await Users.findOne({ where: { id: loggedInUserId }, attributes: ['firstName', 'lastName'] });
                    let userName = `${user.firstName} ${user.lastName}`;

                    let members = await Users.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['firstName', 'lastName'] });
                    let actionMemberNames = members.map(element => `${element.firstName} ${element.lastName}`);

                    actionMemberNames = joinNames(actionMemberNames);

                    let notificationData = group.GroupMembers.map((element) => {
                        let userId = Number(element.userId);
                        let message = ``;

                        if (loggedInUserId != userId && !userIds.includes(loggedInUserId)) {
                            if (notificationType == 'add') {
                                if (userIds.includes(userId)) {
                                    message = `${userName} added you in ${groupName} group.`;
                                } else {
                                    message = `${userName} added ${actionMemberNames} in ${groupName} group.`;
                                }

                                return {
                                    groupId: groupId,
                                    userId: userId,
                                    message: message
                                };
                            } else if (notificationType == 'remove') {
                                if (userIds.includes(userId)) {
                                    message = `${userName} removed you from ${groupName} group.`;
                                } else {
                                    message = `${userName} removed ${actionMemberNames} from ${groupName} group.`;
                                }

                                return {
                                    groupId: groupId,
                                    userId: userId,
                                    message: message
                                };
                            }
                        }
                    }).filter(data => data != undefined);

                    await saveMessageNotification(notificationData);

                    resolve(true);
                } else {
                    resolve(false);
                }
            })();
        } catch (error) {
            console.log("error.message", error.message);
            resolve(error.message);
        }
    });
}

function joinNames(names) {
    if (names.length === 0) {
        return "";
    } else if (names.length === 1) {
        return names[0];
    } else if (names.length === 2) {
        return names.join(" & ");
    } else {
        const lastTwoNames = names.slice(-2).join(" & ");
        const remainingNames = names.slice(0, -2).join(", ");
        return `${remainingNames}, ${lastTwoNames}`;
    }
}
