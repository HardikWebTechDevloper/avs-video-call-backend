const express = require('express');
const http = require('http');
const fs = require('fs');
const cors = require('cors');
const { connection } = require('./config/connection');
const appRoutes = require('./routes/index');
const { saveSingleChatMessages, saveGroupChatMessages, deleteSingleChatMessages, deleteGroupChatMessages } = require('./controller/contactChat.controller');
const constant = require('./config/constant');
const { apiResponse } = require('./helpers/apiResponse.helper');
const HttpStatus = require('./config/httpStatus');

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
const loggedInUsers = [];

io.on('connection', (socket) => {
  socket.emit('connection', null);
  console.log('new user connected');
  console.log(socket.id);

  // Chat Sockets
  socket.on('joined', ({ chatUser }) => {
    users[socket.id] = chatUser;
  });

  socket.on('message', async (data) => {
    let { message, id, name, groupId, userId, file, fileName, replyGroupMessagesId, isForwarded } = data;
    let attachment = null;

    if (isForwarded) {
      attachment = fileName;
    } else {
      if (file) {
        attachment = `chat_attachments/${fileName}`;
        let file = await fs.writeFileSync('uploads/' + attachment, file);
        // console.log('FILE:>>>>>>>>>>>>>>>>>>>>>>>',file);
      }
    }

    let chatData = { userId, groupId, message, attachment, replyGroupMessagesId, isForwarded };
    let messageData = await saveGroupChatMessages(chatData);
    io.emit('sendMessage', { chatUser: users[id], message, id, name, groupId, messageData: messageData });
  });

  socket.on('request', (data, username, groupName) => {
    const response = { data: data, username: username, groupName: groupName };
    io.emit('response', response);
  });

  socket.on('joinSingleChat', ({ chatUser }) => {
    users[socket.id] = chatUser;
    socket.broadcast.emit('singleUserJoined', { chatUser: "Admin", message: ` ${users[socket.id]} has joined` });
  });

  socket.on('userTyping', (data) => {
    const { userName, userIsType, currentUser } = data;
    socket.broadcast.emit('userTypings', { userName, userIsType, currentUser });
  });

  socket.on('groupUserTyping', (data) => {
    socket.broadcast.emit('userGroupTypings', data);
  });

  socket.on('singleMessage', async (data) => {
    let { message, id, name, userId, loginUserId, file, fileName, replyChatMessageId, isForwarded } = data;

    let senderId = loginUserId;
    let receiverId = userId;
    let attachment = null;

    if (isForwarded) {
      attachment = fileName;
    } else {
      if (file) {
        attachment = `chat_attachments/${fileName}`;
        await fs.writeFileSync('uploads/' + attachment, file);
      }
    }

    let reqData = { senderId, receiverId, message, attachment, replyChatMessageId, isForwarded };
    let messageData = await saveSingleChatMessages(reqData);

    io.emit('singleSendMessage', { chatUser: users[id], message, id, name, userId, loginUserId, messageData });
  });

  // Delete Single Chat Messages
  socket.on('deleteSingleMessage', async (messageId) => {
    let isDeleteMessage = await deleteSingleChatMessages(messageId);

    let response = apiResponse(HttpStatus.EXPECTATION_FAILED, 'Something went wrong with delete a message', {}, false);
    if (isDeleteMessage) {
      response = apiResponse(HttpStatus.OK, 'Message deleted', {}, true);
    }
    io.emit('deleteSingleMessageResponse', response);
  });

  // Delete Group Chat Messages
  socket.on('deleteGroupMessage', async (messageId) => {
    let isDeleteMessage = await deleteGroupChatMessages(messageId);

    let response = apiResponse(HttpStatus.EXPECTATION_FAILED, 'Something went wrong with delete a message', {}, false);
    if (isDeleteMessage) {
      response = apiResponse(HttpStatus.OK, 'Message deleted', {}, true);
    }
    io.emit('deleteGroupMessageResponse', response);
  });

  // When a user logs in
  socket.on('userLoggedIn', (userId) => {
    console.log("userId::::", userId);
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

    console.log("loggedInUsers::::", loggedInUsers);

    // Emit updated user status to all connected clients
    io.emit('userStatusUpdated', loggedInUsers);
  });

  socket.on('userLogOut', (userId) => {
    // Find the disconnected user and update their status to 'offline'
    const disconnectedUser = loggedInUsers.find((user) => user.userId === userId);
    if (disconnectedUser) {
      disconnectedUser.status = 'offline';

      console.log("loggedInUsers::::", loggedInUsers);

      // Emit updated user status to all connected clients
      io.emit('userStatusUpdated', loggedInUsers);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');

    // Find the disconnected user and update their status to 'offline'
    const disconnectedUser = loggedInUsers.find((user) => user.socketId === socket.id);
    if (disconnectedUser) {
      disconnectedUser.status = 'offline';

      console.log("loggedInUsers::::", loggedInUsers);

      // Emit updated user status to all connected clients
      io.emit('userStatusUpdated', loggedInUsers);
    }
  });
});

server.listen(constant.PORT, () => {
  console.log(`✓ SERVER IS UP AND RUNNING ON ${constant.PORT}`);
  console.log(`✓ ${BACK_END_URL}:${constant.PORT}`);
});