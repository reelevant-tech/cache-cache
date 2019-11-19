import test from 'ava'
import { Memoize } from '../index'
import { CacheLayerManager } from '../layers/manager'
import { AsyncFunc } from '../strategies/memoize'
import { MemoryCacheLayer } from '../layers/memory'
import { AvailableCacheLayer } from '../types/layer'

/**
 * Get the cache layer manager for a given memoized function
 * @param fn the memoized function
 */
const getManager = (fn: AsyncFunc<Object>): CacheLayerManager => {
  const manager = Object.getOwnPropertyDescriptor(fn, '_cache_manager')
  if (manager?.value === undefined) throw new Error(`Are you sure you are running in test env ?`)
  return manager.value as CacheLayerManager
}

test('should works with default config', async t => {
  class Test {
    @Memoize<Object>()
    static async toto () {
      return {}
    }
  }

  t.deepEqual(await Test.toto(), {})
  const manager = getManager(Test.toto)
  t.assert(manager.layers.length === 1)
  const store = manager.layers[0] as MemoryCacheLayer
  // should have stored one value
  t.assert(store.lru.length === 1)
  // should have stored an empty array
  t.deepEqual(store.lru.values()[0], {})
})

test('should throw if decorated fonction is a getter', async t => {
  try {
    class Test {
      // @ts-ignore
      @Memoize<Object>()
      static get toto () {
        return {}
      }
    }
    new Test()
  }
  catch (error) {
    t.assert(error.includes('decorator only available for'))
  }
})

test('should be able to override default config', async t => {
  class Test {
    @Memoize<Object>({
      layerConfigs: {
        [AvailableCacheLayer.MEMORY]: {
          ttl: 5000,
          maxEntries: 1
        }
      },
      layerOrder: [
        AvailableCacheLayer.MEMORY,
        AvailableCacheLayer.MEMORY
      ]
    })
    static async toto () {
      return {}
    }
  }
  t.deepEqual(await Test.toto(), {})
  const manager = getManager(Test.toto)
  t.assert(manager.layers.length === 2)
  t.assert(manager.layers.every(layer => layer.type === AvailableCacheLayer.MEMORY))
  const store = manager.layers[0] as MemoryCacheLayer
  // should have stored one value
  t.assert(store.lru.length === 1)
  // should have stored an empty array
  t.deepEqual(store.lru.values()[0], {})
})