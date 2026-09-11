# setup-sst

[![CI](https://github.com/brunocleite/setup-sst/actions/workflows/ci.yml/badge.svg)](https://github.com/brunocleite/setup-sst/actions/workflows/ci.yml)
[![Check dist/](https://github.com/brunocleite/setup-sst/actions/workflows/check-dist.yml/badge.svg)](https://github.com/brunocleite/setup-sst/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/brunocleite/setup-sst/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/brunocleite/setup-sst/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)
[![Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Setup%20SST%20Cache-blue?logo=github)](https://github.com/marketplace/actions/setup-sst-cache)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**Stop downloading Pulumi providers on every CI run.** This GitHub Action runs
`sst install` and caches what it produces, so the next run restores it in
seconds.

Installing SST providers means fetching the Pulumi engine and one plugin per
provider — hundreds of megabytes that are byte-for-byte identical between runs.
This action caches them, keyed on your SST version and `sst.config.ts`, and
skips the download entirely on a hit.

```yaml
- uses: brunocleite/setup-sst@v1
```

That is the whole setup for most projects. The lockfile is found automatically,
and npm, Bun, pnpm and Yarn are all supported.

## Quick start

Add the action after your dependency install step and before any `sst` command:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      # Restores the provider cache, or installs and caches it on a miss.
      - uses: brunocleite/setup-sst@v1

      - run: npx sst deploy --stage production
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

> [!IMPORTANT] Install your dependencies **before** this action. It reads your
> lockfile to pin the SST version, and it refuses to run `sst install` when SST
> is missing from `node_modules` — otherwise `npx` would silently fetch the
> latest release and cache the wrong providers.

## Inputs

| Input              | Default | Description                                                                                                       |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `sst-path`         | `./`    | Folder containing `sst.config.ts`.                                                                                |
| `lockfile-path`    | _auto_  | Path to the lockfile. Auto-detected from `sst-path`, then the repository root.                                    |
| `platform-only`    | `false` | Cache only `.sst/platform` and skip the provider binaries. Use for jobs that type-check or lint but never deploy. |
| `cache-key-suffix` | `''`    | Appended to the cache key. Use it to keep separate caches per app in a monorepo.                                  |
| `skip-install`     | `false` | Restore the cache but never run `sst install` on a miss.                                                          |
| `debug`            | `false` | Print the full SST installation log.                                                                              |

## Outputs

| Output            | Description                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| `cache-hit`       | `true` when the cache was restored, `false` when SST had to be installed. |
| `cache-key`       | The cache key used for this run.                                          |
| `sst-version`     | The SST version resolved from your lockfile.                              |
| `package-manager` | The detected package manager: `npm`, `bun`, `pnpm` or `yarn`.             |

## Supported package managers

The lockfile is detected automatically; `lockfile-path` is only needed when it
lives somewhere unusual.

| Package manager | Lockfile                                   |
| --------------- | ------------------------------------------ |
| npm             | `package-lock.json`, `npm-shrinkwrap.json` |
| Bun             | `bun.lock` (text) and `bun.lockb` (binary) |
| pnpm            | `pnpm-lock.yaml`                           |
| Yarn            | `yarn.lock` (Classic and Berry)            |

A binary `bun.lockb` cannot be parsed for a version, so its file hash is used to
key the cache instead. The effect is the same: the cache busts when your
dependencies change.

## Examples

### Lint or type-check without deploying

`.sst/platform` holds the generated type definitions, which is all a type-check
needs. Skipping the provider binaries makes the cache much smaller and the
restore much faster.

```yaml
- uses: brunocleite/setup-sst@v1
  with:
    platform-only: true

- run: npx tsc --noEmit
```

### A monorepo with several SST apps

Give each app its own cache with `cache-key-suffix`:

```yaml
strategy:
  matrix:
    app: [api, web]

steps:
  - uses: brunocleite/setup-sst@v1
    with:
      sst-path: ./apps/${{ matrix.app }}
      cache-key-suffix: ${{ matrix.app }}
```

### Bun

```yaml
- uses: oven-sh/setup-bun@v2
- run: bun install --frozen-lockfile
- uses: brunocleite/setup-sst@v1
```

### Reacting to a cache miss

```yaml
- uses: brunocleite/setup-sst@v1
  id: sst

- if: steps.sst.outputs.cache-hit == 'false'
  run: echo "Cold cache — installed SST v${{ steps.sst.outputs.sst-version }}"
```

## What gets cached

| Path                       | Contents                                 | Cached when            |
| -------------------------- | ---------------------------------------- | ---------------------- |
| `<sst-path>/.sst/platform` | Generated platform sources and typings   | Always                 |
| `~/.config/sst/plugins`    | Pulumi provider plugins — the bulk of it | Unless `platform-only` |
| `~/.config/sst/bin`        | The vendored `pulumi` and `bun` binaries | Unless `platform-only` |

The cache key is:

```text
<runner-os>-sst-<sst-version>-<hash of sst.config.ts>[-<suffix>]
```

Providers are declared in `sst.config.ts`, so hashing it means adding a provider
produces a new key and a fresh install. The runner OS is included because the
cached binaries are platform-specific.

> [!NOTE] Providers must be declared in `sst.config.ts` itself. If you import
> them from another file, changes there will not bust the cache — use
> `cache-key-suffix` to version it manually.

## Versioning

Pin the major tag to get fixes automatically:

```yaml
uses: brunocleite/setup-sst@v1
```

For a stricter supply chain, pin a commit SHA. See [SECURITY.md](./SECURITY.md)
for hardening notes.

## Compatibility

- **Runner**: Linux, macOS and Windows GitHub-hosted runners, and self-hosted
  runners with Node 24.
- **SST**: v3 and v4. Both use the same provider layout and `sst install`
  command.
- **Node**: the action runs on the runner's `node24` runtime; your project can
  use any Node version.

## Contributing

Bug reports and pull requests are welcome — see
[CONTRIBUTING.md](./CONTRIBUTING.md). The one thing that surprises new
contributors: `dist/` is committed, so run `npm run all` and commit the result.

## License

[MIT](./LICENSE) © Bruno Leite
