'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MessageNotifications extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      MessageNotifications.belongsTo(models.Users, { foreignKey: 'id' });
      MessageNotifications.belongsTo(models.ChatMessages, { foreignKey: 'id' });
      MessageNotifications.belongsTo(models.GroupMessages, { foreignKey: 'id' });
    }
  }
  MessageNotifications.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    chatMessageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'ChatMessages', key: 'id', as: 'id' } },
    groupMessageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'GroupMessages', key: 'id', as: 'id' } },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE },
  }, {
    sequelize,
    modelName: 'MessageNotifications',
  });
  return MessageNotifications;
};