import * as types from '../constants/ActionTypes';
import request from 'axios';

const BACKEND_URL = 'http://localhost:3000/todos';

export function getTodos() {
    console.log('getTodos called');
    return {
      type: types.GET_TODOS,
      promise: request.get(BACKEND_URL)
    };
}

export function addTodo(text) {
  return { type: types.ADD_TODO, text };
}

export function deleteTodo(id) {
  return { type: types.DELETE_TODO, id };
}

export function editTodo(id, text) {
  return { type: types.EDIT_TODO, id, text };
}

export function completeTodo(id) {
  return { type: types.COMPLETE_TODO, id };
}

export function completeAll() {
  return { type: types.COMPLETE_ALL };
}

export function clearCompleted() {
  return { type: types.CLEAR_COMPLETED };
}
