
import test from 'ava'
import { CacheLayerManager } from '../manager'
import { AvailableCacheLayer } from '../../types/layer'

test('should fail to instanciate manager with invalid config', t => {
  t.throws(() => {
    new CacheLayerManager({
      layerConfigs: {},
      layerOrder: []
    })
  },
  /No layer has been defined/,
  'should fail because no layer is configured')

  t.throws(() => {
    new CacheLayerManager({
      layerConfigs: {},
      layerOrder: [
        AvailableCacheLayer.MEMORY
      ]
    })
  },
  /doesn't have associated config/,
  'should fail because no options is given to memory layer')

  t.throws(() => {
    new CacheLayerManager({
      layerConfigs: {
        // @ts-ignore
        42: {}
      },
      layerOrder: [
        // @ts-ignore
        42
      ]
    })
  },
  /Invalid layer/,
  'should fail because invalid layer type is provided')
})

test('should instanciate manager with memory layer', async t => {
  const manager = new CacheLayerManager({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 2
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  t.assert(manager instanceof CacheLayerManager)
})

test('manager with memory layer should works', async t => {
  const manager = new CacheLayerManager({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 2
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  manager.set('toto', 'tata')
  const value = await manager.get<string>('toto')
  t.assert(value !== undefined)
  t.assert(value === 'tata')
})

test('manager with memory layer should be able to clear a key', async t => {
  const manager = new CacheLayerManager({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 2
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY
    ]
  })
  manager.set('toto', 'tata')
  const value = await manager.get<string>('toto')
  t.assert(value !== undefined)
  t.assert(value === 'tata')
  manager.clear('toto')
  const noValue = await manager.get<string>('toto')
  t.assert(noValue === undefined)
})

test('manager should set value in both layer if provided', async t => {
  const manager = new CacheLayerManager({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 2
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY,
      AvailableCacheLayer.MEMORY
    ]
  })
  manager.set('toto', 'tata')
  for (let layer of manager.layers) {
    const value = await layer.get<string>('toto')
    t.assert(value === 'tata')
  }
})

test('manager should get in layer in the same order as provided', async t => {
  const manager = new CacheLayerManager({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 2
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY,
      AvailableCacheLayer.MEMORY
    ]
  })
  manager.set('toto', 'tata')
  // change value on upper cache
  manager.layers[1].set('toto', 'toto')
  const value = await manager.get<string>('toto')
  // verify that we correctly retrieve the value of the first layer
  t.assert(value === 'tata')
})

test('manager should get in second layer if first layer failed to find', async t => {
  const manager = new CacheLayerManager({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 2
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY,
      AvailableCacheLayer.MEMORY
    ]
  })
  manager.set('toto', 'tata')
  // clear first level cache
  manager.layers[0].clear('toto')
  const value = await manager.get<string>('toto')
  // verify that we correctly retrieve the value of the second layer
  t.assert(value === 'tata')
})

test('manager should clear keys in both layers', async t => {
  const manager = new CacheLayerManager({
    layerConfigs: {
      [AvailableCacheLayer.MEMORY]: {
        ttl: 5000,
        maxEntries: 2
      }
    },
    layerOrder: [
      AvailableCacheLayer.MEMORY,
      AvailableCacheLayer.MEMORY
    ]
  })
  manager.set('toto', 'tata')
  const value = await manager.get<string>('toto')
  // verify that we correctly retrieve the value
  t.assert(value === 'tata')
  // clear caches
  manager.clear('toto')
  // verify that all layers are empty
  const noValue = await manager.get<string>('toto')
  t.assert(noValue === undefined)
  t.deepEqual(await manager.layers[0].get('toto'), undefined)
  t.deepEqual(await manager.layers[1].get('toto'), undefined)
})