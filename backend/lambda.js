require("dotenv").config();
const serverless = require("serverless-http");
const app = require("./src/app");
const { inicializar } = require("./src/models/database");

let dbReady = null;

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!dbReady) {
    dbReady = inicializar();
  }
  await dbReady;

  return serverless(app)(event, context);
};
