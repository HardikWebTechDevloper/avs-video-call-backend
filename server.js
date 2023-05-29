const express = require('express');
const http = require('http');
const fs = require('fs');
const cors = require('cors');
const { connection } = require('./config/connection');
const appRoutes = require('./routes/index');
const { saveSingleChatMessages, saveGroupChatMessages } = require('./controller/contactChat.controller');
const constant = require('./config/constant');

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

app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));
app.use('/', appRoutes);

const server = http.createServer(serverOptions, app);
const io = require('socket.io')(server, {
  cors: {
    origin: [LOCAL_URL, LIVE_URL]
  }
});

let users = [{}];
const onlineUsers = new Set();
const loggedInUsers = [];

io.on('connection', (socket) => {
  socket.emit('connection', null);
  console.log('new user connected');
  console.log(socket.id);

  // Chat Sockets
  socket.on('joined', ({ chatUser }) => {
    users[socket.id] = chatUser;
  });

  socket.on('message', async ({ message, id, name, groupId, userId }) => {
    let data = { userId, groupId, message };
    let messageData = await saveGroupChatMessages(data);

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

  socket.on('singleMessage', async ({ message, id, name, userId, loginUserId }) => {
    let senderId = loginUserId;
    let receiverId = userId;

    let data = { senderId, receiverId, message };
    let messageData = await saveSingleChatMessages(data);

    io.emit('singleSendMessage', { chatUser: users[id], message, id, name, userId, loginUserId, messageData });
  });

  // // Add the user to the onlineUsers set
  // socket.on('addUserToOnline', (userId) => {

  //   onlineUsers.add(userId);
  //   // Emit the updated online status to other clients
  //   socket.broadcast.emit('updateOnlineStatus', { userId, isOnline: true });
  // });

  // socket.on('getOnlineStatus', (userId) => {
  //   const isOnline = onlineUsers.has(userId);
  //   socket.emit('updateOnlineStatus', { userId, isOnline });
  // });

  // When a user logs in
  socket.on('userLoggedIn', (userId) => {
    const user = {
      id: userId,
      status: 'online',
    };

    console.log("user::::", user);

    loggedInUsers.push(user);
    console.log("loggedInUsers::::", loggedInUsers);

    // Emit updated user status to all connected clients
    io.emit('userStatusUpdated', loggedInUsers);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');

    // Remove the user from the online users set
    onlineUsers.delete(socket.userId);

    // Emit the updated online status to other clients
    io.emit('updateOnlineStatus', { userId: socket.userId, isOnline: false });

    // Find the disconnected user and update their status to 'offline'
    const disconnectedUser = loggedInUsers.find((user) => user.socketId === socket.id);
    if (disconnectedUser) {
      disconnectedUser.status = 'offline';

      // Emit updated user status to all connected clients
      io.emit('userStatusUpdated', loggedInUsers);
    }
  });
});

server.listen(constant.PORT, () => {
  console.log(`✓ SERVER IS UP AND RUNNING ON ${constant.PORT}`);
  console.log(`✓ ${BACK_END_URL}:${constant.PORT}`);
});