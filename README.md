# SST v3 GitHub Actions setup

This GitHub Action will prepare your [SST](https://sst.dev) v3 application by
installing the providers.

It automatically caches the providers if SST version and `sst.config.ts` files
have not changed.

## Inputs

- **Optional**: `package-lock` - the location of the `package-lock.json` file.  
  Defaults to `./package-lock.json`

- **Optional**: `sst-config` - the location of the `sst.config.json` file.  
  Defaults to `./sst.config.ts`

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
    package-lock: './package-lock.json'
    sst-config: './sst.config.ts'
```

How to release?

1. Bump version: `npm version patch --no-git-tag-version`
1. `npm run bundle`
1. Git commit
1. `./script/release` with new version from step (1)
