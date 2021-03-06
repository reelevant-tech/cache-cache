
export interface CacheLayer {
  readonly type: AvailableCacheLayer
  /**
   * Fetch a object with its associated key in this layer
   * @param key the key that was used to store the object
   * @returns the object stored or undefined if it's not stored
   */
  getWithNamespace<T extends object | string | null | undefined> (namespace: string, key: string): Promise<T | undefined>
  get<T extends object | string | null | undefined> (key: string): Promise<T | undefined>
  /**
   * Cache a specific object and its associated key inside the layer
   * @param key the key at which the object will be stored, used to fetch it back
   * @param object arbitrary object to store
   * @param [ttl] override default ttl of the layer
   */
  setWithNamespace<T extends object | string | null | undefined> (namespace: string, key: string, object: T, ttl?: number): Promise<void>
  set<T extends object | string | null | undefined> (key: string, object: T, ttl?: number): Promise<void>

  /**
   * Clear the specific cache layer for a given key
   * @param key the key at which the object will be stored, used to fetch it back
   */
  clearWithNamespace (namespace: string, key: string): Promise<void>
  clear (key: string): Promise<void>
}

export interface CacheLayerOptions {
  /**
   * Default Time-To-Live for all keys on this layer
   */
  ttl: number,
  /**
   * When applying a custom ttl to a specific key you may want to increase the TTL
   * for a given layer, you can use this multiplier that will be applied to compute the
   * final TTL for the layer.
   */
  ttlMultiplier?: number
  /**
   * How much time to wait for the cache to respond when fetching a key
   * if it reach the timeout, the next layer will be called (or if no layer is left)
   * it will call the original function.
   */
  timeout?: number
  /**
   * Shallow errors should be set as true if you want to ignore all caches issues
   * (like failing to connect to a redis server) and fallback to undefined
   */
  shallowErrors?: boolean
}

export enum AvailableCacheLayer {
  MEMORY = 'MEMORY',
  REDIS = 'REDIS'
}
