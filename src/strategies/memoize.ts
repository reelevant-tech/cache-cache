import { CacheLayerManagerOptions, CacheLayerManager } from '../layers/manager'
import { createHash } from 'crypto'
import { AvailableCacheLayer } from '../types/layer'

export type MemoizeFunctionOptions = CacheLayerManagerOptions
export type AsyncFunc<T extends object | string> = (...args: unknown[]) => Promise<T>

export const memoizeFunction = <T extends object | string>(
  original: AsyncFunc<T>,
  options: MemoizeFunctionOptions
): AsyncFunc<T> => {
  const redisLayer = options.layerConfigs[AvailableCacheLayer.REDIS]
  // if we use the redis layer and no one provided a prefix
  // we inject the function name if possible so it's easier to find it in the cache
  if (redisLayer !== undefined && redisLayer.prefix === undefined) {
    const randomPrefix = Math.random().toString(36).substring(2, 15)
    const prefix = original.name.length === 0 || original.name.includes('anonymous')
      ? randomPrefix : original.name
    redisLayer.prefix = prefix
  }
  const manager = new CacheLayerManager(options)
  // code that will be run when someone call our function
  const fn = async function (this: unknown, ...args: unknown[]) {
    // compute the hash for the given args
    const hash = createHash('sha1').update(JSON.stringify(args)).digest('base64')
    const value = await manager.get<T>(hash)
    // if the value is found inside caches, use it
    if (value !== undefined) return value
    // otherwise call the original function to compute the result
    const result = await original.call(this, ...args)
    // set the result in the caches
    manager.set(hash, result)
    return result
  }
  // used to access caches state when testing
  if (process.env.NODE_ENV === 'test') {
    Object.defineProperty(fn, '_cache_manager', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: manager
    })
  }
  return fn
}