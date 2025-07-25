const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const AuditLog = mongoose.connection.collection("auditlogs");
const User = require("../models/UserModel");


exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Fetch logs sorted by timestamp descending with pagination
    const logsArray = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Extract unique user IDs from logs
    const userIds = [...new Set(logsArray.map(log => log.user).filter(Boolean))];

    // Fetch user info for those IDs
    const users = await User.find({ _id: { $in: userIds } }, { name: 1, email: 1 }).lean();

    // Create a map of userId to user info for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });


  } catch (error) {
    next(error);
  }
};
