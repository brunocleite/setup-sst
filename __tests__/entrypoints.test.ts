/**
 * Tests for the bundled entry points, `src/main.ts` and `src/post.ts`.
 *
 * These are thin wrappers, so the only behaviour worth pinning is that
 * importing them kicks off the corresponding run function. The implementation
 * modules are mocked rather than spied on, because each entry point resolves
 * its own copy of them through the module registry.
 */

jest.mock('../src/mainImpl', () => ({ mainRun: jest.fn() }))
jest.mock('../src/postImpl', () => ({ postRun: jest.fn() }))

import { mainRun } from '../src/mainImpl'
import { postRun } from '../src/postImpl'

describe('entry points', () => {
  it('main.ts starts the main step on import', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/main')
    expect(mainRun).toHaveBeenCalledWith(true)
  })

  it('post.ts starts the post step on import', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/post')
    expect(postRun).toHaveBeenCalledWith(true)
  })
})
