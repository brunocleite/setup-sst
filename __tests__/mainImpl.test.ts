/**
 * Tests for the main step.
 *
 * Inputs are mocked at `core.getInput` rather than through `INPUT_*`
 * environment variables so each case can vary one input at a time.
 */

import * as core from '@actions/core'
import * as cache from '@actions/cache'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { mainImpl, mainRun } from '../src/mainImpl'
import { Input, Output, State } from '../src/constants'

const fixtures = path.resolve(__dirname, '../__test_environments__')

/**
 * A self-contained SST app with SST present in `node_modules`.
 *
 * Built in a temp directory rather than reusing `__test_environments__` so the
 * install path can be tested without depending on whether `npm ci` has been run
 * in the fixtures.
 */
let npmFixture: string

beforeAll(() => {
  npmFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-sst-'))

  fs.copyFileSync(
    path.join(fixtures, 'with-npm', 'package-lock.json'),
    path.join(npmFixture, 'package-lock.json')
  )
  fs.copyFileSync(
    path.join(fixtures, 'with-npm', 'sst.config.ts'),
    path.join(npmFixture, 'sst.config.ts')
  )

  const sstModule = path.join(npmFixture, 'node_modules', 'sst')
  fs.mkdirSync(sstModule, { recursive: true })
  fs.writeFileSync(
    path.join(sstModule, 'package.json'),
    JSON.stringify({ name: 'sst', version: '3.19.3' })
  )
})

afterAll(() => {
  fs.rmSync(npmFixture, { recursive: true, force: true })
})

let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>
let saveStateMock: jest.SpiedFunction<typeof core.saveState>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let restoreCacheMock: jest.SpiedFunction<typeof cache.restoreCache>
let saveCacheMock: jest.SpiedFunction<typeof cache.saveCache>
let execMock: jest.SpiedFunction<typeof exec.exec>

type Inputs = Partial<Record<Input, string>>

const mockInputs = (inputs: Inputs): void => {
  getInputMock.mockImplementation((name: string) => inputs[name as Input] ?? '')
}

