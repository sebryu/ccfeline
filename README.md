# ccfeline

A status line cat for [Claude Code](https://claude.com/claude-code). Relax with a cute cat while Claude does the work.

<video src="demo.mp4" autoplay loop muted playsinline></video>

```
              /\_/\
             ( -.- )
              > w <   purr~
              /___\
```

## Install

Pick whichever runtime you have on hand.

### With bunx

```bash
bunx ccfeline pspsps
```

### With npx

```bash
npx -y ccfeline pspsps
```

Either one writes the status line into `~/.claude/settings.json`, pinned to this version — no silent auto-upgrade every refresh.

## Commands

```bash
ccfeline pspsps     # call the cat in   (alias: install)
ccfeline shoo       # send it away      (alias: uninstall — restores any previous statusLine)
ccfeline config     # interactive config: colors, paths
ccfeline preview    # 5-second animated preview
```

To upgrade later: `bunx ccfeline@latest pspsps` (the `@latest` is needed to bust bunx's cache).

## License

MIT
