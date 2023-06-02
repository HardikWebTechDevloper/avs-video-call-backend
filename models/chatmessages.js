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
      ChatMessages.belongsTo(models.Users, { foreignKey: 'senderId', as: 'sender' });
      ChatMessages.belongsTo(models.Users, { foreignKey: 'receiverId', as: 'receiver' });
      ChatMessages.belongsTo(models.ChatMessages, { foreignKey: 'replyChatMessageId', as: 'replyMessage' });
    }
  }
  ChatMessages.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    senderId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    receiverId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    message: { type: DataTypes.TEXT, allowNull: true },
    attachment: { type: DataTypes.TEXT, allowNull: true },
    replyChatMessageId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'ChatMessages', key: 'id', as: 'id' } },
    isEdited: DataTypes.INTEGER,
    isForwarded: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ChatMessages',
  });
  return ChatMessages;
};