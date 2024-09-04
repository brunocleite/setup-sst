/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as cache from '@actions/cache'
import * as main from '../src/main'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the GitHub Actions core library
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let restoreCache: jest.SpiedFunction<typeof cache.restoreCache>
let saveCache: jest.SpiedFunction<typeof cache.saveCache>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    restoreCache = jest.spyOn(cache, 'restoreCache').mockImplementation()
    saveCache = jest.spyOn(cache, 'saveCache').mockImplementation()
  })

  it('with sst folder and cache hit', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'sst-folder':
          return './sst'
        default:
          return ''
      }
    })
    restoreCache.mockImplementation(async () => {
      return 'some-cache-key'
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(errorMock).not.toHaveBeenCalled()
    expect(saveCache).not.toHaveBeenCalled()
    expect(restoreCache).toHaveBeenCalledTimes(1)

    // Verify that all of the core library functions were called correctly
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

  it('with sst folder and cache miss', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'sst-folder':
          return './sst'
        default:
          return ''
      }
    })
    restoreCache.mockImplementation(async () => {
      return undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(errorMock).not.toHaveBeenCalled()
    expect(saveCache).toHaveBeenCalledTimes(1)
    expect(restoreCache).toHaveBeenCalledTimes(1)
  })

  it('without sst folder', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        default:
          return ''
      }
    })
    restoreCache.mockImplementation(async () => {
      return undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenCalledWith(
      'SST module is not on package-lock.json, install it first'
    )
  })
})
