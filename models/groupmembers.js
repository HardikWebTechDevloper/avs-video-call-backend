'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GroupMembers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      GroupMembers.belongsTo(models.Users, {
        foreignKey: 'userId',
      })
      GroupMembers.belongsTo(models.Groups, {
        foreignKey: 'id',
      })
    }
  }
  GroupMembers.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    groupId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Groups', key: 'id', as: 'id' } },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE },
  }, {
    sequelize,
    tableName: 'GroupMembers',
    modelName: 'GroupMembers',
  });
  return GroupMembers;
};