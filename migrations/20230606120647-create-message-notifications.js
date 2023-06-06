'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MessageNotifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      chatMessageId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ChatMessages',
          key: 'id',
        },
      },
      groupMessageId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'GroupMessages',
          key: 'id',
        },
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      isReadAt: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.dropTable('MessageNotifications');
  }
};