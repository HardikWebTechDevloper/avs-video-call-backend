const { Groups, GroupMembers, Users, GroupMessages } = require("../models");
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
            let getGroups = await GroupMembers.findAll({
                attributes: ['groupId'],
                where: { userId: req.user.userId }
            });

            if (getGroups && getGroups.length > 0) {
                let groupIds = getGroups.map(data => data.groupId);
                let groupMessagesTable = GroupMessages.name;

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