const {
    Users,
    ChatMessages,
    GroupMessages,
    GroupMembers,
    GroupMessageReadStatuses,
    Groups,
    MessageNotifications
} = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const HttpStatus = require('../config/httpStatus');
const constant = require('../config/constant');
const { Op } = require("sequelize");
const moment = require("moment");
const { saveMessageNotification } = require("./messageNotifications.controller");
const { fetchGroupDetails } = require("./group.controller");
const fs = require('fs');

module.exports.saveSingleChatMessages = (data, isReadMessage) => {
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
                                attributes: ['firstName', 'lastName', 'profilePicture']
                            },
                            {
                                model: Users,
                                as: 'receiver',
                                attributes: ['firstName', 'lastName', 'profilePicture']
                            },
                            {
                                model: ChatMessages,
                                as: 'replyMessage',
                                attributes: ['id', 'message', 'attachment']
                            }
                        ]
                    });

                    // Send Message Notification
                    if (singleChat && !isReadMessage) {
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

module.exports.getContactChatMessagesWithPagination = (req, res) => {
    try {
        (async () => {
            const { contactId, page, size, pagination } = req.body;
            const loggedInUserId = req.user.userId;
            const { limit, offset } = pagination ? constant.getPagination(page, size) : {};

            let currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");

            const { count, rows } = await ChatMessages.findAndCountAll({
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
                        attributes: ['firstName', 'lastName', 'profilePicture']
                    },
                    {
                        model: Users,
                        as: 'receiver',
                        attributes: ['firstName', 'lastName', 'profilePicture']
                    },
                    {
                        model: ChatMessages,
                        as: 'replyMessage',
                        attributes: ['id', 'message', 'attachment']
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset
            });

            for (let i = 0; i < rows.length; i++) {
                const record = rows[i];
                // Modify the record as needed
                record.isReceiverRead = true;
                record.receiverReadAt = currentDateTime;
            }

            // Save the changes to the database
            await Promise.all(rows.map(record => record.save()));

            const response = constant.getPagingData({ count, rows }, page, limit || count);
            return res.json(apiResponse(HttpStatus.OK, 'Success', response, true));

        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getContactChatMessages = (req, res) => {
    try {
        (async () => {
            const { contactId } = req.body;
            const loggedInUserId = req.user.userId;

            let currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");

            // Update Chat Read Status
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
                        attributes: ['firstName', 'lastName', 'profilePicture']
                    },
                    {
                        model: Users,
                        as: 'receiver',
                        attributes: ['firstName', 'lastName', 'profilePicture']
                    },
                    {
                        model: ChatMessages,
                        as: 'replyMessage',
                        attributes: ['id', 'message', 'attachment']
                    }
                ],
                order: [['createdAt', 'ASC']]
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', singleChat, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getLastContactChatMessages = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                const { senderId, receiverId } = data;

                const singleChat = await ChatMessages.findOne({
                    where: {
                        [Op.or]: [
                            {
                                senderId: senderId,
                                receiverId: receiverId
                            },
                            {
                                senderId: receiverId,
                                receiverId: senderId
                            }
                        ]
                    },
                    include: [
                        {
                            model: Users,
                            as: 'sender',
                            attributes: ['firstName', 'lastName', 'profilePicture']
                        },
                        {
                            model: Users,
                            as: 'receiver',
                            attributes: ['firstName', 'lastName', 'profilePicture']
                        },
                        {
                            model: ChatMessages,
                            as: 'replyMessage',
                            attributes: ['id', 'message', 'attachment']
                        }
                    ],
                    order: [['createdAt', 'DESC']], // Sort the results in descending order based on createdAt
                    limit: 1 // Limit the result to only one message
                });

                resolve(singleChat);
            })();
        } catch (error) {
            console.log("ContactChat Controller: 211", error.message)
            resolve(false)
        }
    });
}

module.exports.deleteSingleChatMessages = (messageId) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                await MessageNotifications.destroy({ where: { chatMessageId: messageId } });
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

module.exports.readSingleChatMessages = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let { senderId, receiverId } = data;
                let currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");

                // Update Chat Read Status
                let isRead = await ChatMessages.update({
                    isReceiverRead: true,
                    receiverReadAt: currentDateTime
                }, {
                    where: {
                        [Op.or]: [
                            {
                                senderId: senderId,
                                receiverId: receiverId
                            },
                            {
                                senderId: receiverId,
                                receiverId: senderId
                            }
                        ]
                    }
                });

                if (isRead) {
                    resolve(true);
                } else {
                    resolve(false);
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
                await MessageNotifications.destroy({ where: { groupMessageId: messageId } });
                await GroupMessageReadStatuses.destroy({ where: { groupMessageId: messageId } });
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

module.exports.saveGroupChatMessages = (data, activeUsers) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let { userId, groupId } = data;
                let groupMessage = await GroupMessages.create(data);

                if (groupMessage) {
                    let id = groupMessage.id;

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
                            let userId = member.userId;
                            let isRead = false;

                            if (activeUsers && activeUsers.length > 0 && activeUsers.includes(userId)) {
                                isRead = true;
                            }

                            return {
                                userId: userId,
                                groupId,
                                groupMessageId: id,
                                isReadMessage: isRead,
                            }
                        });

                        // Save users with unread message
                        await GroupMessageReadStatuses.bulkCreate(membersData);

                        // Return last sent and saved message to socket
                        let groupChat = await GroupMessages.findOne({
                            where: { id },
                            include: [
                                {
                                    model: Users,
                                    attributes: ['firstName', 'lastName', 'profilePicture']
                                },
                                {
                                    model: GroupMessages,
                                    as: 'groupReplyMessage',
                                    attributes: ['id', 'message', 'attachment']
                                },
                                {
                                    model: GroupMessageReadStatuses,
                                    required: false,
                                    where: { isReadMessage: true },
                                    attributes: ['userId'],
                                    include: [
                                        {
                                            model: Users,
                                            attributes: ['firstName', 'lastName', 'profilePicture']
                                        }
                                    ]
                                }
                            ]
                        });

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
                        resolve(groupChat);
                    } else {
                        resolve({});
                    }
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

            let currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");

            // Updated Chat Read Status
            await GroupMessageReadStatuses.update({
                isReadMessage: true,
                messageReadAt: currentDateTime
            }, {
                where: { groupId, userId: loggedInUserId }
            });

            GroupMessageReadStatuses.sync({ force: false }).then(async () => {
                let groupChat = await GroupMessages.findAll({
                    where: { groupId },
                    include: [
                        {
                            model: Users,
                            attributes: ['firstName', 'lastName', 'profilePicture']
                        },
                        {
                            model: GroupMessages,
                            as: 'groupReplyMessage',
                            attributes: ['id', 'message', 'attachment'],
                        },
                        {
                            model: GroupMessageReadStatuses,
                            required: false,
                            where: { isReadMessage: true },
                            attributes: ['userId'],
                            include: [
                                {
                                    model: Users,
                                    attributes: ['firstName', 'lastName', 'profilePicture']
                                }
                            ]
                        }
                    ],
                    order: [['createdAt', 'ASC']]
                });

                return res.json(apiResponse(HttpStatus.OK, 'Success', groupChat, true));
            });
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getLastChatMessagesFromGroup = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                const { loggedInUserId, groupId } = data;

                let groupChat = await GroupMessages.findOne({
                    where: { groupId, userId: loggedInUserId },
                    include: [
                        {
                            model: GroupMessageReadStatuses,
                            required: false,
                            where: { isReadMessage: true },
                            attributes: ['userId'],
                            include: [
                                {
                                    model: Users,
                                    attributes: ['firstName', 'lastName', 'profilePicture']
                                }
                            ]
                        }
                    ],
                    order: [['id', 'DESC']]
                });

                resolve(groupChat);
            })();
        } catch (error) {
            console.log("ERROR MESSAGE getLastChatMessagesFromGroup():::", error.message);
            resolve(null);
        }
    });
}

