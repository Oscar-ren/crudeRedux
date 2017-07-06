const appReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_HEADER':
      return Object.assign(state, { header: action.header })
    case 'UPDATE_BODY':
      return Object.assign(state, { body: action.body })
    default:
      return state
  }
}

function printStateMiddleware(middlewareAPI) {
  return function (dispatch) {

    return function (action) {
      console.log('state before dispatch', middlewareAPI.getState())

      var returnValue = dispatch(action) // 还记得吗，dispatch 的返回值其实还是 action

      console.log('state after dispatch', middlewareAPI.getState())

      return returnValue // 继续传给下一个中间件作为参数 action
    }
  }
}

const store = createStore(appReducer, {
  header: 'Header',
  body: 'Body',
}, applyMiddleware(printStateMiddleware))

/* 渲染 Header */
const renderHeader = () => {
  console.log('render header')
  document.getElementById('header').innerHTML = store.getState().header
}
renderHeader()

/* 渲染 Body */
const renderBody = () => {
  console.log('render body')
  document.getElementById('body').innerHTML = store.getState().body
}
renderBody()

/* 数据发生变化 */
setTimeout(() => {
  store.dispatch({ type: 'UPDATE_HEADER', header: 'New Header' })
  store.dispatch({ type: 'UPDATE_BODY', body: 'New Body' })
}, 1000)

store.subscribe(renderHeader)
store.subscribe(renderBody)
