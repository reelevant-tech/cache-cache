import { CacheLayerManagerOptions } from './layers/manager'
import { currentConfig } from './utils/config'
import { memoizeFunction, AsyncFunc, MemoizeFunctionOptions } from './strategies/memoize'
import { Cache } from './strategies/store'

type NestedPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer R> ? Array<NestedPartial<R>> : NestedPartial<T[K]>
}

export const useAsDefault = (options: CacheLayerManagerOptions) => {
  currentConfig.layerConfigs = options.layerConfigs
  currentConfig.layerOrder = options.layerOrder
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
  return memoizeFunction<T>(fn, options as MemoizeFunctionOptions)
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
      descriptor.value = getMemoize<T>(descriptor.value, options)
    } else {
      throw new Error('Memoize decorator only available for async function.')
    }
  }
}

export { AvailableCacheLayer } from './types/layer'
export { CacheLayerManagerOptions } from './layers/manager'
