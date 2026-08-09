#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const force = args.includes("--force");
const targets = args.filter((arg) => !arg.startsWith("--") && arg !== "install");
const selected = targets.length ? targets : ["codex", "opencode"];
const valid = new Set(["codex", "opencode"]);

if (selected.some((target) => !valid.has(target))) {
	console.error("Usage: agent-refactor install [codex] [opencode] [--force]");
	process.exitCode = 2;
} else {
	const prompt = await readFile(join(root, "prompts", "refactor.md"), "utf8");
	const skill = await readFile(join(root, "skills", "refactor", "SKILL.md"), "utf8");
	const files = [];
	if (selected.includes("codex")) {
		files.push([join(homedir(), ".codex", "prompts", "refactor.md"), prompt]);
		files.push([join(homedir(), ".agents", "skills", "refactor", "SKILL.md"), skill]);
	}
	if (selected.includes("opencode")) {
		files.push([join(homedir(), ".config", "opencode", "commands", "refactor.md"), prompt]);
		if (!selected.includes("codex")) {
			files.push([join(homedir(), ".agents", "skills", "refactor", "SKILL.md"), skill]);
		}
	}

	for (const [path, content] of files) {
		let existing;
		try {
			existing = await readFile(path, "utf8");
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
		if (existing !== undefined && existing !== content && !force) {
			throw new Error(`Refusing to overwrite ${path}; pass --force to replace it`);
		}
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, content);
		console.log(`${existing === undefined ? "installed" : "updated"} ${path}`);
	}
}
