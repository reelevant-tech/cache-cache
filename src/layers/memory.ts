
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
  readonly store: LRU<string, object | string>

  constructor (options: MemoryCacheLayerOptions) {
    this.options = options
    this.store = new LRU<string, object | string>({
      max: this.options.maxEntries,
      maxAge: this.options.ttl
    })
  }

  async get<T extends object | string>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined
  }

  set<T extends object | string>(key: string, object: T, ttl?: number): void {
    this.store.set(key, object, ttl)
  }

  clear (key: string): void {
    this.store.del(key)
  }
}