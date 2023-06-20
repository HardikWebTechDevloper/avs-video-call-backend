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
    let body = req.body;
    try {
        const schema = Joi.object({
            first_name: Joi.string().required().label("First name"),
            last_name: Joi.string().required().label("Last name"),
            country: Joi.number().integer().required().label("Country"),
            state: Joi.number().integer().required().label("State"),
            city: Joi.number().integer().required().label("City")
        });

        // validate request body against schema
        const { error } = schema.validate(body, options);

        if (error) {
            let errors = [];
            error.details.forEach((err) => {
                let message = err.message.replace(/["']/g, "");
                errors.push(message);
                //errors.push(err.context.label);
            });
            return res.json(apiResponse(HttpStatus.NO_CONTENT, errors.join(', '), {}, false));
        } else {
            next();
        }
    } catch (error) {
        return res.json(apiResponse(HttpStatus.EXPECTATION_FAILED, error.message, {}, false));
    }
}