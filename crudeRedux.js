/**
 * Creates a Redux store that hold the state tree
 * @param reducer
 * @param preloadedState
 * @param enhancer
 * @returns {Store}, you can dispatch actions to change state, read the state and subscribe to change
 */
const createStore = (reducer, preloadedState = {}, enhancer) => {

  if(typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  if(typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(createStore)(reducer, preloadedState)
  }

  let currentState = preloadedState;
  let currentListeners = [];
  let nextListeners = currentListeners;

  // dispatch 的时候需使用侦听器副本，防止 unsubscribe 时打乱侦听器数组顺序
  // 侦听器的改变均反映在 nextListeners 里
  // dispatch 调用时更新 currentListeners
  // ***
  // 即，每次侦听器要改变时使用当前侦听器副本 currentListeners.slice() ，改变副本值，dispatch 时再赋给 currentListeners
  const ensureCanMutateNextListeners = () => {
      if(nextListeners === currentListeners) {
        nextListeners = currentListeners.slice();
      }
  }

  const getState = () => currentState;

  const dispatch = (action) => {
    if(!action || typeof action !== 'object') {
      throw new Error('Expected the action to be a object.');
    }
    if(typeof action.type === 'undefined') {
      throw new Error('Actions may not have "type" property.');
    }

    currentState = reducer(currentState, action);

    let listeners = currentListeners = nextListeners;
    // for 循环比 forEach 性能好
    for(let i = 0; i < listeners.length; i++) {
      let listener = listeners[i];
      listener();
    }

    return action;
  }

  const subscribe = (listener) => {
    if(typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.');
    }

    // if unsubscribed, the listener won't be trigger
    let isSubscribed = true;
    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {

      if(!isSubscribed) return;
      isSubscribed = false;
      ensureCanMutateNextListeners();
      const index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    }
  }

  const replaceReducer = (newReducer) => {
    if(typeof newReducer !== 'function') {
      throw new Error('Expected the reducer to be a function.');
    }

    reducer = newReducer;
    dispatch({type: '@@redux_init'});
  }

  // 初始化 state
  // 需要 action 有默认 state
  dispatch({type: '@@redux_init'});

  return {getState, dispatch, subscribe, replaceReducer};
}


/**
 * @param actionCreator
 * @param dispatch
 * @returns {function(): *}
 */
function bindActionCreator(actionCreator, dispatch) {
  return (...args) => dispatch(actionCreator(...args))
}

/**
 * Target is pass some action creators down to a component
 * @param {Function | Object} actionCreators
 * @param {Function} dispatch
 * @returns {Function|Object}
 */
const bindActionCreators = (actionCreators, dispatch) => {
  if(typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch);
  }

  if(typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error('actionCreator expected  an object or a function.');
  }

  const keys = Object.keys(actionCreators);
  let boundActionCreators = {};
  for(let i = 0; i< keys.length; i++) {
    const key = keys[i];
    const actionCreator = actionCreators[key];
    if(typeof actionCreator === 'function') {
      boundActionCreators[keys] = bindActionCreator(actionCreator, dispatch);
    }
  }

  return boundActionCreators;
}


/**
 * combine reducers, return the state pass the each reducer
 * reducers key is the state key
 * @param reducers
 * @returns {Function}
 */
const combineReducers = (reducers) => {

  const finalReducers = Object.assign({} ,reducers);
  const finalReducerKeys = Object.keys(finalReducers);

  return function combination(state = {}, action) {
    let nextState = {};
    let hasChange = false;

    for(let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i];
      const previousStateForKey = state[key];
      if(typeof finalReducers[key] === 'function') {
        const nextStateForKey = finalReducers[key](previousStateForKey, action);
        nextState[key] = nextStateForKey;
        hasChange = hasChange || nextStateForKey != previousStateForKey;
      }
    }

    return hasChange ? nextState : state;
  }
}

/**
 * compose many function deal with dispatch
 * @param funcs
 * @returns {*}
 */
const compose = (...funcs) => {
  if(funcs.length == 0) {
    return args => args;
  }

  if(funcs.length == 1) {
    return funcs[0];
  }
  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}


/**
 * load middleware
 * applyMiddleware() can as an enhancer
 * @param middlewares
 * @returns {function()}
 */
const applyMiddleware = (...middlewares) => {
  return (createStore) => (reducer, preloadedState, enhancer) => {
    const store = createStore(reducer, preloadedState, enhancer);
    let dispatch = store.dispatch;
    let chain = [];

    const middlewareAPI = {
      getState: store.getState,
      // confused: don't use dispatch because compose pass on dispatch
      dispatch: (action) => dispatch(action)
    }

    chain = middlewares.map((middleware) => middleware(middlewareAPI));
    dispatch = compose(...chain)(dispatch);

    return Object.assign(
      {},
      store,
      {dispatch: dispatch}
    )
  }
}