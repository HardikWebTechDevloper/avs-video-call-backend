'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserTokens extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  UserTokens.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },

    // 4 - Account Activation, 3 - Reset Password
    tokenType: { type: DataTypes.TEXT, allowNull: false },
    jwtToken: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE },
  }, {
    sequelize,
    modelName: 'UserTokens',
  });
  return UserTokens;
};