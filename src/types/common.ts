// Used to get parameters type from patched function
export type Parameters<T> = T extends (...args: infer T) => any ? T : unknown[]
// Used to get return type from patched function used for type our memoize function
// (we remove the promise, the original function should be an async function)
export type ReturnType<T> = T extends (...args: any[]) => infer T ? Unpromisify<T> : string | object
// Used to type the patched function (with the promise)
export type OriginalReturnType<T> = Promise<ReturnType<T>>
// Type of the original function with params and promise as result
export type Func<T> = (...args: Parameters<T>) => OriginalReturnType<T>
// Type of our memoize function with original params and promise with original returns types
// we need to remove promise from the original function and set it again to be sure to only
// have one level of promise (avoid Promise<Promise<string>>)
export type AsyncFunc<T> = (...args: Parameters<T>) => Promise<ReturnType<T>>
// Used to remove promise from a type
export type Unpromisify<T> = T extends Promise<infer R> ? R : T
