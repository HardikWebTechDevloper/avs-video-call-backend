'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GroupMessages extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      GroupMessages.belongsTo(models.Users, {
        foreignKey: 'userId',
      });
      GroupMessages.belongsTo(models.Groups, {
        foreignKey: 'id',
      });
      GroupMessages.belongsTo(models.GroupMessages, {
        foreignKey: 'replyGroupMessagesId',
        as: 'groupReplyMessage'
      });
    }
  }
  GroupMessages.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    groupId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Groups', key: 'id', as: 'id' } },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    message: { type: DataTypes.TEXT, allowNull: true },
    attachment: { type: DataTypes.TEXT, allowNull: true },
    replyGroupMessagesId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'GroupMessages', key: 'id', as: 'id' } },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE },
  }, {
    sequelize,
    modelName: 'GroupMessages',
  });
  return GroupMessages;
};