
import { CacheLayer, AvailableCacheLayer, CacheLayerOptions } from '../types/layer'
import IORedis from 'ioredis'
import of from '../utils/of'

export interface RedisCacheLayerOptions extends CacheLayerOptions {
  /**
   * Provide your own ioredis client
   */
  redisClient: IORedis.Redis,
  /**
   * A custom prefix used to differenciate keys
   * By default memoized function use their name as prefix
   */
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
    this.prefix = `${this.options.prefix ?? randomPrefix}:`
  }

  private getCacheKey (key: string) {
    return `${this.prefix}${key}`
  }

  async get<T extends string | object> (key: string): Promise<T | undefined> {
    const promises: Array<Promise<string | undefined | null>> = [
      this.client.get(this.getCacheKey(key))
    ]
    if (this.options.timeout !== undefined) {
      promises.push(this.sleep(this.options.timeout))
    }
    const [ result, err ] = await of(Promise.race(promises))
    if (err !== undefined && this.options.shallowErrors !== true) {
      throw err
    }

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

  async set<T extends object | string> (key: string, object: T, ttl?: number): Promise<void> {
    const customTTL = ttl !== undefined ? ttl * (this.options.ttlMultiplier ?? 1) : undefined
    const value = typeof object !== 'string' ? JSON.stringify(object) : (object as string)
    const res = await of(this.client.set(this.getCacheKey(key), value, 'PX', customTTL ?? this.options.ttl))
    if (res[1] !== undefined && this.options.shallowErrors !== true) {
      throw res[1]
    }
  }

  async clear (key: string): Promise<void> {
    let res = await of(this.client.del(this.getCacheKey(key)))
    if (res[1] !== undefined && this.options.shallowErrors !== true) {
      throw res[1]
    }
  }

  private sleep (timeout: number): Promise<undefined> {
    return new Promise((resolve) => {
      return setTimeout(resolve, timeout)
    })
  }
}
