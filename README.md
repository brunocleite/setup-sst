# SST v3 GitHub Actions setup

[![GitHub Super-Linter](https://github.com/brunocleite/setup-sst/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/brunocleite/setup-sst/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/brunocleite/setup-sst/actions/workflows/check-dist.yml/badge.svg)](https://github.com/brunocleite/setup-sst/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/brunocleite/setup-sst/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/brunocleite/setup-sst/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This GitHub Action will prepare your [SST](https://sst.dev) v3 application by
installing the providers.

It automatically caches the providers if SST version in `package-lock.json` and
`sst.config.ts` files have not changed. It is assuming that your providers are
listed in `sst.config.ts` and not referenced to another file.

## Inputs

- **Optional**: `sst-folder` - the location of the SST folder.  
  Defaults to `./`

Sample with defaults:

```yaml
- name: Setup SST
  id: setup-sst
  uses: brunocleite/setup-sst-v3@v1
```

Sample without defaults:

```yaml
- name: Setup SST
  id: setup-sst
  uses: brunocleite/setup-sst-v3@v1
  with:
    sst-folder: 'sst'
```

## Cached folders

- `<sst-folder>/.sst/platform`
- `<home-folder>/.config/sst/plugins`
- `<home-folder>/.config/sst/bin`
