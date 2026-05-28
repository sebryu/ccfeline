import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
export const CONFIG_DIR = process.env.CCFELINE_CONFIG_DIR || path.join(xdg, 'ccfeline');
export const SETTINGS_PATH = path.join(CONFIG_DIR, 'settings.json');
export const USER_ANIM_DIR = path.join(CONFIG_DIR, 'animations');

export const DEFAULT_SETTINGS = {
  animation: 'sleep_and_purr',
  color: 'none',
  frameSeconds: 1,
  trim: 'edges',
  tint: [135, 206, 250],
  rainbowStep: 12,
  label: 'purr~',
  shimmer: [255, 255, 255],
  shimmerBase: [110, 110, 110],
};

export function loadSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.mkdirSync(USER_ANIM_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}
