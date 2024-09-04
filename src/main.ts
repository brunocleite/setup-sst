import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as cache from '@actions/cache'
import * as glob from '@actions/glob'
import * as fs from 'fs'
import * as path from 'path'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const sstFolder = core.getInput('sst-folder') || './'

    const packageLockPath = path.resolve(sstFolder, 'package-lock')
    const sstConfigPath = path.resolve(sstFolder, 'sst.config.ts')

    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf-8'))
    const sstVersion = packageLock['node_modules/sst']?.version
    if (!sstVersion) {
      core.setFailed('SST version could not be parsed')
      return
    }
    core.info(`SST version v${sstVersion} found`)
    const paths = [
      path.resolve(sstFolder, '.sst/platform'),
      path.resolve(process.env.HOME!, '.config/sst/plugins')
    ]
    const hash = await glob.hashFiles(sstConfigPath)
    const key = `${process.env.RUNNER_OS}-sst-platform-${sstVersion}-${hash}`
    const cacheKey = await cache.restoreCache(paths, key)
    if (!cacheKey) {
      core.info(`SST Cache not found, installing SST and saving cache`)
      await exec.exec(`cd ${sstFolder} && npx sst install`)
      await cache.saveCache(paths, key)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
