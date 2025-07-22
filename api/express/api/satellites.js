const express = require("express")
const app = express()
app.use(express.json())

module.exports.setApp = function (app, client) {
  app.post("/api/proxy-update-user-satellites", async (req, res) => {
    try {
      const { user_location, max_distance_km } = req.body

      if (!user_location || typeof max_distance_km !== "number") {
        return res.status(400).json({
          error: "Missing or invalid user_location or max_distance_km",
        })
      }

      const response = await axios.post(
        "http://localhost:5001/update-user-satellites",
        {
          user_location,
          max_distance_km,
        }
      )

      res.json(response.data)
    } catch (error) {
      console.error("Error calling update-user-satellites:", error.message)
      res.status(500).send("Failed to update user satellites")
    }
  })
}
