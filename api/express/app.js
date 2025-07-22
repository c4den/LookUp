const express = require("express")
require("dotenv").config()
const path = require("path")

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
const PORT = process.env.PORT || 3000

const url = process.env.MONGODB_URI
const MongoClient = require("mongodb").MongoClient
var client
try {
  client = new MongoClient(url)
  client.connect
} catch (e) {
  console.error(e)
}

const detectAPI = require("./api/detect.js")
detectAPI.setApp(app, client)
const usersAPI = require("./api/users.js")
usersAPI.setApp(app, client)
const favoritesAPI = require("./api/favorites.js")
favoritesAPI.setApp(app, client)
const satellitesAPI = require("./api/satellites.js")
satellitesAPI.setApp(app, client)

// previous iteration: app.listen(PORT, () => {)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Express API listening at: ${PORT}`)
})
