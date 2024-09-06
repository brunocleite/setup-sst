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
import { State } from '../src/contants'

// Mock the action's main function
const runMock = jest.spyOn(postImpl, 'postImpl')

// Mock the GitHub Actions core library
let errorMock: jest.SpiedFunction<typeof core.error>
let restoreCache: jest.SpiedFunction<typeof cache.restoreCache>
let saveCache: jest.SpiedFunction<typeof cache.saveCache>
let getState: jest.SpiedFunction<typeof core.getState>

describe('post action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    restoreCache = jest.spyOn(cache, 'restoreCache').mockImplementation()
    saveCache = jest.spyOn(cache, 'saveCache').mockImplementation()
    getState = jest.spyOn(core, 'getState').mockImplementation()
  })

  it('should save cache without matched key', async () => {
    getState.mockImplementation(name => {
      switch (name) {
        case State.CacheMatchedKey:
          return ''
        case State.CachePaths:
          return '["folder1", "folder2"]'
        default:
          return ''
      }
    })
    await postImpl.postImpl()
    expect(runMock).toHaveReturned()

    expect(errorMock).not.toHaveBeenCalled()
    expect(saveCache).toHaveBeenCalled()
    expect(restoreCache).not.toHaveBeenCalled()
  })

  it('should not save cache with matched key', async () => {
    getState.mockImplementation(name => {
      switch (name) {
        case State.CacheMatchedKey:
          return 'some-matched-key'
        default:
          return ''
      }
    })
    await postImpl.postImpl()
    expect(runMock).toHaveReturned()

    expect(errorMock).not.toHaveBeenCalled()
    expect(saveCache).not.toHaveBeenCalled()
    expect(restoreCache).not.toHaveBeenCalled()
  })

  it('should skip save cache with empty paths', async () => {
    getState.mockImplementation(name => {
      switch (name) {
        case State.CacheMatchedKey:
          return ''
        case State.CachePaths:
          return ''
        default:
          return ''
      }
    })
    await postImpl.postImpl()
    expect(runMock).toHaveReturned()

    expect(errorMock).not.toHaveBeenCalled()
    expect(saveCache).not.toHaveBeenCalled()
    expect(restoreCache).not.toHaveBeenCalled()
  })
})
