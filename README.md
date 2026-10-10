# Engineering Workshop

A free, phone-friendly starter 3D assembly playground built with Three.js.

## Publish on GitHub Pages
1. Upload `index.html`, `style.css`, `app.js`, and `README.md` to the root of a GitHub repository.
2. Commit the files to the `main` branch.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**, choose `main` and `/(root)`, then Save.
5. Open the published Pages URL. Internet is required to load Three.js from its CDN.

## Current features
- Expandable visual parts library: block, cylinder, sphere, cone, ring, gear, shaft, wheel, bearing, washer, bolt, spring, DC motor, battery, LED, switch, circuit board, and wire. These are simplified visual stand-ins, not manufacturer-accurate parts.
- Select, rotate, scale up/down, duplicate, recolour, delete, and undo recent edits.
- Orbit/zoom view, drag-move in the ground plane, and step-based X/Y/Z movement plus X/Y/Z rotation controls.
- Save/load design in browser local storage with separate Save and Load controls.

This is a learning prototype, not a validated CAD tool. Dimensions and parts are illustrative; there is no true physics, gear meshing, electrical simulation, or AI model generation yet. Undo history is temporary and clears when the page reloads.
