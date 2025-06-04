const fs = require("fs")
const axios = require("axios")
const FormData = require("form-data")
const multer = require("multer")

const upload = multer({ dest: "uploads/" })

module.exports.setApp = function (app, client) {
  app.post("/api/proxy-detect", upload.single("image"), async (req, res) => {
    try {
      const confidence = 0.5
      const iou = 0.3

      const form = new FormData()
      form.append("image", fs.createReadStream(req.file.path))
      form.append("confidence", confidence)
      form.append("iou", iou)

      const response = await axios.post(
        "http://localhost:5001/detect-and-annotate",
        form,
        {
          headers: form.getHeaders(),
          responseType: "stream",
        }
      )

      res.set("Content-Type", "image/jpeg")
      response.data.pipe(res)
    } catch (error) {
      console.error("Error calling Python API:", error.message)
      res.status(500).send("Error processing image")
    } finally {
      fs.unlink(req.file.path, () => {})
    }
  })

  app.post(
    "/api/proxy-box-corners",
    upload.single("image"),
    async (req, res) => {
      try {
        const confidence = 0.5
        const iou = 0.3

        const form = new FormData()
        form.append("image", fs.createReadStream(req.file.path))
        form.append("confidence", confidence)
        form.append("iou", iou)

        const response = await axios.post(
          "http://localhost:5001/bounding-box-corners",
          form,
          {
            headers: form.getHeaders(),
          }
        )

        res.json(response.data)
      } catch (error) {
        console.error(
          "Error calling Python API for box corners:",
          error.message
        )
        res.status(500).send("Error retrieving box corners")
      } finally {
        fs.unlink(req.file.path, () => {})
      }
    }
  )
}
