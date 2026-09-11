# Security Policy

## Supported versions

Only the latest `v1` release line receives security updates. Pin the action to
the floating major tag to keep receiving them:

```yaml
uses: brunocleite/setup-sst@v1
```

| Version | Supported |
| ------- | --------- |
| `v1.x`  | ✅        |
| `v0.x`  | ❌        |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub's
[private vulnerability reporting](https://github.com/brunocleite/setup-sst/security/advisories/new)
form. You should get an acknowledgement within 7 days, and an assessment with a
fix timeline within 30 days.

Please include:

- A description of the issue and its impact
- Steps to reproduce, ideally a minimal workflow file
- The action version and runner OS

## What this action does with your data

This action is deliberately narrow in scope, which limits its blast radius:

- It reads your lockfile and `sst.config.ts` **only** to compute a cache key.
- It writes to the GitHub Actions cache via
  [`@actions/cache`](https://github.com/actions/toolkit/tree/main/packages/cache),
  scoped to your repository by GitHub.
- It runs `sst install` through your package manager when the cache misses.
- It **never** reads, logs, or transmits your AWS credentials, SST secrets, or
  environment variables.

## Hardening your workflow

Cache poisoning is the realistic threat model for any caching action. To reduce
your exposure:

- **Pin to a commit SHA** rather than a tag if you need full supply-chain
  integrity:
  ```yaml
  uses: brunocleite/setup-sst@<full-40-char-sha>
  ```
- **Do not use this action in `pull_request_target` workflows** that check out
  untrusted code. GitHub's cache is writable from branches, so a malicious PR
  could poison a cache entry that a privileged workflow later restores. This is
  a property of the GitHub cache, not of this action.
- Follow GitHub's
  [security hardening guide for Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions).
