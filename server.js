const express = require('express');
const https = require('https');
const fs = require('fs');
const app = express();

const serverOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/avcallapi.demotestingsite.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/avcallapi.demotestingsite.com/fullchain.pem')
};

const server = https.createServer(serverOptions, app);
const io = require('socket.io')(server);

const cors = require('cors');
const { connection } = require('./config/connection');
const appRoutes = require('./routes/index');

const PORT = 4000;

(async () => {
  // DB Connection
  await connection();
})();

app.use(express.json());
app.use(cors());
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

  socket.on('message', ({ message, id, name, groupId }) => {
    io.emit('sendMessage', { chatUser: users[id], message, id, name, groupId });
  });

  socket.on('request', (data, username, groupName) => {
    console.log("data", data)
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

  socket.on('singleMessage', ({ message, id, name, userId, loginUserId }) => {
    io.emit('singleSendMessage', { chatUser: users[id], message, id, name, userId, loginUserId });
  });
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`https://localhost:${PORT}`);
});