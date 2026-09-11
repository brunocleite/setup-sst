import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as cache from '@actions/cache'
import * as glob from '@actions/glob'
import * as fs from 'fs'
import * as path from 'path'
import { Input, Output, State } from './constants'
import { findLockfile, readLockfile } from './lockfile'
import { buildCacheKey, platformPath, sstCachePaths } from './paths'

/**
 * Restores the SST provider cache, installing the providers when it misses.
 *
 * @returns Resolves when the action is complete.
 */
export async function mainImpl(): Promise<void> {
  const sstFolder = path.resolve(core.getInput(Input.SstPath) || './')
  const sstConfigPath = path.join(sstFolder, 'sst.config.ts')

  if (!fs.existsSync(sstConfigPath)) {
    throw new Error(
      `No 'sst.config.ts' found at '${sstConfigPath}'. Set the 'sst-path' input to the folder containing your SST config.`
    )
  }
  core.info(`Using SST config: ${sstConfigPath}`)

  const lockfilePath = resolveLockfilePath(sstFolder)
  core.info(`Using lockfile: ${lockfilePath}`)

  const { packageManager, runCommand, sstVersion, isHash } = await readLockfile(
    lockfilePath,
    file => glob.hashFiles(file)
  )
  core.info(
    isHash
      ? `Detected ${packageManager} (binary lockfile; using its hash to key the cache)`
      : `Detected ${packageManager} with SST v${sstVersion}`
  )

  const homeFolder = process.env.HOME ?? process.env.USERPROFILE
  if (!homeFolder) {
    throw new Error(
      'Could not determine the home directory (neither HOME nor USERPROFILE is set).'
    )
  }

  const platformOnly = parseBooleanInput(Input.PlatformOnly)
  const cachePaths = platformOnly
    ? [platformPath(sstFolder)]
    : sstCachePaths(sstFolder, homeFolder)

  const cacheKey = buildCacheKey({
    runnerOs: process.env.RUNNER_OS ?? process.platform,
    sstVersion,
    configHash: await glob.hashFiles(sstConfigPath),
    platformOnly,
    suffix: core.getInput(Input.CacheKeySuffix) || undefined
  })

  core.saveState(State.CacheKey, cacheKey)
  core.saveState(State.CachePaths, cachePaths)
  core.setOutput(Output.CacheKey, cacheKey)
  core.setOutput(Output.SstVersion, sstVersion)
  core.setOutput(Output.PackageManager, packageManager)
  core.info(`Cache key: ${cacheKey}`)
  core.info(`Cache paths:\n  ${cachePaths.join('\n  ')}`)

  const matchedKey = await cache.restoreCache(cachePaths, cacheKey)
  core.setOutput(Output.CacheHit, Boolean(matchedKey))

  if (matchedKey) {
    core.info(`Cache restored from key: ${matchedKey}`)
    core.saveState(State.CacheMatchedKey, matchedKey)
    return
  }

  if (parseBooleanInput(Input.SkipInstall)) {
    core.info('Cache miss. Skipping install because `skip-install` is enabled.')
    return
  }

  // Without a local install, `npx sst` silently downloads the latest SST from
  // the registry — which may be a different major than the lockfile names. The
  // cache would then be keyed on the lockfile version but hold the wrong
  // providers, so refuse to continue rather than poison it.
  assertSstInstalledLocally(lockfilePath, sstVersion)

  core.info('Cache miss. Installing SST providers...')
  const args = ['sst', 'install']
  if (parseBooleanInput(Input.Debug)) args.push('--print-logs')

  const exitCode = await exec.exec(runCommand, args, {
    cwd: sstFolder,
    ignoreReturnCode: true
  })

  if (exitCode !== 0) {
    throw new Error(
      `'${runCommand} sst install' failed with exit code ${exitCode}. Re-run with the 'debug: true' input for the full SST log.`
    )
  }
  core.info('SST providers installed.')
}

/**
 * Verifies SST is installed in a `node_modules` reachable from the lockfile.
 *
 * @param lockfilePath Absolute path to the lockfile.
 * @param expectedVersion The SST version named by the lockfile.
 */
function assertSstInstalledLocally(
  lockfilePath: string,
  expectedVersion: string
): void {
  let directory = path.dirname(lockfilePath)

  for (;;) {
    if (fs.existsSync(path.join(directory, 'node_modules', 'sst'))) return

    const parent = path.dirname(directory)
    if (parent === directory) break
    directory = parent
  }

  throw new Error(
    `SST is not installed in node_modules, so 'sst install' would fetch the latest version from the registry instead of the v${expectedVersion} named by your lockfile. Run your package manager's install step before this action.`
  )
}

/**
 * Resolves the lockfile to read, using the `lockfile-path` input when given
 * and otherwise searching the SST folder and then the repository root.
 *
 * @param sstFolder Absolute path to the folder holding `sst.config.ts`.
 * @returns The absolute path to the lockfile.
 */
function resolveLockfilePath(sstFolder: string): string {
  const configured = core.getInput(Input.LockfilePath)
  if (configured) return path.resolve(configured)

  const workspaceRoot = process.env.GITHUB_WORKSPACE ?? process.cwd()
  for (const directory of [sstFolder, path.resolve(workspaceRoot)]) {
    const found = findLockfile(directory)
    if (found) return found
  }

  throw new Error(
    `No lockfile found in '${sstFolder}' or the workspace root. Run your package manager's install step first, or set the 'lockfile-path' input.`
  )
}

/**
 * Reads a boolean input, accepting the values GitHub's own actions accept.
 *
 * @param name The input name.
 * @returns The parsed value; false when the input is unset.
 */
function parseBooleanInput(name: Input): boolean {
  const value = core.getInput(name)
  if (!value) return false

  const normalized = value.toLowerCase().trim()
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) return false

  throw new Error(
    `Invalid value for the '${name}' input: '${value}'. Use 'true' or 'false'.`
  )
}

/**
 * Entry point wrapper that reports failures to the Actions runner.
 *
 * @param earlyExit When true, exits the process once finished. Used by the
 *   bundled entry point so the action does not hang on open handles.
 * @returns Resolves when the action is complete.
 */
export async function mainRun(earlyExit?: boolean): Promise<void> {
  try {
    await mainImpl()
  } catch (error) {
    core.saveState(State.Failed, 'true')
    core.setFailed(error instanceof Error ? error.message : String(error))
    if (earlyExit) process.exit(1)
    return
  }
  if (earlyExit) process.exit(0)
}
