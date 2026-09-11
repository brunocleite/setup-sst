import * as fs from 'fs'
import * as path from 'path'

/**
 * The package managers this action knows how to read a lockfile for.
 */
export type PackageManager = 'npm' | 'bun' | 'pnpm' | 'yarn'

export interface LockfileInfo {
  /** The detected package manager. */
  packageManager: PackageManager
  /** The command used to run the SST binary, e.g. `npx`. */
  runCommand: string
  /**
   * The resolved SST version, e.g. `3.19.3`. For binary Bun lockfiles the
   * version cannot be parsed, so this is a hash of the lockfile instead — it
   * serves the same purpose of busting the cache when SST changes.
   */
  sstVersion: string
  /** True when `sstVersion` is a file hash rather than a semver string. */
  isHash: boolean
}

/** Maps each package manager to the command that runs its binaries. */
const RUN_COMMANDS: Record<PackageManager, string> = {
  npm: 'npx',
  bun: 'bunx',
  pnpm: 'pnpm',
  yarn: 'yarn'
}

/**
 * Identifies the package manager from a lockfile path.
 *
 * @param lockfilePath Path to the lockfile.
 * @returns The package manager, or null when the filename is not recognised.
 */
export function detectPackageManager(
  lockfilePath: string
): PackageManager | null {
  const fileName = path.basename(lockfilePath)
  switch (fileName) {
    case 'package-lock.json':
    case 'npm-shrinkwrap.json':
      return 'npm'
    case 'bun.lock':
    case 'bun.lockb':
      return 'bun'
    case 'pnpm-lock.yaml':
      return 'pnpm'
    case 'yarn.lock':
      return 'yarn'
    default:
      return null
  }
}

/**
 * The lockfile names this action looks for, in the order they are preferred
 * when auto-detecting.
 */
export const KNOWN_LOCKFILES = [
  'package-lock.json',
  'npm-shrinkwrap.json',
  'bun.lock',
  'bun.lockb',
  'pnpm-lock.yaml',
  'yarn.lock'
] as const

/**
 * Finds a lockfile in a directory, preferring the order of `KNOWN_LOCKFILES`.
 *
 * @param directory Directory to search (not recursive).
 * @returns The absolute path to the lockfile, or null when none is present.
 */
