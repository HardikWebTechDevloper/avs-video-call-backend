'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.createTable('Users', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        firstName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        lastName: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        sex: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        date_of_birth: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        password: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        profilePicture: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        notificationSound: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        isShowAge: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        country_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        state_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        city_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        isActive: {
          type: Sequelize.INTEGER,
          defaultValue: 1
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    } catch (error) {
      console.log("Error", error);
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};