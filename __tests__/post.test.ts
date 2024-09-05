/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import * as postImpl from '../src/postImpl'

// Mock the action's entrypoint
const runMock = jest.spyOn(postImpl, 'postRun').mockImplementation()

describe('post', () => {
  it('calls run when imported', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/post')

    expect(runMock).toHaveBeenCalled()
  })
})
