import { CacheLayerManager, CacheLayerManagerOptions } from '../layers/manager'

export type CacheOptions = CacheLayerManagerOptions

/**
 * Currently the cache logic is pretty mutch the same as the CacheLayerManager
 * so we just override it, in the future some details might change
 */
export class Cache extends CacheLayerManager {
  constructor (options: CacheOptions) {
    super(options)
  }
}
