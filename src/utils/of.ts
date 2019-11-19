export default async function of<T> (promise: Promise<T>): Promise<[T?, Error?]> {
  return Promise.resolve(promise)
    .then((r: T): [T?, Error?] => [r])
    .catch(
      (e: Error | undefined | null): [T?, Error?] => {
        if (e === undefined || e === null) {
          return [ undefined, new Error('Rejection with empty value')]
        }

        return [undefined, e]
      }
    )
}
