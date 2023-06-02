'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Groups extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      Groups.hasMany(models.GroupMembers, { foreignKey: 'groupId' });
      Groups.hasMany(models.GroupMessages, { foreignKey: 'groupId' });
    }
  }
  Groups.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: true },
    icon: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE },
  }, {
    sequelize,
    tableName: 'Groups',
    modelName: 'Groups',
  });
  return Groups;
};