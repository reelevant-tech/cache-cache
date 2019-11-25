import test from 'ava'
import { Memoize, useAsDefault } from '../index'
import { CacheLayerManager } from '../layers/manager'
import { AsyncFunc } from '../strategies/memoize'
import { AvailableCacheLayer } from '../types/layer'
import { MemoryCacheLayer } from '../layers/memory'

/**
 * Get the cache layer manager for a given memoized function
 * @param fn the memoized function
 */
const getManager = (fn: AsyncFunc<Object>): CacheLayerManager => {
  const manager = Object.getOwnPropertyDescriptor(fn, '_cache_manager')
  if (manager?.value === undefined) throw new Error(`Are you sure you are running in test env ?`)
  return manager.value as CacheLayerManager
}

const sleep = (timeout: number): Promise<undefined> => {
  return new Promise((resolve) => {
    return setTimeout(resolve, timeout)
  })
}

test('should works with default config', async t => {
  useAsDefault({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 10000
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY,
      AvailableCacheLayer.MEMORY
    ]
  })
  class Test {
    @Memoize<Object>()
    // @ts-ignore
    static async toto () {
      return {}
    }
  }

  t.deepEqual(await Test.toto(), {})
  const manager = getManager(Test.toto)
  t.assert(manager.layers.length === 2)
  t.assert(manager.layers[0].type === AvailableCacheLayer.MEMORY)
  t.assert(manager.layers[1].type === AvailableCacheLayer.MEMORY)
})

test('should be able to overide layerOrder for each method', async t => {
  useAsDefault({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 10000
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY,
      AvailableCacheLayer.MEMORY
    ]
  })
  class Test {
    @Memoize<Object>({
      layerOrder: [
        AvailableCacheLayer.MEMORY
      ]
    })
    // @ts-ignore
    static async toto () {
      return {}
    }
  }

  t.deepEqual(await Test.toto(), {})
  const manager = getManager(Test.toto)
  t.assert(manager.layers.length === 1)
  t.assert(manager.layers[0].type === AvailableCacheLayer.MEMORY)
})

test('should be able to overide layerConfigs for each method', async t => {
  useAsDefault({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 10000
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  class Test {
    @Memoize<Object>({
      layerConfigs: {
        [AvailableCacheLayer.MEMORY]: {
          ttl: 100
        }
      }
    })
    // @ts-ignore
    static async toto () {
      return {}
    }
  }

  t.deepEqual(await Test.toto(), {})
  const manager = getManager(Test.toto)
  t.assert(manager.layers.length === 1)
  t.assert(manager.layers[0].type === AvailableCacheLayer.MEMORY)
  const layer = manager.layers[0] as MemoryCacheLayer
  const key = layer.lru.keys()[0]
  t.assert(key !== undefined)
  await sleep(200)
  t.assert(layer.lru.get(key) === undefined)
})

test('should be able to change default config at runtime', async t => {
  useAsDefault({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 10000
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  class Test {
    @Memoize<Object>()
    // @ts-ignore
    static async toto () {
      return {}
    }
  }

  t.deepEqual(await Test.toto(), {})
  const manager = getManager(Test.toto)
  t.assert(manager.layers.length === 1)
  t.assert(manager.layers[0].type === AvailableCacheLayer.MEMORY)
  const layer = manager.layers[0] as MemoryCacheLayer
  t.assert(layer.lru.keys()[0] !== undefined)
  layer.lru.reset()
  t.assert(layer.lru.keys()[0] === undefined)
  useAsDefault({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 100
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  t.deepEqual(await Test.toto(), {})
  const key = layer.lru.keys()[0]
  t.assert(key !== undefined)
  await sleep(200)
  t.assert(layer.lru.get('key') === undefined)
})
