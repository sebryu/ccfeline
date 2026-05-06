const PAD = '⠀';
const RESET = '\x1b[0m';

const fg = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;

function hslToRgb(hDeg, s, l) {
  const h = ((hDeg % 360) + 360) % 360 / 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  const seg = Math.floor(h * 6);
  if (seg === 0) [r, g, b] = [c, x, 0];
  else if (seg === 1) [r, g, b] = [x, c, 0];
  else if (seg === 2) [r, g, b] = [0, c, x];
  else if (seg === 3) [r, g, b] = [0, x, c];
  else if (seg === 4) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function colorize(lines, mode, opts) {
  if (mode === 'none') return lines;
  if (mode === 'rainbow') return rainbow(lines, opts);
  if (mode === 'tint') return tint(lines, opts);
  return lines;
}

function rainbow(lines, { rainbowStep = 12, time = 0 }) {
  return lines.map((line) => {
    if (!line) return line;
    const out = [];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === PAD) { out.push(ch); continue; }
      const [r, g, b] = hslToRgb((i + time) * rainbowStep, 0.65, 0.6);
      out.push(fg(r, g, b) + ch);
    }
    return out.join('') + RESET;
  });
}

function tint(lines, { tint: rgb = [135, 206, 250] }) {
  const color = fg(rgb[0], rgb[1], rgb[2]);
  return lines.map((line) => (line ? color + line + RESET : line));
}
