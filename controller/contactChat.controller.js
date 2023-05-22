const { Users, ChatMessages, GroupMessages } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const constant = require('../config/constant');
const HttpStatus = require('../config/httpStatus');
const { Op } = require("sequelize");

module.exports.saveSingleChatMessages = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                await ChatMessages.create(data).then(result => {
                    resolve(result);
                });
            })();
        } catch (error) {
            resolve(error.message);
        }
    });
}

module.exports.saveGroupChatMessages = (data) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                await GroupMessages.create(data).then(result => {
                    resolve(result);
                });
            })();
        } catch (error) {
            resolve(error.message);
        }
    });
}

module.exports.getContactChatMessages = (req, res) => {
    try {
        (async () => {
            const { contactId } = req.body;

            let users = await ChatMessages.findAll({
                where: {
                    [Op.or]: [
                        { senderId: req.user.userId },
                        { receiverId: req.user.userId },
                        { senderId: contactId },
                        { receiverId: contactId }
                    ]
                }
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', users, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}