
import { CacheLayer, AvailableCacheLayer } from '../types/layer'
import IORedis from 'ioredis'

export type RedisCacheLayerOptions = {
  ttl: number,
  redisClient: IORedis.Redis,
  prefix?: string
}

export class RedisCacheLayer implements CacheLayer {
  readonly type = AvailableCacheLayer.REDIS
  private options: RedisCacheLayerOptions
  readonly client: IORedis.Redis
  private prefix: string

  constructor (options: RedisCacheLayerOptions) {
    this.options = options
    this.client = this.options.redisClient
    const randomPrefix = Math.random().toString(36).substring(2, 15)
    this.prefix = `${this.options.prefix}:` ?? `${randomPrefix}:`
  }

  private getCacheKey (key: string) {
    return `${this.prefix}${key}`
  }

  async get<T extends string | object>(key: string): Promise<T | undefined> {
    const result = await this.client.get(this.getCacheKey(key))
    if (result === null || result === undefined) return undefined
    // check if it's not a json object, we can return as a string
    if (result[0] !== '{' && result[0] !== '[') {
      return result as T
    }
    // otherwise try to parse it
    try {
      const parsedResult = JSON.parse(result)
      return parsedResult as T
    } catch (err) {
      // if it fail, we can guess its just a string with { or [ leading char
      return result as T
    }
  }

  set<T extends object | string> (key: string, object: T, ttl?: number): void {
    const value = typeof object === 'object' ? JSON.stringify(object) : (object as string)
    this.client.set(this.getCacheKey(key), value, 'PX', ttl ?? this.options.ttl)
  }

  clear (key: string): void {
    this.client.del(this.getCacheKey(key))
  }
}