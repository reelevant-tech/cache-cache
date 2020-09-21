
import { CacheLayer, AvailableCacheLayer, CacheLayerOptions } from '../types/layer'
import LRU from 'lru-cache'
import { getConfig } from '../utils/config'

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
  readonly lru: LRU<string, object | string | null | undefined>

  constructor (private options: MemoryCacheLayerOptions) {
    this.lru = new LRU<string, object | string>({
      max: this.getConfig<number>('maxEntries') ?? 100000,
      maxAge: this.getConfig<number>('ttl')
    })
  }

  private getConfig <T> (key: keyof MemoryCacheLayerOptions): T | undefined {
    return getConfig<MemoryCacheLayerOptions, T>(key, this.options, this.type)
  }

  async get<T extends object | string | null | undefined> (key: string): Promise<T | undefined> {
    // no race is implemented since fetching in memory is sync
    return this.lru.get(key) as T | undefined
  }

  async getWithNamespace<T extends object | string | null | undefined> (namespace: string, key: string) {
    return this.get<T>(`${namespace}-${key}`)
  }

  async set<T extends object | string | null | undefined> (key: string, object: T, ttl?: number): Promise<void> {
    const customTTL = ttl !== undefined ? ttl * (this.getConfig<number>('ttlMultiplier') ?? 1) : undefined
    this.lru.set(key, object, customTTL ?? this.getConfig<number>('ttl'))
  }

  async setWithNamespace<T extends object | string | null | undefined> (namespace: string, key: string, object: T, ttl?: number) {
    return this.set<T>(`${namespace}-${key}`, object, ttl)
  }

  async clear (key: string): Promise<void> {
    this.lru.del(key)
  }

  async clearWithNamespace (namespace: string, key: string): Promise<void> {
    return this.clear(`${namespace}-${key}`)
  }
}
