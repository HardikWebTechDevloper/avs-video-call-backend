const { Users } = require("../models");
const jwt = require('jsonwebtoken');
const { apiResponse } = require('../helpers/apiResponse.helper');
const { encryptPassword, validatePassword } = require('../helpers/password-encryption.helper');
const constant = require('../config/constant');
const HttpStatus = require('../config/httpStatus');

module.exports.register = (request, res) => {
    try {
        (async () => {
            let body = request.body;
            let profilePicture = (request.file) ? request.file.filename : null;

            // Check Unique Email
            let uniqueEmail = await Users.count({ where: { email: body.email } });

            // Check Unique Phone
            let uniquePhone = await Users.count({ where: { phone: body.phone } });

            if (uniqueEmail && uniqueEmail > 0) {
                return res.json(apiResponse(HttpStatus.OK, 'Email is already exists in our records', {}, false));
            } else if (uniquePhone && uniquePhone > 0) {
                return res.json(apiResponse(HttpStatus.OK, 'Phone is already exists in our records', {}, false));
            } else {
                let encryptedPsw = await encryptPassword(body.password);

                let userObject = {
                    firstName: body.first_name,
                    lastName: body.last_name,
                    password: encryptedPsw,
                    email: body.email,
                    phone: body.phone,
                    profilePicture: profilePicture
                };

                let user = await Users.create(userObject);

                if (user) {
                    return res.json(apiResponse(HttpStatus.OK, 'User has been created successfully', { user }, true));
                } else {
                    return res.json(apiResponse(HttpStatus.OK, 'Oops, something went wrong while creating the user', {}, false));
                }
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.login = (req, res) => {
    try {
        (async () => {
            let { email, password } = req.body;

            // Check Unique Email
            let user = await Users.findOne({ where: { email } });

            if (user && user != null) {
                let hashPassword = user.password;
                let isPasswordCorrect = await validatePassword(password, hashPassword);

                if (isPasswordCorrect) {
                    const userDetails = { userId: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email };

                    const token = jwt.sign(userDetails, constant.JWT_TOKEN_SECRET, { expiresIn: constant.JWT_TOKEN_EXPIRED_TIME });
                    userDetails.accessToken = token;

                    res.setHeader('Access-Token', token);
                    return res.json(apiResponse(HttpStatus.OK, 'Hooray! Your login attempt was successful', userDetails, true));
                } else {
                    return res.json(apiResponse(HttpStatus.NOT_FOUND, 'We could not verify your password. Please ensure that you have entered the correct password', {}, false));
                }
            } else {
                return res.json(apiResponse(HttpStatus.NOT_FOUND, 'We are unable to find the requested user. Please check if you have entered the correct information', {}, false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}