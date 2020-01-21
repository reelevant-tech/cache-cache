# Cache-cache

<img src="https://i.imgur.com/jpUTpLQ.png">

[![Version](https://img.shields.io/npm/v/@rlvt/cache-cache.svg)](https://img.shields.io/npm/v/@rlvt/cache-cache.svg)
[![codecov](https://codecov.io/gh/Kiwup/cache-cache/branch/master/graph/badge.svg?token=W69VvAfXZh)](https://codecov.io/gh/Kiwup/cache-cache)
[![CircleCI](https://circleci.com/gh/Kiwup/cache-cache/tree/master.svg?style=svg)](https://circleci.com/gh/Kiwup/cache-cache/tree/master)

# Motivation

You are right, there are already a few package that does that:
- https://www.npmjs.com/package/petty-cache
- https://www.npmjs.com/package/redis-cache-fn
- https://www.npmjs.com/package/cache-manager

So why bother re-writting one from scratch ? Here are the reasons:
  - They are quite old, some are a mix of callback and promises, hard to maintain
  - Some packages doesn't handle multiple caches layer (in-memory/redis)
  - Generally expose a complex API to end user
  - When using redis as cache, they weren't handling failures from upstream servers (timeout, errors).

Our objectives when writting that package were simple:
  - Simply to use
  - Easy to read how it works
  - Typings (avoid quite a lof of errors)
  - Handle failures correctly:
    - When memoizing function we wanted to always do something, even if our cache is down, we wanted to call the expensive function instead of reporting an error even if it's slower.

# API

# Config

By default the package is configured to use the `MEMORY` cache layer with a TTL of 15s, you can of course change those default:
Each method accept a whole configuration, if you want to have a common one, you can use `useAsDefault`:
```ts

import { getMemoize, useAsDefault, AvailableCacheLayer } from '@rlvt/cache-cache'

// those default we be applied to all following new cache.
useAsDefault({
  layerConfigs: {
    [AvailableCacheLayer.MEMORY]: {
      ttl: 10 * 1000
    },
    [AvailableCachelayer.REDIS]: {
      ttl: 30 * 60 * 1000
    }
  },
  layerOrder: [
    AvailableCacheLayer.MEMORY,
    AvailableCacheLayer.REDIS
  ]
})

const expensiveFunction = async () => {
  // do something expensive
  return {}
}

// and you can override them per method if you want
const noMoreExpensive = getMemoize(expensiveFunction, {
  layerConfigs: {
    [AvailableCacheLayer.MEMORY]: {
      ttl: 10 * 1000
    }
  },
  layerOrder: [
    AvailableCacheLayer.MEMORY
  ]
})
```

Things to know:
- Each `getMemoize` call 

## Memoize a function

**NOTE**: You can only memoize `async` function since call to cache can be asynchronous

You currently have two API to memoize a function:

- if you are in Typescript, you can use the `@Memoize` decorator

```ts
import { Memoize } from '@rlvt/cache-cache'

@Memoize({
  layerConfigs: {
    [AvailableCacheLayer.MEMORY]: {
      ttl: 10 * 1000
    }
  },
  layerOrder: [
    AvailableCacheLayer.MEMORY
  ]
})
const expensiveFunction = async () => {
  // do something expensive
  return {}
}

// calling expensiveFunction will now automatically use the memoized version

```

- Use the `getMemoize` API:
```ts
import { Memoize } from '@rlvt/cache-cache'

const expensiveFunction = async () => {
  // do something expensive
  return {}
}

// and you can override them per method if you want
const noMoreExpensive = getMemoize(expensiveFunction, {
  layerConfigs: {
    [AvailableCacheLayer.MEMORY]: {
      ttl: 10 * 1000
    }
  },
  layerOrder: [
    AvailableCacheLayer.MEMORY
  ]
})
```

## Simple key/value cache

You can use the `getStore` API to get a cache that you can use with simple `get`/`set` functions:
```ts
import { getStore } from '@rlvt/cache-cache'

const store = getStore({
  layerConfigs: {
    [AvailableCacheLayer.MEMORY]: {
      ttl: 10 * 1000
    }
  },
  layerOrder: [
    AvailableCacheLayer.MEMORY
  ]
})
await store.set('key', { value: 1 })
const obj = await store.get('key')
// obj.value === 1
await store.clear('key')
const obj = await store.get('key')
// obj === undefined

```

## Typescript typing

Since the data stored inside the cache isn't typed, by default you will only get raw object as type when fetching from cache.
We implement our API to accept a generic argument that is the type of the memoized function:

```ts
import { Memoize } from '@rlvt/cache-cache'

type Person = {
 age: number
 name: number
}

@Memoize<typeof expensiveFunction>()
const expensiveFunction = async (): Person => {
  // do something expensive
  return {}
}
```

## Full configuration reference

```ts
enum AvailableCacheLayer {
  MEMORY = 'MEMORY',
  REDIS = 'REDIS'
}

type Config = {
  /**
   * Configuration for each cache layer 
   */
  layerConfigs: {
    [AvailableCacheLayer.REDIS]?: {
      /**
       * Default Time-To-Live for all keys on this layer
       */
      ttl: number,
      /**
       * When applying a custom ttl to a specific key you may want to increase the TTL
       * for a given layer, you can use this multiplier that will be applied to compute the
       * final TTL for the layer.
       */
      ttlMultiplier?: number
      /**
       * How much time to wait for the cache to respond when fetching a key
       * if it reach the timeout, the next layer will be called (or if no layer is left)
       * it will call the original function.
       */
      timeout?: number
      /**
       * Shallow errors should be set as true if you want to ignore all caches issues
       * (like failing to connect to a redis server) and fallback to undefined
       */
      shallowErrors?: boolean
      /**
       * Provide your own ioredis client
       */
      redisClient: IORedis.Redis,
      /**
       * A custom prefix used to differenciate keys
       * By default memoized function use their name as prefix
       */
      prefix?: string,
      /**
       * Enable or not the hashmap mode. When enabled, cache-cache will use
       * redis' hashmaps (hget/hset) with namespace+prefix as key and hash as field
       * NOTE: The expiration is set on the hashmap
       */
      hashmap?: boolean = false
    }
    [AvailableCacheLayer.MEMORY]?: {
      /**
       * Default Time-To-Live for all keys on this layer
       */
      ttl: number,
      /**
       * When applying a custom ttl to a specific key you may want to increase the TTL
       * for a given layer, you can use this multiplier that will be applied to compute the
       * final TTL for the layer.
       */
      ttlMultiplier?: number
      /**
       * How much time to wait for the cache to respond when fetching a key
       * if it reach the timeout, the next layer will be called (or if no layer is left)
       * it will call the original function.
       */
      timeout?: number
      /**
       * Shallow errors should be set as true if you want to ignore all caches issues
       * (like failing to connect to a redis server) and fallback to undefined
       */
      shallowErrors?: boolean
      /**
       * Maximum number of keys to store inside the in-memory cache, if it's reached
       * the cache implement the `least-recently-used` algorithm, see
       * https://github.com/isaacs/node-lru-cache
       *
       * default to 100000 keys
       */
      maxEntries?: number
    }
  }
  /**
   * Order in the array is the order in which each layer will be called when getting a value
   */
  layerOrder: AvailableCacheLayer[]
}
```

# License

Apache-2.0