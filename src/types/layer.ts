

export interface CacheLayer {
  readonly type: AvailableCacheLayer
  /**
   * Fetch a object with its associated key in this layer
   * @param key the key that was used to store the object
   * @returns the object stored or undefined if it's not stored
   */
  get<T extends object | string>(key: string): Promise<T | undefined>
  /**
   * Cache a specific object and its associated key inside the layer
   * @param key the key at which the object will be stored, used to fetch it back
   * @param object arbitrary object to store
   * @param [ttl] override default ttl of the layer
   */
  set<T extends object | string>(key: string, object: T, ttl?: number): void

  /**
   * Clear the specific cache layer for a given key
   * @param key the key at which the object will be stored, used to fetch it back
   */
  clear (key: string): void
}

export enum AvailableCacheLayer {
  MEMORY,
  REDIS
}