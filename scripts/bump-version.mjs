#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function resolveVersion() {
	const arg = process.argv.find((a) => a.startsWith("--version="));
	if (arg) {
		const value = arg.slice("--version=".length).trim();
		if (value) return value;
	}
	try {
		const tag = execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
			cwd: ROOT,
			encoding: "utf8",
		}).trim();
		if (tag) return tag.replace(/^v/, "");
	} catch {
		// no tags yet
	}
	return null;
}

const version = resolveVersion();
if (!version) {
	console.error("No version found. Pass --version=x.y.z or create a git tag.");
	process.exit(1);
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
	console.error(`Invalid version: ${version}`);
	process.exit(1);
}

const changed = [];

// package.json — update only the "version" value, preserving formatting.
const pkgPath = `${ROOT}package.json`;
const pkgText = readFileSync(pkgPath, "utf8");
const pkgNext = pkgText.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);
if (pkgNext !== pkgText) {
	writeFileSync(pkgPath, pkgNext);
	changed.push("package.json");
}

// CHANGELOG.md — insert a new version section right after the header.
// No `[Unreleased]` section by design: write the notes directly under the new version.
const changelogPath = `${ROOT}CHANGELOG.md`;
let changelogText = readFileSync(changelogPath, "utf8");
const today = new Date().toISOString().slice(0, 10);

if (new RegExp(`^##\\s+\\[${version.replace(/\./g, "\\.")}\\]`, "m").test(changelogText)) {
	console.warn(`CHANGELOG.md already has an entry for ${version}; skipped.`);
} else {
	const marker = "---\n\n";
	const markerIndex = changelogText.indexOf(marker);
	const insertAt = markerIndex === -1 ? 0 : markerIndex + marker.length;
	const section = `## [${version}] - ${today}\n\n### Added\n\n### Changed\n\n### Fixed\n\n`;
	changelogText =
		changelogText.slice(0, insertAt) + section + changelogText.slice(insertAt);
	writeFileSync(changelogPath, changelogText);
	changed.push("CHANGELOG.md");
}

console.log(
	changed.length
		? `Version bumped to ${version} in ${changed.join(", ")}.\nNext: write the notes under "## [${version}]", commit and push the tag (git tag v${version} && git push origin v${version}).`
		: `Nothing to change for version ${version}.`,
);
