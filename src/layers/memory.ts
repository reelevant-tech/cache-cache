
import { CacheLayer, AvailableCacheLayer } from '../types/layer'
import LRU from 'lru-cache'

export type MemoryCacheLayerOptions = {
  ttl: number,
  maxEntries: number
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
      max: this.options.maxEntries,
      maxAge: this.options.ttl
    })
  }

  async get<T extends object | string>(key: string): Promise<T | undefined> {
    return this.lru.get(key) as T | undefined
  }

  set<T extends object | string>(key: string, object: T, ttl?: number): void {
    this.lru.set(key, object, ttl)
  }

  clear (key: string): void {
    this.lru.del(key)
  }
}