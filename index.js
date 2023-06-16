const express = require('express');
const http = require('http');
const { ExpressPeerServer } = require('peer');
const groupCallHandler = require('./groupCallHandler');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const cors = require('cors');
const constant = require('./config/constant');

const PORT = 4001;

let serverOptions = {};
if (constant.NODE_ENV == 'test') {
    serverOptions = {
        key: fs.readFileSync('/etc/letsencrypt/live/avcallvideo.demotestingsite.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/avcallvideo.demotestingsite.com/fullchain.pem')
    };
}

const app = express();
const server = http.createServer(serverOptions, app);

// CORS
app.use(cors());

// Peer Server Connections
const peerServer = ExpressPeerServer(server, { debug: true });
app.use('/peerjs', peerServer);
groupCallHandler.createPeerServerListeners(peerServer);

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

let peers = [];
let groupCallRooms = [];

const broadcastEventTypes = {
    ACTIVE_USERS: 'ACTIVE_USERS',
    GROUP_CALL_ROOMS: 'GROUP_CALL_ROOMS'
};

io.on('connection', (socket) => {
    socket.emit('connection', null);
    console.log('new user connected');
    console.log(socket.id);

    socket.on('register-new-user', (data) => {
        peers.push({
            id: data.id,
            email: data.email,
            profilePicture: data.profilePicture,
            username: data.username,
            localGroupMicrophoneEnabled: data.localGroupMicrophoneEnabled,
            socketId: data.socketId,
        });
        console.log('registered new user');
        console.log(peers);

        io.sockets.emit('broadcast', {
            event: broadcastEventTypes.ACTIVE_USERS,
            activeUsers: peers
        });

        io.sockets.emit('broadcast', {
            event: broadcastEventTypes.GROUP_CALL_ROOMS,
            groupCallRooms
        });
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        peers = peers.filter(peer => peer.socketId !== socket.id);
        io.sockets.emit('broadcast', {
            event: broadcastEventTypes.ACTIVE_USERS,
            activeUsers: peers
        });

        groupCallRooms = groupCallRooms.filter(room => room.socketId !== socket.id);
        io.sockets.emit('broadcast', {
            event: broadcastEventTypes.GROUP_CALL_ROOMS,
            groupCallRooms
        });
    });

    // listeners related with direct call

    socket.on('pre-offer', (data) => {
        console.log('pre-offer handled');
        io.to(data.callee.socketId).emit('pre-offer', {
            callerUsername: data.caller.username,
            callerSocketId: socket.id
        });
    });

    socket.on('pre-offer-answer', (data) => {
        console.log('handling pre offer answer');
        io.to(data.callerSocketId).emit('pre-offer-answer', {
            answer: data.answer
        });
    });

    socket.on('webRTC-offer', (data) => {
        console.log('handling webRTC offer');
        io.to(data.calleeSocketId).emit('webRTC-offer', {
            offer: data.offer
        });
    });

    socket.on('webRTC-answer', (data) => {
        console.log('handling webRTC answer');
        io.to(data.callerSocketId).emit('webRTC-answer', {
            answer: data.answer
        });
    });

    socket.on('webRTC-candidate', (data) => {
        console.log('handling ice candidate');
        io.to(data.connectedUserSocketId).emit('webRTC-candidate', {
            candidate: data.candidate
        });
    });

    socket.on('user-hanged-up', (data) => {
        io.to(data.connectedUserSocketId).emit('user-hanged-up');
    });

    // listeners related with group call
    socket.on('group-call-register', (data) => {
        const roomId = uuidv4();
        socket.join(roomId);

        const newGroupCallRoom = {
            peerId: data.peerId,
            hostName: data.username,
            groupName: data.groupname,
            socketId: socket.id,
            roomId: roomId
        };
        groupCallRooms.push(newGroupCallRoom);
        io.sockets.emit('broadcast', {
            event: broadcastEventTypes.GROUP_CALL_ROOMS,
            groupCallRooms
        });
    });

    socket.on('group-call-join-request', (data) => {
        io.to(data.roomId).emit('group-call-join-request', {
            peerId: data.peerId,
            streamId: data.streamId
        });

        socket.join(data.roomId);
    });

    socket.on('group-call-user-left', (data) => {
        socket.leave(data.roomId);

        io.to(data.roomId).emit('group-call-user-left', {
            streamId: data.streamId
        });
    });

    socket.on('group-call-closed-by-host', (data) => {
        groupCallRooms = groupCallRooms.filter(room => room.peerId !== data.peerId);

        io.sockets.emit('broadcast', {
            event: broadcastEventTypes.GROUP_CALL_ROOMS,
            groupCallRooms
        });
    });
});

server.listen(PORT, () => {
    console.log(`✓ SERVER IS UP AND RUNNING ON ${PORT}`);
});