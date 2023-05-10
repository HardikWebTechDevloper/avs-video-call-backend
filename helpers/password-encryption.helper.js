const bcrypt = require('bcrypt');
const saltOrRounds = 10;

module.exports.encryptPassword = async (password) => {
    const hash = await bcrypt.hash(password, saltOrRounds);
    return hash;
}

module.exports.validatePassword = async (password, hash) => {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
}