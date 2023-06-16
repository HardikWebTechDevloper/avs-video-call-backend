const { Users, ChatMessages } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const { encryptPassword, validatePassword } = require('../helpers/password-encryption.helper');
const constant = require('../config/constant');
const HttpStatus = require('../config/httpStatus');
const { Op, literal } = require("sequelize");

module.exports.getAllUsers = (req, res) => {
    try {
        (async () => {
            let usersTable = Users.name;
            let chatMessagesTable = ChatMessages.name;
            let loggedInUserId = req.user.userId;

            let users = await Users.findAll({
                where: {
                    id: { [Op.ne]: loggedInUserId }
                },
                attributes: [
                    'id',
                    'firstName',
                    'lastName',
                    'email',
                    'profilePicture',
                    'createdAt',
                    [
                        literal(`(SELECT "message" FROM "${chatMessagesTable}" 
                                    WHERE ("${usersTable}"."id" = "${chatMessagesTable}"."senderId" AND "${chatMessagesTable}"."receiverId" = ${loggedInUserId}) OR 
                                        ("${usersTable}"."id" = "${chatMessagesTable}"."receiverId" AND "${chatMessagesTable}"."senderId" = ${loggedInUserId})
                                    ORDER BY "createdAt" DESC LIMIT 1)`),
                        'lastSentMessage'
                    ],
                    [
                        literal(`(SELECT "createdAt" FROM "${chatMessagesTable}" 
                                    WHERE ("${usersTable}"."id" = "${chatMessagesTable}"."senderId" AND "${chatMessagesTable}"."receiverId" = ${loggedInUserId}) OR 
                                        ("${usersTable}"."id" = "${chatMessagesTable}"."receiverId" AND "${chatMessagesTable}"."senderId" = ${loggedInUserId})
                                    ORDER BY "createdAt" DESC LIMIT 1)`),
                        'lastSentMessageAt'
                    ],
                    [
                        literal(`(SELECT COUNT(*) FROM "${chatMessagesTable}" WHERE "${chatMessagesTable}"."receiverId"=${loggedInUserId} AND "${chatMessagesTable}"."senderId" = "${usersTable}"."id" AND "${chatMessagesTable}"."isReceiverRead"=false)`),
                        'totalUnreadMessage'
                    ]
                ],
                include: [
                    {
                        model: ChatMessages,
                        as: 'sentMessages',
                        attributes: []
                    }
                ],
                group: ['Users.id'],
                order: [
                    [literal('"lastSentMessageAt" DESC NULLS LAST')],
                    [literal('MAX("sentMessages"."createdAt") DESC')],
                ],
                raw: true
            });

            if (users && users.length > 0) {
                return res.json(apiResponse(HttpStatus.OK, 'Success', users, true));
            } else {
                return res.json(apiResponse(HttpStatus.NO_CONTENT, 'No Data', [], false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getProfile = (req, res) => {
    try {
        (async () => {
            let userId = req.user.userId;

            if (req.body.userId) {
                userId = req.body.userId;
            }

            let user = await Users.findOne({
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profilePicture'],
                where: {
                    id: userId,
                },
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', user, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.updateProfile = (req, res) => {
    try {
        (async () => {
            let userId = req.user.userId;

            if (req.body.userId) {
                userId = req.body.userId;
            }

            let user = await Users.findOne({
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profilePicture'],
                where: {
                    id: userId,
                },
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', user, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

