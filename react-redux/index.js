import 'babel-core/polyfill';

import React from 'react';
import { Provider } from 'react-redux';
import App from './containers/App';
import configureStore from './store/configureStore';
import 'todomvc-app-css/index.css';

import { applyMiddleware } from 'redux';
import promiseMiddleware         from './lib/promiseMiddleware';

import { createStore } from 'redux';
import rootReducer from './reducers';
const store = applyMiddleware(promiseMiddleware)(createStore)(rootReducer);

React.render(
  <Provider store={store}>
    {() => <App />}
  </Provider>,
  document.getElementById('root')
);
