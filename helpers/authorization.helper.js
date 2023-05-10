const jwt = require('jsonwebtoken');
const constant = require('../config/constant');
const { apiResponse } = require('./apiResponse.helper');
const HttpStatus = require('../config/httpStatus');

module.exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.json(apiResponse(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing token", {}, false));
    }

    jwt.verify(token, constant.JWT_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.json(apiResponse(HttpStatus.FORBIDDEN, "Unauthorized: Invalid token", {}, false));
        }
        req.user = user;
        next();
    });
}
