import { CacheLayerManagerOptions, CacheLayerManager } from '../layers/manager'
import { createHash } from 'crypto'
import { AvailableCacheLayer } from '../types/layer'
import { currentConfig } from '../utils/config'
import { Func, AsyncFunc, Parameters, ReturnType } from '../types/common'

export type MemoizeFunctionOptions<T> = CacheLayerManagerOptions & {
  // Allow user to define a custom function to compute his function hash
  computeHash?: (args: Parameters<T>) => string
}

export const memoizeFunction = <T extends object | string>(
  original: Func<T>,
  partial: Partial<MemoizeFunctionOptions<T>>
): AsyncFunc<T> => {
  let manager: CacheLayerManager | undefined
  let options: MemoizeFunctionOptions<T>
  // code that will be run when someone call our function
  const fn = async function (this: unknown, ...args: Parameters<T>) {
    if (manager === undefined) {
      options = {
        ...partial,
        layerConfigs: { ...currentConfig.layerConfigs, ...partial.layerConfigs },
        layerOrder: partial.layerOrder || currentConfig.layerOrder
      }
      const redisLayer = options.layerConfigs?.[AvailableCacheLayer.REDIS]
      // if we use the redis layer and no one provided a prefix
      // we inject the function name if possible so it's easier to find it in the cache
      const funcFasName = original.name.length > 0 && !original.name.includes('anonymous')
      if (redisLayer !== undefined && redisLayer.prefix === undefined && funcFasName) {
        redisLayer.prefix = original.name
      }
      manager = new CacheLayerManager(options)
      // attach the cache manager to the fn if low level access is needed
      Object.defineProperty(fn, '_cache_manager', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: manager
      })
    }
    // compute the hash for the given args
    let hash: string
    if (options.computeHash) {
      hash = options.computeHash(args)
    } else {
      hash = createHash('sha1').update(JSON.stringify(args)).digest('base64')
    }
    const value = await manager.get<ReturnType<T>>(hash)
    // if the value is found inside caches, use it
    if (value !== undefined) return value
    // otherwise call the original function to compute the result
    // tslint:disable-next-line: await-promise
    const result = await original.call(this, ...args)
    // set the result in the caches
    await manager.set<ReturnType<T>>(hash, result)
    return result
  }
  return fn
}
