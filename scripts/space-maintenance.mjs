#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  readdirSync,
  rmSync,
  statfsSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const mode = process.argv[2] ?? "status";
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const minimumFreeGb = Number(process.env.SPACE_MIN_FREE_GB ?? 50);

const cacheDirectoryNames = new Set([
  ".next",
  ".turbo",
  "coverage",
  "playwright-report",
  "test-results",
]);
const dependencyDirectoryNames = new Set(["node_modules"]);
const excludedDirectoryNames = new Set([
  ".claude",
  ".convex",
  ".git",
  ".venv",
  ".vercel",
  "Pods",
  "data",
  "outputs",
  "storage",
  "uploads",
  "vendor",
  "venv",
]);
const activeProcessPattern =
  /\b(node|next|turbo|vite|expo|convex|playwright|webpack|php|artisan|composer|python|uvicorn)\b/i;

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index >= 3 ? 2 : 1)} ${units[index]}`;
}

function freeBytes() {
  const stats = statfsSync(root);
  return Number(stats.bavail) * Number(stats.bsize);
}

function directoryBytes(directory) {
  try {
    const output = execFileSync("du", ["-sk", directory], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return Number.parseInt(output, 10) * 1024;
  } catch {
    return 0;
  }
}

function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\0")
      .filter(Boolean);
  } catch {
    return ["Process inspection unavailable; cleanup blocked for safety."];
  }
}

function activeProcesses() {
  try {
    return execFileSync("ps", ["-axo", "pid=,command="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .filter(
        (line) =>
          line.includes(root) &&
          activeProcessPattern.test(line) &&
          !line.trimStart().startsWith(`${process.pid} `),
      )
      .map((line) => line.trim());
  } catch {
    return [];
  }
}

function findTargets(includeDependencies) {
  const targets = [];
  const wanted = new Set(cacheDirectoryNames);
  if (includeDependencies) {
    for (const name of dependencyDirectoryNames) wanted.add(name);
  }

  function visit(directory, relativeDirectory = "") {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;

      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      const absolutePath = path.join(directory, entry.name);

      if (wanted.has(entry.name)) {
        targets.push({
          absolutePath,
          relativePath,
          kind: dependencyDirectoryNames.has(entry.name)
            ? "dependencies"
            : "cache",
        });
        continue;
      }

      if (
        excludedDirectoryNames.has(entry.name) ||
        dependencyDirectoryNames.has(entry.name)
      ) {
        continue;
      }

      visit(absolutePath, relativePath);
    }
  }

  visit(root);
  return targets;
}

function containsTrackedFiles(relativePath, tracked) {
  return tracked.some(
    (file) => file === relativePath || file.startsWith(`${relativePath}/`),
  );
}

function printStatus(targets, tracked) {
  const rows = targets
    .map((target) => ({
      ...target,
      bytes: directoryBytes(target.absolutePath),
      protected: containsTrackedFiles(target.relativePath, tracked),
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const total = rows.reduce((sum, row) => sum + row.bytes, 0);
  console.log(`Free disk space: ${formatBytes(freeBytes())}`);
  console.log(`Rebuildable project data: ${formatBytes(total)}`);

  for (const row of rows) {
    const protection = row.protected ? " [tracked files: protected]" : "";
    console.log(
      `${formatBytes(row.bytes).padStart(10)}  ${row.relativePath}${protection}`,
    );
  }

  return rows;
}

function clean(includeDependencies) {
  const running = activeProcesses();
  if (running.length > 0 && !force) {
    console.error("Cleanup refused because this project appears to be active:");
    for (const processLine of running.slice(0, 8)) {
      console.error(`  ${processLine}`);
    }
    console.error("Stop the project first, then run the command again.");
    process.exitCode = 2;
    return;
  }

  const tracked = trackedFiles();
  const rows = printStatus(findTargets(includeDependencies), tracked);
  const removable = rows.filter((row) => !row.protected);
  const protectedRows = rows.filter((row) => row.protected);

  if (protectedRows.length > 0) {
    console.log(
      `Protected ${protectedRows.length} director${
        protectedRows.length === 1 ? "y" : "ies"
      } containing Git-tracked files.`,
    );
  }

  if (dryRun) {
    console.log(
      `Dry run: would remove ${formatBytes(
        removable.reduce((sum, row) => sum + row.bytes, 0),
      )}.`,
    );
    return;
  }

  for (const row of removable) {
    rmSync(row.absolutePath, { recursive: true, force: true });
  }

  console.log(
    `Removed ${formatBytes(
      removable.reduce((sum, row) => sum + row.bytes, 0),
    )} of rebuildable data.`,
  );
}

if (!["status", "clean", "deep-clean", "auto"].includes(mode)) {
  console.error(
    "Usage: node scripts/space-maintenance.mjs <status|clean|deep-clean|auto> [--dry-run] [--force]",
  );
  process.exitCode = 1;
} else if (mode === "status") {
  printStatus(findTargets(true), trackedFiles());
} else if (mode === "auto") {
  const available = freeBytes();
  const threshold = minimumFreeGb * 1024 ** 3;
  console.log(
    `Free disk space: ${formatBytes(available)}; cleanup threshold: ${minimumFreeGb} GB.`,
  );
  if (available >= threshold) {
    console.log("No cleanup needed.");
  } else {
    clean(false);
  }
} else {
  clean(mode === "deep-clean");
}
