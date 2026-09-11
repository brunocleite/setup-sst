import * as path from 'path'
import { buildCacheKey, platformPath, sstCachePaths } from '../src/paths'

describe('sstCachePaths', () => {
  it('returns the platform, plugins and bin directories', () => {
    expect(sstCachePaths('/repo/app', '/home/runner')).toEqual([
      path.join('/repo/app', '.sst', 'platform'),
      path.join('/home/runner', '.config', 'sst', 'plugins'),
      path.join('/home/runner', '.config', 'sst', 'bin')
    ])
  })
})

describe('platformPath', () => {
  it('resolves the per-app platform directory', () => {
    expect(platformPath('/repo/app')).toBe(
      path.join('/repo/app', '.sst', 'platform')
    )
  })
})

describe('buildCacheKey', () => {
  const base = {
    runnerOs: 'Linux',
    sstVersion: '3.19.3',
    configHash: 'abc123',
    platformOnly: false
  }

  it('includes the OS, version and config hash', () => {
    expect(buildCacheKey(base)).toBe('Linux-sst-3.19.3-abc123')
  })

  it('uses a distinct scope when caching the platform only', () => {
    expect(buildCacheKey({ ...base, platformOnly: true })).toBe(
      'Linux-sst-platform-3.19.3-abc123'
    )
  })

  it('appends a suffix when one is supplied', () => {
    expect(buildCacheKey({ ...base, suffix: 'api' })).toBe(
      'Linux-sst-3.19.3-abc123-api'
    )
  })

  it('produces different keys for different runners', () => {
    const linux = buildCacheKey(base)
    const windows = buildCacheKey({ ...base, runnerOs: 'Windows' })
    expect(linux).not.toBe(windows)
  })

  it('produces different keys when the config changes', () => {
    expect(buildCacheKey(base)).not.toBe(
      buildCacheKey({ ...base, configHash: 'def456' })
    )
  })

  it('separates the platform-only cache from the full cache', () => {
    expect(buildCacheKey({ ...base, platformOnly: true })).not.toBe(
      buildCacheKey(base)
    )
  })
})
