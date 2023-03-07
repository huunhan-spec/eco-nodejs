"use strict";

const shopModel = require("../models/shop.model");
const bycrypt = require("bcrypt");
const crypto = require("crypto");
const KeyTokenService = require("./keyToken.service");
const { createTokenPair } = require("../auth/authUtils");
const { getInfoData } = require("../utils");
const { BadRequestError } = require("../core/error.response");
const RoleShop = {
  SHOP: "SHOP",
  WRITER: "WRITER",
  EDITOR: "EDITOR",
  ADMIN: "ADMIN",
};

class AccessService {
  static signUp = async ({ name, email, password }) => {
    ///step1: check email exists
    const holderShop = await shopModel.findOne({ email }).lean();
    if (holderShop) {
      throw new BadRequestError("Error: Shop already registered");
    }
    const passwordHash = await bycrypt.hash(password, 10);
    const newShop = await shopModel.create({
      name,
      email,
      password: passwordHash,
      roles: [RoleShop.SHOP],
    });
    if (newShop) {
      //created Private Key , Public Key
      // thuật toán bất đố xứng
      const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 4086,
        publicKeyEncoding: {
          type: "pkcs1",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs1",
          format: "pem",
        },
      });
      // const privateKey = crypto.getRandomValues(64).toString("hex");
      // const publicKey = crypto.getRandomValues(64).toString("hex");

      console.log({ privateKey, publicKey }); /// save collection keyStore
      const publicKeyString = await KeyTokenService.createKeyToken({
        userId: newShop._id,
        publicKey,
      });
      if (!publicKeyString) {
        throw new BadRequestError("publickKeyString error");

        // return {
        //   code: "xxx",
        //   message: "publickKeyString error",
        // };
      }
      /** Get public Key from DB
       *  Use crypto convert it to normal key
       */
      const publicKeyObject = crypto.createPublicKey(publicKeyString);
      console.log("publicKeyString :::", publicKeyObject);
      ///created token pair
      const tokens = await createTokenPair(
        {
          userId: newShop._id,
          email,
        },
        publicKeyObject,
        privateKey
      );
      console.log(`Created Token Success ::`, tokens);
      return {
        code: 201,
        metadata: {
          shop: getInfoData({
            object: newShop,
            fields: ["_id", "name", "email"],
          }),
          tokens,
        },
      };
    }
    return {
      code: 200,
      metadata: null,
    };
  };
}
module.exports = AccessService;
