const { Users } = require("../models");
const { apiResponse } = require('../helpers/apiResponse.helper');
const { encryptPassword, validatePassword } = require('../helpers/password-encryption.helper');
const constant = require('../config/constant');
const HttpStatus = require('../config/httpStatus');

module.exports.getAllUsers = (req, res) => {
    try {
        (async () => {
            // console.log(req.user)

            let users = await Users.findAll({
                attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', users, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getProfile = (req, res) => {
    try {
        (async () => {
            let user = await Users.findOne({
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profilePicture'],
                where: {
                    id: req.user.userId,
                },
            });

            return res.json(apiResponse(HttpStatus.OK, 'Success', user, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

