const { MessageNotifications } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const HttpStatus = require('../config/httpStatus');
const { Op, literal } = require("sequelize");

module.exports.saveMessageNotification = (data = []) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                if (data && data.length > 0) {
                    let createNotification = await MessageNotifications.bulkCreate(data);

                    if (createNotification && createNotification.length > 0) {
                        resolve({ status: true, data: createNotification });
                    } else {
                        resolve({ status: false, data: [] });
                    }
                } else {
                    resolve({ status: false, data: [] });
                }
            })();
        } catch (error) {
            console.log(error.message);
            reject(error.message);
        }
    });
}

module.exports.getUserMessageNotifications = (req, res) => {
    try {
        (async () => {
            const loggedInUserId = req.user.userId;

            let userNotifications = await MessageNotifications.findAll({
                where: { userId: loggedInUserId },
                order: [['createdAt', 'DESC']]
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', userNotifications, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getTotalUnreadNotificationOfUser = (req, res) => {
    try {
        (async () => {
            const loggedInUserId = req.user.userId;

            let totalUnreadNotification = await MessageNotifications.count({
                where: { userId: loggedInUserId, isRead: false },
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', { totalUnreadNotification }, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.updateReadNotificationStatus = (req, res) => {
    try {
        (async () => {
            const loggedInUserId = req.user.userId;

            let notification = await MessageNotifications.update(
                { isRead: true },
                {
                    where: { userId: loggedInUserId, isRead: false },
                }
            );

            if (notification) {
                return res.json(apiResponse(HttpStatus.OK, 'Notification read successfully.', {}, true));
            } else {
                return res.json(apiResponse(HttpStatus.OK, 'Something went wrong with update notification.', {}, false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}