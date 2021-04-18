const mongoose = require('mongoose')
const Schema = mongoose.Schema

const user = {
  _id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  noti_count: {
    type: Number,
    default: 0
  }
}

const chatRoomSchema = new Schema({
  name: {
    type: String
  },
  users: [user],
  deleted_by: {
    type: Schema.Types.ObjectId
  }
}, {
  timestamps: { createdAt: 'timestamp.created_at', updatedAt: 'timestamp.updated_at' }
})

module.exports = mongoose.model('chat_room', chatRoomSchema)