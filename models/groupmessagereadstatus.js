'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GroupMessageReadStatus extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  GroupMessageReadStatus.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    groupId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Groups', key: 'id', as: 'id' } },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    groupMessageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'GroupMessages', key: 'id', as: 'id' } },
    isReadMessage: { type: DataTypes.BOOLEAN, defaultValue: false },
    messageReadAt: { type: DataTypes.DATE },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE },
  }, {
    sequelize,
    modelName: 'GroupMessageReadStatuses',
  });
  return GroupMessageReadStatus;
};