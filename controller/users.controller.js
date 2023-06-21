const { Users, ChatMessages, country, state, city } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const { encryptPassword, validatePassword } = require('../helpers/password-encryption.helper');
const constant = require('../config/constant');
const moment = require("moment"),
    fs = require('fs');
const HttpStatus = require('../config/httpStatus');
const { Op, literal } = require("sequelize");

module.exports.getAllUsers = (req, res) => {
    try {
        (async () => {
            let usersTable = Users.name;
            let chatMessagesTable = ChatMessages.name;
            let loggedInUserId = req.user.userId;

            let users = await Users.findAll({
                where: {
                    id: { [Op.ne]: loggedInUserId }
                },
                attributes: [
                    'id',
                    'firstName',
                    'lastName',
                    'email',
                    'phone',
                    'profilePicture',
                    'createdAt',
                    [
                        literal(`(SELECT "message" FROM "${chatMessagesTable}" 
                                    WHERE ("${usersTable}"."id" = "${chatMessagesTable}"."senderId" AND "${chatMessagesTable}"."receiverId" = ${loggedInUserId}) OR 
                                        ("${usersTable}"."id" = "${chatMessagesTable}"."receiverId" AND "${chatMessagesTable}"."senderId" = ${loggedInUserId})
                                    ORDER BY "createdAt" DESC LIMIT 1)`),
                        'lastSentMessage'
                    ],
                    [
                        literal(`(SELECT "createdAt" FROM "${chatMessagesTable}" 
                                    WHERE ("${usersTable}"."id" = "${chatMessagesTable}"."senderId" AND "${chatMessagesTable}"."receiverId" = ${loggedInUserId}) OR 
                                        ("${usersTable}"."id" = "${chatMessagesTable}"."receiverId" AND "${chatMessagesTable}"."senderId" = ${loggedInUserId})
                                    ORDER BY "createdAt" DESC LIMIT 1)`),
                        'lastSentMessageAt'
                    ],
                    [
                        literal(`(SELECT COUNT(*) FROM "${chatMessagesTable}" WHERE "${chatMessagesTable}"."receiverId"=${loggedInUserId} AND "${chatMessagesTable}"."senderId" = "${usersTable}"."id" AND "${chatMessagesTable}"."isReceiverRead"=false)`),
                        'totalUnreadMessage'
                    ]
                ],
                include: [
                    {
                        model: ChatMessages,
                        as: 'sentMessages',
                        attributes: []
                    }
                ],
                group: ['Users.id'],
                order: [
                    [literal('"lastSentMessageAt" DESC NULLS LAST')],
                    [literal('MAX("sentMessages"."createdAt") DESC')],
                ],
                raw: true
            });

            if (users && users.length > 0) {
                return res.json(apiResponse(HttpStatus.OK, 'Success', users, true));
            } else {
                return res.json(apiResponse(HttpStatus.NO_CONTENT, 'No Data', [], false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getProfile = (req, res) => {
    try {
        (async () => {
            let userId = req.user.userId;

            if (req.body.userId) {
                userId = req.body.userId;
            }

            let user = await Users.findOne({
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profilePicture', 'sex', 'date_of_birth'],
                where: {
                    id: userId,
                },
                include: [{
                    model: country,
                    as: 'country',
                    attributes: [['country_id', 'id'], ['country_name', 'name']]
                }, {
                    model: state,
                    as: 'state',
                    attributes: [['state_id', 'id'], ['state_name', 'name']]
                }, {
                    model: city,
                    as: 'city',
                    attributes: [['city_id', 'id'], ['city_name', 'name']]
                }]
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', user, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.updateProfile = (req, res) => {
    try {
        (async () => {
            let userId = req.user.userId;
            let body = req.body;
            let profilePicture = (req.file) ? req.file.filename : null;

            const is_user_exists = await Users.findOne({ where: { id: userId } });
            if (is_user_exists) {
                if ((profilePicture != null) && is_user_exists.profilePicture != null) {
                    fs.unlink(`uploads/${is_user_exists.profilePicture}`, (err) => { });
                }
                is_user_exists.update({
                    firstName: body.first_name,
                    lastName: body.last_name,
                    sex: body.sex,
                    date_of_birth: moment(body.dob).format("YYYY-MM-DD"),
                    phone: body.phone,
                    profilePicture: profilePicture,
                    country_id: body.country,
                    state_id: body.state,
                    city_id: body.city
                });
                return res.json(apiResponse(HttpStatus.OK, 'Woohoo! Your profile has been successfully updated.', {}, true));
            } else {
                return res.json(apiResponse(HttpStatus.OK, 'Oops, something went wrong while update the profile.', {}, false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

