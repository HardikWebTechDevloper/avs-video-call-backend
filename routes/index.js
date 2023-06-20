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
const messageNotificationsController = require('../controller/messageNotifications.controller');
const { updateUserProfileValidation } = require('../validations/users.validation');

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

// Download Attachment
router.get('/download/attachment', authController.downloadChatAttachment);

// Authentication APIs
router.post('/get/countries', authController.getcountries);
router.post('/get/statesByCountry', authController.getStatesByCountry);
router.post('/get/citiesByState', authController.getCitiesByState);
router.post('/auth/register', upload.single('profile_picture'), authController.register);
router.post('/auth/login', authController.login);
router.post('/forgot/password', authController.forgotPassword);
router.post('/reset/password', authController.resetPassword);

// Users APIs
router.get('/user/get/all', authMiddleware.authenticateToken, usersController.getAllUsers);
router.post('/auth/profile', authMiddleware.authenticateToken, usersController.getProfile);
// router.post('/user/profile/update', authMiddleware.authenticateToken, updateUserProfileValidation, usersController.updateProfile);

// Group APIs
router.post('/group/create', authMiddleware.authenticateToken, upload.single('icon'), groupController.createGroup);
router.post('/group/update', authMiddleware.authenticateToken, upload.single('icon'), groupController.updateGroup);
router.get('/group/allgroups', authMiddleware.authenticateToken, groupController.getAllGroups);

// Chat APIs
router.post('/user/contact/chat', authMiddleware.authenticateToken, contactChatController.getContactChatMessages);
router.post('/user/group/chat', authMiddleware.authenticateToken, contactChatController.getGroupChatMessages);

// Chat Notifications
router.get('/user/message/notifications', authMiddleware.authenticateToken, messageNotificationsController.getUserMessageNotifications);
router.get('/user/message/unread/notification', authMiddleware.authenticateToken, messageNotificationsController.getTotalUnreadNotificationOfUser);
router.get('/user/update/notification/status', authMiddleware.authenticateToken, messageNotificationsController.updateReadNotificationStatus);
router.get('/user/clear/notification', authMiddleware.authenticateToken, messageNotificationsController.clearNotification);

module.exports = router;