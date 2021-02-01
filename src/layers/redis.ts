
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

  private getCacheKey (namespace: string, key: string) {
    return `${namespace}${this.prefix}${key}`
  }

  private getCommandAndParams ({
    action, key, value, ttl, namespace: rawNamespace
  }: {
    action: CommandAction,
    key: string,
    namespace: string,
    value?: unknown,
    ttl?: number
  }): () => Promise<any> {
    if (action === CommandAction.SET && (ttl === undefined || value === undefined)) {
      throw new Error('Invalid set command, ttl and value are required')
    }
    const namespace = rawNamespace ? `${rawNamespace}:` : ''
    const hashmap = this.getConfig<boolean>('hashmap')
    if (hashmap === true) {
      if (this.prefix === '' && namespace === '') {
        throw new Error('You need to configure prefix or namespace to use hashmap mode')
      }
      let hashmapKey = `${namespace}${this.prefix}`
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
        return () => this.client.del(this.getCacheKey(namespace, key))
      case CommandAction.GET:
        return () => this.client.get(this.getCacheKey(namespace, key))
      case CommandAction.SET:
        return () => this.client.set(this.getCacheKey(namespace, key), value, 'PX', ttl)
    }
  }

  private getConfig <T> (key: keyof RedisCacheLayerOptions): T | undefined {
    return getConfig<RedisCacheLayerOptions, T>(key, this.options, this.type)
  }

  async get<T extends string | object | null | undefined> (key: string) {
    return this.getWithNamespace<T>(this.namespace, key)
  }

  async getWithNamespace<T extends string | object | null | undefined> (namespace: string, key: string): Promise<T | undefined> {
    const promises: Array<Promise<string | undefined | null>> = [
      this.getCommandAndParams({ action: CommandAction.GET, key, namespace })()
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
    try {
      return this.parse(result) as T
    } catch (err) {
      return result as T
    }
  }

  private stringify (data: unknown): string {
    if (typeof data === 'undefined') {
      return 'undefined'
    }
    return JSON.stringify(data, function replacer (key, value) {
      if (value instanceof Map) {
        return {
          type: 'Map',
          value: Array.from(value.entries())
        }
      } else {
        return value
      }
    })
  }

  private parse (data: string): any {
    if (data === 'undefined') {
      return undefined
    }
    return JSON.parse(data, function reviver (key, value) {
      if (typeof value === 'object' && value !== null) {
        if (value.type === 'Map') {
          return new Map(value.value)
        }
        if (value.type === 'Buffer') {
          return Buffer.from(value)
        }
      }
      return value
    })
  }

  async set (key: string, object: unknown, ttl?: number) {
    return this.setWithNamespace(this.namespace, key, object, ttl)
  }

  async setWithNamespace (namespace: string, key: string, object: unknown, ttl?: number): Promise<void> {
    const customTTL = ttl !== undefined ? ttl * (this.getConfig<number>('ttlMultiplier') ?? 1) : undefined
    const value = this.stringify(object)
    const res = await of(this.getCommandAndParams({
      action: CommandAction.SET,
      key, value,
      ttl: customTTL ?? this.getConfig<number>('ttl'),
      namespace
    })())
    if (res[1] !== undefined && this.getConfig('shallowErrors') !== true) {
      throw res[1]
    }
  }

  async clear (key: string) {
    return this.clearWithNamespace(this.namespace, key)
  }

  async clearWithNamespace (namespace: string, key: string): Promise<void> {
    let res = await of(this.getCommandAndParams({ action: CommandAction.DEL, key, namespace })())
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
    return namespace ?? ''
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
