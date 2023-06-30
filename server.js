const express = require('express');
const http = require('http');
const fs = require('fs');
const cors = require('cors');
const { connection } = require('./config/connection');
const appRoutes = require('./routes/index');
const {
  Users,
  ChatMessages,
  GroupMessages,
  GroupMembers,
  GroupMessageReadStatuses,
  Groups
} = require("./models");
const {
  saveSingleChatMessages,
  saveGroupChatMessages,
  deleteSingleChatMessages,
  deleteGroupChatMessages,
  updateGroupDetails,
  createGroup,
  readSingleChatMessages,
  getLastContactChatMessages,
  getLastChatMessagesFromGroup
} = require('./controller/contactChat.controller');
const {
  removeUserFromGroup,
  addMembersInGroup,
  getGroupDetails,
  userLeftGroup
} = require('./controller/group.controller');
const constant = require('./config/constant');
const { apiResponse } = require('./helpers/apiResponse.helper');
const HttpStatus = require('./config/httpStatus');
const moment = require("moment");
const { getUnreadContactNotification, getUnreadGroupNotification, saveMessageNotification } = require('./controller/messageNotifications.controller');
const multer = require('multer');
const { authenticateToken } = require('./helpers/authorization.helper');
const { Op } = require('sequelize');

const attachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/chat_attachments/');
  },
  filename: function (req, file, cb) {
    let fileFormat = file.mimetype.split('/');
    let extension = (fileFormat && fileFormat.length > 0 && fileFormat[1]) ? fileFormat[1] : '';
    const uniqueSuffix = Date.now() + '-' + (Math.round(Math.random() * 1e9));
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + extension);
  }
});
const attachementUploads = multer({ storage: attachmentStorage });

const app = express();

let LOCAL_URL = 'http://localhost:3000';
let LIVE_URL = 'https://avcall.demotestingsite.com';

let BACK_END_URL = 'http://localhost';
let serverOptions = {};
if (constant.NODE_ENV == 'test') {
  serverOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/avcallapi.demotestingsite.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/avcallapi.demotestingsite.com/fullchain.pem')
  };
  BACK_END_URL = 'https://avcapi.demotestingsite.com';
}

// DB Connection
(async () => {
  await connection();
})();

app.use(express.json());
app.use(express.static('uploads'));
app.use(cors());
app.use('/', appRoutes);

const server = http.createServer(serverOptions, app);
const io = require('socket.io')(server, {
  cors: {
    origin: [LOCAL_URL, LIVE_URL]
  }
});

let users = [{}];
let loggedInUsers = [];
let activeContactChatWindows = [];
let activeGroupChatWindows = [];

