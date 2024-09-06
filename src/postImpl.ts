import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { State } from './contants'

/**
 * The post function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function postImpl(): Promise<void> {
  const cacheMatchedKey = core.getState(State.CacheMatchedKey)
  if (cacheMatchedKey && cacheMatchedKey.length > 0) return

  const cacheKey = core.getState(State.CacheKey)
  const cachePaths = JSON.parse(core.getState(State.CachePaths) || '[]')
  await cache.saveCache(cachePaths, cacheKey)
}

export async function postRun(earlyExit?: boolean | undefined): Promise<void> {
  try {
    await postImpl()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    if (earlyExit) process.exit(1)
    throw error
  }
  if (earlyExit) process.exit(0)
}
