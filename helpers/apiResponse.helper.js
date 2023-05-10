module.exports.apiResponse = (statusCode, message, data, status = false) => {
    return { statusCode, message, data, success: status };
}