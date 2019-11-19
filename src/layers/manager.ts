
import { AvailableCacheLayer, CacheLayer } from '../types/layer'
import { MemoryCacheLayerOptions, MemoryCacheLayer } from './memory'
import { RedisCacheLayerOptions, RedisCacheLayer } from './redis'

export type CacheLayerManagerOptions = {
  layerConfigs: {
    [AvailableCacheLayer.REDIS]?: RedisCacheLayerOptions
    [AvailableCacheLayer.MEMORY]?: MemoryCacheLayerOptions
  }
  layerOrder: AvailableCacheLayer[]
}

export class CacheLayerManager {
  readonly layers: CacheLayer[] = []

  constructor (options: CacheLayerManagerOptions) {
    for (let layer of options.layerOrder) {
      const layerOption = options.layerConfigs[layer]
      if (layerOption === undefined) {
        throw new Error(`Layer ${layer} provided in order doesn't have associated config`)
      }
      switch (layer) {
        case AvailableCacheLayer.MEMORY: {
          this.layers.push(new MemoryCacheLayer(layerOption as MemoryCacheLayerOptions))
          break
        }
        case AvailableCacheLayer.REDIS: {
          this.layers.push(new RedisCacheLayer(layerOption as RedisCacheLayerOptions))
          break
        }
        default: {
          throw new Error(`Invalid layer (${layer}) provided`)
        }
      }
    }
    if (this.layers.length === 0) {
      throw new Error(`No layer has been defined`)
    }
  }

  async get<T extends object | string> (key: string): Promise<T | undefined> {
    for (let layer of this.layers) {
      const result = await layer.get<T>(key)
      if (result !== undefined) return result
    }
    return undefined
  }

  async set<T extends object | string> (key: string, object: T, ttl?: number): Promise<void> {
    for (let layer of this.layers) {
      await layer.set<T>(key, object, ttl)
    }
  }

  async clear (key: string) {
    for (let layer of this.layers) {
      await layer.clear(key)
    }
  }
}
