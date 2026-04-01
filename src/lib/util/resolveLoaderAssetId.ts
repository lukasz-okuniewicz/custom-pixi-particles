/**
 * Coerces editor / loader config entries to Pixi Loader resource keys.
 * File picks are stored as `{ fileName, result }` while runtime expects `fileName` strings.
 */
export function resolveLoaderAssetId(entry: unknown): string {
  if (typeof entry === 'string' && entry.length > 0) {
    return entry
  }
  if (
    entry &&
    typeof entry === 'object' &&
    'fileName' in entry &&
    typeof (entry as { fileName: unknown }).fileName === 'string'
  ) {
    const id = (entry as { fileName: string }).fileName
    return id.length > 0 ? id : ''
  }
  return ''
}
