const { MongoClient } = require("mongodb");

const url = process.env.DB_URL;
let client;

async function connectDB() {
  if (!client) {
    client = await new MongoClient(url).connect();
  }
  return client;
}

module.exports = { connectDB };
