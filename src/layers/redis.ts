
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
  namespace?: string,
  /**
   * Enable or not the hashmap mode. When enabled, cache-cache will use
   * redis' hashmaps (hget/hset) with namespace+prefix as key and hash as field
   */
  hashmap?: boolean
}

enum CommandAction {
  GET = 'get',
  SET = 'set',
  DEL = 'del'
}

export class RedisCacheLayer implements CacheLayer {
  readonly type = AvailableCacheLayer.REDIS

  constructor (private options: RedisCacheLayerOptions) {}

  private getCacheKey (key: string) {
    return `${this.namespace}${this.prefix}${key}`
  }

  private getCommandAndParams (action: CommandAction, key: string, value?: unknown, ttl?: number): () => Promise<any> {
    if (action === CommandAction.SET && (ttl === undefined || value === undefined)) {
      throw new Error('Invalid set command, ttl and value are required')
    }
    if (this.hashmap === true) {
      let hashmapKey = `${this.namespace}${this.prefix}`
      hashmapKey = hashmapKey.substr(0, hashmapKey.length - 1)
      switch (action) {
        case CommandAction.DEL:
          return () => this.client.hdel(hashmapKey, key)
        case CommandAction.GET:
          return () => this.client.hget(hashmapKey, key)
        case CommandAction.SET:
          return async () => {
            await this.client.hset(hashmapKey, key, value)
            return this.client.pexpire(hashmapKey, ttl!)
          }
      }
    }
    switch (action) {
      case CommandAction.DEL:
        return () => this.client.del(this.getCacheKey(key))
      case CommandAction.GET:
        return () => this.client.get(this.getCacheKey(key))
      case CommandAction.SET:
        return () => this.client.set(this.getCacheKey(key), value, 'PX', ttl)
    }
  }

  private getConfig <T> (key: keyof RedisCacheLayerOptions): T | undefined {
    return getConfig<RedisCacheLayerOptions, T>(key, this.options, this.type)
  }

  async get<T extends string | object | null | undefined> (key: string): Promise<T | undefined> {
    const promises: Array<Promise<string | undefined | null>> = [
      this.getCommandAndParams(CommandAction.GET, key)()
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
    if (result === 'undefined') return undefined as T
    try {
      const parsedResult = JSON.parse(result)
      return (parsedResult?.type === 'Buffer' ? Buffer.from(parsedResult) : parsedResult) as T
    } catch (err) {
      return result as T
    }
  }

  async set<T extends object | string | null | undefined> (key: string, object: T, ttl?: number): Promise<void> {
    const customTTL = ttl !== undefined ? ttl * (this.getConfig<number>('ttlMultiplier') ?? 1) : undefined
    const value = typeof object === 'undefined' ? 'undefined' : JSON.stringify(object)
    const res = await of(this.getCommandAndParams(CommandAction.SET, key, value, customTTL ?? this.getConfig<number>('ttl'))())
    if (res[1] !== undefined && this.getConfig('shallowErrors') !== true) {
      throw res[1]
    }
  }

  async clear (key: string): Promise<void> {
    let res = await of(this.getCommandAndParams(CommandAction.DEL, key)())
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

  get hashmap () {
    const hashmap = this.getConfig<boolean>('hashmap')
    if (hashmap === true && this.namespace === '' && this.prefix === '') {
      throw new Error('You need to configure prefix or namespace to use hashmap mode')
    }
    return hashmap
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
