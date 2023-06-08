const { Users, ChatMessages, GroupMessages, GroupMembers, GroupMessageReadStatuses, Groups } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const HttpStatus = require('../config/httpStatus');
const constant = require('../config/constant');
const { Op } = require("sequelize");
const moment = require("moment");
const { saveMessageNotification } = require("./messageNotifications.controller");

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
                            },
                            {
                                model: ChatMessages,
                                as: 'replyMessage',
                                attributes: ['id', 'message', 'attachment']
                            }
                        ]
                    });

                    // Send Message Notification
                    if (singleChat) {
                        let senderName = `${singleChat.sender.firstName} ${singleChat.sender.lastName}`;

                        let chatMessage = `${senderName} sent you`;
                        if (singleChat.attachment && !singleChat.message) {
                            chatMessage += ` an attachment.`;
                        } else if (singleChat.attachment && singleChat.message) {
                            chatMessage += ` an attachment and message.`;
                        } else {
                            chatMessage += ` message.`;
                        }

                        let notificationData = [{
                            userId: data.receiverId,
                            message: chatMessage,
                            chatMessageId: singleChat.id,
                            groupMessageId: null
                        }];
                        await saveMessageNotification(notificationData);
                    }

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

module.exports.getContactChatMessages = (req, res) => {
    try {
        (async () => {
            const { contactId } = req.body;
            const loggedInUserId = req.user.userId;

            const singleChat = await ChatMessages.findAll({
                where: {
                    [Op.or]: [
                        {
                            senderId: loggedInUserId,
                            receiverId: contactId
                        },
                        {
                            senderId: contactId,
                            receiverId: loggedInUserId
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
                    },
                    {
                        model: ChatMessages,
                        as: 'replyMessage',
                        attributes: ['id', 'message', 'attachment']
                    }
                ],
                order: [['createdAt', 'ASC']]
            });

            let currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");

            // Updated Chat Read Status
            await ChatMessages.update({
                isReceiverRead: true,
                receiverReadAt: currentDateTime
            }, {
                where: {
                    [Op.or]: [
                        {
                            senderId: loggedInUserId,
                            receiverId: contactId
                        },
                        {
                            senderId: contactId,
                            receiverId: loggedInUserId
                        }
                    ]
                }
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', singleChat, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.deleteSingleChatMessages = (messageId) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let chatMessage = await ChatMessages.destroy({ where: { id: messageId } });

                if (chatMessage) {
                    resolve(chatMessage);
                } else {
                    resolve(null);
                }
            })();
        } catch (error) {
            resolve(error.message);
        }
    });
}

module.exports.deleteGroupChatMessages = (messageId) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let chatMessage = await GroupMessages.destroy({ where: { id: messageId } });

                if (chatMessage) {
                    resolve(chatMessage);
                } else {
                    resolve(null);
                }
            })();
        } catch (error) {
            resolve(error.message);
        }
    });
}

module.exports.saveGroupChatMessages = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let { userId, groupId } = data;
                let groupMessage = await GroupMessages.create(data);

                if (groupMessage) {
                    let id = groupMessage.id;

                    // Return last sent and saved message to socket
                    let groupChat = await GroupMessages.findOne({
                        where: { id },
                        include: [
                            {
                                model: Users,
                                attributes: ['firstName', 'lastName']
                            },
                            {
                                model: GroupMessages,
                                as: 'groupReplyMessage',
                                attributes: ['id', 'message', 'attachment']
                            }
                        ]
                    });

                    // Get all group members
                    let groupMembers = await GroupMembers.findAll({
                        where: {
                            groupId,
                            userId: { [Op.ne]: userId }
                        },
                        attributes: ['userId']
                    });

                    if (groupMembers && groupMembers.length > 0) {
                        let membersData = groupMembers.map(member => {
                            return {
                                userId: member.userId,
                                groupId,
                                groupMessageId: id,
                                isReadMessage: false,
                            }
                        });

                        // Save users with unread message
                        await GroupMessageReadStatuses.bulkCreate(membersData);

                        if (groupChat) {
                            let group = await Groups.findOne({ where: { id: groupId }, attributes: ['name'] });

                            // Send Notifications to all group members
                            let senderName = `${groupChat.User.firstName} ${groupChat.User.lastName}`;

                            let chatMessage = `${senderName} sent`;
                            if (groupChat.attachment && !groupChat.message) {
                                chatMessage += ` an attachment`;
                            } else if (groupChat.attachment && groupChat.message) {
                                chatMessage += ` an attachment and message`;
                            } else {
                                chatMessage += ` message`;
                            }
                            chatMessage += ` in ${group.name} group.`;

                            let notificationData = groupMembers.map(member => {
                                return {
                                    userId: member.userId,
                                    message: chatMessage,
                                    chatMessageId: null,
                                    groupMessageId: id
                                }
                            });

                            await saveMessageNotification(notificationData);
                        }
                    }

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

module.exports.getGroupChatMessages = (req, res) => {
    try {
        (async () => {
            const loggedInUserId = req.user.userId;
            const { groupId } = req.body;

            let groupChat = await GroupMessages.findAll({
                where: { groupId },
                include: [
                    {
                        model: Users,
                        attributes: ['firstName', 'lastName']
                    },
                    {
                        model: GroupMessages,
                        as: 'groupReplyMessage',
                        attributes: ['id', 'message', 'attachment']
                    }
                ],
                order: [['createdAt', 'ASC']]
            });

            let currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");

            // Updated Chat Read Status
            await GroupMessageReadStatuses.update({
                isReadMessage: true,
                messageReadAt: currentDateTime
            }, {
                where: { groupId, userId: loggedInUserId }
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', groupChat, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}