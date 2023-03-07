const compression = require("compression");
const express = require("express");
const { default: helmet } = require("helmet");
const morgan = require("morgan");
const app = express();
require("dotenv").config();
//init middlewares

app.use(morgan("dev"));
app.use(helmet());
app.use(compression());
app.use(express.text());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// init db
require("./dbs/init.mongodb");
const { checkOverload } = require("./helpers/check.connect");
// checkOverload();

// init router
app.use("", require("./routes"));
/// handling error
/// Cant find Any route
app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  console.log("Qua");
  next(error);
});
app.use((error, req, res, next) => {
  const status = error.status || 500;
  return res.status(status).json({
    status: "error",
    code: status,
    message: error.message || "Internal Server Error",
  });
});

module.exports = app;
