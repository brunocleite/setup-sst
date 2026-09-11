/** Values persisted between the main and post steps. */
export enum State {
  CacheKey = 'CACHE_KEY',
  CacheMatchedKey = 'CACHE_MATCHED_KEY',
  CachePaths = 'CACHE_PATHS',
  Failed = 'FAILED'
}

/** Inputs declared in `action.yml`. */
export enum Input {
  SstPath = 'sst-path',
  LockfilePath = 'lockfile-path',
  PlatformOnly = 'platform-only',
  CacheKeySuffix = 'cache-key-suffix',
  SkipInstall = 'skip-install',
  Debug = 'debug'
}

/** Outputs declared in `action.yml`. */
export enum Output {
  CacheHit = 'cache-hit',
  CacheKey = 'cache-key',
  SstVersion = 'sst-version',
  PackageManager = 'package-manager'
}
