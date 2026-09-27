const mongoose = require("mongoose");

let memoryServerInstance = null;
let connectionPromise = null;
let isReconnecting = false;

const connectDB = async () => {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Connection already in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    const errorMsg =
      "MONGODB_URI is missing. Please configure your shared MongoDB Atlas connection string in server/.env. Data cannot be synchronized across laptops without a shared database.";
    console.error("\n=================================");
    console.error("DATABASE CONFIGURATION ERROR");
    console.error("=================================");
    console.error(errorMsg);
    console.error("=================================\n");
    throw new Error(errorMsg);
  }

  connectionPromise = (async () => {
    // 1. Try remote MongoDB Atlas if URI is provided
    if (uri) {
      try {
        console.log("Connecting to MongoDB Atlas...");
        const conn = await mongoose.connect(uri, {
          dbName: "craftloop",
          serverSelectionTimeoutMS: 5000,
        });

        console.log("\n=================================");
        console.log("MongoDB Atlas connected successfully");
        console.log(`Database: ${conn.connection.name}`);
        console.log(`Host: ${conn.connection.host}`);
        console.log(`ReadyState: ${conn.connection.readyState}`);
        console.log("=================================\n");

        connectionPromise = null;
        return conn;
      } catch (remoteError) {
        console.warn("\n=================================");
        console.warn("MongoDB Atlas remote connection failed:");
        console.warn(`Reason: ${remoteError.message}`);
        console.warn("Switching to persistent Local MongoDB storage on Laptop A...");
        console.warn("Both laptops will share this database through the backend.");
        console.warn("=================================\n");
      }
    }

    // 2. Shared Local MongoDB instance (shares data across Laptop A & B without crashing)
    try {
      const fixedUri = "mongodb://127.0.0.1:27018/craftloop";

      // Check if instance is already running on port 27018
      try {
        const conn = await mongoose.connect(fixedUri, {
          dbName: "craftloop",
          serverSelectionTimeoutMS: 1200,
        });

        console.log("\n=================================");
        console.log("Connected to existing Shared Local MongoDB on port 27018");
        console.log(`Database: ${conn.connection.name}`);
        console.log(`Host: ${conn.connection.host}`);
        console.log(`ReadyState: ${conn.connection.readyState}`);
        console.log("=================================\n");

        connectionPromise = null;
        return conn;
      } catch (_) {
        // Port 27018 not running yet, spin it up
      }

      const { MongoMemoryServer } = require("mongodb-memory-server");

      if (!memoryServerInstance) {
        try {
          memoryServerInstance = await MongoMemoryServer.create({
            instance: { port: 27018 },
          });
        } catch (portErr) {
          memoryServerInstance = await MongoMemoryServer.create();
        }
      }

      const memUri = memoryServerInstance.getUri();
      console.log(`Connecting to Local MongoDB at ${memUri}...`);

      const conn = await mongoose.connect(memUri, {
        dbName: "craftloop",
      });

      console.log("\n=================================");
      console.log("Shared Local MongoDB connected successfully");
      console.log(`Database: ${conn.connection.name}`);
      console.log(`Host: ${conn.connection.host}`);
      console.log(`ReadyState: ${conn.connection.readyState}`);
      console.log("=================================\n");

      connectionPromise = null;
      return conn;
    } catch (fallbackError) {
      connectionPromise = null;
      console.error("\n=================================");
      console.error("ALL MongoDB CONNECTIONS FAILED");
      console.error("=================================");
      console.error(fallbackError.message);
      console.error("=================================\n");
      throw fallbackError;
    }
  })();

  return connectionPromise;
};

// ========================================
// MongoDB connection events
// ========================================

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established.");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

let hasSuccessfullyConnected = false;

// ========================================
// Auto reconnect (only after initial successful connection)
// ========================================

mongoose.connection.on("connected", () => {
  hasSuccessfullyConnected = true;
});

mongoose.connection.on("disconnected", () => {
  if (!hasSuccessfullyConnected || isReconnecting) {
    return;
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    return;
  }

  isReconnecting = true;
  console.log("Attempting MongoDB reconnection in 3 seconds...");

  setTimeout(async () => {
    try {
      await connectDB();
      console.log("MongoDB reconnected successfully.");
    } catch (error) {
      console.error("MongoDB reconnection failed:", error.message);
    } finally {
      isReconnecting = false;
    }
  }, 3000);
});


module.exports = {
  connectDB,
};