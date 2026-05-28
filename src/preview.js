import pc from 'picocolors';
import { loadSettings } from './settings.js';
import { loadAnimation } from './animations.js';
import { colorize } from './color.js';
import { prepareFrame, pickFrameIndex } from './frame.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// durationMs   — how long the fixed-length preview runs (used by `cccat preview`).
// untilKeypress — run forever, stopping on the next keypress (used by the TUI).
//                 Only honored on a TTY; falls back to the fixed-length loop otherwise.
export async function livePreview({ durationMs = 5000, untilKeypress = false } = {}) {
  const settings = loadSettings();
  const anim = loadAnimation(settings.animation);
  const total = anim.frames.length;
  const frameMs = Math.max(100, settings.frameSeconds * 1000);
  const interactive = untilKeypress && process.stdin.isTTY;
  const totalSteps = Math.max(1, Math.ceil(durationMs / frameMs));
  const startTime = Math.floor(Date.now() / 1000);
  const startIdx = pickFrameIndex(total, settings.frameSeconds, startTime);

  const tail = interactive ? 'press any key to stop' : `${(durationMs / 1000).toFixed(0)}s`;
  process.stdout.write(
    `\n${pc.dim(`preview · ${pc.cyan(anim.name)} · color=${settings.color} · ${tail}`)}\n\n`
  );

  const stdin = process.stdin;
  // Capture stdin's entry state so we can hand it back to clack exactly as we
  // found it — over-managing raw mode / pause is what breaks the next prompt.
  const enteredRaw = !!stdin.isRaw;
  const wasPaused = stdin.isPaused();

  // A CR/LF arriving within this window of start is treated as the Enter that
  // confirmed the menu selection still sitting in the input buffer — not a real
  // request to stop. A human's intentional Enter lands far later than this.
  const ENTER_GRACE_MS = 250;
  const startedAt = Date.now();

  let stopped = false;
  let resolveKey;
  const keyPressed = new Promise((resolve) => { resolveKey = resolve; });

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    if (interactive) {
      stdin.removeListener('data', onData);
      if (stdin.setRawMode) stdin.setRawMode(enteredRaw);
      if (wasPaused) stdin.pause();
    }
    process.removeListener('SIGINT', onSigint);
    process.stdout.write('\x1b[?25h');
  };

  const onData = (buf) => {
    // In raw mode SIGINT isn't delivered, so handle Ctrl-C (ETX) ourselves.
    if (buf.includes(0x03)) {
      restore();
      process.exit(130);
    }
    // Swallow the menu-confirm Enter if it's still buffered (see ENTER_GRACE_MS).
    if (Date.now() - startedAt < ENTER_GRACE_MS && buf.every((b) => b === 0x0d || b === 0x0a)) {
      return;
    }
    stopped = true;
    resolveKey();
  };

  const onSigint = () => {
    restore();
    process.exit(130);
  };

  // Hide cursor while we redraw frames in place; restore on exit.
  process.stdout.write('\x1b[?25l');
  process.on('SIGINT', onSigint);
  if (interactive) {
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  }

  let prevLineCount = 0;
  try {
    let step = 0;
    while (true) {
      const time = startTime + step * settings.frameSeconds;
      const idx = (startIdx + step) % total;
      const lines = colorize(prepareFrame(anim.frames[idx], settings), settings.color, {
        ...settings,
        time,
      });

      if (prevLineCount > 0) {
        process.stdout.write(`\x1b[${prevLineCount}A\x1b[J`);
      }
      process.stdout.write(lines.join('\n') + '\n');
      prevLineCount = lines.length;
      step++;

      if (interactive) {
        await Promise.race([sleep(frameMs), keyPressed]);
        if (stopped) break;
      } else {
        if (step >= totalSteps) break;
        await sleep(frameMs);
      }
    }
  } finally {
    restore();
    process.stdout.write('\n');
  }
}
