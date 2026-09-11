import * as path from 'path'

/**
 * Directories SST populates when it installs providers.
 *
 * - `<sstPath>/.sst/platform` — the generated platform sources and typings for
 *   the app, rewritten whenever the SST version changes.
 * - `<home>/.config/sst/plugins` — downloaded Pulumi provider plugins. This is
 *   the bulk of the download and the main reason to cache.
 * - `<home>/.config/sst/bin` — the vendored `pulumi` and `bun` binaries.
 *
 * @param sstFolder Absolute path to the folder holding `sst.config.ts`.
 * @param homeFolder Absolute path to the runner's home directory.
 * @returns The directories to cache, in a stable order.
 */
export function sstCachePaths(sstFolder: string, homeFolder: string): string[] {
  return [
    platformPath(sstFolder),
    path.join(homeFolder, '.config', 'sst', 'plugins'),
    path.join(homeFolder, '.config', 'sst', 'bin')
  ]
}

/**
 * The per-app platform directory, which is the only path cached when the
 * `platform-only` input is set.
 *
 * @param sstFolder Absolute path to the folder holding `sst.config.ts`.
 * @returns The platform directory.
 */
export function platformPath(sstFolder: string): string {
  return path.join(sstFolder, '.sst', 'platform')
}

/**
 * Builds the cache key.
 *
 * The key includes the runner OS (binaries are platform-specific), the SST
 * version, and a hash of `sst.config.ts` — providers are declared there, so a
 * change to it can change what must be installed.
 *
 * @param options Key components.
 * @param options.runnerOs The runner operating system.
 * @param options.sstVersion Resolved SST version or lockfile hash.
 * @param options.configHash Hash of `sst.config.ts`.
 * @param options.platformOnly Whether only the platform directory is cached.
 * @param options.suffix Optional user-supplied suffix for cache partitioning.
 * @returns The cache key.
 */
export function buildCacheKey(options: {
  runnerOs: string
  sstVersion: string
  configHash: string
  platformOnly: boolean
  suffix?: string
}): string {
  const scope = options.platformOnly ? 'sst-platform' : 'sst'
  const suffix = options.suffix ? `-${options.suffix}` : ''
  return `${options.runnerOs}-${scope}-${options.sstVersion}-${options.configHash}${suffix}`
}
