import * as core from '@actions/core';
import * as cache from '@actions/cache';
import { sstCachePaths } from './sst';

/**
 * The post function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function postImpl(): Promise<void> {
  try {
    const sstFolder = core.getState('sstFolder');
    const homeFolder = core.getState('homeFolder');
    const sstPaths = sstCachePaths(sstFolder, homeFolder);

    const cacheKey = core.getState('cacheKey');
    await cache.saveCache(sstPaths, cacheKey);

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

export async function postRun(): Promise<void> {
  try {
    await postImpl();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}
