import test from 'ava'
import { memoizeFunction, AsyncFunc } from '../memoize'
import { AvailableCacheLayer } from '../../types/layer'
import { CacheLayerManager } from '../../layers/manager'
import { MemoryCacheLayer } from '../../layers/memory'

/**
 * Get the cache layer manager for a given memoized function
 * @param fn the memoized function
 */
const getManager = (fn: AsyncFunc<Object>): CacheLayerManager => {
  const manager = Object.getOwnPropertyDescriptor(fn, '_cache_manager')
  if (manager?.value === undefined) throw new Error(`Are you sure you are running in test env ?`)
  return manager.value as CacheLayerManager
}

test('should correctly store fn result inside the cache', async t => {
  const asyncTest = async () => {
    return {}
  }

  const patched = memoizeFunction<Object>(asyncTest, {
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 1000
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  t.deepEqual(await patched(), {})
  const manager = getManager(patched)
  t.assert(manager.layers.length === 1)
  const store = manager.layers[0] as MemoryCacheLayer
  // should have stored one value
  t.assert(store.lru.length === 1)
  // should have stored an empty array
  t.deepEqual(store.lru.values()[0], {})
})

test('should correctly fetch from cache if the result is already there', async t => {
  const asyncTest = async () => {
    return {}
  }

  const patched = memoizeFunction<Object>(asyncTest, {
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 1000
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  t.deepEqual(await patched(), {})
  const manager = getManager(patched)
  t.assert(manager.layers.length === 1)
  const store = manager.layers[0] as MemoryCacheLayer
  const key = store.lru.keys()[0]
  // set the cache to another value
  store.set(key, { toto: 1 })
  // recall the memoized function
  t.deepEqual(await patched(), { toto: 1 })
})


test('should compute have two different key for different invokation', async t => {
  const asyncTest = async () => {
    return {}
  }

  const patched = memoizeFunction<Object>(asyncTest, {
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 1000
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  t.deepEqual(await patched(), {})
  const manager = getManager(patched)
  t.assert(manager.layers.length === 1)
  const store = manager.layers[0] as MemoryCacheLayer
  const key = store.lru.keys()[0]
  // set the cache to another value
  store.set(key, { toto: 1 })
  // recall the memoized function
  t.deepEqual(await patched(), { toto: 1 })
  // if we change the parameters, we should use another key
  t.deepEqual(await patched(1), {})
  t.assert(store.lru.keys().length === 2)
})