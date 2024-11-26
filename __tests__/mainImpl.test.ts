/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as cache from '@actions/cache'
import * as mainImpl from '../src/mainImpl'
import { Input } from '../src/contants'

// Mock the action's main function
const runMock = jest.spyOn(mainImpl, 'mainImpl')

// Mock the GitHub Actions core library
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let restoreCache: jest.SpiedFunction<typeof cache.restoreCache>
let saveCache: jest.SpiedFunction<typeof cache.saveCache>

describe('main action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    restoreCache = jest.spyOn(cache, 'restoreCache').mockImplementation()
    saveCache = jest.spyOn(cache, 'saveCache').mockImplementation()
  })

  interface InputMock {
    sstPath?: string
    lockfilePath?: string
    platformOnly?: boolean
  }

  const mockInputs = (inputMock: InputMock): void => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case Input.SstPath:
          return inputMock.sstPath || ''
        case Input.LockfilePath:
          return inputMock.lockfilePath || ''
        case Input.PlatformOnly:
          return String(inputMock.platformOnly) || ''
        default:
          return ''
      }
    })
  }

  it('with existing SST folder and cache hit should not install SST', async () => {
    mockInputs({
      sstPath: './__test_environments__/with-npm',
      lockfilePath: './__test_environments__/with-npm/package-lock.json',
      platformOnly: false
    })

    restoreCache.mockImplementation(async () => {
      return 'some-cache-key'
    })

    await mainImpl.mainImpl()
    expect(runMock).toHaveReturned()

    expect(errorMock).not.toHaveBeenCalled()
    expect(saveCache).not.toHaveBeenCalled()
    expect(restoreCache).toHaveBeenCalledTimes(1)

    // Verify that all the core library functions were called correctly
    // expect(debugMock).toHaveBeenNthCalledWith(1, 'Waiting 500 milliseconds ...')
    // expect(debugMock).toHaveBeenNthCalledWith(
    //   2,
    //   expect.stringMatching(timeRegex)
    // )
    // expect(debugMock).toHaveBeenNthCalledWith(
    //   3,
    //   expect.stringMatching(timeRegex)
    // )
    // expect(setOutputMock).toHaveBeenNthCalledWith(
    //   1,
    //   'time',
    //   expect.stringMatching(timeRegex)
    // )
  })

  it('with existing SST folder and cache miss should install SST', async () => {
    mockInputs({
      sstPath: './__test_environments__/with-npm',
      lockfilePath: './__test_environments__/with-npm/package-lock.json',
      platformOnly: false
    })
    restoreCache.mockImplementation(async () => {
      return undefined
    })

    await mainImpl.mainImpl()
    expect(runMock).toHaveReturned()

    expect(errorMock).not.toHaveBeenCalled()
    expect(saveCache).not.toHaveBeenCalled()
    expect(restoreCache).toHaveBeenCalled()

    const firstCallArgs = restoreCache.mock.calls[0]
    expect(firstCallArgs[1]).toMatch(/\b(?=.*-sst-)(?!.*-sst-platform-).*$/)
  }, 120000)

  it('with lockfile containing that has no SST dependency should fail as SST module is not on package-lock.json file', async () => {
    mockInputs({
      sstPath: './__test_environments__/with-npm',
      lockfilePath: '',
      platformOnly: false
    })
    await expect(async () => mainImpl.mainImpl()).rejects.toThrow(
      'SST module is not on package-lock.json, install it first'
    )
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('with invalid lockfile should fail with node_modules not found', async () => {
    mockInputs({ lockfilePath: '/invalid/invalid_folder', platformOnly: false })
    await expect(async () => mainImpl.mainImpl()).rejects.toThrow(
      'node_modules folder not found, please run npm install first'
    )
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('with SST folder and bun lockfile and cache hit should not install SST', async () => {
    mockInputs({
      sstPath: './__test_environments__/with-bun',
      lockfilePath: './__test_environments__/with-bun/bun.lockb',
      platformOnly: false
    })

    restoreCache.mockImplementation(async () => {
      return 'some-cache-key'
    })

    await mainImpl.mainImpl()
    expect(runMock).toHaveReturned()

    expect(errorMock).not.toHaveBeenCalled()
    expect(saveCache).not.toHaveBeenCalled()
    expect(restoreCache).toHaveBeenCalledTimes(1)
  })
})
