'use strict';
const Sequelize = require('sequelize'); 
const { Model} = require('sequelize'); 
const constant = require('../config/constant');

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
      ChatMessages.hasOne(models.MessageNotifications, { foreignKey: 'chatMessageId' });
    }
  }
  ChatMessages.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    senderId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    receiverId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id', as: 'id' } },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      // get() {
      //   const encryptedValue = this.getDataValue('encryptedMessage');
      //   console.log(encryptedValue);

      //   // Decrypt the value using decryption logic (e.g., using pgp_sym_decrypt)
      //   if (encryptedValue && encryptedValue != undefined) {
      //     const decryptedValue = pgp_sym_decrypt(encryptedValue);
      //     return decryptedValue;
      //   } else {
      //     return null;
      //   }
      // },
      // set(value) {
      //   console.log("value>>>>>>>>>", value);
      //   // Encrypt the value using encryption logic (e.g., using pgp_sym_encrypt)
      //   if (value && value != null) {
      //     const encryptedValue = pgp_sym_encrypt(value);
      //     this.setDataValue('encryptedMessage', encryptedValue);
      //   }
      // }
    },
    attachment: { type: DataTypes.TEXT, allowNull: true },
    replyChatMessageId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'ChatMessages', key: 'id', as: 'id' } },
    isEdited: DataTypes.INTEGER,
    isForwarded: { type: DataTypes.BOOLEAN, defaultValue: false },
    isReceiverRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    receiverReadAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ChatMessages',
  });

  async function pgp_sym_encrypt(value) {
    try {
      console.log("value>>>>>>>>>>>>>>>");
      // Example: Use pgcrypto extension in PostgreSQL
      const encryptedValue = `CREATE EXTENSION IF NOT EXISTS pgcrypto;
                            SELECT pgp_sym_encrypt('${value}', '${constant.JWT_TOKEN_SECRET}') AS encrypted_value;`;
      console.log(encryptedValue);
      const [results, metadata] = await sequelize.query(encryptedValue, { type: Sequelize.QueryTypes.SELECT });
      console.log("results------------------------", results, metadata);
      return results;
    } catch (error) {
      console.error('Error executing query::::::::', error);
    }
  }

  async function pgp_sym_decrypt(encryptedValue) {
    // Example: Use pgcrypto extension in PostgreSQL
    const decryptedValue = `SELECT pgp_sym_decrypt('${encryptedValue}', '${constant.JWT_TOKEN_SECRET}') AS decrypted_value;`;
    const [results] = await sequelize.query(decryptedValue, { type: Sequelize.QueryTypes.SELECT });
    console.log("pgp_sym_decrypt>>>>>>", results, results[0].encrypted_value);
    return results[0].decrypted_value;
  }

  return ChatMessages;
};