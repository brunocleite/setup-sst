# Contributing to setup-sst

Thanks for taking the time to contribute! This project is small, so the process
is light.

## Ways to contribute

- **Report a bug** — open an issue with the workflow YAML you used, the runner
  OS, your package manager, and the relevant log output.
- **Request a feature** — open an issue describing the problem you hit, not just
  the solution you have in mind.
- **Send a pull request** — see below.

## Development setup

You need Node.js (the version is pinned in [`.node-version`](./.node-version))
and npm.

```bash
git clone https://github.com/brunocleite/setup-sst.git
cd setup-sst
npm ci
```

Install the fixture apps that the tests run against:

```bash
npm run test:fixtures
```

## The commands you need

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm test`             | Runs the unit tests with coverage                         |
| `npm run lint`         | Lints with ESLint                                         |
| `npm run format:write` | Formats with Prettier                                     |
| `npm run package`      | Bundles `src/` into `dist/` with `ncc`                    |
| `npm run all`          | Format, lint, test, coverage badge, and bundle — run this |

## The one rule that trips everyone up: commit `dist/`

This is a JavaScript action, so GitHub runs the **bundled** code in
[`dist/`](./dist), not `src/`. If you change anything under `src/`, you must
rebuild and commit the result:

```bash
npm run all
git add dist/
```

The `Check dist/` workflow fails the PR if `dist/` does not match a fresh build
of `src/`. This is the most common reason a first PR goes red.

## Pull requests

1. Fork and branch off `main`.
2. Make your change, and add or update a test for it.
3. Run `npm run all` and commit the `dist/` changes it produces.
4. Open the PR and fill in the template.

Keep PRs focused — one logical change each. Unrelated formatting churn makes
review slower.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) are preferred
(`feat:`, `fix:`, `docs:`, `chore:`) because release notes are generated from
them, but this is not enforced by a hook.

## Releasing (maintainers)

Releases are automated. Push a tag and the
[`release` workflow](./.github/workflows/release.yml) verifies the build,
creates the GitHub release, and moves the floating major tag:

```bash
npm version patch --no-git-tag-version
npm run all
git commit -am "chore(release): v1.2.3"
git tag v1.2.3
git push origin main --tags
```

Consumers pin `@v1`, so moving the major tag is what actually ships the change.

## Code of Conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). By
participating you agree to uphold it.
