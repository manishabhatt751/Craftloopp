const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { User, Message } = require("./models");

let io = null;

/**
 * Initialize Socket.io with HTTP server
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all incoming origins (localhost, LAN IPs, 192.168.x.x, deployment URLs, or non-browser clients)
        callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication Middleware for incoming Socket connections
  io.use(async (socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

      if (token && token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
      }

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error("Authentication error: JWT_SECRET not configured"));
      }
      const decoded = jwt.verify(token, secret);


      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  // Socket Connection Event
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const userRoom = `user:${userId}`;

    // Join user's private room
    socket.join(userRoom);
    console.log(`⚡ Socket connected: ${socket.id} (Joined room: ${userRoom})`);

    // Real-time send_message event
    socket.on("send_message", async (data, callback) => {
      try {
        const receiverId = data.receiverId || data.recipientId;
        const content = (data.content || data.text || "").trim();

        if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
          if (typeof callback === "function") {
            callback({ success: false, message: "Valid receiver ID is required." });
          }
          return;
        }

        if (receiverId.toString() === userId) {
          if (typeof callback === "function") {
            callback({ success: false, message: "Cannot send message to yourself." });
          }
          return;
        }

        const receiver = await User.findById(receiverId).select("name email avatar role title");
        if (!receiver) {
          if (typeof callback === "function") {
            callback({ success: false, message: "Recipient user not found." });
          }
          return;
        }

        if (!content) {
          if (typeof callback === "function") {
            callback({ success: false, message: "Message content cannot be empty." });
          }
          return;
        }

        // Persist message to MongoDB
        const message = await Message.create({
          sender: socket.user._id,
          senderName: socket.user.name || "User",
          recipient: receiver._id,
          receiver: receiver._id,
          recipientName: receiver.name || "User",
          content,
          read: false,
        });

        await message.populate("sender", "name email avatar role title");
        await message.populate("recipient", "name email avatar role title");
        await message.populate("receiver", "name email avatar role title");

        // Emit to recipient's private room
        io.to(`user:${receiver._id}`).emit("new_message", message);

        // Also emit to sender so other active tabs receive it
        io.to(userRoom).emit("new_message", message);

        if (typeof callback === "function") {
          callback({ success: true, data: message });
        }
      } catch (err) {
        console.error("Socket send_message error:", err);
        if (typeof callback === "function") {
          callback({ success: false, message: "Server error sending message." });
        }
      }
    });

    // Disconnect event
    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id} (User: ${userId})`);
    });
  });

  return io;
}

/**
 * Getter for io instance
 */
function getIO() {
  return io;
}

module.exports = {
  initSocket,
  getIO,
};
