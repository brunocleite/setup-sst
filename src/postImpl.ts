import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { State } from './constants'

/**
 * Saves the SST cache when the main step installed providers.
 *
 * Nothing is saved when the main step failed (the install may be incomplete)
 * or when the cache was restored (the entry already exists).
 *
 * @returns Resolves when the action is complete.
 */
export async function postImpl(): Promise<void> {
  if (core.getState(State.Failed) === 'true') {
    core.info('Main step failed; not saving the cache.')
    return
  }

  const matchedKey = core.getState(State.CacheMatchedKey)
  if (matchedKey) {
    core.info(`Cache already exists for key '${matchedKey}'; nothing to save.`)
    return
  }

  const cacheKey = core.getState(State.CacheKey)
  if (!cacheKey) {
    core.info('No cache key was recorded; nothing to save.')
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(core.getState(State.CachePaths) || '[]')
  } catch {
    core.warning('Could not read the cache paths saved by the main step.')
    return
  }

  const cachePaths = Array.isArray(parsed)
    ? parsed.filter((entry): entry is string => typeof entry === 'string')
    : []

  if (cachePaths.length === 0) {
    core.info('No cache paths were recorded; nothing to save.')
    return
  }

  try {
    await cache.saveCache(cachePaths, cacheKey)
    core.info(`Cache saved with key: ${cacheKey}`)
  } catch (error) {
    // A failed save must never fail the job: the work already succeeded, and
    // a concurrent job reserving the same key is normal and expected.
    const message = error instanceof Error ? error.message : String(error)
    core.warning(`Failed to save the cache: ${message}`)
  }
}

/**
 * Entry point wrapper for the post step.
 *
 * @param earlyExit When true, exits the process once finished.
 * @returns Resolves when the action is complete.
 */
export async function postRun(earlyExit?: boolean): Promise<void> {
  try {
    await postImpl()
  } catch (error) {
    core.warning(error instanceof Error ? error.message : String(error))
    if (earlyExit) process.exit(0)
    return
  }
  if (earlyExit) process.exit(0)
}
