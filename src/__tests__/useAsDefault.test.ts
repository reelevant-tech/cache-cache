import test from 'ava'
import { Memoize, useAsDefault } from '../index'
import { CacheLayerManager } from '../layers/manager'
import { AsyncFunc } from '../strategies/memoize'
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
