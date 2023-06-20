const Joi = require("joi");
const { apiResponse } = require('../helpers/apiResponse.helper');
const HttpStatus = require('../config/httpStatus');
const constant = require('../config/constant');

const options = {
    abortEarly: false, // include all errors
    allowUnknown: true, // ignore unknown props
    stripUnknown: true, // remove unknown props
};

module.exports.updateUserProfileValidation = (req, res, next) => {
    try {
        let body = req.body;
        const schema = Joi.object({
            firstName: Joi.string().required().label("First name"),
            lastName: Joi.string().required().label("Last name"),
        });

        // validate request body against schema
        const { error } = schema.validate(body, options);

        if (error) {
            let errors = [];
            error.details.forEach((err) => {
                errors.push(err.context.label);
            });
            return res.json(apiResponse(HttpStatus.NO_CONTENT, errors, {}, false));
        } else {
            next();
        }
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}