<h1 align="center">Pi Refactor</h1>

<p align="center"><strong>让跑偏的 coding agent 回到起点，同时保留工具已经证明的经验。</strong></p>

<p align="center"><a href="README.md">English</a> · <a href="LICENSE">MIT</a></p>

长会话会积累过时假设、失败 patch 和 assistant 自己写出的解释。Pi Refactor 提供一次重试指令：合并历次用户要求，只从工具调用/结果提取证据，备份旧工作，回到任务开始时的 commit，再用全新上下文完成任务。

```text
多轮 trace → user + tool calls/results → Refactor packet
           → backup + reset           → 新 session 重试
```

Pi 版本只有一个扩展且无运行时依赖；Codex 和 OpenCode 复用同一份小型 workflow。

## 安装

### Pi

需要 Git、Pi 0.84.1+ 和 Node.js 22.19+：

```bash
pi install npm:pi-refactor
```

重启 Pi 或执行 `/reload`，然后：

```text
/refactor
/refactor BASE=abc123 保持公开 API 不变
```

Pi 会在 session 启动时记录 `HEAD`。执行 `/refactor` 后，它会额外调用一轮模型完成证据压缩，创建恢复点，reset 工作树，打开新 Pi session，并自动提交重试 packet。

### Codex

```bash
npx pi-refactor install codex
```

重启 Codex 后使用：

```text
$refactor BASE=abc123 保持公开 API 不变
```

安装器也会提供兼容入口 `/prompts:refactor`。Codex 保留顶层 slash command，第三方包无法注册精确的 `/refactor`；当前官方推荐的可复用 workflow 入口是 skill，即 `$refactor`。

### OpenCode

```bash
npx pi-refactor install opencode
```

之后使用 `/refactor`。命令安装到 `~/.config/opencode/commands/refactor.md`，共享 skill 安装到 `~/.agents/skills/refactor/SKILL.md`。

本地源码安装：

```bash
pi install /absolute/path/to/pi-refactor
node install.mjs install codex opencode
```

## 工作流

Refactor packet 只接收：

- 按时间合并的全部 user message，后续纠正覆盖早期描述；
- 工具名、参数与结果；
- 错误、diff、测试输出、路径、符号、命令和版本。

进入压缩轮前会排除 assistant 文本、计划、结论、隐藏 reasoning 和 chain-of-thought。只有工具结果或验证输出支持的经验才会写入 packet，工具输出始终作为不可信证据引用。

```text
# Refactor packet
## Objective
## Requirements
## Evidence       # 使用 [Tn] 引用工具证据
## Lessons
## Verification
## Retry plan
```

## Git 恢复

reset 前会依次：

1. 拒绝在 merge、rebase、cherry-pick、revert 进行中执行；
2. 把当前 commit 保存到 `refs/pi-refactor/backups/<timestamp>`；
3. 用 `pi-refactor backup` 备注 stash tracked/untracked 改动；
4. 执行 `git reset --hard <base>` 和 `git clean -fd`。

不会使用 `git clean -x`，ignored 文件保持不动。恢复旧尝试：

```bash
git show refs/pi-refactor/backups/<timestamp>
git stash apply <stash-hash>
```

## 开发

```bash
npm install --ignore-scripts
npm run check
npm test
```

发布包只包含 Pi 扩展、两份 Markdown 适配、安装器、README 和许可证，无生产依赖。

## License

[MIT](LICENSE) © Pi Refactor contributors
