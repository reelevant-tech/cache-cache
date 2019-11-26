
import { CacheLayer, AvailableCacheLayer, CacheLayerOptions } from '../types/layer'
import IORedis from 'ioredis'
import of from '../utils/of'
import { getConfig } from '../utils/config'

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
  /**
   * A namespace that will be added before the prefix
   */
  namespace?: string
}

export class RedisCacheLayer implements CacheLayer {
  readonly type = AvailableCacheLayer.REDIS

  constructor (private options: RedisCacheLayerOptions) {}

  private getCacheKey (key: string) {
    return `${this.namespace}${this.prefix}${key}`
  }

  private getConfig <T> (key: keyof RedisCacheLayerOptions): T | undefined {
    return getConfig<RedisCacheLayerOptions, T>(key, this.options, this.type)
  }

  async get<T extends string | object> (key: string): Promise<T | undefined> {
    const promises: Array<Promise<string | undefined | null>> = [
      this.client.get(this.getCacheKey(key))
    ]
    const timeout = this.getConfig<number>('timeout')
    if (timeout !== undefined) {
      promises.push(this.sleep(timeout))
    }
    const [ result, err ] = await of(Promise.race(promises))
    if (err !== undefined && this.getConfig('shallowErrors') !== true) {
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
      return (parsedResult?.type === 'Buffer' ? Buffer.from(parsedResult) : parsedResult) as T
    } catch (err) {
      // if it fail, we can guess its just a string with { or [ leading char
      return result as T
    }
  }

  async set<T extends object | string> (key: string, object: T, ttl?: number): Promise<void> {
    const customTTL = ttl !== undefined ? ttl * (this.getConfig<number>('ttlMultiplier') ?? 1) : undefined
    const value = typeof object !== 'string' ? JSON.stringify(object) : (object as string)
    const res = await of(this.client.set(this.getCacheKey(key), value, 'PX', customTTL ?? this.getConfig<number>('ttl')))
    if (res[1] !== undefined && this.getConfig('shallowErrors') !== true) {
      throw res[1]
    }
  }

  async clear (key: string): Promise<void> {
    let res = await of(this.client.del(this.getCacheKey(key)))
    if (res[1] !== undefined && this.getConfig('shallowErrors') !== true) {
      throw res[1]
    }
  }

  private sleep (timeout: number): Promise<undefined> {
    return new Promise((resolve) => {
      return setTimeout(resolve, timeout)
    })
  }

  get prefix () {
    const prefix = this.getConfig<string>('prefix')
    return prefix ? `${prefix}:` : ''
  }

  get namespace () {
    const namespace = this.getConfig<string>('namespace')
    return namespace ? `${namespace}:` : ''
  }

  get client (): IORedis.Redis {
    const redis = this.getConfig<IORedis.Redis>('redisClient')
    if (redis === undefined) {
      throw new Error(`RedisCacheLayer cannot be instanciated without a redisClient`)
    } else {
      return redis
    }
  }
}
