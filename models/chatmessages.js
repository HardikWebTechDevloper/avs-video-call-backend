'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ChatMessages extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      ChatMessages.belongsTo(models.Users, {
        foreignKey: 'senderId',
      });
      ChatMessages.belongsTo(models.Users, {
        foreignKey: 'receiverId',
      });
      ChatMessages.belongsTo(models.ChatMessages, {
        foreignKey: 'replyChatMessageId',
      });
    }
  }
  ChatMessages.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    senderId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    receiverId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    message: DataTypes.TEXT,
    attachment: DataTypes.TEXT,
    replyChatMessageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'ChatMessages', key: 'id', as: 'id' } },
    isEdited: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ChatMessages',
  });
  return ChatMessages;
};