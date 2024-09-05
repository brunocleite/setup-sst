import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as cache from '@actions/cache'
import * as glob from '@actions/glob'
import * as fs from 'fs'
import * as path from 'path'
import { sstCachePaths } from './sst'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function mainImpl(): Promise<void> {
  try {
    const sstFolder = core.getInput('sst-folder') || './'
    core.saveState('sstFolder', sstFolder)

    if (!folderExists(path.resolve(sstFolder, 'node_modules'))) {
      core.setFailed(
        'node_modules folder not found, please run npm install first'
      )
      return
    }

    const packageLockPath = path.resolve(sstFolder, 'package-lock.json')
    core.info(`'package-lock' path: ${packageLockPath}`)
    const sstConfigPath = path.resolve(sstFolder, 'sst.config.ts')
    core.info(`'sst.config.ts' path: ${sstConfigPath}`)

    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf-8'))
    const nodeModulesSst = packageLock?.packages['node_modules/sst']
    if (!nodeModulesSst) {
      core.setFailed('SST module is not on package-lock.json, install it first')
      return
    }

    const sstVersion = nodeModulesSst.version
    if (!sstVersion) {
      core.setFailed('SST version could not be parsed')
      return
    }
    core.info(`SST version v${sstVersion} found`)

    const homeFolder = process.env.HOME
    if (!homeFolder) {
      core.setFailed('Failed to get HOME folder')
      return
    }
    core.saveState('homeFolder', homeFolder)

    const sstConfigHash = await glob.hashFiles(sstConfigPath)
    const cacheKey = `${process.env.RUNNER_OS}-sst-${sstVersion}-${sstConfigHash}`
    core.saveState('cacheKey', cacheKey)

    const sstPaths = sstCachePaths(sstFolder, homeFolder)

    core.info(`SST cache paths: ${sstPaths.join(', ')}`)
    const cacheRestored = await cache.restoreCache(sstPaths, cacheKey)
    if (cacheRestored) {
      core.info(`SST cache key: ${cacheRestored}`)
      core.saveState('cacheRestored', true)
    } else {
      core.info(`SST cache not found, installing SST...`)
      await exec.exec(`npx`, ['sst', 'install'], { cwd: sstFolder })
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

export async function mainRun(earlyExit?: boolean | undefined): Promise<void> {
  try {
    await mainImpl()
  } catch (err) {
    console.error(err)
    if (earlyExit) process.exit(1)
  }
  if (earlyExit) process.exit(0)
}

function folderExists(path: string): boolean {
  return fs.existsSync(path) && fs.lstatSync(path).isDirectory()
}
