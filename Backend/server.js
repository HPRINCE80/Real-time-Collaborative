// import express from 'express'
// import {createServer} from 'http'
// import { Server } from 'socket.io'
// import { YSocketIO } from "y-socket.io/dist/server"

// const app = express()
// app.use(express.static('public'))
// const httpServer = createServer(app)
// const io = new Server(httpServer, {
//     cors: { 
//         origin: "*",
//         methods: ["GET", "POST"]
//     }
// })
// const ySocketIO = new YSocketIO(io)
// ySocketIO.initialize()

// /*app.get("/", (req, res) =>{
//     res.status(200).json({
//         message: "Hello World",
//         success: true
//     })
// })*/
// app.get("/health", (req, res) =>{
//     res.status(200).json({
//         message: "Server is healthy",
//         success: true
//     })
// })

// httpServer.listen(3000, () => {
//     console.log("Server is running on port 3000")

// })


import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { YSocketIO } from "y-socket.io/dist/server"

const app = express()
app.use(express.static('public'))
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // Base64 files ke liye max size badhao
  maxHttpBufferSize: 25 * 1024 * 1024 // 25MB
})

// Yjs for code sync
const ySocketIO = new YSocketIO(io)
ySocketIO.initialize()

// Har room ki files store karo (memory mein)
const roomFiles = {}

// File sharing socket events
io.on("connection", (socket) => {

  // User file room join karo
  socket.on("join-file-room", (roomId) => {
    socket.join(`files-${roomId}`)

    // Pehle se jo files hain wo bhejo
    if (roomFiles[roomId]) {
      socket.emit("room-files", roomFiles[roomId])
    }
  })

  // File receive karo aur baaki sabko bhejo
  socket.on("send-file", ({ roomId, fileData }) => {
    // Room ki files mein save karo
    if (!roomFiles[roomId]) roomFiles[roomId] = []
    roomFiles[roomId].push(fileData)

    // Baaki sabko broadcast karo
    socket.to(`files-${roomId}`).emit("receive-file", fileData)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
})

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy", success: true })
})

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000")
})