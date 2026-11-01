# A3 SOP / LOA Study

Practice Indy Area 3 SOPs and LOAs one aircraft at a time on a radar scope.

This is the dev version, with the Build tab: https://azooc.github.io/A3SOPLOAStudy/

The study-only version is [A3SOPLOAStudyLIVE](https://github.com/Azooc/A3SOPLOAStudyLIVE): https://azooc.github.io/A3SOPLOAStudyLIVE/. It uses the same files except [`edition.js`](edition.js), which is set to `"live"` there.

## Study

Pick what you're studying at the top:

- **North**: BOB, CRW and HNN
- **South**: CRW and BLF
- **Combined**: all of them

Each question puts one aircraft on the scope, with its route if it has one, and shows which sector it's for. Think through the answer (or type it), then hit **Show answer**.

`Space` shows the answer, `←` / `→` go to the previous / next question. **Shuffle** mixes up the order.

## Build

The Build tab is for making new questions.

1. Pick the **sector** the SOP / LOA applies to.
2. **Plane** (`P`): click the scope to place the aircraft.
3. **Move** (`V`): drag the plane to move it, drag the circle at the end of the vector line to turn it and set the vector length (hold `Shift` to snap to 5°), and drag the data block to put it where you want.
4. Fill in the data block: callsign, altitude, CID, speed and line 4.
5. **Route** (`R`): click to add route points. Segments are always straight. Click the plane first to start the route from it. `Enter` or `Esc` when done, `Backspace` to undo a point. Double-click a route point to delete it.
6. Type the question and answer, then hit **Save**. The scenario's data shows up in the box below; copy it and send it over to get it added.

To change a saved question, pick it from **Edit existing** (or paste its data into the box and hit **Load**), make your changes and Save again.

Your work in progress is kept in the browser, so a refresh won't lose it.

## Files

- [`scenarios.js`](scenarios.js): the study questions (paste saved output here)
- [`map.js`](map.js): the sector boundary lines and the part of the map the scope shows
- [`edition.js`](edition.js): `"dev"` here, `"live"` in the study-only repo
- `index.html`, `styles.css`, `app.js`: the site itself. No build step.

To run it locally, serve the folder with any static server, for example:

```bash
python -m http.server 8000
```
