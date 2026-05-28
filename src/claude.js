import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
export const CLAUDE_SETTINGS = path.join(CLAUDE_DIR, 'settings.json');

// Pin to the version that performed the install so users don't auto-upgrade
// on every status-line refresh. To upgrade: `bunx ccfeline@latest pspsps`.
const PKG_VERSION = JSON.parse(
  fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')
).version;

export const COMMANDS = {
  bun: `bunx -y ccfeline@${PKG_VERSION}`,
  node: `npx -y ccfeline@${PKG_VERSION}`,
};

export function detectRuntime() {
  if (process.versions.bun) return 'bun';
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(probe, ['bunx'], { stdio: 'ignore' });
  return result.status === 0 ? 'bun' : 'node';
}

export function readClaudeSettings() {
  try {
    return JSON.parse(fs.readFileSync(CLAUDE_SETTINGS, 'utf8'));
  } catch {
    return {};
  }
}

function writeClaudeSettings(settings) {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  fs.writeFileSync(CLAUDE_SETTINGS, JSON.stringify(settings, null, 2) + '\n');
}

export function isInstalled() {
  const s = readClaudeSettings();
  return Boolean(s.statusLine?.command?.includes('ccfeline'));
}

function backupForeignStatusLine() {
  let raw;
  try {
    raw = fs.readFileSync(CLAUDE_SETTINGS, 'utf8');
  } catch {
    return null;
  }
  let existing;
  try {
    existing = JSON.parse(raw);
  } catch {
    return null;
  }
  const cmd = existing.statusLine?.command;
  if (!cmd || cmd.includes('ccfeline')) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${CLAUDE_SETTINGS}.bak-${stamp}`;
  fs.writeFileSync(backupPath, raw);
  return backupPath;
}

export function install({ runtime, refreshInterval = 1 } = {}) {
  const resolved = runtime || detectRuntime();
  const command = COMMANDS[resolved] || COMMANDS.bun;
  const backupPath = backupForeignStatusLine();
  const s = readClaudeSettings();
  s.statusLine = { type: 'command', command, refreshInterval };
  writeClaudeSettings(s);
  return { path: CLAUDE_SETTINGS, command, backupPath };
}

function findLatestBackup() {
  let entries;
  try {
    entries = fs.readdirSync(CLAUDE_DIR);
  } catch {
    return null;
  }
  const matches = entries.filter((f) => f.startsWith('settings.json.bak-')).sort();
  return matches.length ? path.join(CLAUDE_DIR, matches[matches.length - 1]) : null;
}

export function uninstall() {
  const s = readClaudeSettings();
  if (!s.statusLine?.command?.includes('ccfeline')) return { removed: false };

  const backupPath = findLatestBackup();
  let restoredCommand = null;
  if (backupPath) {
    try {
      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      if (backup.statusLine) {
        s.statusLine = backup.statusLine;
        restoredCommand = backup.statusLine.command || null;
      } else {
        delete s.statusLine;
      }
    } catch {
      delete s.statusLine;
    }
  } else {
    delete s.statusLine;
  }
  writeClaudeSettings(s);
  return { removed: true, restoredCommand, backupPath: restoredCommand ? backupPath : null };
}
