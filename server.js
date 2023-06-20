const express = require('express');
const http = require('http');
const fs = require('fs');
const cors = require('cors');
const { connection } = require('./config/connection');
const appRoutes = require('./routes/index');
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
const { getUnreadContactNotification, getUnreadGroupNotification } = require('./controller/messageNotifications.controller');
// const multer = require('multer');

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/chat_attachments/')
//   },
//   filename: function (req, file, cb) {
//     let fileFormat = file.mimetype.split('/');
//     let extension = (fileFormat && fileFormat.length > 0 && fileFormat[1]) ? fileFormat[1] : '';
//     const uniqueSuffix = Date.now() + '-' + (Math.round(Math.random() * 1e9));
//     cb(null, file.fieldname + '-' + uniqueSuffix + '.' + extension);
//   }
// });
// const upload = multer({ storage: storage });

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

app.use(express.static('uploads'));
app.use(cors());
app.use(express.json());
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
    let { message, id, name, groupId, userId, file, fileName, replyGroupMessagesId, isForwarded } = data;
    let attachment = null;
    let activeGroupUsers = activeGroupChatWindows.filter(group => group.groupId == groupId);
    let activeUsers = (activeGroupUsers && activeGroupUsers.length > 0) ? activeGroupUsers.map(user => user.loggedInUserId) : [];

    if (isForwarded) {
      attachment = fileName;
    } else {
      if (file) {
        attachment = `chat_attachments/${fileName}`;
        await fs.writeFileSync('uploads/' + attachment, file);
      }
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
    socket.broadcast.emit('removedMemberInGroup', { response, data });
  });

  socket.on('userLeaveGroupRequest', async (data) => {
    let response = await userLeftGroup(data);
    socket.broadcast.emit('userLeaveGroupResponse', { response, data });
  });

  socket.on('addMemberInGroup', async (data) => {
    let response = await addMembersInGroup(data);
    socket.broadcast.emit('addedMemberInGroup', { response, data });
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
    let { message, id, name, userId, loginUserId, file, fileName, replyChatMessageId, isForwarded } = data;

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
    } else {
      if (file) {
        attachment = `chat_attachments/${fileName}`;
        await fs.writeFileSync('uploads/' + attachment, file);
      }
    }

    let reqData = { senderId, receiverId, message, attachment, replyChatMessageId, isForwarded };

    if (isReadMessage) {
      reqData.isReceiverRead = true;
      reqData.receiverReadAt = currentDateTime;
    }

    let messageData = await saveSingleChatMessages(reqData, isReadMessage);
    io.emit('singleSendMessage', { chatUser: users[id], message, id, name, userId, loginUserId, messageData });
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