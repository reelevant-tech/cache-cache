import { currentConfig } from '../index'
import { CacheLayerOptions, AvailableCacheLayer } from '../types/layer'

/**
 * Fetch a config value from either the local or global options
 * @param key path inside the cachelayeroptions to the value
 * @param localOptions local CacheLayerOptions
 * @param type type of CacheLayer
 */
export const getConfig = <I extends CacheLayerOptions, O>(
  key: keyof I,
  localOptions: Partial<I> | undefined,
  type: AvailableCacheLayer
): O | undefined => {
  if (localOptions?.[key] !== undefined) return localOptions[key] as unknown as O
  const globalLayerOptions = currentConfig.layerConfigs?.[type] as Partial<I> | undefined
  if (globalLayerOptions?.[key] !== undefined) return globalLayerOptions[key] as unknown as O
  return undefined
}
