# ccfeline — contributor notes

## Adding a new cat animation

1. Create `animations/<name>.txt`. The file is a plain text animation:
   - Each **frame** is a block of text (any height — most are 4 lines for the resting cat).
   - Frames are separated by a single line containing exactly `---FRAME---`.
   - Leading/trailing whitespace-only rows in a frame are trimmed at render time (`trim: "edges"` setting), so frames can declare more vertical room than they actually use without wasting space.
2. The current frame is picked by wall-clock time:
   `idx = floor(now_seconds / frameSeconds) % total_frames`
   This is stateless — every render call agrees on the frame, so animations stay smooth without IPC.
3. Test locally before committing:
   ```bash
   echo '{}' | bun src/cli.js                    # current frame
   bun src/cli.js preview                        # one frame with trailing newline
   CCFELINE_CONFIG_DIR=/tmp/ccfeline-test bun src/cli.js  # sandboxed settings
   ```
4. To make the new animation the default, change `DEFAULT_SETTINGS.animation` in `src/settings.js`. Otherwise it shows up in the picker and users opt in.

### Format example

```
   /\_/\
  ( -.- )
   > w <
   /___\
---FRAME---
   /\_/\
  ( o.o )
   > w <
   /___\
```

### Things to know about character widths

- The renderer (`src/render.js`) replaces leading runs of ASCII spaces with `U+2800` (Braille blank) per row. Claude Code's status line strips ASCII whitespace from the start of each row; `U+2800` survives that strip while rendering as a 1-cell blank. **Author the animation with normal spaces** — the renderer does the substitution.
- Don't put `\t`, NBSP, or zero-width chars in animation files; stick to ASCII printable + spaces.
- Avoid ANSI escape codes in the animation source — color is applied by `src/color.js` based on the user's `color` setting.

### Naming and discovery

- Filename without `.txt` is the animation's name (used in `settings.json` and the picker).
- Built-in animations live in `cccat/animations/` (shipped with the package).
- User animations live in `~/.config/ccfeline/animations/`. A user file shadows a built-in of the same name.

### Sizing guidance

- Cats walk horizontally by varying leading-space count. Keep the rightmost column under ~30 to avoid wrapping in narrow terminals.
- Vertical: 4–7 rows is comfortable. Anything taller pushes the prompt down a lot.
- Total frame count: any number works, but multiples of common cycle lengths (60 = 1 min at `frameSeconds: 1`) feel natural.

## Project layout

```
src/
  cli.js          entry / dispatch
                  - TTY no-args → welcome.runDefaultInstall (install or status)
                  - piped       → render
                  - `config`    → tui
                  - `preview`   → preview.livePreview
                  - install / uninstall / render → claude.js / render.js
  render.js       per-refresh render path (lean — no clack, no picocolors)
  preview.js     live animated preview, redraws frames in place
  welcome.js      first-run install + idempotent status messages
  tui.js          @clack/prompts UI
  settings.js     ~/.config/ccfeline/settings.json + DEFAULT_SETTINGS
  animations.js   discovery (built-in + user dirs) and parsing
  color.js        none / rainbow / tint / sweep-label modes
  frame.js        shared trim / pad / time → frame index helpers
  claude.js       patches ~/.claude/settings.json with the statusLine entry
animations/
  <name>.txt      built-in animations
```

The render path (`cli.js → render.js`) loads only `frame.js`, `color.js`, `animations.js`, `settings.js` — no clack, no picocolors — so per-refresh cost stays low.

### Hidden TUI features

- **Animation picker** is hidden from the menu while there's only one cat. The `pickAnimation` handler is still wired up in `tui.js`; uncomment the menu entry in the `select` options to bring it back when a second animation lands.

## Local development

```bash
bun install
bun src/cli.js                 # TUI
echo '{}' | bun src/cli.js     # one render
bun src/cli.js install         # writes ~/.claude/settings.json (use a sandbox dir for testing)
```

For end-to-end testing with Claude Code without publishing, point `statusLine.command` at the local file:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun /absolute/path/to/cccat/src/cli.js",
    "refreshInterval": 1
  }
}
```
