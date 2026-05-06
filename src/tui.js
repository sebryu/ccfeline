import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadSettings, saveSettings, SETTINGS_PATH } from './settings.js';
import { listAnimations } from './animations.js';
import * as claude from './claude.js';
import { livePreview } from './preview.js';

const COLOR_MODES = [
  { value: 'none', label: 'none — plain' },
  { value: 'rainbow', label: 'rainbow — drifting hue gradient' },
  { value: 'tint', label: 'tint — single color overlay' },
];

export async function tui() {
  console.clear();
  p.intro(pc.bold(pc.cyan('  ≽^•⩊•^≼  cccat ')));

  let settings = loadSettings();

  while (true) {
    const installed = claude.isInstalled();
    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'preview', label: 'Preview (5s animated)' },
        {
          value: 'color',
          label: `Pick color mode  ${pc.dim(`(current: ${settings.color})`)}`,
        },
        // Animation picker is hidden until there's more than one cat to choose from.
        // The pickAnimation handler below is kept so re-enabling is a one-line change.
        // ...(listAnimations().length > 1 ? [{ value: 'animation', label: ... }] : []),
        {
          value: 'install',
          label: installed
            ? `Reinstall in Claude Code  ${pc.dim('(already installed)')}`
            : 'Install in Claude Code',
        },
        ...(installed ? [{ value: 'uninstall', label: 'Uninstall from Claude Code' }] : []),
        { value: 'where', label: 'Show config paths' },
        { value: 'quit', label: 'Quit' },
      ],
    });

    if (p.isCancel(action) || action === 'quit') break;

    if (action === 'preview') await livePreview({ durationMs: 5000 });
    else if (action === 'color') settings = await pickColor(settings);
    else if (action === 'animation') settings = await pickAnimation(settings);
    else if (action === 'install') await runInstall();
    else if (action === 'uninstall') runUninstall();
    else if (action === 'where') showPaths();
  }

  p.outro(pc.dim('See you ≽^- ⩊ -^≼'));
}

// Reserved for v0.2 when more cats land. Kept defined so the menu line above
// can be uncommented without other plumbing.
async function pickAnimation(settings) {
  const all = listAnimations();
  if (all.length === 0) {
    p.log.warn('No animations found.');
    return settings;
  }
  const choice = await p.select({
    message: 'Pick an animation',
    options: all.map((a) => ({
      value: a.name,
      label: `${a.name} ${pc.dim(`(${a.source})`)}`,
    })),
    initialValue: settings.animation,
  });
  if (p.isCancel(choice)) return settings;
  const next = { ...settings, animation: choice };
  saveSettings(next);
  p.log.success(`Animation set to ${pc.cyan(choice)}`);
  return next;
}

async function pickColor(settings) {
  const choice = await p.select({
    message: 'Pick a color mode',
    options: COLOR_MODES,
    initialValue: settings.color,
  });
  if (p.isCancel(choice)) return settings;
  const next = { ...settings, color: choice };
  saveSettings(next);
  p.log.success(`Color mode set to ${pc.cyan(choice)}`);
  return next;
}

async function runInstall() {
  const runtime = await p.select({
    message: 'Which runtime should Claude Code use to launch cccat?',
    options: [
      { value: 'bun', label: `bun (${claude.COMMANDS.bun})  — recommended, faster` },
      { value: 'node', label: `node (${claude.COMMANDS.node})` },
    ],
    initialValue: 'bun',
  });
  if (p.isCancel(runtime)) return;
  const { path: settingsPath, command, backupPath } = claude.install({ runtime });
  p.log.success(`Wrote ${pc.cyan('statusLine')} to ${pc.dim(settingsPath)}`);
  p.log.message(`command: ${pc.cyan(command)}`);
  if (backupPath) p.log.message(`backup:  ${pc.cyan(backupPath)} ${pc.dim('(previous statusLine preserved)')}`);
  p.log.message(pc.dim('Restart Claude Code to see the cat.'));
}

function runUninstall() {
  const result = claude.uninstall();
  if (!result.removed) {
    p.log.info('cccat was not installed.');
    return;
  }
  p.log.success('Removed cccat from Claude Code settings.');
  if (result.restoredCommand) {
    p.log.message(`Restored previous statusLine: ${pc.cyan(result.restoredCommand)}`);
    p.log.message(pc.dim(`from ${result.backupPath}`));
  }
}

function showPaths() {
  p.log.message(`settings: ${pc.cyan(SETTINGS_PATH)}`);
  p.log.message(`claude:   ${pc.cyan(claude.CLAUDE_SETTINGS)}`);
}
