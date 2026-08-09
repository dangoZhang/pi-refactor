<h1 align="center">Pi Refactor</h1>

<p align="center"><strong>Reset a drifting coding-agent task without throwing away what the tools proved.</strong></p>

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="https://www.npmjs.com/package/pi-refactor"><img alt="npm" src="https://img.shields.io/npm/v/pi-refactor?style=flat-square"></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/github/license/dangoZhang/pi-refactor?style=flat-square"></a>
</p>

Long coding sessions accumulate stale assumptions, failed patches, and assistant-authored explanations. Pi Refactor adds one retry command that keeps the user requirements and observable tool evidence, backs up the abandoned work, returns Git to the task's starting commit, and continues in a fresh session.

```text
multi-turn trace → users + tool calls/results → Refactor packet
                → backup + reset to base     → fresh agent retry
```

The Pi implementation is one extension with no runtime dependencies. Codex and OpenCode use the same small workflow as a skill/command.

## Install

Pi Refactor requires Git and Node.js 22.19+ for Pi.

### Pi

```bash
pi install npm:pi-refactor
```

Restart Pi or run `/reload`, then invoke:

```text
/refactor
/refactor BASE=abc123 keep the public API unchanged
```

Pi records `HEAD` when the session starts. `/refactor` makes one evidence-compaction model call, creates recovery refs, resets the worktree, opens a new Pi session, and submits the retry packet automatically.

### Codex

```bash
npx pi-refactor install codex
```

Restart Codex and invoke the skill:

```text
$refactor BASE=abc123 keep the public API unchanged
```

The installer also provides the deprecated custom-prompt compatibility entry `/prompts:refactor`. Codex reserves top-level slash commands, so an installed package cannot expose an exact `/refactor` alias; `$refactor` is the current supported reusable-workflow surface.

### OpenCode

```bash
npx pi-refactor install opencode
```

Then invoke `/refactor`. The command is installed at `~/.config/opencode/commands/refactor.md`; the shared skill is installed at `~/.agents/skills/refactor/SKILL.md`.

For local development:

```bash
pi install /absolute/path/to/pi-refactor
node install.mjs install codex opencode
```

## What survives

The compaction input contains:

- every user message, with later corrections taking precedence;
- tool names and arguments;
- tool results, errors, diffs, and test output;
- exact paths, symbols, commands, and versions when present.

Assistant prose, plans, conclusions, hidden reasoning, and chain-of-thought are excluded before the compaction call. A lesson enters the packet only when a tool result or verification outcome supports it. Tool output is quoted as untrusted evidence, not followed as instructions.

Pi creates this packet shape:

```text
# Refactor packet
## Objective
## Requirements
## Evidence       # claims cite [Tn] tool evidence
## Lessons
## Verification
## Retry plan
```

## Git safety

Before reset, Pi Refactor:

1. rejects an active merge, rebase, cherry-pick, or revert;
2. saves the current commit under `refs/pi-refactor/backups/<timestamp>`;
3. stashes tracked and untracked changes with a `pi-refactor backup` message;
4. runs `git reset --hard <base>` and `git clean -fd`.

It never uses `git clean -x`, so ignored files remain in place. Recover an abandoned attempt with the identifiers printed in the new session:

```bash
git show refs/pi-refactor/backups/<timestamp>
git stash apply <stash-hash>
```

## Development

```bash
npm install --ignore-scripts
npm run check
npm test
```

The published tarball contains the Pi extension, two Markdown adapters, the installer, READMEs, and license. There are no production dependencies.

## License

[MIT](LICENSE) © Pi Refactor contributors
