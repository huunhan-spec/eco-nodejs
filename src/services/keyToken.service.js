"use strict";
const keytokenModel = require("../models/keytoken.model");

const { Types } = require("mongoose");
class KeyTokenService {
  static createKeyToken = async ({
    userId,
    publicKey,
    privateKey,
    refreshToken,
  }) => {
    try {
      // level 0
      ///publicKey sinh ra bởi thuật toán bất đối xứng => type Buffer => need convert to String
      // const publickeyString = publicKey.toString();
      // const tokens = await keytokenModel.create({
      //   user: userId,
      //   publicKey: publickeyString,
      // });
      // console.log("tokens ::: ", tokens);

      // const tokens = await keytokenModel.create({
      //   user: userId,
      //   publicKey,
      //   privateKey,
      // });
      //level XXX
      const filter = { user: userId },
        update = {
          publicKey,
          privateKey,
          refreshTokensUsed: [],
          refreshToken,
        },
        options = { upsert: true, new: true };
      const tokens = await keytokenModel.findOneAndUpdate(
        filter,
        update,
        options
      );
      return tokens ? tokens.publicKey : null;
    } catch (error) {
      return error;
    }
  };
  static findUserId = async (userId) => {
    return await keytokenModel.findOne({ user: Types.ObjectId(userId) });
  };
  static removeKeyById = async (id) => {
    return await keytokenModel.remove(id);
  };
  static findByRefreshTokenUsed = async (refreshToken) => {
    return await keytokenModel.findOne({ refreshTokensUsed: refreshToken });
  };
  static findByRefreshToken = async (refreshToken) => {
    return await keytokenModel.findOne({ refreshToken });
  };
  static deleteKeyById = async (userId) => {
    return await keytokenModel.deleteOne({
      user: Types.ObjectId(userId),
    });
  };
}
module.exports = KeyTokenService;
