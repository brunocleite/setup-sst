# SST v3 GitHub Actions setup

[![GitHub Super-Linter](https://github.com/brunocleite/setup-sst/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/brunocleite/setup-sst/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/brunocleite/setup-sst/actions/workflows/check-dist.yml/badge.svg)](https://github.com/brunocleite/setup-sst/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/brunocleite/setup-sst/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/brunocleite/setup-sst/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This GitHub Action will prepare your [SST](https://sst.dev) v3 application by
installing the providers.

It automatically caches the providers if SST version in lockfile (supports npm
and Bun) and `sst.config.ts` files have not changed.  
It is assuming that your providers are listed in `sst.config.ts` and not
referenced to another file.

## Inputs

- **Optional**: `sst-path` - the SST configuration path path. `sst.config.ts`
  should be here. Defaults to `./`
- **Optional**: `lockfile-path` - the `package-lock.json` or `bun.lockb` file
  location. Defaults to `./package-lock.json`
- **Optional**: `platform-only` - Only caches the SST platform files on
  '.sst/platform'. Useful for linting runs that will not deploy. Defaults to
  `false`
- **Optional**: `debug` - Prints SST installation logs to the console. Defaults
  to `false`

- Sample with defaults:

```yaml
- name: Setup SST
  id: setup-sst
  uses: brunocleite/setup-sst-v3@v1
```

Sample specifying a different SST config and package other than root and
platform-only:

```yaml
- name: Setup SST
  id: setup-sst
  uses: brunocleite/setup-sst-v3@v1
  with:
    sst-path: './sst'
    lockfile-path: './sst/bun.lockb'
    platform-only: true
```

## Cached folders

- `<sst-folder>/.sst/platform` - everytime and platform-only
- `<home-folder>/.config/sst/plugins` - everytime
- `<home-folder>/.config/sst/bin` - everytime
