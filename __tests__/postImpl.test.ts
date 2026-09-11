import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { postImpl, postRun } from '../src/postImpl'
import { State } from '../src/constants'

let saveCacheMock: jest.SpiedFunction<typeof cache.saveCache>
let warningMock: jest.SpiedFunction<typeof core.warning>
let getStateMock: jest.SpiedFunction<typeof core.getState>

type States = Partial<Record<State, string>>

const mockState = (states: States): void => {
  getStateMock.mockImplementation((name: string) => states[name as State] ?? '')
}

describe('postImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(core, 'info').mockImplementation()
    warningMock = jest.spyOn(core, 'warning').mockImplementation()
    getStateMock = jest.spyOn(core, 'getState').mockImplementation()
    saveCacheMock = jest.spyOn(cache, 'saveCache').mockResolvedValue(1)
  })

  it('saves the cache after a successful install', async () => {
    mockState({
      [State.CacheKey]: 'Linux-sst-3.19.3-abc',
      [State.CachePaths]: '["/a","/b"]'
    })
    await postImpl()
    expect(saveCacheMock).toHaveBeenCalledWith(
      ['/a', '/b'],
      'Linux-sst-3.19.3-abc'
    )
  })

  it('does not save when the cache was restored', async () => {
    mockState({
      [State.CacheMatchedKey]: 'Linux-sst-3.19.3-abc',
      [State.CacheKey]: 'Linux-sst-3.19.3-abc',
      [State.CachePaths]: '["/a"]'
    })
    await postImpl()
    expect(saveCacheMock).not.toHaveBeenCalled()
  })

  it('does not save when the main step failed', async () => {
    mockState({
      [State.Failed]: 'true',
      [State.CacheKey]: 'key',
      [State.CachePaths]: '["/a"]'
    })
    await postImpl()
    expect(saveCacheMock).not.toHaveBeenCalled()
  })

  it('does nothing when no cache key was recorded', async () => {
    mockState({ [State.CachePaths]: '["/a"]' })
    await postImpl()
    expect(saveCacheMock).not.toHaveBeenCalled()
  })

  it('does nothing when the recorded paths are empty', async () => {
    mockState({ [State.CacheKey]: 'key', [State.CachePaths]: '[]' })
    await postImpl()
    expect(saveCacheMock).not.toHaveBeenCalled()
  })

  it('warns rather than throwing when the paths state is malformed', async () => {
    mockState({ [State.CacheKey]: 'key', [State.CachePaths]: 'not-json' })
    await postImpl()
    expect(warningMock).toHaveBeenCalled()
    expect(saveCacheMock).not.toHaveBeenCalled()
  })

  it('warns rather than failing the job when the save errors', async () => {
    mockState({ [State.CacheKey]: 'key', [State.CachePaths]: '["/a"]' })
    saveCacheMock.mockRejectedValue(new Error('cache service unavailable'))
    await expect(postImpl()).resolves.toBeUndefined()
    expect(warningMock).toHaveBeenCalledWith(
      expect.stringContaining('cache service unavailable')
    )
  })
})

describe('postRun', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(core, 'info').mockImplementation()
    warningMock = jest.spyOn(core, 'warning').mockImplementation()
    getStateMock = jest.spyOn(core, 'getState').mockImplementation()
    jest.spyOn(cache, 'saveCache').mockResolvedValue(1)
  })

  it('never fails the job when the post step throws', async () => {
    const setFailed = jest.spyOn(core, 'setFailed').mockImplementation()
    getStateMock.mockImplementation(() => {
      throw new Error('state unavailable')
    })
    await expect(postRun()).resolves.toBeUndefined()
    expect(setFailed).not.toHaveBeenCalled()
    expect(warningMock).toHaveBeenCalled()
  })
})