describe('mainImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.HOME = '/home/runner'
    process.env.RUNNER_OS = 'Linux'

    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    saveStateMock = jest.spyOn(core, 'saveState').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    jest.spyOn(core, 'info').mockImplementation()
    restoreCacheMock = jest.spyOn(cache, 'restoreCache').mockImplementation()
    saveCacheMock = jest.spyOn(cache, 'saveCache').mockImplementation()
    execMock = jest.spyOn(exec, 'exec').mockResolvedValue(0)
    jest.spyOn(glob, 'hashFiles').mockResolvedValue('confighash')
  })

  describe('on a cache hit', () => {
    beforeEach(() => {
      mockInputs({
        [Input.SstPath]: npmFixture,
        [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json')
      })
      restoreCacheMock.mockResolvedValue('Linux-sst-3.0.107-confighash')
    })

    it('does not install SST', async () => {
      await mainImpl()
      expect(execMock).not.toHaveBeenCalled()
      expect(saveCacheMock).not.toHaveBeenCalled()
    })

    it('reports cache-hit as true', async () => {
      await mainImpl()
      expect(setOutputMock).toHaveBeenCalledWith(Output.CacheHit, true)
    })

    it('records the matched key for the post step', async () => {
      await mainImpl()
      expect(saveStateMock).toHaveBeenCalledWith(
        State.CacheMatchedKey,
        'Linux-sst-3.0.107-confighash'
      )
    })
  })

  describe('on a cache miss', () => {
    beforeEach(() => {
      mockInputs({
        [Input.SstPath]: npmFixture,
        [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json')
      })
      restoreCacheMock.mockResolvedValue(undefined)
    })

    it('installs SST with the package manager from the lockfile', async () => {
      await mainImpl()
      expect(execMock).toHaveBeenCalledWith(
        'npx',
        ['sst', 'install'],
        expect.objectContaining({ cwd: npmFixture })
      )
    })

    it('reports cache-hit as false', async () => {
      await mainImpl()
      expect(setOutputMock).toHaveBeenCalledWith(Output.CacheHit, false)
    })

    it('passes --print-logs when debug is enabled', async () => {
      mockInputs({
        [Input.SstPath]: npmFixture,
        [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json'),
        [Input.Debug]: 'true'
      })
      await mainImpl()
      expect(execMock).toHaveBeenCalledWith(
        'npx',
        ['sst', 'install', '--print-logs'],
        expect.anything()
      )
    })

    it('does not install when skip-install is enabled', async () => {
      mockInputs({
        [Input.SstPath]: npmFixture,
        [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json'),
        [Input.SkipInstall]: 'true'
      })
      await mainImpl()
      expect(execMock).not.toHaveBeenCalled()
    })

    it('fails with a helpful message when sst install exits non-zero', async () => {
      execMock.mockResolvedValue(1)
      await expect(mainImpl()).rejects.toThrow(/failed with exit code 1/)
    })

    it('refuses to install when SST is absent from node_modules', async () => {
      // Guards against a cache poisoned with the wrong SST major: `npx sst`
      // downloads the latest release when nothing is installed locally.
      const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-sst-bare-'))
      fs.copyFileSync(
        path.join(fixtures, 'with-npm', 'package-lock.json'),
        path.join(bare, 'package-lock.json')
      )
      fs.copyFileSync(
        path.join(fixtures, 'with-npm', 'sst.config.ts'),
        path.join(bare, 'sst.config.ts')
      )

      mockInputs({ [Input.SstPath]: bare })
      await expect(mainImpl()).rejects.toThrow(
        /SST is not installed in node_modules/
      )
      expect(execMock).not.toHaveBeenCalled()

      fs.rmSync(bare, { recursive: true, force: true })
    })
  })

  describe('cache scope', () => {
    beforeEach(() => {
      restoreCacheMock.mockResolvedValue('hit')
    })

    it('caches the platform, plugins and bin directories by default', async () => {
      mockInputs({
        [Input.SstPath]: npmFixture,
        [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json')
      })
      await mainImpl()
      const [paths] = restoreCacheMock.mock.calls[0]
      expect(paths).toHaveLength(3)
      expect(paths[0]).toContain(path.join('.sst', 'platform'))
    })

    it('caches only the platform directory when platform-only is set', async () => {
      mockInputs({
        [Input.SstPath]: npmFixture,
        [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json'),
        [Input.PlatformOnly]: 'true'
      })
      await mainImpl()
      const [paths, key] = restoreCacheMock.mock.calls[0]
      expect(paths).toHaveLength(1)
      expect(key).toContain('-sst-platform-')
    })

    it('appends the cache-key-suffix to the key', async () => {
      mockInputs({
        [Input.SstPath]: npmFixture,
        [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json'),
        [Input.CacheKeySuffix]: 'api'
      })
      await mainImpl()
      const [, key] = restoreCacheMock.mock.calls[0]
      expect(key).toMatch(/-api$/)
    })
  })

  describe('lockfile auto-detection', () => {
    it('finds the lockfile in the SST folder when none is configured', async () => {
      mockInputs({ [Input.SstPath]: npmFixture })
      restoreCacheMock.mockResolvedValue('hit')
      await mainImpl()
      expect(setOutputMock).toHaveBeenCalledWith(Output.PackageManager, 'npm')
    })

    it('detects pnpm from its lockfile', async () => {
      const pnpmFixture = path.join(fixtures, 'with-pnpm')
      mockInputs({ [Input.SstPath]: pnpmFixture })
      restoreCacheMock.mockResolvedValue('hit')
      await mainImpl()
      expect(setOutputMock).toHaveBeenCalledWith(Output.PackageManager, 'pnpm')
      expect(setOutputMock).toHaveBeenCalledWith(Output.SstVersion, '3.19.3')
    })

    it('detects yarn from its lockfile', async () => {
      mockInputs({ [Input.SstPath]: path.join(fixtures, 'with-yarn') })
      restoreCacheMock.mockResolvedValue('hit')
      await mainImpl()
      expect(setOutputMock).toHaveBeenCalledWith(Output.PackageManager, 'yarn')
    })
  })

  describe('input validation', () => {
    it('fails when sst.config.ts is missing', async () => {
      mockInputs({ [Input.SstPath]: '/nonexistent' })
      await expect(mainImpl()).rejects.toThrow(/No 'sst.config.ts' found/)
    })

    it('fails when no lockfile can be found', async () => {
      mockInputs({ [Input.SstPath]: fixtures })
      // The fixtures root has an sst.config.ts in each child, not itself.
      await expect(mainImpl()).rejects.toThrow(/No 'sst.config.ts' found/)
    })

    it('rejects a non-boolean platform-only value', async () => {
      mockInputs({
        [Input.SstPath]: npmFixture,
        [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json'),
        [Input.PlatformOnly]: 'maybe'
      })
      await expect(mainImpl()).rejects.toThrow(/Invalid value for the/)
    })

    it('accepts the boolean spellings GitHub users expect', async () => {
      restoreCacheMock.mockResolvedValue('hit')
      for (const value of ['TRUE', 'yes', 'on', '1']) {
        jest.clearAllMocks()
        mockInputs({
          [Input.SstPath]: npmFixture,
          [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json'),
          [Input.PlatformOnly]: value
        })
        await mainImpl()
        const [paths] = restoreCacheMock.mock.calls[0]
        expect(paths).toHaveLength(1)
      }
    })

    it('fails when the home directory cannot be determined', async () => {
      delete process.env.HOME
      delete process.env.USERPROFILE
      mockInputs({
        [Input.SstPath]: npmFixture,
        [Input.LockfilePath]: path.join(npmFixture, 'package-lock.json')
      })
      await expect(mainImpl()).rejects.toThrow(/home directory/)
    })
  })
})

describe('mainRun', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(core, 'info').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    saveStateMock = jest.spyOn(core, 'saveState').mockImplementation()
    jest
      .spyOn(core, 'getInput')
      .mockImplementation((name: string) =>
        name === String(Input.SstPath) ? '/nonexistent' : ''
      )
  })

  it('marks the run failed and records the failure state', async () => {
    await mainRun()
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining("No 'sst.config.ts' found")
    )
    expect(saveStateMock).toHaveBeenCalledWith(State.Failed, 'true')
  })
})
