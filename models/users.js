'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

      User.hasOne(models.GroupMessageReadStatuses, { foreignKey: 'id' });
      User.hasOne(models.GroupMembers, { foreignKey: 'id' });
      User.hasMany(models.ChatMessages, { foreignKey: 'senderId', as: 'sentMessages' });
      User.hasMany(models.ChatMessages, { foreignKey: 'receiverId', as: 'receivedMessages' });
      User.hasMany(models.MessageNotifications, { foreignKey: 'userId' });
      User.hasOne(models.Groups, { foreignKey: 'createdBy' });
      User.belongsTo(models.country, { foreignKey: 'country_id', as: 'country' });
      User.belongsTo(models.state, { foreignKey: 'state_id', as: 'state' });
      User.belongsTo(models.city, { foreignKey: 'city_id', as: 'city' });
    }
  }
  User.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    sex: { type: DataTypes.INTEGER, allowNull: false },
    date_of_birth: { type: DataTypes.DATEONLY, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.TEXT },
    profilePicture: { type: DataTypes.TEXT },
    country_id: { type: DataTypes.INTEGER, allowNull: false },
    state_id: { type: DataTypes.INTEGER, allowNull: false },
    city_id: { type: DataTypes.INTEGER, allowNull: false },
    isActive: { type: DataTypes.INTEGER },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE },
  }, {
    sequelize,
    tableName: 'Users',
    modelName: 'Users',
  });
  return User;
};