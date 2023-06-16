const nodemailer = require('nodemailer');
const constant = require('../config/constant');

module.exports.sendEmail = (emailObj) => {
    return new Promise(async (resolve, reject) => {
        try {
            const mailConfigs = constant.MAIL_CREDS;
            const transporter = nodemailer.createTransport({
                service: constant.MAIL_CREDS.EMAIL_SERVICE,
                host: constant.MAIL_CREDS.EMAIL_HOST,
                auth: {
                    user: constant.MAIL_CREDS.EMAIL_USERNAME,
                    pass: constant.MAIL_CREDS.EMAIL_PASSWORD,
                },
                from: constant.MAIL_CREDS.EMAIL_FROM,
                from_name: constant.MAIL_CREDS.EMAIL_FROM_NAME,
                secure: true,
            });

            let result = await transporter.sendMail({
                from: mailConfigs.EMAIL_FROM_NAME + " <" + mailConfigs.EMAIL_FROM + ">",
                to: emailObj.email,
                subject: emailObj.subject,
                html: emailObj.html,
                // text: text,
                // attachments: emailObj.attachments
            });

            console.log("result", result);

            resolve(result);
        } catch (error) {
            resolve(error.message);
        }
    });
}