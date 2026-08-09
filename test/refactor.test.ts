import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { buildEvidence, checkpoint, parseArgs } from "../extensions/refactor.ts";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
	const { stdout } = await execFileAsync("git", ["-C", cwd, ...args], { encoding: "utf8" });
	return stdout.trim();
}

test("parseArgs extracts an optional base and keeps additions", () => {
	assert.deepEqual(parseArgs('focus on tests BASE="HEAD~2" preserve API'), {
		base: "HEAD~2",
		additions: "focus on tests preserve API",
	});
	assert.deepEqual(parseArgs("preserve API"), { additions: "preserve API" });
});

test("buildEvidence keeps users and tools while dropping assistant prose and thinking", () => {
	const entries = [
		{
			type: "message",
			message: { role: "user", content: "Fix the parser", timestamp: 1 },
		},
		{
			type: "message",
			message: {
				role: "assistant",
				content: [
					{ type: "thinking", thinking: "secret plan" },
					{ type: "text", text: "I think the bug is here" },
					{ type: "toolCall", id: "call-1", name: "read", arguments: { path: "src/parser.ts" } },
				],
				api: "test",
				provider: "test",
				model: "test",
				usage: {},
				stopReason: "toolUse",
				timestamp: 2,
			},
		},
		{
			type: "message",
			message: {
				role: "toolResult",
				toolCallId: "call-1",
				toolName: "read",
				content: [{ type: "text", text: "export function parse() {}" }],
				isError: false,
				timestamp: 3,
			},
		},
	] as SessionEntry[];

	const evidence = buildEvidence(entries);
	assert.match(evidence, /\[U1\] Fix the parser/);
	assert.match(evidence, /\[T1 call\] read.*src\/parser\.ts/);
	assert.match(evidence, /\[T1 result\] read/);
	assert.doesNotMatch(evidence, /secret plan|I think/);
});

test("checkpoint preserves committed and dirty work before resetting to base", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-refactor-test-"));
	await git(root, ["init"]);
	await git(root, ["config", "user.name", "Pi Refactor Test"]);
	await git(root, ["config", "user.email", "test@example.com"]);
	await writeFile(join(root, "tracked.txt"), "base\n");
	await git(root, ["add", "tracked.txt"]);
	await git(root, ["commit", "-m", "base"]);
	const base = await git(root, ["rev-parse", "HEAD"]);

	await writeFile(join(root, "tracked.txt"), "committed attempt\n");
	await git(root, ["commit", "-am", "attempt"]);
	const attempt = await git(root, ["rev-parse", "HEAD"]);
	await writeFile(join(root, "tracked.txt"), "dirty attempt\n");
	await writeFile(join(root, "untracked.txt"), "untracked\n");

	const backup = await checkpoint(root, base);
	assert.equal(await git(root, ["rev-parse", "HEAD"]), base);
	assert.equal(await readFile(join(root, "tracked.txt"), "utf8"), "base\n");
	assert.equal(await git(root, ["status", "--porcelain=v1"]), "");
	assert.equal(await git(root, ["rev-parse", backup.backupRef]), attempt);
	assert.ok(backup.stash);
	assert.equal(await git(root, ["rev-parse", backup.stash!]), backup.stash);
});
