const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { uploadMedia } = require("../services/uploadService");
const { protect } = require("../middleware/authMiddleware");

// Ensure uploads destination directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 5000 MB = 5 GB per file (enforced at Multer streaming level)
const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB) || 5000;
const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;

// Configure Multer diskStorage to stream directly to disk without loading into RAM
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || "";
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${cleanName || "file"}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxUploadSizeBytes, // 5 GB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Only accept common image and media/video types
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "application/pdf",
    ];
    if (
      allowed.includes(file.mimetype) ||
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Standard image formats (JPG, PNG, WEBP, GIF, SVG) and video formats (MP4, WEBM, MOV, MKV) are accepted."
        )
      );
    }
  },
});

const uploadFields = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
  { name: "image", maxCount: 1 },
]);

// POST /api/upload
// Accepts files up to 5000 MB (5 GB) per file across 'file', 'avatar', or 'image' field
router.post("/", protect, (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}, async (req, res) => {
  try {
    const file =
      req.file ||
      (req.files &&
        (req.files.file?.[0] || req.files.avatar?.[0] || req.files.image?.[0]));

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Please provide a file to upload in the 'file' or 'avatar' field.",
      });
    }

    const { folder } = req.body;
    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "http";

    const isAvatarUpload =
      folder === "craftloop/avatars" ||
      (req.files && Boolean(req.files.avatar?.[0])) ||
      Boolean(req.originalUrl && req.originalUrl.includes("avatar"));

    const result = await uploadMedia(file, {
      folder: folder || (isAvatarUpload ? "craftloop/avatars" : "craftloop/media"),
      host,
      protocol,
    });

    let updatedUser = null;
    if (req.user && req.user._id && isAvatarUpload) {
      const { User } = require("../models");
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: result.url },
        { returnDocument: "after" }
      ).select("-password");
    }

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully.",
      url: result.url,
      secure_url: result.secure_url,
      avatar: result.url,
      user: updatedUser || (req.user ? { ...(typeof req.user.toObject === "function" ? req.user.toObject() : req.user), avatar: result.url } : undefined),
      data: updatedUser || { avatar: result.url },
      format: result.format,
      bytes: result.bytes,
      provider: result.provider,
    });
  } catch (error) {
    console.error("Upload route error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload file.",
    });
  }
});

// Error handling middleware for Multer file size errors (5 GB limit enforcement)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File exceeds the 5 GB limit. Maximum file size: 5 GB.",
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;
