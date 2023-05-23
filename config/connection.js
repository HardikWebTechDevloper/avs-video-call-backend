const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'config';
const config = require(__dirname + '/../config/config.json')[env];

console.log("Connection config:::::", config);

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