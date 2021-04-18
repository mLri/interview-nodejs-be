/* include module */
const ObjectId = require('mongoose').Types.ObjectId

/* include model */
const Chat = require('../models/chat.model')
const ChatRoom = require('../models/chat_room.model')

/* include helper */
const { setMessage } = require('../helpers/socket.helper')
module.exports.init = (http) => {

  const io = require('socket.io')(http, {
    cors: {
      origin: "*"
    }
  })

  let user = {
    room_id: null
  }

  // let ROOM_ID = undefined

  io.on('connection', (socket) => {

    socket.on('join_room', async room_id => {
      console.log('join room -> ', room_id)
      // ROOM_ID = room_id
      socket.join(room_id)
    })

    socket.on('leave_room', async room_id => {
      console.log('leave room -> ', room_id)
      socket.leave(room_id)
    })

    socket.on('join_noti', room_id => {
      console.log('join noti -> ', room_id)
      socket.join(room_id)
    })

    socket.on('leave_noti', room_id => {
      console.log('leave noti -> ', room_id)
      socket.leave(room_id)
    })

    socket.on('set_rooms', ({ join_chat_id_arr, join_room_id, new_room }) => {
      for (let chat_room_id of join_chat_id_arr) {
        console.log('chat_room_id -> ', chat_room_id)
        io.to(`${chat_room_id}`).emit('set_rooms', { join_room_id, new_room })
      }
      // io.to(`${room_id}`).emit('set_rooms', { room_id, join_room_id, data })
    })

    socket.on('send_message', async (data) => {

      /* limit file size */
      if (data.type == 'file' && data.files.size > 100000) {
        socket.emit('socket_error', { status: false, message: 'File limit error!' })
        return
      }

      console.log('data -> ', data)

      const message = await setMessage(data)

      if (message) {
        /* create chat */
        await Chat.create(message)

        io.to(`${data.room_id}`).emit('send_message', message)

        let find_room = await ChatRoom.findOne({ _id: data.room_id })


        console.log('find_room --- ', find_room)

        let find_receive = find_room.users.find(val => {
          console.log('val._id -> ', val._id)
          console.log('data.user_id -> ', data.user_id)
          return String(val._id) !== String(data.user_id)
        })
        console.log('find_receive -> ', find_receive)
        if (find_receive) find_receive.noti_count += 1
        // find_room.noti_fag = true
        // find_room.noti_count = find_room.noti_count + 1
        // console.log('find_room -> ', find_room)
        await find_room.save()

        let find_room_after_update = await ChatRoom.aggregate([
          {
            $match: {
              _id: ObjectId(data.room_id)
            }
          },
          {
            $lookup: {
              from: "users",
              let: { "users_id_from_chat_room": "$users" },
              pipeline: [
                {
                  $match: {
                    $expr: { "$in": ["$_id", "$$users_id_from_chat_room._id"] }
                  }
                },
                {
                  $project: {
                    _id: 1,
                    first_name: 1,
                    notification: {
                      $filter: {
                        input: '$$users_id_from_chat_room',
                        as: 'users',
                        cond: { $eq: ['$$users._id', '$_id'] }
                      }
                    }
                  }
                }
              ],
              as: 'users'
            },
          }
        ])

        io.to(`${find_receive._id}`).emit('noti_alert', find_room_after_update[0])
      }
    })

    socket.on('clear_noti', async ({ room_id, user_id }) => {
      let find_room = await ChatRoom.findOne({ _id: room_id })

      /* clear noti */
      let find_user = find_room.users.find(val => String(val._id) === String(user_id))
      find_user.noti_count = 0
      await find_room.save()

      let find_room_after_update = await ChatRoom.aggregate([
        {
          $match: {
            _id: ObjectId(room_id)
          }
        },
        {
          $lookup: {
            from: "users",
            let: { "users_id_from_chat_room": "$users" },
            pipeline: [
              {
                $match: {
                  $expr: { "$in": ["$_id", "$$users_id_from_chat_room._id"] }
                }
              },
              {
                $project: {
                  _id: 1,
                  first_name: 1,
                  notification: {
                    $filter: {
                      input: '$$users_id_from_chat_room',
                      as: 'users',
                      cond: { $eq: ['$$users._id', '$_id'] }
                    }
                  }
                }
              }
            ],
            as: 'users'
          },
        }
      ])

      io.to(`${user_id}`).emit('noti_alert', find_room_after_update[0])
    })

    socket.on('read_message', async (data) => {
      let last_chat = await Chat.findOne({ chat_room_id: data.room_id }).sort({ 'timestamp.created_at': -1 })

      if (last_chat) {
        const find_me = last_chat.readed_by.find(id => id == data.user_id)
        if (!find_me && last_chat.user_id != data.user_id) {
          /* update readed_by */
          last_chat.readed_by.push(data.user_id)
          await last_chat.save()

          let readed_by_arr = await Chat.aggregate([
            {
              $match: {
                _id: ObjectId(last_chat._id)
              }
            },
            {
              $lookup: {
                from: "users",
                localField: 'readed_by',
                foreignField: '_id',
                as: 'user'
              }
            },
            {
              $project: {
                'user._id': 1,
                'user.first_name': 1
              }
            }
          ])

          io.to(`${data.room_id}`).emit('read_message', readed_by_arr[0])
        }
      }
    })

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

    socket.on('error', (err) => {
      console.log('Websocket error!: ' + err);
    });
  });
}
