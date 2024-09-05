/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as cache from '@actions/cache'
import * as postImpl from '../src/postImpl'

// Mock the action's main function
const runMock = jest.spyOn(postImpl, 'postImpl')

// Mock the GitHub Actions core library
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let restoreCache: jest.SpiedFunction<typeof cache.restoreCache>
let saveCache: jest.SpiedFunction<typeof cache.saveCache>

describe('post action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    restoreCache = jest.spyOn(cache, 'restoreCache').mockImplementation()
    saveCache = jest.spyOn(cache, 'saveCache').mockImplementation()
  })

  it('post run', async () => {

    await postImpl.postImpl()
    expect(runMock).toHaveReturned()

    expect(errorMock).not.toHaveBeenCalled()
    expect(saveCache).toHaveBeenCalled()
    expect(restoreCache).not.toHaveBeenCalled()
  })

})
