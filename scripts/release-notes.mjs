#!/usr/bin/env node
// Extract the CHANGELOG section for a version and print it to stdout.
// Usage: node scripts/release-notes.mjs v1.2.3
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, "utf8"));
const rawVersion = process.argv[2] ?? pkg.version ?? "";
const version = rawVersion.replace(/^v/, "");

if (!version) {
	console.error("Usage: node scripts/release-notes.mjs v1.2.3");
	process.exit(1);
}

const changelog = readFileSync(`${ROOT}CHANGELOG.md`, "utf8");
const lines = changelog.split("\n");
const escaped = version.replace(/\./g, "\\.");
const start = lines.findIndex((line) => new RegExp(`^##\\s+\\[${escaped}\\]`).test(line));

if (start === -1) {
	console.error(`No CHANGELOG entry found for ${version}.`);
	process.exit(0);
}

let end = lines.length;
for (let i = start + 1; i < lines.length; i++) {
	if (/^##\s+\[/.test(lines[i] ?? "")) {
		end = i;
		break;
	}
}

const body = lines
	.slice(start + 1, end)
	.join("\n")
	.replace(/\n{3,}/g, "\n\n")
	.trim();

process.stdout.write(`${body}\n`);
