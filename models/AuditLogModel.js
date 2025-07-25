const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String
  },
  
  
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
