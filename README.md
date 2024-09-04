# SST v3 GitHub Actions setup

This GitHub Action will prepare your [SST](https://sst.dev) v3 application by
installing the providers.

It automatically caches the providers if SST version and `sst.config.ts` files
have not changed.

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
    sst-folder: './sst'
```

How to release?

--> Run `npm run release` (remind to commit files before entering version
number)
