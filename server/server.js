const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from server/.env (MongoDB Atlas Connected)
dotenv.config({
  path: path.join(__dirname, ".env"),
});

const http = require("http");
const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");
const apiRoutes = require("./routes");
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorHandler");
const { initSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// ===============================
// Middleware
// ===============================

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Serve uploaded media statically and with byte-range video streaming (videos up to 5 GB)
const fs = require("fs");
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Media / Video streaming route supporting HTTP 206 Partial Content range requests up to 5 GB
app.get("/uploads/:filename", (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadsPath, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".ogv": "video/ogg",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
  };

  const contentType = mimeTypes[ext] || "application/octet-stream";
  const isVideo = contentType.startsWith("video/");

  // Set CORS and byte-range headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
  res.setHeader("Accept-Ranges", "bytes");

  const range = req.headers.range;

  if (range && isVideo) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.setHeader("Content-Range", `bytes */${fileSize}`);
      return res.status(416).end();
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": contentType,
    });

    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

app.use("/uploads", express.static(uploadsPath));

// ===============================
// API Routes
// ===============================

app.use("/api", apiRoutes);

// ===============================
// Serve Static Frontend (Render / Production)
// ===============================

const clientDistPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
  // Serve static assets from Vite build
  app.use(express.static(clientDistPath));

  // SPA fallback for all non-API and non-uploads GET requests
  app.get("/{*splat}", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/uploads") ||
      req.path.startsWith("/socket.io")
    ) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  // Fallback for development if client is not built
  app.get("/", (req, res) => {
    res.json({
      message: "CraftLoop Backend is running!",
      apiDocs: "/api",
    });
  });
}

// ===============================
// Error Handling
// ===============================

app.use(notFoundHandler);
app.use(errorHandler);

// ===============================
// Server Configuration
// ===============================

const PORT = process.env.PORT || 5000;

// ===============================
// Start Server
// ===============================

if (require.main === module) {
  // Handle unexpected errors
  process.on("unhandledRejection", (reason) => {
    console.error(
      "Unhandled Rejection:",
      reason?.message || reason
    );
  });

  process.on("uncaughtException", (err) => {
    console.error(
      "Uncaught Exception:",
      err?.message || err
    );
  });

  console.log("=================================");
  console.log("Starting CraftLoop Backend...");
  console.log("=================================");

  // Check environment variable
  console.log(
    "MONGODB_URI:",
    process.env.MONGODB_URI ? "LOADED" : "MISSING"
  );

  console.log(
    "PORT:",
    process.env.PORT || 5000
  );

  // Connect to MongoDB first
  connectDB()
    .then(async () => {
      console.log("MongoDB connection successful.");

      // Start HTTP server only after DB connection succeeds
      server.listen(PORT, () => {
        console.log("=================================");
        console.log(`CraftLoop Backend running on port ${PORT}`);
        console.log(`http://localhost:${PORT}`);
        console.log("MongoDB: Connected");
        console.log("=================================");
      });
    })
    .catch((err) => {
      console.error("=================================");
      console.error("DATABASE CONNECTION FAILED");
      console.error("=================================");
      console.error(err.message);

      console.error(
        "Backend will NOT start because MongoDB connection failed."
      );

      process.exit(1);
    });
}

// Export app and server
module.exports = app;
module.exports.server = server;