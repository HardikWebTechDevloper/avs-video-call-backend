'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GroupChatAttachments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  GroupChatAttachments.init({
    groupMessageId: DataTypes.INTEGER,
    attachment: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'GroupChatAttachments',
  });
  return GroupChatAttachments;
};