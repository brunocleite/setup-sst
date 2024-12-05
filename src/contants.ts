export enum State {
  CacheKey = 'CACHE_KEY',
  CacheMatchedKey = 'CACHE_MATCHED_KEY',
  CachePaths = 'CACHE_PATHS',
  Failed = 'FAILED'
}

export enum Input {
  SstPath = 'sst-path',
  LockfilePath = 'lockfile-path',
  PlatformOnly = 'platform-only'
}
