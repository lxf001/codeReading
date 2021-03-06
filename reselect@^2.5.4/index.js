// 默认的比较函数
function defaultEqualityCheck(a, b) {
  return a === b
}
// 这个默认记忆函数呢，接收一个函数func, 并返回一个函数a，调用a这个函数时，如果参数与上次相同则返回上次缓存的结果，否则重新计算func并缓存这次的结果
export function defaultMemoize(func, equalityCheck = defaultEqualityCheck) {
  let lastArgs = null
  let lastResult = null
  return (...args) => {
    if (
      lastArgs === null ||
      lastArgs.length !== args.length ||
      !args.every((value, index) => equalityCheck(value, lastArgs[index]))
    ) {
      lastResult = func(...args)
    }
    lastArgs = args
    return lastResult
  }
}

// 返回一个函数数组
function getDependencies(funcs) {
  const dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs

  if (!dependencies.every(dep => typeof dep === 'function')) {
    const dependencyTypes = dependencies.map(
      dep => typeof dep
    ).join(', ')
    throw new Error(
      `Selector creators expect all input-selectors to be functions, ` +
      `instead received the following types: [${dependencyTypes}]`
    )
  }

  return dependencies
}

export function createSelectorCreator(memoize, ...memoizeOptions) {
  // 返回的这个函数才是我们import时使用到的
  return (...funcs) => {
    let recomputations = 0
    // 最后一个参数
    const resultFunc = funcs.pop()
    // 依赖数组（函数）
    const dependencies = getDependencies(funcs)

    const memoizedResultFunc = memoize(
      // func
      (...args) => {
        recomputations++
        return resultFunc(...args)
      },
      ...memoizeOptions
    )

    const selector = (state, props, ...args) => {
      // 通过依赖函数计算出参数
      const params = dependencies.map(
        dependency => dependency(state, props, ...args)
      )
      // 如果参数和上次相同，则返回上次缓存的结果，否则重新计算func返回并缓存
      return memoizedResultFunc(...params)
    }

    selector.resultFunc = resultFunc
    selector.recomputations = () => recomputations
    selector.resetRecomputations = () => recomputations = 0
    return selector
  }
}

export const createSelector = createSelectorCreator(defaultMemoize)

export function createStructuredSelector(selectors, selectorCreator = createSelector) {
  if (typeof selectors !== 'object') {
    throw new Error(
      `createStructuredSelector expects first argument to be an object ` +
      `where each property is a selector, instead received a ${typeof selectors}`
    )
  }
  const objectKeys = Object.keys(selectors)
  return selectorCreator(
    objectKeys.map(key => selectors[key]),
    (...values) => {
      return values.reduce((composition, value, index) => {
        composition[objectKeys[index]] = value
        return composition
      }, {})
    }
  )
}
