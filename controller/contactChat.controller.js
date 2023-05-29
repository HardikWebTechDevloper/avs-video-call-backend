const { Users, ChatMessages, GroupMessages } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const constant = require('../config/constant');
const HttpStatus = require('../config/httpStatus');
const { Op } = require("sequelize");

module.exports.saveSingleChatMessages = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let chatMessage = await ChatMessages.create(data);

                if (chatMessage) {
                    let id = chatMessage.id;

                    const singleChat = await ChatMessages.findOne({
                        where: { id },
                        include: [
                            {
                                model: Users,
                                as: 'sender',
                                attributes: ['firstName', 'lastName']
                            },
                            {
                                model: Users,
                                as: 'receiver',
                                attributes: ['firstName', 'lastName']
                            }
                        ]
                    });

                    resolve(singleChat);
                } else {
                    resolve({});
                }
            })();
        } catch (error) {
            resolve(error.message);
        }
    });
}

module.exports.saveGroupChatMessages = (data, attachment) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                data.attachment = attachment;
                let groupMessage = await GroupMessages.create(data);

                if (groupMessage) {
                    let id = groupMessage.id;

                    let groupChat = await GroupMessages.findOne({
                        where: { id },
                        include: [
                            {
                                model: Users,
                                attributes: ['firstName', 'lastName']
                            }
                        ]
                    });

                    resolve(groupChat);
                } else {
                    resolve({});
                }
            })();
        } catch (error) {
            resolve(error.message);
        }
    });
}

module.exports.getContactChatMessages = (req, res) => {
    try {
        (async () => {
            const { contactId } = req.body;

            const singleChat = await ChatMessages.findAll({
                where: {
                    [Op.or]: [
                        {
                            senderId: req.user.userId,
                            receiverId: contactId
                        },
                        {
                            senderId: contactId,
                            receiverId: req.user.userId
                        }
                    ]
                },
                include: [
                    {
                        model: Users,
                        as: 'sender',
                        attributes: ['firstName', 'lastName']
                    },
                    {
                        model: Users,
                        as: 'receiver',
                        attributes: ['firstName', 'lastName']
                    }
                ]
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', singleChat, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getGroupChatMessages = (req, res) => {
    try {
        (async () => {
            const { groupId } = req.body;

            let groupChat = await GroupMessages.findAll({
                where: { groupId },
                include: [
                    {
                        model: Users,
                        attributes: ['firstName', 'lastName']
                    }
                ]
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', groupChat, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}