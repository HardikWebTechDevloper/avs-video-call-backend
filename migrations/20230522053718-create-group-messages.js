'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GroupMessages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      groupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Groups',
          key: 'id',
        },
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      attachment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      replyGroupMessagesId: {
        allowNull: true,
        type: Sequelize.INTEGER,
        references: {
          model: 'GroupMessages',
          key: 'id',
        },
      },
      isForwarded: {
        type: Sequelize.BOOLEAN, 
        defaultValue: false
      },
      isNotification: {
        type: Sequelize.BOOLEAN, 
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('GroupMessages');
  }
};