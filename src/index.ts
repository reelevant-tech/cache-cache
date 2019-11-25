import { CacheLayerManagerOptions } from './layers/manager'
import { AvailableCacheLayer } from './types/layer'
import { memoizeFunction, AsyncFunc, MemoizeFunctionOptions } from './strategies/memoize'

type NestedPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer R> ? Array<NestedPartial<R>> : NestedPartial<T[K]>
}

const defaultConfig: CacheLayerManagerOptions = {
  layerConfigs: {
    [AvailableCacheLayer.MEMORY]: {
      ttl: 15 * 1000
    }
  },
  layerOrder: [
    AvailableCacheLayer.MEMORY
  ]
}

export let currentConfig: CacheLayerManagerOptions = defaultConfig

export const useAsDefault = (options: CacheLayerManagerOptions) => {
  currentConfig = options
}

/**
 * Get a key/value cache with configured layers.
 * @param [options] {Types.CacheManagerOptions} default to memory-only cache or
 *  config given to `useAsDefault`
 */
export const getStore = (options?: NestedPartial<CacheLayerManagerOptions>) => {
  // Why is this lazy loaded ? Good question !
  // When we require the CacheLayerManager, it requires the MemoryLayer which
  // in turns require the Config, which then require the index (since it access currentConfig)
  // which then require the Store strategy, which try to require the CacheLayerManager
  // BUT it hasn't been loaded yet, so its undefined.
  // So we are forced to lazy load the strategy to be sure that the CacheLayerManager is here
  const { Cache } = require('./strategies/store')
  return new Cache(Object.assign({}, currentConfig, options))
}

/**
 * Return a memoized function with current layers.
 * The original function need to be `async` since the cache can be asynchronous.
 *
 * @param [options] {Types.CacheManagerOptions} default to memory-only cache or
 *  config given to `useAsDefault`
 */
export const getMemoize = <T extends object | string>(
  fn: AsyncFunc<T>,
  options?: NestedPartial<MemoizeFunctionOptions>
) => {
  return memoizeFunction<T>(fn, Object.assign({}, currentConfig as MemoizeFunctionOptions, options))
}

/**
 * Use this decorator to memoize a specific function.
 * The original function need to be `async` since the cache can be asynchronous.
 *
 * @param [options] {Types.CacheManagerOptions} default to memory-only cache or
 *  config given to `useAsDefault`
 */
export const Memoize = <T extends object | string>(
  options?: NestedPartial<MemoizeFunctionOptions>
) => {
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<AsyncFunc<T>>) => {
    if (descriptor.value !== undefined) {
      descriptor.value = memoizeFunction<T>(descriptor.value, Object.assign({}, currentConfig as MemoizeFunctionOptions, options))
    } else {
      throw new Error('Memoize decorator only available for async function.')
    }
  }
}

export { AvailableCacheLayer } from './types/layer'
export { CacheLayerManagerOptions } from './layers/manager'
