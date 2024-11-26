import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as cache from '@actions/cache';
import * as glob from '@actions/glob';
import * as fs from 'fs';
import * as path from 'path';
import { Input, State } from './contants';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function mainImpl(): Promise<void> {
  // SST Folder
  const sstFolder = path.resolve(core.getInput(Input.SstPath) || './');
  const sstConfigPath = path.resolve(sstFolder, 'sst.config.ts');
  core.info(`'sst.config.ts' path: ${sstConfigPath}`);
  const lockfilePath = path.resolve(core.getInput(Input.LockfilePath) || './package-lock.json');

  const lockFileFolder = path.dirname(lockfilePath);
  const nodeModulesPath = findFile('node_modules', lockFileFolder);
  core.info('node_modules path: ' + nodeModulesPath);
  if (!nodeModulesPath) {
    throw new Error(
      'node_modules folder not found, please run npm install first',
    );
  }

  // Lockfile verification
  let sstVersion;
  if (lockfilePath.endsWith('package-lock.json')) { //NPM lockfile
    // SST dependency present
    const packageLock = JSON.parse(fs.readFileSync(lockfilePath, 'utf-8'));
    const nodeModulesSst = packageLock?.packages['node_modules/sst'];
    if (!nodeModulesSst) {
      throw new Error('SST module is not on package-lock.json, install it first');
    }
    // SST version
    sstVersion = nodeModulesSst.version;
    if (!sstVersion) {
      throw new Error('SST version could not be parsed');
    }
    core.info(`SST version v${sstVersion} found`);
  } else if (lockfilePath.endsWith('bun.lockb')) {
    //Use the full 'bun.lockb' as the sst version, can't parse as it is binary
    sstVersion = await glob.hashFiles(lockfilePath);
  } else {
    throw new Error('Unsupported lockfile format');
  }

  // Home folder
  const homeFolder = process.env.HOME;
  if (!homeFolder) {
    throw new Error('Failed to get HOME folder');
  }

  //Paths
  const platformPath = path.resolve(sstFolder, '.sst/platform');
  const pluginsPath = path.resolve(homeFolder, '.config/sst/plugins');
  const binPath = path.resolve(homeFolder, '.config/sst/bin');

  // Caching
  const sstConfigHash = await glob.hashFiles(sstConfigPath);
  const platformOnly = strictParseBoolean(core.getInput(Input.PlatformOnly));
  let cacheKey;
  let cachePaths;
  if (platformOnly) {
    cachePaths = [platformPath];
    cacheKey = `${process.env.RUNNER_OS}-sst-platform-${sstVersion}-${sstConfigHash}`;
  } else {
    cachePaths = [platformPath, pluginsPath, binPath];
    cacheKey = `${process.env.RUNNER_OS}-sst-${sstVersion}-${sstConfigHash}`;
  }
  core.saveState(State.CacheKey, cacheKey);
  core.saveState(State.CachePaths, cachePaths);
  core.info(`SST cache paths: ${cachePaths.join(', ')}`);

  // Restore cache
  const cacheMatchedKey = await cache.restoreCache(cachePaths, cacheKey);
  if (cacheMatchedKey) {
    core.info(`SST cache key: ${cacheMatchedKey}`);
    core.saveState(State.CacheMatchedKey, cacheMatchedKey);
  } else {
    core.info(`SST cache not found, installing SST...`);
    await exec.exec(`npx`, ['sst', 'install'], { cwd: sstFolder });
  }
}

function findFile(
  fileName: string,
  currentDir: string = __dirname,
): string | null {
  const currentPath = path.join(currentDir, fileName);

  if (fs.existsSync(currentPath)) {
    return currentPath;
  } else {
    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      // reached the root
      return null;
    }

    return findFile(fileName, parentDir);
  }
}

export async function mainRun(earlyExit?: boolean | undefined): Promise<void> {
  try {
    await mainImpl();
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
    if (earlyExit) process.exit(1);
    throw error;
  }
  if (earlyExit) process.exit(0);
}

function strictParseBoolean(value: string | null | undefined): boolean {
  if (value === null || value === undefined) {
    throw new Error('Invalid boolean value: null or undefined');
  }

  const lowerValue = value.toLowerCase().trim();

  if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
    return true;
  } else if (
    lowerValue === 'false' ||
    lowerValue === '0' ||
    lowerValue === 'no'
  ) {
    return false;
  } else {
    throw new Error(`Invalid boolean value: ${value}`);
  }
}