export function findLockfile(directory: string): string | null {
  for (const name of KNOWN_LOCKFILES) {
    const candidate = path.join(directory, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Extracts the SST version from an npm `package-lock.json`.
 *
 * @param contents Raw lockfile contents.
 * @returns The SST version string.
 */
export function parseNpmLockfile(contents: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch {
    throw new Error(
      'Could not parse the npm lockfile as JSON. Is the `lockfile-path` input pointing at a valid `package-lock.json`?'
    )
  }

  if (!isRecord(parsed)) throw sstNotFoundError('package-lock.json')

  // lockfileVersion 2/3 use `packages`; version 1 uses `dependencies`.
  const version =
    readVersion(parsed.packages, 'node_modules/sst') ??
    readVersion(parsed.dependencies, 'sst')

  if (!version) throw sstNotFoundError('package-lock.json')
  return version
}

/**
 * Extracts the SST version from a text-format Bun lockfile (`bun.lock`,
 * the default since Bun 1.2). The format is JSONC, so comments and trailing
 * commas are stripped before parsing.
 *
 * @param contents Raw lockfile contents.
 * @returns The SST version string.
 */
export function parseBunLockfile(contents: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripJsonComments(contents))
  } catch {
    throw new Error(
      'Could not parse `bun.lock`. If this is a binary lockfile, rename it to `bun.lockb` so it is hashed instead.'
    )
  }

  if (!isRecord(parsed)) throw sstNotFoundError('bun.lock')
  const packages = isRecord(parsed.packages) ? parsed.packages : undefined
  const entry = packages?.['sst'] ?? packages?.['node_modules/sst']

  // The first element is a resolution string such as `sst@3.19.3`.
  const resolution = Array.isArray(entry) ? (entry[0] as unknown) : undefined
  if (typeof resolution !== 'string') throw sstNotFoundError('bun.lock')

  const version = resolution.slice(resolution.lastIndexOf('@') + 1)
  if (!version) throw sstNotFoundError('bun.lock')
  return version
}

/**
 * Extracts the SST version from a pnpm `pnpm-lock.yaml`.
 *
 * A dependency-focused scan is used rather than a full YAML parser: it keeps
 * the bundled action small, and the fields being read have a stable shape
 * across lockfile versions 6 and 9.
 *
 * @param contents Raw lockfile contents.
 * @returns The SST version string.
 */
export function parsePnpmLockfile(contents: string): string {
  // Preferred: the resolved version of the direct dependency, which appears as
  //   dependencies:
  //     sst:
  //       specifier: ^3.19.3
  //       version: 3.19.3
  const direct = contents.match(
    /^\s{4,}sst:\s*\n\s+specifier:.*\n\s+version:\s*['"]?([^'"\s(]+)/m
  )
  if (direct?.[1]) return direct[1]

  // Fallback: a package graph key such as `  sst@3.19.3:`.
  const graph = contents.match(/^\s+sst@([^:\s(]+)[:(]/m)
  if (graph?.[1]) return graph[1]

  throw sstNotFoundError('pnpm-lock.yaml')
}

/**
 * Extracts the SST version from a `yarn.lock` (both Classic and Berry).
 *
 * @param contents Raw lockfile contents.
 * @returns The SST version string.
 */
export function parseYarnLockfile(contents: string): string {
  const lines = contents.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // A block header lists one or more descriptors, e.g.
    //   "sst@npm:^3.19.3":           (Berry)
    //   sst@^3.19.3, sst@^3.18.0:    (Classic)
    if (/^\s/.test(line) || !line.trim()) continue

    const header = line.replace(/:\s*$/, '')
    const descriptors = header
      .split(',')
      .map(d => d.trim().replace(/^"|"$/g, ''))
    const isSst = descriptors.some(
      d => d.startsWith('sst@') && !d.startsWith('sst@npm:@')
    )
    if (!isSst) continue

    // The block's `version` field holds the concrete installed version.
    for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j++) {
      const match = lines[j].match(/^\s+version:?\s+"?([^"\s]+)"?/)
      if (match?.[1]) return match[1]
    }
  }

  throw sstNotFoundError('yarn.lock')
}

/**
 * Reads a lockfile and resolves the SST version and run command from it.
 *
 * @param lockfilePath Absolute path to the lockfile.
 * @param hashFile Hashes a file; used for binary Bun lockfiles which cannot be
 *   parsed. Injected so it can be substituted in tests.
 * @returns The detected package manager and SST version.
 */
export async function readLockfile(
  lockfilePath: string,
  hashFile: (file: string) => Promise<string>
): Promise<LockfileInfo> {
  const packageManager = detectPackageManager(lockfilePath)
  if (!packageManager) {
    throw new Error(
      `Unsupported lockfile: '${path.basename(lockfilePath)}'. Supported lockfiles are ${KNOWN_LOCKFILES.join(', ')}.`
    )
  }

  if (!fs.existsSync(lockfilePath)) {
    throw new Error(
      `Lockfile not found at '${lockfilePath}'. Set the 'lockfile-path' input, or run your package manager's install step before this action.`
    )
  }

  const runCommand = RUN_COMMANDS[packageManager]

  // A binary `bun.lockb` cannot be parsed, so its hash stands in for the
  // version: it changes exactly when the dependency set changes.
  if (lockfilePath.endsWith('bun.lockb')) {
    return {
      packageManager,
      runCommand,
      sstVersion: await hashFile(lockfilePath),
      isHash: true
    }
  }

  const contents = fs.readFileSync(lockfilePath, 'utf-8')
  const sstVersion = parseLockfileContents(
    packageManager,
    lockfilePath,
    contents
  )

  return { packageManager, runCommand, sstVersion, isHash: false }
}

/**
 * Dispatches to the parser matching the lockfile format.
 *
 * @param packageManager The detected package manager.
 * @param lockfilePath Path to the lockfile, used to distinguish Bun formats.
 * @param contents Raw lockfile contents.
 * @returns The SST version string.
 */
function parseLockfileContents(
  packageManager: PackageManager,
  lockfilePath: string,
  contents: string
): string {
  switch (packageManager) {
    case 'npm':
      return parseNpmLockfile(contents)
    case 'bun':
      return parseBunLockfile(contents)
    case 'pnpm':
      return parsePnpmLockfile(contents)
    case 'yarn':
      return parseYarnLockfile(contents)
  }
}

/**
 * Narrows an unknown value to a plain object.
 *
 * @param value The value to test.
 * @returns True when the value is a non-null object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Reads `container[key].version` when it is present and a string.
 *
 * @param container A lockfile section such as `packages` or `dependencies`.
 * @param key The entry to read.
 * @returns The version string, or undefined when absent.
 */
function readVersion(container: unknown, key: string): string | undefined {
  if (!isRecord(container)) return undefined
  const entry = container[key]
  if (!isRecord(entry)) return undefined
  return typeof entry.version === 'string' ? entry.version : undefined
}

/**
 * Builds the error shown when SST is absent from an otherwise valid lockfile.
 *
 * @param lockfileName The lockfile's base name.
 * @returns The error to throw.
 */
function sstNotFoundError(lockfileName: string): Error {
  return new Error(
    `Could not find the 'sst' package in ${lockfileName}. Add SST as a dependency and commit the updated lockfile.`
  )
}

/**
 * Removes comments and trailing commas so JSONC can be parsed as JSON.
 * String literals are preserved verbatim.
 *
 * @param input JSONC text.
 * @returns Equivalent JSON text.
 */
function stripJsonComments(input: string): string {
  let result = ''
  let inString = false
  let inLineComment = false
  let inBlockComment = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const next = input[i + 1]

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false
        result += char
      }
      continue
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }

    if (inString) {
      result += char
      if (char === '\\') {
        result += next ?? ''
        i++
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      result += char
      continue
    }

    if (char === '/' && next === '/') {
      inLineComment = true
      i++
      continue
    }

    if (char === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }

    result += char
  }

  // Drop trailing commas, which JSON rejects but JSONC allows.
  return result.replace(/,(\s*[}\]])/g, '$1')
}
