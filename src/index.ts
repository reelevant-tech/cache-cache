import { CacheLayerManagerOptions } from './layers/manager'
import { AvailableCacheLayer } from './types/layer'
import { memoizeFunction, AsyncFunc } from './strategies/memoize'
import { Cache } from './strategies/store'
import { mergeOptions, NestedPartial } from './utils/merge'

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

let currentConfig: CacheLayerManagerOptions = defaultConfig

export const useAsDefault = (options: CacheLayerManagerOptions) => {
  currentConfig = options
}

/**
 * Get a key/value cache with configured layers.
 * @param [options] {Types.CacheManagerOptions} default to memory-only cache or
 *  config given to `useAsDefault`
 */
export const getStore = (options?: NestedPartial<CacheLayerManagerOptions>) => {
  return new Cache(mergeOptions(currentConfig, options))
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
  options?: NestedPartial<CacheLayerManagerOptions>
) => {
  return memoizeFunction<T>(fn, mergeOptions(currentConfig, options))
}

/**
 * Use this decorator to memoize a specific function.
 * The original function need to be `async` since the cache can be asynchronous.
 *
 * @param [options] {Types.CacheManagerOptions} default to memory-only cache or
 *  config given to `useAsDefault`
 */
export const Memoize = <T extends object | string>(
  options?: NestedPartial<CacheLayerManagerOptions>
) => {
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<AsyncFunc<T>>) => {
    if (descriptor.value !== undefined) {
      descriptor.value = memoizeFunction<T>(descriptor.value, mergeOptions(currentConfig, options))
    } else {
      throw new Error('Memoize decorator only available for async function.')
    }
  }
}

export { AvailableCacheLayer } from './types/layer'
export { CacheLayerManagerOptions } from './layers/manager'
