
import { CacheLayerManagerOptions } from '../layers/manager'
import { MemoizeFunctionOptions } from '../strategies/memoize'

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
  partial?: NestedPartial<CacheLayerManagerOptions> | NestedPartial<MemoizeFunctionOptions>
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
  // special case for the computeHash method that need to be a ref
  // @ts-ignore Typescript don't want to use the `MemoizeFunctionOptions` type
  if (partial?.computeHash !== undefined) {
    // @ts-ignore
    finalOptions.computeHash = partial.computeHash
  }
  return finalOptions as CacheLayerManagerOptions
}
