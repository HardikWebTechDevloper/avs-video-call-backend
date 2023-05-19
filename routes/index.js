const express = require('express');
const multer = require('multer');

const router = express.Router();

// Middleware
const authMiddleware = require('../helpers/authorization.helper');

// Controllers
const authController = require('../controller/auth.controller');
const usersController = require('../controller/users.controller');
const groupController = require('../controller/group.controller');
const contactChatController = require('../controller/contactChat.controller');

// File Upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        let fileFormat = file.mimetype.split('/');
        let extension = (fileFormat && fileFormat.length > 0 && fileFormat[1]) ? fileFormat[1] : '';
        const uniqueSuffix = Date.now() + '-' + (Math.round(Math.random() * 1e9));
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + extension);
    }
});
const upload = multer({ storage: storage });

// Routes
router.get('/', (req, res) => {
    res.send('Server is up and running');
});

// Authentication APIs
router.post('/auth/register', upload.single('profile_picture'), authController.register);
router.post('/auth/login', authController.login);

// Users APIs
router.get('/user/get/all', authMiddleware.authenticateToken, usersController.getAllUsers);
router.get('/auth/profile', authMiddleware.authenticateToken, usersController.getProfile);

// Group APIs
router.post('/group/create', authMiddleware.authenticateToken, upload.single('icon'), groupController.createGroup);
router.get('/group/allgroups', authMiddleware.authenticateToken, groupController.getAllGroups);

// Chat APIs
router.post('/user/contact/chat', authMiddleware.authenticateToken, contactChatController.getContactChatMessages);


module.exports = router;