io.on('connection', (socket) => {
  socket.emit('connection', null);
  console.log('new user connected');
  console.log(socket.id);

  // Chat Sockets
  socket.on('joined', ({ chatUser }) => {
    users[socket.id] = chatUser;
  });

  /*
  GROUP CHAT SOCKET EVENTS
  */
  socket.on('groupChatWindowActive', (data) => {
    let { loggedInUserId, groupId } = data;
    let checkUser = activeGroupChatWindows.find(user => user.loggedInUserId == loggedInUserId);

    if (checkUser && checkUser != undefined) {
      checkUser.groupId = groupId;
    } else {
      activeGroupChatWindows.push({ loggedInUserId, groupId });
    }

    activeContactChatWindows = activeContactChatWindows.filter(value => value.loggedInUserId !== loggedInUserId);
  });

  socket.on('message', async (data) => {
    let { message, id, name, groupId, userId, fileName, replyGroupMessagesId, isForwarded } = data;
    let attachment = null;
    let activeGroupUsers = activeGroupChatWindows.filter(group => group.groupId == groupId);
    let activeUsers = (activeGroupUsers && activeGroupUsers.length > 0) ? activeGroupUsers.map(user => user.loggedInUserId) : [];

    if (isForwarded) {
      attachment = fileName;
    }

    let chatData = { userId, groupId, message, attachment, replyGroupMessagesId, isForwarded };
    let messageData = await saveGroupChatMessages(chatData, activeUsers);
    io.emit('sendMessage', { chatUser: users[id], message, id, name, groupId, messageData: messageData });
  });

  socket.on('lastMessageOfGroup', async (data) => {
    let response = await getLastChatMessagesFromGroup(data);
    io.emit('lastMessageOfGroupResponse', { response });
  });

  socket.on('deleteGroupMessage', async (messageId) => {
    let isDeleteMessage = await deleteGroupChatMessages(messageId);

    let response = apiResponse(HttpStatus.EXPECTATION_FAILED, 'Something went wrong with delete a message', {}, false);
    if (isDeleteMessage) {
      response = apiResponse(HttpStatus.OK, 'Message deleted', {}, true);
    }
    io.emit('deleteGroupMessageResponse', response);
  });

  socket.on('groupUserTyping', (data) => {
    socket.broadcast.emit('userGroupTypings', data);
  });

  socket.on('createGroup', async (data) => {
    let response = await createGroup(data);
    socket.broadcast.emit('groupCreated', response);
  });

  socket.on('updateGroup', async (data) => {
    let response = await updateGroupDetails(data);
    socket.broadcast.emit('groupUpdated', { response });
  });

  socket.on('getGroupDetailsRequest', async (data) => {
    let response = await getGroupDetails(data);
    socket.broadcast.emit('getGroupDetailsResponse', { response });
  });

  socket.on('removeMemberInGroup', async (data) => {
    let response = await removeUserFromGroup(data);
    socket.broadcast.emit('removedMemberInGroup', {
      response: response.groupDetails,
      removedUser: response.removedUser,
      removedByUser: response.removedByUser,
      data
    });
  });

  socket.on('userLeaveGroupRequest', async (data) => {
    let response = await userLeftGroup(data);
    socket.broadcast.emit('userLeaveGroupResponse', { response: response.groupDetails, leftUser: response.leftUser, data });
  });

  socket.on('addMemberInGroup', async (data) => {
    let response = await addMembersInGroup(data);
    socket.broadcast.emit('addedMemberInGroup', {
      response: response.response,
      addedByUser: response.addedByUser,
      data
    });
  });

  socket.on('groupNotification', async (data) => {
    let isReadMessage = await getUnreadGroupNotification(data);
    io.emit('groupNotificationResponse', isReadMessage);
  });

  /*
    CONTACT CHAT SOCKET EVENTS
  */
  socket.on('chatWindowActive', (data) => {
    let { loggedInUserId, activeUserId } = data;
    let checkUser = activeContactChatWindows.find(user => user.loggedInUserId == loggedInUserId);

    if (checkUser && checkUser != undefined) {
      checkUser.activeUserId = activeUserId;
    } else {
      activeContactChatWindows.push({ loggedInUserId, activeUserId });
    }

    activeGroupChatWindows = activeGroupChatWindows.filter(value => value.loggedInUserId !== loggedInUserId);
  });

  socket.on('singleMessage', async (data) => {
    let { message, id, name, userId, loginUserId, fileName, replyChatMessageId, isForwarded } = data;

    let senderId = loginUserId;
    let receiverId = userId;
    let attachment = null;
    let isReadMessage = false;
    let currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");

    let findUser = activeContactChatWindows.find(user => user.loggedInUserId == receiverId);

    if (findUser && findUser != undefined && findUser.activeUserId == senderId) {
      isReadMessage = true;
    }

    if (isForwarded) {
      attachment = fileName;
    }

    let reqData = { senderId, receiverId, message, attachment, replyChatMessageId, isForwarded };

    if (isReadMessage) {
      reqData.isReceiverRead = true;
      reqData.receiverReadAt = currentDateTime;
    }

    let messageData = await saveSingleChatMessages(reqData, isReadMessage);
    io.emit('singleSendMessage', { chatUser: users[id], message, id, name, userId, loginUserId, messageData });
  });

  const checkIsActiveContact = (senderId, receiverId) => {
    let isReadMessage = false;
    let findUser = activeContactChatWindows.find(user => user.loggedInUserId == receiverId);

    if (findUser && findUser != undefined && findUser.activeUserId == senderId) {
      isReadMessage = true;
    }

    return isReadMessage;
  }

  const checkIsActiveGroup = (groupId) => {
    let activeGroupUsers = activeGroupChatWindows.filter(group => group.groupId == groupId);
    let activeUsers = (activeGroupUsers && activeGroupUsers.length > 0) ? activeGroupUsers.map(user => user.loggedInUserId) : [];

    return activeUsers;
  }

  // Upload Multiple Attachments
  app.post('/chat/attachments/uploads', authenticateToken, attachementUploads.array('attachments'), (req, res) => {
    try {
      (async () => {
        let senderId = req.user.userId;
        let { userId, groupId, chatType, socketId, name, message } = req.body;
        let currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");

        if (!req.files && req.files.length == 0) {
          return res.json(apiResponse(HttpStatus.OK, 'Please upload any attachment.', {}, false));
        }

        let attachmentData = req.files.map(attachment => `chat_attachments/${attachment.filename}`).join('|');

        if (chatType == 'contact') {
          // Get sender and receiver window active status
          let isMessageRead = await checkIsActiveContact(senderId, userId);

          let chatObject = {
            senderId: senderId,
            receiverId: userId,
            attachment: attachmentData,
            isReceiverRead: isMessageRead,
            message: message
          };

          if (isMessageRead) {
            chatObject.receiverReadAt = currentDateTime;
          }

          // Create Contact Chat Message
          let chatMessage = await ChatMessages.create(chatObject);

          if (chatMessage) {
            let receiverUser = await Users.findOne({ where: { id: userId }, attributes: ['firstName', 'lastName'] });
            let senderName = `${receiverUser.firstName} ${receiverUser.lastName}`;

            // Send Message Notification
            if (!isMessageRead) {
              let notification = `${senderName} sent you ${req.files.length} attachment(s).`;

              let notificationData = [{
                userId: userId,
                message: notification,
                chatMessageId: chatMessage.id,
                groupMessageId: null
              }];

              await saveMessageNotification(notificationData);
            }

            const singleChat = await ChatMessages.findOne({
              where: { id: chatMessage.id },
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

            io.emit('singleSendMessage', { chatUser: users[socketId], message: null, socketId, senderName, userId, senderId, messageData: singleChat });
            return res.json(apiResponse(HttpStatus.OK, 'Woohoo! file uploaded successfully.', {}, true));
          } else {
            return res.json(apiResponse(HttpStatus.OK, 'Soemthing went wrong with file upload.', {}, false));
          }
        } else if (chatType == 'group') {
          message = message ? message : null;

          let groupMessage = await GroupMessages.create({
            groupId,
            userId: senderId,
            message,
            attachment: attachmentData
          });

          if (groupMessage) {
            let id = groupMessage.id;

            // Get all group members
            let groupMembers = await GroupMembers.findAll({
              where: {
                groupId,
                userId: { [Op.ne]: senderId }
              },
              attributes: ['userId']
            });

            if (groupMembers && groupMembers.length > 0) {
              let activeUsers = await checkIsActiveGroup(groupId);
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
                    model: Groups,
                    attributes: ['name']
                  },
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

              io.emit('sendMessage', { chatUser: users[socketId], message, socketId, name, groupId, messageData: groupChat });
              return res.json(apiResponse(HttpStatus.OK, 'Attchment uploaded successfully.', {}, true));
            } else {
              return res.json(apiResponse(HttpStatus.OK, 'Attchment uploaded successfully..', {}, true));
            }
          } else {
            return res.json(apiResponse(HttpStatus.OK, 'Something went wrong with upload group attachment.', {}, false));
          }
        } else {
          return res.json(apiResponse(HttpStatus.OK, 'Chat type is required.', {}, false));
        }
      })();
    } catch (error) {
      return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
  });

  socket.on('checkLastMessageReadStatus', async (data) => {
    let response = await getLastContactChatMessages(data);
    io.emit('lastMessageData', { response });
  });

  socket.on('joinSingleChat', ({ chatUser }) => {
    users[socket.id] = chatUser;
    socket.broadcast.emit('singleUserJoined', { chatUser: "Admin", message: ` ${users[socket.id]} has joined` });
  });

  socket.on('userTyping', (data) => {
    const { userName, userIsType, currentUser } = data;
    socket.broadcast.emit('userTypings', { userName, userIsType, currentUser });
  });

  socket.on('deleteSingleMessage', async (messageId) => {
    let isDeleteMessage = await deleteSingleChatMessages(messageId);

    let response = apiResponse(HttpStatus.EXPECTATION_FAILED, 'Something went wrong with delete a message', {}, false);
    if (isDeleteMessage) {
      response = apiResponse(HttpStatus.OK, 'Message deleted', {}, true);
    }
    io.emit('deleteSingleMessageResponse', response);
  });

  socket.on('readContactMessage', async (data) => {
    let isReadMessage = await readSingleChatMessages(data);
    io.emit('readContactMessageResponse', isReadMessage);
  });

  socket.on('contactNotification', async (data) => {
    let isReadMessage = await getUnreadContactNotification(data);
    io.emit('contactNotificationResponse', isReadMessage);
  });

  /*
    USER ONLINE OFFLINE STATUS SOCKET EVENTS
  */
  socket.on('userLoggedIn', (userId) => {
    const user = {
      id: userId,
      status: 'online',
      socketId: socket.id
    };

    let checkUsers = loggedInUsers.find(data => data.id == userId);
    if (checkUsers && checkUsers != undefined) {
      checkUsers.status = 'online';
    } else {
      loggedInUsers.push(user);
    }

    // Emit updated user status to all connected clients
    io.emit('userStatusUpdated', loggedInUsers);
  });

  socket.on('userLogOut', (loggedInUserId) => {
    // Find the disconnected user and update their status to 'offline'
    const disconnectedUser = loggedInUsers.find((user) => user.userId === loggedInUserId);
    if (disconnectedUser) {
      disconnectedUser.status = 'offline';

      // Emit updated user status to all connected clients
      io.emit('userStatusUpdated', loggedInUsers);
    }

    // Filter out the entry with the value 'value2'
    activeContactChatWindows = activeContactChatWindows.filter(value => value.loggedInUserId !== loggedInUserId);
    activeGroupChatWindows = activeGroupChatWindows.filter(value => value.loggedInUserId !== loggedInUserId);
  });

  /*
    SOCKET DISCONNECT EVENTS
  */
  socket.on('disconnect', () => {
    console.log('A user disconnected');

    // Find the disconnected user and update their status to 'offline'
    const disconnectedUser = loggedInUsers.find((user) => user.socketId === socket.id);
    if (disconnectedUser) {
      disconnectedUser.status = 'offline';

      // Emit updated user status to all connected clients
      io.emit('userStatusUpdated', loggedInUsers);
    }
  });

  /*
    OTHER SOCKET EVENTS
  */
  socket.on('request', (data, username, groupName) => {
    const response = { data: data, username: username, groupName: groupName };
    io.emit('response', response);
  });
});

server.listen(constant.PORT, () => {
  console.log(`✓ SERVER IS UP AND RUNNING ON ${constant.PORT}`);
  console.log(`✓ ${BACK_END_URL}:${constant.PORT}`);
});