/* include models */
const Todo = require('../models/todo.model')

/* include helpers */
const { handleError } = require('../helpers/handle_error.helper')
const statusError = require('../helpers/status_error.helper')

module.exports.listTodo = async (req, res) => {
  try {
    const { principal: { _id } } = req.user
    const {
      complete = '',
      limit = 5,
      sorted_by = 'created_at',
      sorted_order = 'asc',
      page = 1
    } = req.query

    let query = { user_id: _id }
    if (complete) query.completed = complete

    /* calculate page */
    const skip_num = (page - 1) * limit
    const limit_num = parseInt(limit)

    /* manage sort */
    const order = sorted_order === 'asc' ? 1 : -1
    if (sorted_by === 'created_at') { sort = { 'timestamp.created_at': order } }
    if (sorted_by === 'title') { sort = { 'title': order } }

    const todo_list = await Todo.find(query).sort(sort).limit(limit_num).skip(skip_num)
    const total = await Todo.countDocuments({ user_id: _id })

    res.json({
      result: todo_list,
      total
    })
  } catch (error) {
    handleError(error, res)
  }
}

module.exports.createTodo = async (req, res) => {
  try {
    const { principal: { _id } } = req.user
    const { title } = req.body

    const create_todo = await Todo.create({
      user_id: _id,
      title
    })

    const total = await Todo.countDocuments({ user_id: _id })

    res.json({
      result: create_todo,
      total
    })
  } catch (error) {
    handleError(error, res)
  }
}

module.exports.updateTodo = async (req, res) => {
  try {
    const _id = req.params.todo_id

    const find_todo = await Todo.findOne({ _id })
    if (!find_todo) throw statusError.bad_request_with_message(`not found todo_id ${_id}`)

    /* update todo */
    Object.assign(find_todo, { ...req.body })
    const update_todo = await find_todo.save()

    res.status(200).json(update_todo)
  } catch (error) {
    handleError(error, res)
  }
}

module.exports.deleteTodo = async (req, res) => {
  try {
    const _id = req.params.todo_id

    let delete_todo = await Todo.findByIdAndDelete(_id)
    if (!delete_todo) throw statusError.bad_request_with_message(`not found todo_id -> ${_id}`)

    const total = await Todo.countDocuments({})

    res.json({
      result: delete_todo,
      total
    })
  } catch (error) {
    handleError(error, res)
  }
}