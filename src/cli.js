#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const cmd = args[0];

async function main() {
  if (cmd === '-h' || cmd === '--help') return printHelp();
  if (cmd === '-v' || cmd === '--version') return printVersion();

  if (cmd === 'render') {
    const { render } = await import('./render.js');
    return render();
  }
  if (cmd === 'preview') {
    const { livePreview } = await import('./preview.js');
    return livePreview({ durationMs: 5000 });
  }
  if (cmd === 'install' || cmd === 'pspsps') {
    const { install } = await import('./claude.js');
    const runtime = args.includes('--node')
      ? 'node'
      : args.includes('--bun')
        ? 'bun'
        : undefined;
    const { path: p, command, backupPath } = install({ runtime });
    process.stdout.write(`installed: ${command}\n  -> ${p}\n`);
    if (backupPath) process.stdout.write(`  backup: ${backupPath}\n`);
    return;
  }
  if (cmd === 'uninstall' || cmd === 'shoo') {
    const { uninstall } = await import('./claude.js');
    const result = uninstall();
    if (!result.removed) {
      process.stdout.write('ccfeline was not installed\n');
      return;
    }
    process.stdout.write('uninstalled\n');
    if (result.restoredCommand) {
      process.stdout.write(`  restored previous statusLine: ${result.restoredCommand}\n`);
      process.stdout.write(`  from: ${result.backupPath}\n`);
    }
    return;
  }
  if (cmd === 'config') {
    if (!process.stdin.isTTY) {
      process.stderr.write('ccfeline config: requires a TTY\n');
      process.exit(1);
    }
    const { tui } = await import('./tui.js');
    return tui();
  }

  // No subcommand:
  //   piped stdin (Claude Code calling) → render one frame
  //   TTY (user just ran `bunx ccfeline`) → idempotent install + status
  if (!process.stdin.isTTY) {
    const { render } = await import('./render.js');
    return render();
  }
  const { runDefaultInstall } = await import('./welcome.js');
  return runDefaultInstall();
}

function printVersion() {
  const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));
  process.stdout.write(version + '\n');
}

async function printHelp() {
  const { SETTINGS_PATH, USER_ANIM_DIR } = await import('./settings.js');
  process.stdout.write(
    [
      'ccfeline — a cat status line for Claude Code',
      '',
      'Usage:',
      '  ccfeline                   first run: install. otherwise: show status.',
      '                          (piped stdin → render one frame)',
      '  ccfeline config            interactive config (TUI)',
      '  ccfeline preview           5-second animated preview in your terminal',
      '  ccfeline pspsps [--node|--bun]',
      '                          add ccfeline to ~/.claude/settings.json (call the cat in)',
      '                          runtime matches how you invoked it (bunx / npx)',
      '  ccfeline install           alias for pspsps',
      '  ccfeline shoo              remove ccfeline from ~/.claude/settings.json',
      '                          (restores previous statusLine if a backup exists)',
      '  ccfeline uninstall         alias for shoo',
      '  ccfeline render            render one frame to stdout',
      '  ccfeline --version         print version',
      '  ccfeline --help            this help',
      '',
      `Settings: ${SETTINGS_PATH} (defaults baked in).`,
      `Custom animations: drop .txt files into ${USER_ANIM_DIR}/.`,
      'Override the config dir with $CCFELINE_CONFIG_DIR or $XDG_CONFIG_HOME.',
      '',
    ].join('\n')
  );
}

main().catch((err) => {
  process.stderr.write(`ccfeline: ${err.message || err}\n`);
  process.exit(1);
});
