import test from 'ava'
import IORedis from 'ioredis'
import { AsyncFunc } from '../types/common'
import { getMemoize, useAsDefault } from '../index'
import { AvailableCacheLayer } from '../types/layer'
import { CacheLayerManager } from '../layers/manager'
import { MemoryCacheLayer } from '../layers/memory'

const redisClient = new IORedis({
  host: process.env.REDIS_HOST
})

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

  const patched = getMemoize<typeof asyncTest>(asyncTest, {
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

  const patched = getMemoize<typeof asyncTest>(asyncTest, {
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
  await store.set(key, { toto: 1 })
  // recall the memoized function
  t.deepEqual(await patched(), { toto: 1 })
})

test('should compute have two different key for different invokation', async t => {
  const asyncTest = async (t?: number) => {
    return {}
  }

  const patched = getMemoize<typeof asyncTest>(asyncTest, {
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
  await store.set(key, { toto: 1 })
  // recall the memoized function
  t.deepEqual(await patched(), { toto: 1 })
  // if we change the parameters, we should use another key
  t.deepEqual(await patched(1), {})
  t.assert(store.lru.keys().length === 2)
})

test('should correctly set prefix as function name', async t => {
  const asyncTest = async () => {
    return {}
  }

  const patched = getMemoize<typeof asyncTest>(asyncTest, {
    layerConfigs: {
      [AvailableCacheLayer.REDIS]: {
        ttl: 5000,
        redisClient
      }
    },
    layerOrder: [
      AvailableCacheLayer.REDIS
    ]
  })
  t.deepEqual(await patched(), {})
  const manager = getManager(patched)
  t.assert(manager.layers.length === 1)
  t.assert(manager.layers[0].type === AvailableCacheLayer.REDIS)
  const keys = await redisClient.keys('asyncTest:*')
  t.assert(keys.length === 1)
})

test('should correctly set a custom prefix', async t => {
  const asyncTest = async () => {
    return {}
  }

  useAsDefault({
    layerConfigs: {
      [AvailableCacheLayer.REDIS]: {
        ttl: 5000,
        redisClient
      }
    },
    layerOrder: [
      AvailableCacheLayer.REDIS
    ]
  })

  const patched = getMemoize<typeof asyncTest>(asyncTest, {
    layerConfigs: {
      [AvailableCacheLayer.REDIS]: {
        prefix: 'myPrefix'
      }
    }
  })
  t.deepEqual(await patched(), {})
  const manager = getManager(patched)
  t.assert(manager.layers.length === 1)
  t.assert(manager.layers[0].type === AvailableCacheLayer.REDIS)
  const keys = await redisClient.keys('myPrefix:*')
  t.assert(keys.length === 1)
})

test('should correctly use computeHash', async t => {
  const asyncTest = async (test: string, foo?: number) => {
    return {}
  }

  useAsDefault({
    layerConfigs: {
      [AvailableCacheLayer.REDIS]: {
        ttl: 5000,
        redisClient
      },
      [AvailableCacheLayer.MEMORY]: {
        ttl: 10,
        maxEntries: 1
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY,
      AvailableCacheLayer.REDIS
    ]
  })

  const patched = getMemoize<typeof asyncTest>(asyncTest, {
    layerConfigs: {
      [AvailableCacheLayer.REDIS]: {
        prefix: 'myPrefix2'
      }
    },
    computeHash: (args) => {
      t.deepEqual(args, ['test'])
      return 'my-hash'
    }
  })
  t.deepEqual(await patched('test'), {})
  const manager = getManager(patched)
  t.assert(manager.layers.length === 2)
  t.assert(manager.layers[1].type === AvailableCacheLayer.REDIS)
  const keys = await redisClient.keys('myPrefix2:my-hash')
  t.assert(keys.length === 1)
})

test('should work with null', async t => {
  t.plan(6)
  const asyncTest = async () => {
    t.true(true) // ensure fn is called two time only (memory+redis)
    return null
  }

  useAsDefault({
    layerConfigs: {
      [AvailableCacheLayer.REDIS]: {
        ttl: 5000,
        redisClient
      },
      [AvailableCacheLayer.MEMORY]: {
        ttl: 10,
        maxEntries: 1
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY,
      AvailableCacheLayer.REDIS
    ]
  })

  const patchedWithMemory = getMemoize<typeof asyncTest>(asyncTest, {
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  t.deepEqual(await patchedWithMemory(), null)
  t.deepEqual(await patchedWithMemory(), null)

  const patchedWithRedis = getMemoize<typeof asyncTest>(asyncTest, {
    layerConfigs: {
      [AvailableCacheLayer.REDIS]: {
        prefix: 'null-test'
      }
    },
    layerOrder: [
      AvailableCacheLayer.REDIS
    ]
  })
  t.deepEqual(await patchedWithRedis(), null)
  t.deepEqual(await patchedWithRedis(), null)
})

test('should work with undefined', async t => {
  const asyncTest = async () => {
    return undefined
  }

  useAsDefault({
    layerConfigs: {
      [AvailableCacheLayer.REDIS]: {
        ttl: 5000,
        redisClient
      },
      [AvailableCacheLayer.MEMORY]: {
        ttl: 10,
        maxEntries: 1
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY,
      AvailableCacheLayer.REDIS
    ]
  })

  const patchedWithMemory = getMemoize<typeof asyncTest>(asyncTest, {
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  t.deepEqual(await patchedWithMemory(), undefined)
  t.deepEqual(await patchedWithMemory(), undefined)

  const patchedWithRedis = getMemoize<typeof asyncTest>(asyncTest, {
    layerConfigs: {
      [AvailableCacheLayer.REDIS]: {
        prefix: 'undefined-test'
      }
    },
    layerOrder: [
      AvailableCacheLayer.REDIS
    ]
  })
  t.deepEqual(await patchedWithRedis(), undefined)
  t.deepEqual(await patchedWithRedis(), undefined)
})
