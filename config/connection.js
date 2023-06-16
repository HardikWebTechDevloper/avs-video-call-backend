const Sequelize = require('sequelize');
const constant = require('./constant');
const env = constant.NODE_ENV || 'test';
const config = require(__dirname + '/../config/config.json')[env];

module.exports.connection = async () => {
    const sequelize = new Sequelize({
        dialect: 'postgres',
        host: config.host,
        username: config.username,
        password: config.password,
        database: config.database,
        port: 5432,
        logging: false, // set to true if you want to see the SQL queries
    });

    return sequelize;
};