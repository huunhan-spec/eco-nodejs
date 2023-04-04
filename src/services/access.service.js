"use strict";

const shopModel = require("../models/shop.model");
const bycrypt = require("bcrypt");
const crypto = require("crypto");
const KeyTokenService = require("./keyToken.service");
const { createTokenPair, verifyJWT } = require("../auth/authUtils");
const { getInfoData } = require("../utils");
const {
  BadRequestError,
  AuthFailureError,
  ForbiddenError,
} = require("../core/error.response");
const { findByEmail } = require("./shop.service");
const RoleShop = {
  SHOP: "SHOP",
  WRITER: "WRITER",
  EDITOR: "EDITOR",
  ADMIN: "ADMIN",
};

class AccessService {
  /**
   *  check Token used
   *
   *
   */
  static handleRefreshTokenV2 = async ({ refreshToken, user, keyStore }) => {
    const { userId, email } = user;
    if (keyStore.refreshTokensUsed.includes(refreshToken)) {
      await KeyTokenService.deleteKeyById(userId);
      throw new ForbiddenError(" Something wrong happend!! Pls relogin");
    }
    if (keyStore.refreshToken !== refreshToken) {
      throw new AuthFailureError(" Shop not registerd");
    }
    const foundShop = await findByEmail({ email });
    if (!foundShop) throw new AuthFailureError(" Shop not registerd");

    const tokens = await createTokenPair(
      { userId, email },
      keyStore.publicKey,
      keyStore.privateKey
    );
    //Update token
    await keyStore.update({
      $set: {
        refreshToken: tokens.refreshToken,
      },
      $addToSet: {
        refreshTokensUsed: refreshToken, // da duoc su dung de lay token oi
      },
    });
    return {
      user,
      tokens,
    };
  };
  static handleRefreshToken = async (refreshToken) => {
    ///Check xem token da duoc su dung chua
    const foundToken = await KeyTokenService.findByRefreshTokenUsed(
      refreshToken
    );
    console.log("foundToken", foundToken);
    if (foundToken) {
      const { userId, email } = await verifyJWT(refreshToken, foundToken);
      /// xoa tat ca token trong keyStore
      await KeyTokenService.deleteKeyById(userId);
      throw new ForbiddenError(" Something wrong happend!! Pls relogin");
    }
    //No

    const holderToken = await KeyTokenService.findByRefreshToken(refreshToken);
    if (!holderToken) throw new AuthFailureError(" Shop not registerd");
    //Verify Token
    console.log("holderToken", holderToken.privateKey);
    const { userId, email } = await verifyJWT(refreshToken, holderToken);
    console.log("[2]--", { userId, email });
    // check UserId
    const foundShop = await findByEmail({ email });
    if (!foundShop) throw new AuthFailureError(" Shop not registerd");
    // create 1 cap moi

    const tokens = await createTokenPair(
      { userId, email },
      holderToken.publicKey,
      holderToken.privateKey
    );
    //Update token
    await holderToken.update({
      $set: {
        refreshToken: tokens.refreshToken,
      },
      $addToSet: {
        refreshTokensUsed: refreshToken, // da duoc su dung de lay token oi
      },
    });
    return {
      user: { userId, email },
      tokens,
    };
  };
  static logout = async ({ keyStore }) => {
    const delKey = await KeyTokenService.removeKeyById(keyStore._id);
    console.log({ delKey });
    return delKey;
  };
  /*
   *
   * 1 - Check email in dbs
   * 2 - match password
   * 3 - create AT vs RT and Save
   * 4 - generate tokens
   * 5 - get data return login
   */

  static login = async ({ email, password }) => {
    console.log("email", email);
    //1.
    const foundShop = await findByEmail({ email });
    if (!foundShop) throw new BadRequestError("Shop not registered");
    //2.
    const match = bycrypt.compare(password, foundShop.password);
    if (!match) throw new AuthFailureErrorder("Authentication Error");

    //3. Create Privatekey , public Key
    const privateKey = crypto.randomBytes(64).toString("hex");
    const publicKey = crypto.randomBytes(64).toString("hex");

    //4 generate Token
    const tokens = await createTokenPair(
      {
        userId: foundShop._id,
        email,
      },
      publicKey,
      privateKey
    );
    await KeyTokenService.createKeyToken({
      userId: foundShop._id,
      publicKey,
      privateKey,
      refreshToken: tokens.refreshToken,
    });
    return {
      shop: getInfoData({
        object: foundShop,
        fields: ["_id", "name", "email"],
      }),
      tokens,
    };
  };

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
      const privateKey = crypto.randomBytes(32).toString("hex");
      const publicKey = crypto.randomBytes(32).toString("hex");
      const keyStore = await KeyTokenService.createKeyToken({
        userId: newShop._id,
        publicKey,
        privateKey,
      });

      if (!keyStore) {
        /// throw new BadRequestError(Error: Shop alread registerd)
        return {
          code: "XXXX",
          message: "Key Store Error",
        };
      }
      console.log("keyStore", keyStore);
      const tokens = await createTokenPair(
        {
          userId: newShop._id,
          email,
        },
        publicKey,
        privateKey
      );
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
