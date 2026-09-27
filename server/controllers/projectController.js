const mongoose = require("mongoose");
const { Project, User } = require("../models");

/**
 * @route   GET /api/projects
 * @desc    Get all projects/services
 * @access  Public / Optional Auth
 */
const getProjects = async (req, res) => {
  try {
    const filter = {};

    if (req.query.creator === "me" || req.query.mine === "true") {
      if (req.user) {
        filter.creator = req.user._id;
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required to view your projects.",
        });
      }
    } else if (req.query.category && req.query.category !== "All") {
      filter.category = req.query.category;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .populate("creator", "name email avatar role title");

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (err) {
    console.error("getProjects error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching projects.",
    });
  }
};

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project by ID
 * @access  Public
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const project = await Project.findById(id).populate("creator", "name email avatar role title bio");
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    console.error("getProjectById error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching project.",
    });
  }
};

/**
 * @route   POST /api/projects
 * @desc    Create a new project/service
 * @access  Private (Creator only)
 */
const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      projectType,
      skills,
      image,
      price,
      status,
      demoUrl,
      tags,
      tools,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project title is required.",
      });
    }

    const project = await Project.create({
      title: title.trim(),
      description: description || "",
      category: category || "General",
      type: type || (projectType === "Service" ? "Service" : "Project"),
      projectType: projectType || "Project",
      skills: skills || "",
      image: image || "",
      price: price || 0,
      status: status || "Published",
      demoUrl: demoUrl || "",
      tags: Array.isArray(tags) ? tags : [],
      tools: Array.isArray(tools) ? tools : [],
      creator: req.user._id,
    });

    await project.populate("creator", "name email avatar role title");

    res.status(201).json({
      success: true,
      message: "Project created successfully.",
      data: project,
    });
  } catch (err) {
    console.error("createProject error:", err);
    res.status(500).json({
      success: false,
      message: "Server error creating project.",
    });
  }
};

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private (Project creator only)
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (project.creator && project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this project.",
      });
    }

    const updates = { ...req.body };
    delete updates.creator;

    const updatedProject = await Project.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    }).populate("creator", "name email avatar role title");

    res.status(200).json({
      success: true,
      message: "Project updated successfully.",
      data: updatedProject,
    });
  } catch (err) {
    console.error("updateProject error:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating project.",
    });
  }
};

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private (Project creator only)
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (project.creator && project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this project.",
      });
    }

    await Project.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully.",
    });
  } catch (err) {
    console.error("deleteProject error:", err);
    res.status(500).json({
      success: false,
      message: "Server error deleting project.",
    });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
