
import { CacheLayer, AvailableCacheLayer, CacheLayerOptions } from '../types/layer'
import LRU from 'lru-cache'

export interface MemoryCacheLayerOptions extends CacheLayerOptions {
  /**
   * Maximum number of keys to store inside the in-memory cache, if it's reached
   * the cache implement the `least-recently-used` algorithm, see
   * https://github.com/isaacs/node-lru-cache
   * 
   * default to 100000 keys
   */
  maxEntries?: number
}

/**
 * A cache layer that use memory to store content.
 */
export class MemoryCacheLayer implements CacheLayer {

  readonly type = AvailableCacheLayer.MEMORY
  private options: MemoryCacheLayerOptions
  readonly lru: LRU<string, object | string>

  constructor (options: MemoryCacheLayerOptions) {
    this.options = options
    this.lru = new LRU<string, object | string>({
      max: this.options.maxEntries ?? 100000,
      maxAge: this.options.ttl
    })
  }

  async get<T extends object | string>(key: string): Promise<T | undefined> {
    // no race is implemented since fetching in memory is sync
    return this.lru.get(key) as T | undefined
  }

  set<T extends object | string>(key: string, object: T, ttl?: number): void {
    const customTTL = ttl !== undefined ? ttl * (this.options.ttlMultiplier ?? 1) : undefined
    this.lru.set(key, object, customTTL ?? this.options.ttl)
  }

  clear (key: string): void {
    this.lru.del(key)
  }
}