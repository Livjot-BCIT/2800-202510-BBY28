const mongoose = require("mongoose");
const msgSchema = new mongoose.Schema({
  groupId:   String,
  userId:    mongoose.Schema.Types.ObjectId,
  message:   String,
  timestamp: Date,
});
module.exports = mongoose.model("Message", msgSchema);