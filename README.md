<h1 align="center">Agent Refactor</h1>

<p align="center"><strong>Reset a drifting coding-agent task without throwing away what the tools proved.</strong></p>

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="https://www.npmjs.com/package/agent-refactor"><img alt="npm" src="https://img.shields.io/npm/v/agent-refactor?style=flat-square"></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/github/license/dangoZhang/agent-refactor?style=flat-square"></a>
</p>

Long coding sessions accumulate stale assumptions, failed patches, and assistant-authored explanations. Agent Refactor adds one retry command that keeps the user requirements and observable tool evidence, backs up the abandoned work, returns Git to the task's starting commit, and continues in a fresh session.

```text
multi-turn trace → users + tool calls/results → Refactor packet
                → backup + reset to base     → fresh agent retry
```

The Pi implementation is one extension with no runtime dependencies. Codex and OpenCode use the same small workflow as a skill/command.

## Install

Agent Refactor requires Git and Node.js 22.19+ for Pi.

### Pi

```bash
pi install npm:agent-refactor
```

Restart Pi or run `/reload`, then invoke:

```text
/refactor
/refactor BASE=abc123 keep the public API unchanged
```

Pi records `HEAD` when the session starts. `/refactor` makes one evidence-compaction model call, creates recovery refs, resets the worktree, opens a new Pi session, and submits the retry packet automatically.

### Codex

```bash
npx agent-refactor install codex
```

Restart Codex and invoke the skill:

```text
$refactor BASE=abc123 keep the public API unchanged
```

The installer also provides the deprecated custom-prompt compatibility entry `/prompts:refactor`. Codex reserves top-level slash commands, so an installed package cannot expose an exact `/refactor` alias; `$refactor` is the current supported reusable-workflow surface.

### OpenCode

```bash
npx agent-refactor install opencode
```

Then invoke `/refactor`. The command is installed at `~/.config/opencode/commands/refactor.md`; the shared skill is installed at `~/.agents/skills/refactor/SKILL.md`.

For local development:

```bash
pi install /absolute/path/to/agent-refactor
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

Before reset, Agent Refactor:

1. rejects an active merge, rebase, cherry-pick, or revert;
2. saves the current commit under `refs/agent-refactor/backups/<timestamp>`;
3. stashes tracked and untracked changes with an `agent-refactor backup` message;
4. runs `git reset --hard <base>` and `git clean -fd`.

It never uses `git clean -x`, so ignored files remain in place. Recover an abandoned attempt with the identifiers printed in the new session:

```bash
git show refs/agent-refactor/backups/<timestamp>
git stash apply <stash-hash>
```

## Evaluation

### Installed end-to-end checks

We installed the package locally and ran the same controlled dirty-worktree scenario through Pi 0.84.1 and Codex CLI 0.144.1 with `gpt-5.6-luna`: the first turn wrote `WRONG`, then Refactor had to back it up, reset, create a fresh session/worker, apply the corrected user requirement, and verify exact bytes.

| Host | Reset | Recovery ref + stash | Fresh context | Final `RIGHT\n` |
|---|---:|---:|---:|---:|
| Pi | pass | pass | new session | pass |
| Codex | pass | pass | isolated worker | pass |

These checks validate orchestration and isolation, not a general pass@1 improvement. A paired coding benchmark is still needed before claiming task-quality gains.

## Related work

- [LLMs Get Lost in Multi-Turn Conversation](https://arxiv.org/abs/2505.06120) reports a large reliability loss in underspecified multi-turn tasks and evaluates a simple Recap turn. Its [reference implementation](https://github.com/microsoft/lost_in_conversation/blob/main/simulator_recap.py) appends the complete task to the existing conversation; Agent Refactor additionally removes assistant-authored history, resets repository state, and retries in a fresh context.
- [SWE-Together](https://github.com/Togetherbench/SWE-Together) and [SWE-Interact](https://github.com/scaleapi/SWE-Interact) evaluate progressively revealed coding tasks and corrective user turns. They motivate preserving all user corrections instead of summarizing only the latest request.
- Pi's [handoff example](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/handoff.ts) generates a prompt for a new session. It serializes assistant content and does not restore Git; Agent Refactor narrows the trace to user/tool evidence and couples handoff with a recoverable reset.
- Claude Code's [`/rewind`](https://code.claude.com/docs/en/checkpointing) restores conversation or code checkpoints. It is host-specific and does not merge trace-grounded lessons into a cross-agent retry packet.
- [SE-Agent](https://github.com/JARVIS-Xs/SE-Agent) revises and recombines failed SWE-bench trajectories. It is a benchmark-scale search framework; Agent Refactor is a single interactive retry primitive and deliberately excludes unsupported self-reflection.

No reviewed project combined all four properties: recoverable Git reset, user-prompt merging, tool-evidence-only compression, and Codex/Pi/OpenCode packaging.

## Limits

- Pi can capture the starting commit exactly at session start. On Codex or OpenCode, pass `BASE=<commit>` when the trace does not establish it or when the agent created commits during the task.
- The compaction model can still omit or misstate evidence. `[Tn]` citations make the packet auditable but do not guarantee correctness.
- Stash excludes ignored files. Refactor also leaves ignored files untouched.
- OpenCode support follows its documented command/skill surfaces but was not executed locally because OpenCode was not installed on the test machine.
- Refactor is intentionally destructive after creating recovery points. Review the printed base and recovery identifiers for important worktrees.

## Development

```bash
npm install --ignore-scripts
npm run check
npm test
```

The published tarball contains the Pi extension, two Markdown adapters, the installer, READMEs, and license. There are no production dependencies.

## License

[MIT](LICENSE) © Agent Refactor contributors
