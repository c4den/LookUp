require("express")
require("mongodb")
const { ObjectId } = require("mongodb")
require("dotenv").config()
const crypto = require("crypto")
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")

const saltRounds = 10
// Change this to domain which API is running on
const appName = "http://134.199.204.181:3000"

const sgMail = require("@sendgrid/mail")
sgMail.setApiKey(process.env.SEND_GRID_API)

function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateToken() {
  return crypto.randomBytes(16).toString("hex")
}

function renderResendForm(message = "", color = "", prefillLogin = "") {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Resend Verification</title>
        <style>
          body {
            background-color: #0b1e3d;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }

          .container {
            background-color: #ffffff;
            padding: 2rem 3rem;
            border-radius: 10px;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 400px;
            width: 100%;
          }

          h2 {
            color: #0b1e3d;
            margin-bottom: 1.5rem;
          }

          input[type="text"] {
            width: 100%;
            padding: 0.75rem;
            margin-bottom: 1rem;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-size: 1rem;
          }

          button {
            width: 100%;
            padding: 0.75rem;
            background-color: #0b1e3d;
            color: white;
            font-size: 1rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
          }

          button:hover {
            background-color: #133c74;
          }

          .status {
            margin-top: 1rem;
            font-size: 0.95rem;
            color: ${color};
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Resend Verification Email</h2>
          <form id="resendForm">
            <input type="text" name="login" placeholder="Email or Username" required value="${prefillLogin}" />
            <button type="submit">Resend Email</button>
          </form>
          <div class="status" id="status">${message}</div>
        </div>

        <script>
          const form = document.getElementById("resendForm");
          const status = document.getElementById("status");

          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const login = formData.get("login");

            const response = await fetch("/api/resend-verification", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ login })
            });

            const result = await response.json();
            if (response.ok) {
              status.innerHTML = "<span style='color: green;'>Verification email sent successfully.</span>";
            } else {
              status.innerHTML = "<span style='color: red;'>" + (result.error || "Something went wrong.") + "</span>";
            }
          });
        </script>
      </body>
    </html>
  `
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
        from: process.env.SEND_GRID_FROM,
        subject: "Verify Your Email",
        html: `
          <div style="background-color:#0b1e3d; padding:40px 20px; font-family:Arial, sans-serif; color:#ffffff; text-align:center;">
            <div style="max-width:500px; margin:0 auto; background-color:#ffffff; color:#000; border-radius:8px; padding:30px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
              <h2 style="color:#0b1e3d; margin-bottom:20px;">Welcome to the App!</h2>
              <p style="font-size:16px; margin-bottom:25px;">Please verify your email to complete your registration.</p>
              <a href="${verifyLink}" 
                 style="display:inline-block; background-color:#0b1e3d; color:#fff; text-decoration:none; padding:12px 24px; border-radius:5px; font-weight:bold;">
                Verify Email
              </a>
              <p style="margin-top:30px; font-size:14px; color:#444;">Or use this 6-digit code in the mobile app:</p>
              <div style="font-size:24px; font-weight:bold; margin:10px 0;">${verificationCode}</div>
              <p style="font-size:13px; color:#777;">This code expires soon, so be sure to use it right away.</p>
            </div>
          </div>
        `,
      }

      sgMail
        .send(msg)
        .then(() => {
          console.log("Email sent")
        })
        .catch((error) => {
          return res
            .status(500)
            .json({ error: `Error during sending reset code: ${e}` })
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
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Invalid Token</title>
                <style>
                  body {
                    background-color: #0b1e3d;
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                  }
          
                  .message-box {
                    background-color: #ffffff;
                    padding: 2rem 3rem;
                    border-radius: 10px;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                    text-align: center;
                    max-width: 400px;
                  }
          
                  h2 {
                    color: #d32f2f;
                    margin-bottom: 1rem;
                  }
          
                  p {
                    font-size: 1rem;
                    color: #333;
                  }
          
                  a {
                    display: inline-block;
                    margin-top: 1.5rem;
                    text-decoration: none;
                    background-color: #0b1e3d;
                    color: #fff;
                    padding: 0.6rem 1.2rem;
                    border-radius: 5px;
                    transition: background-color 0.3s ease;
                  }
          
                  a:hover {
                    background-color: #133c74;
                  }
                </style>
              </head>
              <body>
                <div class="message-box">
                  <h2>Invalid Verification Token</h2>
                  <p>The email verification link is no longer valid or has already been used.</p>
                  <a href="${appName}/resend-verification">Resend Verification Email</a>
                </div>
              </body>
            </html>
          `)
      }

      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: { isVerified: true },
          $unset: { verifyToken: "", verifyCode: "" },
        }
      )

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Password Reset Success</title>
            <style>
              body {
                background-color: #0b1e3d;
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
              }

              .message-box {
                background-color: #ffffff;
                padding: 2rem 3rem;
                border-radius: 10px;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                text-align: center;
                max-width: 400px;
              }

              h2 {
                color: #0b1e3d;
                margin-bottom: 1rem;
              }

              p {
                font-size: 1rem;
                color: #333;
              }

              a {
                display: inline-block;
                margin-top: 1.5rem;
                text-decoration: none;
                background-color: #0b1e3d;
                color: #fff;
                padding: 0.6rem 1.2rem;
                border-radius: 5px;
                transition: background-color 0.3s ease;
              }

              a:hover {
                background-color: #133c74;
              }
            </style>
          </head>
          <body>
            <div class="message-box">
              <h2>Success!</h2>
              <p>Email verified successfully.</p>
            </div>
          </body>
        </html>
      `)
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
        from: process.env.SEND_GRID_FROM,
        subject: "Verify Your Email",
        html: `
          <div style="background-color:#0b1e3d; padding:40px 20px; font-family:Arial, sans-serif; color:#ffffff; text-align:center;">
            <div style="max-width:500px; margin:0 auto; background-color:#ffffff; color:#000; border-radius:8px; padding:30px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
              <h2 style="color:#0b1e3d; margin-bottom:20px;">Verify Your Email</h2>
              <p style="font-size:16px; margin-bottom:25px;">You're almost there! Just verify your email to complete setup.</p>
              <a href="${verifyLink}" 
                 style="display:inline-block; background-color:#0b1e3d; color:#fff; text-decoration:none; padding:12px 24px; border-radius:5px; font-weight:bold;">
                Click to Verify
              </a>
              <p style="margin-top:30px; font-size:14px; color:#444;">Or use this 6-digit code in the mobile app:</p>
              <div style="font-size:24px; font-weight:bold; margin:10px 0;">${newCode}</div>
              <p style="font-size:13px; color:#777;">This code will expire shortly for your security.</p>
            </div>
          </div>
        `,
      }

      sgMail
        .send(msg)
        .then(() => {
          console.log("Email sent")
        })
        .catch((error) => {
          return res
            .status(500)
            .json({ error: `Error during sending mail, error: ${e}` })
        })

      res.status(200).json({ message: "Verification code sent to email" })
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

      const resetToken = generateToken()
      const resetLink = `${appName}/reset-password/${resetToken}`

      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            resetToken,
            resetTokenExpires: new Date(Date.now() + 10 * 60 * 1000),
          },
        }
      )

      const msg = {
        to: email,
        from: process.env.SEND_GRID_FROM,
        subject: "Reset Your Password",
        html: `
          <div style="background-color:#0b1e3d; padding:40px 20px; font-family:Arial, sans-serif; color:#ffffff; text-align:center;">
            <div style="max-width:500px; margin:0 auto; background-color:#ffffff; color:#000; border-radius:8px; padding:30px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
              <h2 style="color:#0b1e3d; margin-bottom:20px;">Reset Your Password</h2>
              <p style="font-size:16px; margin-bottom:25px;">
                Use the code below or click the button to reset your password.
              </p>
              <a href="${resetLink}" 
                 style="display:inline-block; background-color:#0b1e3d; color:#fff; text-decoration:none; padding:12px 24px; border-radius:5px; font-weight:bold;">
                Reset Password
              </a>
              <p style="margin-top:30px; font-size:14px; color:#444;">Your 6-digit reset code:</p>
              <div style="font-size:24px; font-weight:bold; margin:10px 0;">${resetCode}</div>
              <p style="font-size:13px; color:#777;">This code expires in 10 minutes for your security.</p>
            </div>
          </div>
        `,
      }

      sgMail
        .send(msg)
        .then(() => {
          console.log("Email sent")
        })
        .catch((error) => {
          return res
            .status(500)
            .json({ error: `Error during sending reset code: ${e}` })
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

  app.get("/reset-password/:token", async (req, res) => {
    const token = req.params.token

    // Optionally validate token exists
    const db = client.db("app")
    const user = await db.collection("users").findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invalid or Expired Link</title>
              <style>
                body {
                  background-color: #0b1e3d;
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                }
        
                .message-box {
                  background-color: #ffffff;
                  padding: 2rem 3rem;
                  border-radius: 10px;
                  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                  text-align: center;
                  max-width: 400px;
                }
        
                h2 {
                  color: #d32f2f;
                  margin-bottom: 1rem;
                }
        
                p {
                  font-size: 1rem;
                  color: #333;
                }
        
                a {
                  display: inline-block;
                  margin-top: 1.5rem;
                  text-decoration: none;
                  background-color: #0b1e3d;
                  color: #fff;
                  padding: 0.6rem 1.2rem;
                  border-radius: 5px;
                  transition: background-color 0.3s ease;
                }
        
                a:hover {
                  background-color: #133c74;
                }
              </style>
            </head>
            <body>
              <div class="message-box">
                <h2>Link Expired or Invalid</h2>
                <p>Your password reset link is no longer valid. Please request a new one.</p>
                <a href="${appName}/forgot-password">Request New Link</a>
              </div>
            </body>
          </html>
        `)
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reset Password</title>
          <style>
            body {
              background-color: #0b1e3d;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }

            .container {
              background-color: #ffffff;
              padding: 2rem 3rem;
              border-radius: 10px;
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
              width: 100%;
              max-width: 400px;
            }

            h2 {
              margin-bottom: 1.5rem;
              text-align: center;
              color: #0b1e3d;
            }

            label {
              display: block;
              margin-bottom: 0.5rem;
              font-weight: bold;
            }

            input[type="password"] {
              width: 100%;
              padding: 0.75rem;
              margin-bottom: 1rem;
              border: 1px solid #ccc;
              border-radius: 5px;
              font-size: 1rem;
            }

            button {
              width: 100%;
              padding: 0.75rem;
              background-color: #0b1e3d;
              color: white;
              font-size: 1rem;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              transition: background-color 0.3s ease;
            }

            button:hover {
              background-color: #133c74;
            }

            .footer {
              text-align: center;
              margin-top: 1rem;
              font-size: 0.85rem;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Reset Your Password</h2>
            <form action="/api/reset-password/${token}" method="POST">
              <label for="newPassword">New Password</label>
              <input type="password" name="newPassword" id="newPassword" required />
              <button type="submit">Reset Password</button>
            </form>
            <div class="footer">Make sure to choose a strong password.</div>
          </div>
        </body>
      </html>
    `)
  })

  app.post("/api/reset-password/:token", async (req, res) => {
    const { token } = req.params
    const { newPassword } = req.body

    try {
      const db = client.db("app")
      const user = await db.collection("users").findOne({
        resetToken: token,
        resetTokenExpires: { $gt: new Date() },
      })

      if (!user) {
        return res.status(400).send("Reset link is invalid or expired.")
      }

      const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: { password: hashedPassword },
          $unset: { resetToken: "", resetTokenExpires: "" },
        }
      )

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Password Reset Success</title>
            <style>
              body {
                background-color: #0b1e3d;
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
              }

              .message-box {
                background-color: #ffffff;
                padding: 2rem 3rem;
                border-radius: 10px;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                text-align: center;
                max-width: 400px;
              }

              h2 {
                color: #0b1e3d;
                margin-bottom: 1rem;
              }

              p {
                font-size: 1rem;
                color: #333;
              }

              a {
                display: inline-block;
                margin-top: 1.5rem;
                text-decoration: none;
                background-color: #0b1e3d;
                color: #fff;
                padding: 0.6rem 1.2rem;
                border-radius: 5px;
                transition: background-color 0.3s ease;
              }

              a:hover {
                background-color: #133c74;
              }
            </style>
          </head>
          <body>
            <div class="message-box">
              <h2>Success!</h2>
              <p>Your password has been reset successfully.</p>
            </div>
          </body>
        </html>
      `)
    } catch (e) {
      console.error(e)
      res.status(500).send("Server error resetting password.")
    }
  })

  app.get("/forgot-password", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Forgot Password</title>
          <style>
            body {
              background-color: #0b1e3d;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
  
            .container {
              background-color: #ffffff;
              padding: 2rem 3rem;
              border-radius: 10px;
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
              text-align: center;
              max-width: 400px;
              width: 100%;
            }
  
            h2 {
              color: #0b1e3d;
              margin-bottom: 1.5rem;
            }
  
            input[type="email"] {
              width: 100%;
              padding: 0.75rem;
              margin-bottom: 1rem;
              border: 1px solid #ccc;
              border-radius: 5px;
              font-size: 1rem;
            }
  
            button {
              width: 100%;
              padding: 0.75rem;
              background-color: #0b1e3d;
              color: white;
              font-size: 1rem;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              transition: background-color 0.3s ease;
            }
  
            button:hover {
              background-color: #133c74;
            }
  
            .status {
              margin-top: 1rem;
              font-size: 0.95rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Forgot Your Password?</h2>
            <form id="resetForm">
              <input type="email" name="email" placeholder="Enter your email" required />
              <button type="submit">Send Reset Link</button>
            </form>
            <div class="status" id="status"></div>
          </div>
  
          <script>
            const form = document.getElementById("resetForm");
            const status = document.getElementById("status");
  
            form.addEventListener("submit", async (e) => {
              e.preventDefault();
              const formData = new FormData(form);
              const email = formData.get("email");
  
              const response = await fetch("/api/forgot-password-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
              });
  
              const result = await response.json();
              if (response.ok) {
                status.innerHTML = "<span style='color: green;'>Reset link sent! Check your email.</span>";
              } else {
                status.innerHTML = "<span style='color: red;'>" + (result.error || "Something went wrong.") + "</span>";
              }
            });
          </script>
        </body>
      </html>
    `)
  })

  app.get("/resend-verification", async (req, res) => {
    const login = req.query.login

    if (login) {
      try {
        const db = client.db("app")
        let user = await db.collection("users").findOne({
          $or: [{ email: login }, { username: login }],
        })

        if (!user) {
          return res.send(renderResendForm("User not found", "red"))
        }

        if (user.isVerified) {
          return res.send(renderResendForm("User is already verified", "green"))
        }

        return res.send(renderResendForm("", "", login))
      } catch (e) {
        console.error(e)
        return res.send(renderResendForm("Server error occurred", "red"))
      }
    } else {
      // Show blank form
      return res.send(renderResendForm())
    }
  })
}
