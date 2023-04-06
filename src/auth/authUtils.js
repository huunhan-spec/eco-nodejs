"use strict";
const JWT = require("jsonwebtoken");
const { AuthFailureError, NotFoundError } = require("../core/error.response");
const { findUserId } = require("../services/keyToken.service");
const asyncHandler = require("../helpers/asyncHandler");
const HEADER = {
  API_KEY: "x-api-key",
  CLIENT_ID: "x-client-id",
  AUTHORIZATION: "authorization",
  REFRESHTOKEN: "x-rtoken-id",
};
const createTokenPair = async (payload, publicKey, privateKey) => {
  try {
    // accessToken
    const accessToken = JWT.sign(payload, privateKey, {
      expiresIn: "2 days",
    });
    const refreshToken = JWT.sign(payload, privateKey, {
      expiresIn: "7 days",
    });

    // JWT.verify(accessToken, publicKey, (err, decode) => {
    //   if (err) {
    //     console.error(`Error verify::`, err);
    //   } else {
    //     console.log("decode verify::", decode);
    //   }
    // });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
  }
};

const authentication = asyncHandler(async (req, res, next) => {
  /**
   * 1-Check userId missing ???
   * 2-Get accessToken
   * 3-Verify Token
   * 4-Check User in bds
   * 5-Check keystore with the userId?
   * 6 Ok all => return next()
   */

  const userId = req.headers[HEADER.CLIENT_ID];
  console.log("userId", userId);
  if (!userId) throw new AuthFailureError("Invalid Request");

  //2
  const keyStore = await findUserId(userId);
  console.log("keyStore", keyStore);
  if (!keyStore) throw new NotFoundError("Not found keyStore");

  //3
  const accessToken = req.headers[HEADER.AUTHORIZATION];
  if (!accessToken) throw new AuthFailureError("Invalid Request");

  try {
    const decodeUser = JWT.verify(accessToken, keyStore.privateKey);
    if (userId !== decodeUser.userId)
      throw new AuthFailureError("Invalid UserId");
    req.keyStore = keyStore;
    return next();
  } catch (error) {
    console.log("error", error);
    return error;
  }
});

const authenticationV2 = asyncHandler(async (req, res, next) => {
  /**
   * 1-Check userId missing ???
   * 2-Get accessToken
   * 3-Verify Token
   * 4-Check User in bds
   * 5-Check keystore with the userId?
   * 6 Ok all => return next()
   */

  const userId = req.headers[HEADER.CLIENT_ID];
  if (!userId) throw new AuthFailureError("Invalid Request");

  //2
  const keyStore = await findUserId(userId);
  console.log("keyStore", keyStore);
  if (!keyStore) throw new NotFoundError("Not found keyStore");

  //3

  if (req.headers[HEADER.REFRESHTOKEN]) {
    try {
      const refreshToken = req.headers[HEADER.REFRESHTOKEN];
      const decodeUser = JWT.verify(refreshToken, keyStore.privateKey);
      if (userId !== decodeUser.userId)
        throw new AuthFailureError("Invalid UserId");
      req.keyStore = keyStore;
      req.user = decodeUser;
      req.refreshToken = refreshToken;
      return next();
    } catch (error) {}
  }
  const accessToken = req.headers[HEADER.AUTHORIZATION];
  if (!accessToken) throw new AuthFailureError("Invalid Request");

  try {
    const decodeUser = JWT.verify(accessToken, keyStore.privateKey);
    if (userId !== decodeUser.userId)
      throw new AuthFailureError("Invalid UserId");
    req.keyStore = keyStore;
    req.user = decodeUser;

    return next();
  } catch (error) {
    console.log("error", error);
    return error;
  }
});
const verifyJWT = async (token, keySecret) => {
  return JWT.verify(token, keySecret.privateKey);
};
module.exports = {
  createTokenPair,
  authentication,
  verifyJWT,
  authenticationV2,
};
