# Playground — Repository Rules

This repo holds unrelated, standalone projects. **Projects must never depend on, import from, or modify each other.** These rules exist to enforce that. Read them before creating or changing anything.

## Structure

```
/
├── CLAUDE.md              # these rules (root governance only)
├── README.md              # project index
├── .gitignore             # repo-wide ignores only
├── .github/               # PR template, CI
├── scripts/               # repo-level tooling (e.g. boundary check)
├── _template/             # copy this to start a new project
└── <project-name>/        # one folder per project, at the repo root
```

- One project = one top-level folder, named `kebab-case`, lowercase, descriptive (`sales-sim`, not `test2`).
- Nothing project-specific lives at the root. The root allowlist is: `CLAUDE.md`, `README.md`, `.gitignore`, `.github/`, `scripts/`, `_template/`, and project folders. Anything else needs explicit approval.
- No nesting of projects inside projects. No `shared/`, `common/`, `utils/` or `lib/` folders at the root.

## Isolation rules

1. **Stay in your folder.** When working on a project, read and write only inside that project's folder. Do not edit another project or root files unless the task is explicitly about repo governance or the project index.
2. **No cross-project references.** No imports, relative paths (`../other-project`), symlinks, git submodules, or shared config pointing at another project.
3. **No shared code.** If two projects need the same logic, copy it. Duplication is the accepted cost of independence.
4. **Self-contained dependencies.** Each project owns its own manifest and lockfile (`package.json`, `requirements.txt`, `pyproject.toml`, etc.) inside its folder. No root-level manifests, workspaces, or monorepo tooling. Install, build and test commands run from the project folder.
5. **Self-contained ignores.** Project-specific ignore rules go in a `.gitignore` inside the project folder, not the root. Root `.gitignore` covers only universal items (OS files, editor files, `node_modules/`, `.env*`).
6. **Self-contained docs and config.** Each project carries its own `README.md`, tooling config, tests, and generated output. Generated output stays inside the project folder.
7. **No secrets.** Never commit credentials, tokens, or `.env` files. Commit a `.env.example` if a project needs variables.

## Required per project

- `README.md`: what it is, how to run it, how to test it, status (`active` / `paused` / `archived`).
- An entry in the root `README.md` index.
- Optional `CLAUDE.md` inside the project for project-specific instructions. It applies only within that folder and may not contradict this file.

## Starting a new project

1. `cp -r _template <project-name>`
2. Fill in the project `README.md`.
3. Add a row to the root `README.md` index.
4. Run `scripts/check-boundaries.sh`.

## Git conventions

- Prefix commit messages and PR titles with the project: `sales-sim: fix matcher scoring`.
- One project per commit and per PR. Governance changes (root files) get their own commit with the prefix `repo:`.
- Do not rename or move a project folder without updating the index and all internal paths in the same commit.

## Retiring a project

Set status to `archived` in its README and the index. Delete the folder only when the user asks; git history retains it.

## Verification

Run `scripts/check-boundaries.sh` before committing. It fails on unknown root entries, cross-project path references, root-level manifests, and missing project READMEs. CI runs the same check.
