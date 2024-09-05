/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import * as mainImpl from '../src/mainImpl'

// Mock the action's entrypoint
const runMock = jest.spyOn(mainImpl, 'mainRun').mockImplementation()

describe('index', () => {
  it('calls run when imported', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/main')

    expect(runMock).toHaveBeenCalled()
  })
})
