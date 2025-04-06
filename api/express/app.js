const express = require('express');
const path = require('path');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const url = process.env.MONGODB_URI;
const MongoClient = require("mongodb").MongoClient;
var client;
try {
	client = new MongoClient(url);
	client.connect;
} catch (e) {
	console.error(e);
}

const detectProxyAPI = require('./api/detect.js');
detectProxyAPI.setApp(app, client); 

app.listen(PORT, () => {
  console.log(`Express API running at http://localhost:${PORT}`);
});