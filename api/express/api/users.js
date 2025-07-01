require("express")
require("mongodb")
const { ObjectId } = require("mongodb")
require("dotenv").config()
const crypto = require("crypto")
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")

const saltRounds = 10
// Change this to domain which API is running on
const appName = "134.199.204.181:3000"

const sgMail = require("@sendgrid/mail")
sgMail.setApiKey(process.env.SEND_GRID_API)

function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateToken() {
  return crypto.randomBytes(16).toString("hex")
}

module.exports.setApp = function (app, client) {
  // Login API
  app.post("/api/login", async (req, res) => {
    let id = -1
    let email = ""
    let username = ""
    let error = ""
    const login = req.body.login
    const password = req.body.password
    let db

    try {
      db = client.db("app")
      resultsUsername = await db
        .collection("users")
        .find({ username: login })
        .toArray()
      resultsEmail = await db
        .collection("users")
        .find({ email: login })
        .toArray()
    } catch (e) {
      error = e.toString
      let ret = {
        id: id,
        email: email,
        username: username,
        error: error,
      }
      return res.status(500).json(ret)
    }

    if (resultsUsername.length > 0) {
      //Login matched a user's username
      const match = await bcrypt.compare(password, resultsUsername[0].password)
      if (match) {
        //Password matched
        isVerified = resultsUsername[0].isVerified
        if (!isVerified) {
          error = "User is not verified"
          let ret = {
            id: id,
            email: email,
            username: username,
            error: error,
          }
          return res.status(403).json(ret)
        }
        id = resultsUsername[0]._id
        email = resultsUsername[0].email
        username = resultsUsername[0].username
        let ret = {
          id: id,
          email: email,
          username: username,
          error: error,
        }
        return res.status(200).json(ret)
      } else {
        //Password did not match
        error = "password is wrong"
        let ret = {
          id: id,
          email: email,
          username: username,
          error: error,
        }
        return res.status(401).json(ret)
      }
    } else if (resultsEmail.length > 0) {
      //Login matched a user's email
      const match = await bcrypt.compare(password, resultsEmail[0].password)
      if (match) {
        //Password matched
        isVerified = resultsEmail[0].isVerified
        if (!isVerified) {
          error = "User is not verified"
          let ret = {
            id: id,
            email: email,
            username: username,
            error: error,
          }
          return res.status(403).json(ret)
        }
        id = resultsEmail[0]._id
        confirmation = resultsEmail[0].confirmation
        email = resultsEmail[0].email
        username = resultsEmail[0].username
        let ret = {
          id: id,
          email: email,
          username: username,
          error: error,
        }
        return res.status(200).json(ret)
      } else {
        //Password did not match
        error = "password is wrong"
        let ret = {
          id: id,
          email: email,
          username: username,
          error: error,
        }
        return res.status(401).json(ret)
      }
    } else {
      //Login did not match any user
      error = "Login did not match any user"
      let ret = {
        id: id,
        email: email,
        username: username,
        error: error,
      }
      return res.status(404).json(ret)
    }
  })

  // Register API
  app.post("/api/register", async (req, res) => {
    const { email, username, password } = req.body
    let error = ""
    let db

    try {
      db = client.db("app")

      // Check if email or username already exists
      const existingUsername = await db
        .collection("users")
        .findOne({ username })
      const existingEmail = await db.collection("users").findOne({ email })

      if (existingUsername) {
        error = "Username is already taken"
        return res.status(409).json({ id: -1, email: "", username: "", error })
      }

      if (existingEmail) {
        error = "Email is already registered"
        return res.status(409).json({ id: -1, email: "", username: "", error })
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds)
      const verificationCode = generate6DigitCode()
      const verificationToken = generateToken()

      // Insert new user
      const result = await db.collection("users").insertOne({
        email,
        username,
        password: hashedPassword,
        isVerified: false,
        verifyCode: verificationCode,
        verifyToken: verificationToken,
      })

      const verifyLink = appName + `/api/verify-link/${verificationToken}`

      const msg = {
        to: email,
        subject: "Verify your email",
        html: `
                  <h3>Welcome to the app!</h3>
                  <p>Click <a href="${verifyLink}">here</a> to verify your email.</p>
                  <p>Or use this 6-digit code in the mobile app: <strong>${verificationCode}</strong></p>
                `,
      }

      sgMail
        .send(msg)
        .then(() => {
          console.log("Email sent")
        })
        .catch((error) => {
          console.error(error)
        })

      const resultId = result.insertedId

      return res.status(201).json({
        id: resultId,
        email: email,
        username: username,
        error: "",
      })
    } catch (e) {
      console.error(e)
      error = e.toString()
      return res.status(500).json({ id: -1, email: "", username: "", error })
    }
  })

  // Verify User (6 digit)
  app.post("/api/verify-code", async (req, res) => {
    const { username, code } = req.body

    try {
      const db = client.db("app")
      const user = await db
        .collection("users")
        .findOne({ username: username, verifyCode: code })

      if (!user) {
        return res.status(400).json({ error: "Invalid code" })
      }

      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: { isVerified: true },
          $unset: { verifyToken: "", verifyCode: "" },
        }
      )

      res.status(200).json({ message: "Email verified successfully" })
    } catch (e) {
      console.error(e)
      res.status(500).json({
        error: `Server error during verification, error: ${e}`,
      })
    }
  })

  // Verify User (URL)
  app.get("/api/verify-link/:token", async (req, res) => {
    const { token } = req.params

    try {
      const db = client.db("app")
      const user = await db.collection("users").findOne({ verifyToken: token })

      if (!user) {
        return res.status(400).send("Invalid verification token")
      }

      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: { isVerified: true },
          $unset: { verifyToken: "", verifyCode: "" },
        }
      )

      res.send("Email verified successfully!")
    } catch (e) {
      console.error(e)
      res.status(500).send({
        error: `Server error during verification, error: ${e}`,
      })
    }
  })

  // Resend Email Verification
  app.post("/api/resend-verification", async (req, res) => {
    const { login } = req.body

    try {
      const db = client.db("app")
      let user = await db.collection("users").findOne({ email: login })
      if (!user) {
        user = await db.collection("users").findOne({ username: login })
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" })
      }

      if (user.isVerified) {
        return res.status(400).json({ error: "User is already verified" })
      }

      const newCode = generate6DigitCode()
      const newToken = generateToken()

      // Update user with new code/token
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            verifyCode: newCode,
            verifyToken: newToken,
          },
        }
      )

      const verifyLink = appName + `/api/verify-link/${newToken}`

      const msg = {
        to: user.email,
        subject: "Resend Email Verification",
        html: `
                    <h3>Verify your email</h3>
                    <p>Click <a href="${verifyLink}">here</a> to verify your email.</p>
                    <p>Or use this 6-digit code in the mobile app: <strong>${newCode}</strong></p>
                `,
      }
      sgMail
        .send(msg)
        .then(() => {
          console.log("Email sent")
        })
        .catch((error) => {
          console.error(error)
        })
    } catch (e) {
      console.error(e)
      return res
        .status(500)
        .json({ error: `Server error during resend, error: ${e}` })
    }
  })

  // Forgot Password (Send a link)
  app.post("/api/forgot-password-email", async (req, res) => {
    const { email } = req.body

    try {
      const db = client.db("app")
      const user = await db.collection("users").findOne({ email })

      if (!user) {
        return res.status(404).json({ error: "User not found" })
      }

      const resetCode = generate6DigitCode()
      const codeExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 min expiry

      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            resetCode,
            resetCodeExpires: codeExpires,
          },
        }
      )

      const msg = {
        to: email,
        subject: "Your Password Reset Code",
        html: `
                    <h3>Reset Your Password</h3>
                    <p>Use the following code to reset your password in the mobile app:</p>
                    <h2>${resetCode}</h2>
                    <p>This code expires in 10 minutes.</p>
                `,
      }

      sgMail
        .send(msg)
        .then(() => {
          console.log("Email sent")
        })
        .catch((error) => {
          console.error(error)
        })

      res.status(200).json({ message: "Reset code sent to email" })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: `Error sending reset code: ${e}` })
    }
  })

  // Forgot Password (Process)
  app.post("/api/forgot-password-process", async (req, res) => {
    const { email, code, newPassword } = req.body

    try {
      const db = client.db("app")
      const userEmail = await db.collection("users").findOne({
        email,
      })

      if (!userEmail) {
        return res.status(404).json({ error: "User not found" })
      }

      const user = await db.collection("users").findOne({
        email,
        resetCode: code,
        resetCodeExpires: { $gt: new Date() },
      })

      if (!user) {
        return res.status(403).json({ error: "Invalid or expired reset code" })
      }

      const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: { password: hashedPassword },
          $unset: { resetCode: "", resetCodeExpires: "" },
        }
      )

      res.status(200).json({
        message: "Password has been reset successfully",
      })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: `Error resetting password: ${e}` })
    }
  })

  // Get User API
  app.get("/api/users/:userId", async (req, res, next) => {
    let userId = req.params.userId
    let error = ""
    let db

    try {
      db = client.db("app")

      // Convert userId string to ObjectId
      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(userId) })

      if (!user) {
        error = "User not found"
        return res.status(404).json({ id: -1, email: "", username: "", error })
      }

      // Return user info
      return res.status(200).json({
        id: user._id,
        email: user.email,
        username: user.username,
        error: "",
      })
    } catch (e) {
      console.error(e)
      error = "Invalid user ID or server error"
      return res.status(500).json({ id: -1, email: "", username: "", error })
    }
  })

  // Update User API
  app.put("/api/users/:userId", async (req, res) => {
    const userId = req.params.userId
    const db = client.db("app")
    const updateData = req.body

    try {
      const allowedFields = ["email", "username", "password"]
      const filteredUpdate = {}

      // Only pick allowed fields from body
      for (const key of allowedFields) {
        if (updateData[key]) {
          filteredUpdate[key] = updateData[key]
        }
      }

      if (Object.keys(filteredUpdate).length === 0) {
        return res
          .status(400)
          .json({ error: "No valid fields provided for update" })
      }

      // Check if email is being changed and already exists
      if (filteredUpdate.email) {
        const emailExists = await db.collection("users").findOne({
          email: filteredUpdate.email,
          _id: { $ne: new ObjectId(userId) }, // Exclude current user
        })
        if (emailExists) {
          return res.status(409).json({
            error: "Email is already in use by another user",
          })
        }
      }

      // Check if username is being changed and already exists
      if (filteredUpdate.username) {
        const usernameExists = await db.collection("users").findOne({
          username: filteredUpdate.username,
          _id: { $ne: new ObjectId(userId) },
        })
        if (usernameExists) {
          return res.status(409).json({ error: "Username is already taken" })
        }
      }

      // Hash password if being updated
      if (filteredUpdate.password) {
        filteredUpdate.password = await bcrypt.hash(
          filteredUpdate.password,
          saltRounds
        )
      }

      const result = await db
        .collection("users")
        .updateOne({ _id: new ObjectId(userId) }, { $set: filteredUpdate })

      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ error: "User not found or nothing updated" })
      }

      res.status(200).json({ message: "User updated successfully" })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: `Failed to update user: ${e}` })
    }
  })

  // Delete User API
  app.delete("/api/users/:userId", async (req, res) => {
    const userId = req.params.userId

    try {
      const db = client.db("app")
      const result = await db
        .collection("users")
        .deleteOne({ _id: new ObjectId(userId) })

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      res.status(200).json({ message: "User deleted successfully" })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: `Failed to delete user: ${e}` })
    }
  })
}
