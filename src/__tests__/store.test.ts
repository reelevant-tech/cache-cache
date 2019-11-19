import test from 'ava'
import { getStore } from '../index'
import { AvailableCacheLayer } from '../types/layer'

test('should works with default config', async t => {
  const cache = getStore()
  t.assert(cache.layers.length === 1)
  t.assert(cache.layers[0].type === AvailableCacheLayer.MEMORY)
  cache.set('test', 'toto')
  t.deepEqual(await cache.layers[0].get('test'), 'toto')
  t.deepEqual(await cache.get('test'), 'toto')
})

test('should be able to override default config', async t => {
  const cache = getStore({
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
  t.assert(cache.layers.length === 2)
  t.assert(cache.layers.every(layer => layer.type === AvailableCacheLayer.MEMORY))
  cache.set('test', 'toto')
  t.deepEqual(await cache.layers[0].get('test'), 'toto')
  t.deepEqual(await cache.layers[1].get('test'), 'toto')
  t.deepEqual(await cache.get('test'), 'toto')
})