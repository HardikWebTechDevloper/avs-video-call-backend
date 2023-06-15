'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class state extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  state.init({
    state_id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    state_name: { type: DataTypes.STRING, allowNull: false },
    country_id: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE },
  }, {
    sequelize,
    tableName : 'state',
    modelName: 'state',
  });
  return state;
};