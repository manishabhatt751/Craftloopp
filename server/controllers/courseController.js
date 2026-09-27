const mongoose = require("mongoose");
const { Course, User } = require("../models");

/**
 * @route   GET /api/courses
 * @desc    Get all courses (or filtered by creator)
 * @access  Public / Optional Auth
 */
const getCourses = async (req, res) => {
  try {
    const filter = {};

    if (req.query.creator === "me" || req.query.mine === "true") {
      if (req.user) {
        filter.$or = [{ creator: req.user._id }, { instructor: req.user._id }];
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required to view your courses.",
        });
      }
    } else if (req.query.category && req.query.category !== "All") {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { category: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const courses = await Course.find(filter)
      .sort({ createdAt: -1 })
      .populate("creator", "name email avatar role title")
      .populate("instructor", "name email avatar role title");

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (err) {
    console.error("getCourses error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching courses.",
    });
  }
};

/**
 * @route   GET /api/courses/:id
 * @desc    Get single course by ID
 * @access  Public
 */
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const course = await Course.findById(id)
      .populate("creator", "name email avatar role title bio")
      .populate("instructor", "name email avatar role title bio");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (err) {
    console.error("getCourseById error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching course.",
    });
  }
};

/**
 * @route   POST /api/courses
 * @desc    Create a new course
 * @access  Private (Creator only)
 */
const createCourse = async (req, res) => {
  try {
    const { title, description, category, level, thumbnail, price, lessons, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Course title is required.",
      });
    }

    const course = await Course.create({
      title: title.trim(),
      description: description || "",
      category: category || "Development",
      level: level || "Beginner",
      thumbnail: thumbnail || req.body.image || "",
      price: price || 0,
      lessons: Array.isArray(lessons) ? lessons : [],
      status: status || "Published",
      creator: req.user._id,
      instructor: req.user._id,
    });

    await course.populate("creator", "name email avatar role title");
    await course.populate("instructor", "name email avatar role title");

    res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: course,
    });
  } catch (err) {
    console.error("createCourse error:", err);
    res.status(500).json({
      success: false,
      message: "Server error creating course.",
    });
  }
};

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course
 * @access  Private (Course creator only)
 */
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const isCreator =
      (course.creator && course.creator.toString() === req.user._id.toString()) ||
      (course.instructor && course.instructor.toString() === req.user._id.toString());

    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this course.",
      });
    }

    const updates = { ...req.body };
    delete updates.creator;
    delete updates.instructor;

    const updatedCourse = await Course.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("creator", "name email avatar role title")
      .populate("instructor", "name email avatar role title");

    res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: updatedCourse,
    });
  } catch (err) {
    console.error("updateCourse error:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating course.",
    });
  }
};

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete course
 * @access  Private (Course creator only)
 */
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const isCreator =
      (course.creator && course.creator.toString() === req.user._id.toString()) ||
      (course.instructor && course.instructor.toString() === req.user._id.toString());

    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this course.",
      });
    }

    await Course.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (err) {
    console.error("deleteCourse error:", err);
    res.status(500).json({
      success: false,
      message: "Server error deleting course.",
    });
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
