"use strict";

const keytokenModel = require("../models/keytoken.model");

class KeyTokenService {
  static createKeyToken = async ({ userId, publicKey }) => {
    try {
      ///publicKey sinh ra bởi thuật toán bất đối xứng => type Buffer => need convert to String
      const publickeyString = publicKey.toString();
      const tokens = await keytokenModel.create({
        user: userId,
        publicKey: publickeyString,
      });
      console.log("tokens ::: ", tokens);
      return tokens ? tokens.publicKey : null;
    } catch (error) {
      return error;
    }
  };
}
module.exports = KeyTokenService;