module.exports.updateGroupDetails = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let { groupId, groupName, file, fileName } = data;
                let groupObject = { name: groupName };

                if (file) {
                    groupObject.icon = fileName;
                    await fs.writeFileSync('uploads/' + attachment, file);
                }

                let group = await Groups.update(groupObject, {
                    where: {
                        id: groupId
                    }
                });

                if (group) {
                    let groups = await fetchGroupDetails(groupId);
                    resolve(groups);
                } else {
                    resolve(false);
                }
            })();
        } catch (error) {
            console.log(error.message);
            resolve(false);
        }
    });
}

module.exports.createGroup = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                let { group_name, group_users, loggedInUserId, file, fileName } = data;
                let attachment = null;

                if (file) {
                    attachment = fileName;
                    await fs.writeFileSync('uploads/' + attachment, file);
                }

                let groupObject = {
                    name: group_name,
                    createdBy: loggedInUserId,
                    icon: attachment
                };

                let group = await Groups.create(groupObject);

                console.log("group>>>>>>>>>", group);

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

                        let isCreated = await GroupMembers.bulkCreate(userGroup);

                        if (isCreated && isCreated.length > 0) {
                            resolve(apiResponse(HttpStatus.OK, 'Woohoo! Your group has been successfully created', {}, true));
                        } else {
                            resolve(apiResponse(HttpStatus.OK, 'Oops, something went wrong while adding the members in group.', {}, false));
                        }
                    } else {
                        resolve(apiResponse(HttpStatus.OK, 'Woohoo! Your group has been successfully created', {}, true));
                    }
                } else {
                    resolve(apiResponse(HttpStatus.OK, 'Oops, something went wrong while creating the group.', {}, false));
                }
            })();
        } catch (error) {
            resolve(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
        }
    });
}