import test from 'ava'
import IORedis from 'ioredis'
import { RedisCacheLayer } from '../redis'
import { AvailableCacheLayer } from '../../types/layer'

const redisClient = new IORedis({
  host: process.env.REDIS_HOST
})

const sleep = (timeout: number): Promise<undefined> => {
  return new Promise((resolve) => {
    return setTimeout(resolve, timeout)
  })
}

test.afterEach(async t => {
  await redisClient.flushall()
})

test.serial('should instanciate redis but fail when setting if no client is given', async t => {
  t.throws(() => {
    // @ts-ignore
    const layer = new RedisCacheLayer({
      ttl: 5000
    })
    layer.client.set()
  })
})

test.serial('should instanciate redis layer succesfully', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000
  })
  t.assert(layer.type === AvailableCacheLayer.REDIS)
})

test.serial('should be able to use redis layer', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000
  })
  await layer.set('test', 'toto')
  const value = await layer.get('test')
  t.assert(value === 'toto')
  await layer.clear('test')
  const noValue = await layer.get('test')
  t.assert(noValue === undefined)
})

test.serial('layer should parse json value', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000
  })
  const toStore = { toto: 1 }
  await layer.set('test', toStore)
  const value = await layer.get<typeof toStore>('test')
  t.assert(value !== undefined && value.toto === 1)
})

test.serial('layer should try to parse json value but fallback to string (object)', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000
  })
  await layer.set('test', '{toto')
  const value = await layer.get('test')
  t.assert(value === '{toto')
})

test.serial('layer should try to parse json value but fallback to string (array)', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000
  })
  await layer.set('test', '[toto')
  const value = await layer.get('test')
  t.assert(value === '[toto')
})

test.serial('layer should timeout correctly', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    timeout: 10
  })
  await layer.set('test', 'toto')
  await redisClient.client('PAUSE', '200')
  const value = await layer.get('test')
  // should be timeout so undefined
  t.assert(value === undefined)
})

test.serial('layer should implement TTL correctly', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 100
  })
  await layer.set('test', 'toto')
  await sleep(200)
  const value = await layer.get('test')
  // ttl should have invalided the key
  t.assert(value === undefined)
})

test.serial('layer should be able to override TTL correctly', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000
  })
  await layer.set('test', 'toto', 100)
  await sleep(200)
  const value = await layer.get('test')
  // ttl should have invalided the key
  t.assert(value === undefined)
})

test.serial('layer should implement TTL multiplier correctly', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
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

test.serial('layer should set the correct prefix', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    prefix: 'myprefix'
  })
  await layer.set('test', 'toto')
  const value = await redisClient.get('myprefix:test')
  t.assert(value === '"toto"')
})

test.serial('layer should set the correct namespace', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    namespace: 'mynamespace'
  })
  await layer.set('test', 'toto')
  const value = await redisClient.get('mynamespace:test')
  t.assert(value === '"toto"')
})

test.serial('layer should set the correct namespace + prefix', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    namespace: 'mynamespace',
    prefix: 'myprefix'
  })
  await layer.set('test', 'toto')
  const value = await redisClient.get('mynamespace:myprefix:test')
  t.assert(value === '"toto"')
})

test.serial('should not throw if shallowErrors is set to true on get', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    prefix: 'myprefix',
    shallowErrors: true
  })
  await layer.set('test', 'toto')
  const value = await layer.get('test')
  t.assert(value === 'toto')
  const originalGet = redisClient.get
  redisClient.get = async () => {
    throw Error('randomError')
  }
  const noValue = await layer.get('test')
  t.assert(noValue === undefined)
  redisClient.get = originalGet
})

test.serial('should throw if shallowErrors is set to false on get', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    prefix: 'myprefix',
    shallowErrors: false
  })
  const originalGet = redisClient.get
  redisClient.get = async () => {
    throw Error('randomError')
  }
  await t.throwsAsync(() => layer.get('test'))
  redisClient.get = originalGet
})

test.serial('should not throw if shallowErrors is set to true on set', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    prefix: 'myprefix',
    shallowErrors: true
  })
  const originalSet = redisClient.set
  redisClient.set = async () => {
    throw Error('randomError')
  }
  await layer.set('test', 'toto')
  redisClient.set = originalSet
  const value = await layer.get('test')
  t.assert(value === undefined)
})

test.serial('should throw if shallowErrors is set to false on set', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    prefix: 'myprefix',
    shallowErrors: false
  })
  const originalSet = redisClient.set
  redisClient.set = async () => {
    throw Error('randomError')
  }
  await t.throwsAsync(() => layer.set('test', 'toto'))
  redisClient.set = originalSet
})

test.serial('should not throw if shallowErrors is set to true on clear', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    prefix: 'myprefix',
    shallowErrors: true
  })
  await layer.set('test', 'toto')
  const originalDel = redisClient.del
  redisClient.del = async () => {
    throw Error('randomError')
  }
  await layer.clear('test')
  redisClient.del = originalDel
  const value = await layer.get('test')
  t.assert(value === 'toto')
})

test.serial('should throw if shallowErrors is set to false on clear', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    prefix: 'myprefix',
    shallowErrors: false
  })
  const originalDel = redisClient.del
  redisClient.del = async () => {
    throw Error('randomError')
  }
  await t.throwsAsync(() => layer.clear('test'))
  redisClient.del = originalDel
})

test.serial('should be able to use redis layer with buffer', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000
  })
  const buf = Buffer.from('toto')
  await layer.set('test', buf)
  const value = await layer.get<Buffer>('test')
  t.assert(value instanceof Buffer)
  t.assert(Buffer.compare(buf, value) === 0)
})

test.serial('layer should not throw error on hashmap mode without prefix', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    hashmap: true,
    prefix: 'test'
  })
  await t.notThrowsAsync(() => layer.set('test', 'toto'), 'You need to configure prefix or namespace to use hashmap mode')
})

test.serial('layer should not throw error on hashmap mode without namespace', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    hashmap: true,
    namespace: 'test'
  })
  await t.notThrowsAsync(() => layer.set('test', 'toto'), 'You need to configure prefix or namespace to use hashmap mode')
})

test.serial('layer should throw error on hashmap mode without prefix or namespace', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    hashmap: true
  })
  await t.throwsAsync(() => layer.set('test', 'toto'), 'You need to configure prefix or namespace to use hashmap mode')
})

test.serial('layer should set the correct namespace + prefix with hashmap mode', async t => {
  const layer = new RedisCacheLayer({
    redisClient,
    ttl: 5000,
    hashmap: true,
    namespace: 'mynamespace',
    prefix: 'myprefix'
  })
  await layer.set('test', 'toto')
  await layer.set('test2', 'toto')
  const value = await redisClient.hget('mynamespace:myprefix', 'test')
  t.assert(value === '"toto"')
  const value2 = await redisClient.hget('mynamespace:myprefix', 'test2')
  t.assert(value2 === '"toto"')
  await layer.clear('test')
  const clearedValue = await redisClient.hget('mynamespace:myprefix', 'test')
  t.assert(clearedValue === null)
  const clearedValue2 = await redisClient.hget('mynamespace:myprefix', 'test2')
  t.assert(clearedValue2 === '"toto"')
})
