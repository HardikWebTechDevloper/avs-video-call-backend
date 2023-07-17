const { Users, UserTokens, country, state, city } = require("../models");
const jwt = require('jsonwebtoken');
const { apiResponse } = require('../helpers/apiResponse.helper');
const { encryptPassword, validatePassword } = require('../helpers/password-encryption.helper');
const constant = require('../config/constant');
const HttpStatus = require('../config/httpStatus');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const moment = require("moment");
const { sendEmail } = require("../helpers/email-sender.helper");

module.exports.getFiles = (req, res) => {
    try {
        (async () => {
            const fileName = req.params.filename;
            const imagePath = path.join(__dirname, '../uploads/', fileName);

            res.sendFile(imagePath);
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getcountries = (req, res) => {
    try {
        (async () => {
            const country_list = await country.findAll({
                attributes: [['country_id', 'id'], ['country_name', 'label']],
                order: [['country_name', 'ASC']]
            });
            return res.json(apiResponse(HttpStatus.OK, 'success', country_list, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getStatesByCountry = (req, res) => {
    try {
        (async () => {
            let { id } = req.body;

            const state_list = await state.findAll({
                attributes: [['state_id', 'id'], ['state_name', 'label']],
                where: { country_id: id },
                order: [['state_name', 'ASC']]
            });
            return res.json(apiResponse(HttpStatus.OK, 'success', state_list, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.getCitiesByState = (req, res) => {
    try {
        (async () => {
            let { id } = req.body;

            const city_list = await city.findAll({
                attributes: [['city_id', 'id'], ['city_name', 'label']],
                where: { state_id: id },
                order: [['city_name', 'ASC']]
            });
            return res.json(apiResponse(HttpStatus.OK, 'success', city_list, true));
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

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
                    sex: body.sex,
                    date_of_birth: moment(body.dob).format("YYYY-MM-DD"),
                    password: encryptedPsw,
                    email: body.email,
                    phone: body.phone,
                    profilePicture: profilePicture,
                    country_id: body.country,
                    state_id: body.state,
                    city_id: body.city,
                    isActive: 0
                };

                let user = await Users.create(userObject);
                if (user) {
                    let userId = user.id;
                    let userName = `${body.first_name} ${body.last_name}`;

                    let currentDateTime = new Date().getTime();
                    let expDateTime = (new Date().getTime() + (constant.JWT_FORGOT_PASSWORD_TOKEN_EXPIRED_TIME * 24 * 60 * 60 * 1000));

                    const token = jwt.sign({
                        id: userId,
                        dateTime: currentDateTime,
                        expDateTime: expDateTime
                    }, constant.JWT_TOKEN_SECRET);

                    await UserTokens.create({
                        userId: userId,
                        tokenType: 4,
                        jwtToken: token,
                        status: 1
                    });

                    let url = (constant.NODE_ENV == 'test') ? constant.LIVE_URL : constant.LOCAL_URL;
                    const accountConfirmationLink = `${url}/account-activation/${token}`;

                    let templatePath = path.join(__dirname, '../templates/', 'account-activation.ejs');
                    ejs.renderFile(templatePath, { userName, accountConfirmationLink }, async (err, html) => {
                        if (err) {
                            console.log(err);
                            return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, "Email Template::: " + err, {}, false));
                        } else {
                            await sendEmail({ email: body.email, subject: constant.APP_NAME + " - Activate Your Account", html });
                            return res.json(apiResponse(HttpStatus.OK, 'Welcome! Please Verify Your Email Address.', {}, true));
                        }
                    });
                } else {
                    return res.json(apiResponse(HttpStatus.OK, 'Oops, something went wrong while creating the user', {}, false));
                }
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.userEmailVerification = (req, res) => {
    try {
        (async () => {
            const { token } = req.body;

            const decodedToken = jwt.verify(token, constant.JWT_TOKEN_SECRET);
            if (decodedToken) {
                let currentDateTimeJWT = new Date().getTime();
                const isValidToken = await UserTokens.findOne({ where: { userId: decodedToken.id, status: 1, tokenType: 4, jwtToken: token } });

                if (isValidToken && decodedToken.expDateTime >= currentDateTimeJWT) {
                    await Users.update({ isActive: true }, { where: { id: decodedToken.id } });
                    await isValidToken.destroy();

                    return res.json(apiResponse(HttpStatus.OK, "Fantastic! Your email has been verified successfully.", {}, true));
                } else {
                    return res.json(apiResponse(HttpStatus.OK, "Email verification token has been expired.", {}, false));
                }
            } else {
                return res.json(apiResponse(HttpStatus.OK, "Invalid email verification token.", {}, false));
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
            let user = await Users.findOne({ where: { email, isActive: true } });

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
                return res.json(apiResponse(HttpStatus.NOT_FOUND, 'Please verify your account from your registered email id.', {}, false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.forgotPassword = (req, res) => {
    try {
        (async () => {
            let { email } = req.body;

            let user = await Users.findOne({
                attributes: ['id', 'firstName', 'lastName'],
                where: { email, isActive: true }
            });

            if (user) {
                let userId = user.id;
                let userName = `${user.firstName} ${user.lastName}`;
                let currentDateTime = new Date().getTime();
                let expDateTime = (new Date().getTime() + (constant.JWT_FORGOT_PASSWORD_TOKEN_EXPIRED_TIME * 24 * 60 * 60 * 1000));

                const token = jwt.sign({
                    id: userId,
                    dateTime: currentDateTime,
                    expDateTime: expDateTime
                }, constant.JWT_TOKEN_SECRET);

                await UserTokens.create({
                    userId: userId,
                    tokenType: 1,
                    jwtToken: token,
                    status: 1
                });

                let url = (constant.NODE_ENV == 'test') ? constant.LIVE_URL : constant.LOCAL_URL;
                const resetLink = `${url}/reset-password?token=${token}`;
                const backgroundImageUrl = `${constant.BACK_END_LIVE_URL}/images/background_2.png`;
                const header3ImageUrl = `${constant.BACK_END_LIVE_URL}/images/header3.png`;

                let templatePath = path.join(__dirname, '../templates/', 'reset-password.ejs');
                ejs.renderFile(templatePath, { userName, resetLink, backgroundImageUrl, header3ImageUrl }, async (err, html) => {
                    if (err) {
                        console.log(err);
                        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, "Email Template::: " + err, {}, false));
                    } else {
                        await sendEmail({ email, subject: constant.APP_NAME + " - Reset Password", html });
                        return res.json(apiResponse(HttpStatus.OK, 'Check your email now! We have sent you a password reset email with further instructions.', {}, true));
                    }
                });
            } else {
                return res.json(apiResponse(HttpStatus.NOT_FOUND, 'Please enter your valid registered email id.', {}, false));
            }
        })();
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.resetPassword = async function (req, res) {
    try {
        const { token, password } = req.body;
        const decodedToken = jwt.verify(token, constant.JWT_TOKEN_SECRET);

        if (decodedToken) {
            let currentDateTimeJWT = new Date().getTime();
            const isValidToken = await UserTokens.findOne({ where: { userId: decodedToken.id, status: 1, tokenType: 1, jwtToken: token } });

            if (isValidToken && decodedToken.expDateTime >= currentDateTimeJWT) {
                const encryptedPassword = await encryptPassword(password)

                await Users.update({ password: encryptedPassword }, { where: { id: decodedToken.id } });
                await isValidToken.destroy();

                return res.json(apiResponse(HttpStatus.OK, "Fantastic! You've successfully changed your password.", {}, true));
            } else {
                return res.json(apiResponse(HttpStatus.OK, "Reset password token has been expired", {}, false));
            }
        } else {
            return res.json(apiResponse(HttpStatus.OK, "Invalid reset password token.", {}, false));
        }
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}

module.exports.downloadChatAttachment = (req, res) => {
    try {
        const fileName = req.query.attachment;
        const filePath = path.join(__dirname, '../uploads/chat_attachments/' + fileName);

        // Set the headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Send the file as the response
        res.sendFile(filePath, err => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Error downloading file');
            }
        });
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).send('Error downloading file');
    }
};