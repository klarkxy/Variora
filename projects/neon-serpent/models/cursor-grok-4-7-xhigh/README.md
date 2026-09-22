# cursor-grok-4-7-xhigh

| Field | Value |
| --- | --- |
| Model | cursor-grok-4-7-xhigh |
| Reasoning effort | unknown |
| Provider | unknown |
| Harness | Cursor (version unknown) |

## Assistance used

- Skills: frontend-design (local skill, version unknown) for the city palette and the on-screen type. motion (local skill, version unknown) for the frame loop: reused objects, no per-frame allocations on the hot path, and a capped timestep.
- Tools and plugins: Shell, to download Three.js 0.170.0 from the npm registry and bundle the official module build into one classic script with esbuild. Cursor's browser, to play the game and save a screenshot.
- Subagents: none

## Run

Open `app/index.html` in a browser. No install step. Choose Start, then turn with the mouse or with A and D. Click the view if the pointer is not captured. Eat the teal lights. After a hit, choose Run again, or press R. On a narrow window, Left and Right steer as well.

Three.js r170 is in `app/vendor/three.min.js`. That release has no separate UMD file, so the official `three.module.js` was bundled into one classic script. The preview sandbox can load it without module CORS. `app/vendor/LICENSE` is the MIT license.

## Notes

The camera sits at the snake's eyes. A short visor marks the nose. The body is the trail behind you, also drawn on the corner map. Length starts at 16 and grows by 4 each light. Buildings, the outer wall, and the torii posts block the way. Crossing the older part of the trail ends the run.

Buildings, windows, and trim are made in code. No image or audio files are fetched. Start begins a quiet two-note bed. Eating a light plays a short tone. A hit plays a noise burst.

Checked in Cursor's browser at a desktop width: the city renders, Start begins the run, eating teal lights raises the score and the length, and driving into a building opens Run again. Run again starts a fresh run. The corner map shows the trail. A sandboxed iframe with `allow-scripts` and `allow-pointer-lock`, the same permissions as the site preview, also rendered the street and the Start control. Screenshot: `screenshots/street.png`.
