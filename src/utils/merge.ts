
import { CacheLayerManagerOptions } from '../layers/manager'

export type NestedPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer R> ? Array<NestedPartial<R>> : NestedPartial<T[K]>
}

const deepAssign = (target: any, ...sources: Object[]) => {
  sources.forEach(function (source) {
    Object.entries(source).forEach(([key, value]) => {
      if (key === `__proto__`) {
        return
      }
      if (typeof value !== `object` || value === null) {
        target[key] = value
        return
      }
      if (Array.isArray(value)) {
        target[key] = []
      }
      // value is an Object
      if (typeof target[key] !== `object` || !target[key]) {
        target[key] = {}
      }
      deepAssign(target[key], value)
    })
  })
  return target
}

export const mergeOptions = (
  base: CacheLayerManagerOptions,
  partial?: NestedPartial<CacheLayerManagerOptions>
) => {
  if (partial === undefined) return base
  // deep copy of the base
  const flatBase = JSON.parse(JSON.stringify(base)) as typeof partial
  // deep copy of the partial
  const flastPartial = JSON.parse(JSON.stringify(partial)) as typeof partial
  const finalOptions = deepAssign(flatBase, flastPartial)

  // special case for the redis client that need to be a ref
  if (base.layerConfigs.REDIS?.redisClient !== undefined && finalOptions.layerConfigs?.REDIS !== undefined) {
    finalOptions.layerConfigs.REDIS.redisClient = base.layerConfigs.REDIS.redisClient
  }
  if (partial?.layerConfigs?.REDIS?.redisClient !== undefined && finalOptions.layerConfigs?.REDIS !== undefined) {
    finalOptions.layerConfigs.REDIS.redisClient = partial.layerConfigs.REDIS.redisClient
  }
  return finalOptions as CacheLayerManagerOptions
}
