---
name: screenshot
description: Take screenshots of the local macOS display and analyze them with a vision model. Use when: (1) user asks to check/see their screen, (2) verifying UI changes in apps, (3) debugging visual issues, (4) any time you need to see what's on screen without asking the user to take a screenshot manually. Triggers on "check my screen", "take a screenshot", "what's on my screen", "look at my screen", "revisa mi pantalla", "toma screenshot", "see my screen". NOT for: remote machines, non-macOS systems, or when the user already provided a screenshot in the message.
---

# Screenshot Skill

Take and analyze screenshots on macOS without user intervention.

## Quick Usage

```bash
# Full screen screenshot (silent, no shutter sound)
/usr/sbin/screencapture -x -t jpg <output_path>

# After capture, analyze with image tool
```

## Workflow

1. Capture: `/usr/sbin/screencapture -x -t jpg /Users/hectorvelasquez/.openclaw/workspace/auto-screenshot.jpg`
2. Analyze: use `image` tool on the captured file
3. Cleanup: delete the screenshot file after analysis

## Bringing an App to Front Before Capture

```bash
osascript -e 'tell application "<AppName>" to activate'
sleep 2
/usr/sbin/screencapture -x -t jpg <output_path>
```

## Options

| Flag | Effect |
|------|--------|
| `-x` | Silent (no shutter sound) |
| `-t jpg` | JPEG format (smaller than PNG, stays under 5MB vision limit) |
| `-R x,y,w,h` | Capture specific region |
| `-T <seconds>` | Delay before capture |

## Important Notes

- Use JPG format (`-t jpg`) to stay under the 5MB vision model limit
- Full path required: `/usr/sbin/screencapture` (not in default PATH)
- Use `osascript -e 'tell application "X" to activate'` to bring apps to front before capturing
- Cannot send keystrokes or mouse clicks (macOS security restriction) — only capture and observe
- Always delete temp screenshot files after analysis to keep workspace clean
- Output path: use workspace directory (`~/.openclaw/workspace/auto-screenshot.jpg`)
