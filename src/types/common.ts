export type Parameters<T> = T extends (...args: infer T) => any ? T : unknown[]
export type ReturnType<T> = T extends (...args: any[]) => infer T ? T : string | object
export type Func<T> = (...args: Parameters<T>) => ReturnType<T>
export type AsyncFunc<T> = (...args: Parameters<T>) => Promise<ReturnType<T>>
