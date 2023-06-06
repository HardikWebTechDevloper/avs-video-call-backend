const { Groups, GroupMembers, Users, GroupMessages, GroupMessageReadStatuses } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const HttpStatus = require('../config/httpStatus');
const { Op, literal } = require("sequelize");

module.exports.createGroup = (req, res) => {
    try {
        (async () => {
            let { group_name, group_users } = req.body;
            let groupIcon = (req.file) ? req.file.filename : null;

            let groupObject = {
                name: group_name,
                icon: groupIcon
            };

            let group = await Groups.create(groupObject);

            if (group) {
                let groupId = group.id;
                group_users = group_users + ',' + req.user.userId;

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

module.exports.removeUserFromGroup = (req, res) => {
    try {
        (async () => {
            let { groupId, userId } = req.body;

            if (groupId && userId) {
                let deleteMember = await GroupMembers.destroy({ where: { groupId, userId } });

                if (deleteMember) {
                    return res.json(apiResponse(HttpStatus.OK, 'User has been removed from group.', {}, true));
                } else {
                    return res.json(apiResponse(HttpStatus.NOT_FOUND, 'Something went wrong with remove user from group.', {}, false));
                }
            } else {
                return res.json(apiResponse(HttpStatus.NOT_FOUND, 'Required data missing.', {}, false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}