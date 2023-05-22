const express = require('express');
const http = require('http');
const fs = require('fs');
const app = express();

require('dotenv').config();

let serverOptions = {};
if (process.env.NODE_ENV !== 'development') {
  serverOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/avcallapi.demotestingsite.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/avcallapi.demotestingsite.com/fullchain.pem')
  };
}

const server = http.createServer(serverOptions, app);
const io = require('socket.io')(server);

const cors = require('cors');
const { connection } = require('./config/connection');
const appRoutes = require('./routes/index');
const { saveSingleChatMessages, saveGroupChatMessages } = require('./controller/contactChat.controller');

const PORT = 4000;

(async () => {
  // DB Connection
  await connection();
})();

app.use(express.json());
app.use(cors());
app.use(express.static('uploads'));
app.use('/', appRoutes);

let users = [{}];

io.on('connection', (socket) => {
  socket.emit('connection', null);
  console.log('new user connected');
  console.log(socket.id);

  // Chat Sockets
  socket.on('joined', ({ chatUser }) => {
    users[socket.id] = chatUser;
  });

  socket.on('message', async ({ message, id, name, groupId }) => {
    let userId = id;

    let data = { userId, groupId, message };
    let messageData = await saveGroupChatMessages(data);

    io.emit('sendMessage', { chatUser: users[id], message, id, name, groupId, messageData });
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
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`https://localhost:${PORT}`);
});