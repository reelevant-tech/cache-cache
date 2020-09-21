import test from 'ava'
import { MemoryCacheLayer } from '../memory'

const sleep = (timeout: number): Promise<undefined> => {
  return new Promise((resolve) => {
    return setTimeout(resolve, timeout)
  })
}

test.serial('layer should implement TTL correctly', async t => {
  const layer = new MemoryCacheLayer({
    ttl: 100
  })
  await layer.set('test', 'toto')
  await sleep(200)
  const value = await layer.get('test')
  // ttl should have invalided the key
  t.assert(value === undefined)
})

test.serial('layer should be able to override TTL correctly', async t => {
  const layer = new MemoryCacheLayer({
    ttl: 5000
  })
  await layer.set('test', 'toto', 100)
  await sleep(200)
  const value = await layer.get('test')
  // ttl should have invalided the key
  t.assert(value === undefined)
})

test.serial('layer should implement TTL multiplier correctly', async t => {
  const layer = new MemoryCacheLayer({
    ttl: 5000,
    ttlMultiplier: 0.1
  })
  // should normally override to 1s of ttl
  // but with the multiplier, its actually 100ms
  await layer.set('test', 'toto', 1000)
  await sleep(200)
  const value = await layer.get('test')
  // overriden ttl should have invalided the key
  t.assert(value === undefined)
})

test.serial('layer should works with namespace', async t => {
  const layer = new MemoryCacheLayer({
    ttl: 1000
  })
  await layer.setWithNamespace('foo', 'bar', '12')
  t.is(await layer.getWithNamespace('foo', 'bar'), '12')
  await layer.clearWithNamespace('foo', 'bar')
  t.is(await layer.getWithNamespace('foo', 'bar'), undefined)
})
