# Engineering Workshop — 3D Design Lab

Live demo: https://divyadoshi45018-art.github.io/engineering-workshop/

A phone-friendly browser prototype for exploring mechanical assemblies and simple electrical circuits in a 3D bench.

## Current features
- Full-screen 3D viewport, orbit, zoom, grid toggle and responsive layout.
- Component library with grouped 3D geometry: blocks, cylinders, spheres, cones, rings, toothed gears, shafts, wheels, bearing rings/balls, washers, threaded bolts, springs, a DC motor, base plate, battery, LED, bulb, switch, resistor, IC chip and wire piece.
- Select, drag-move, move in X/Y/Z, rotate around X/Y/Z, scale, duplicate, delete, recolour and undo.
- Approximate length/height/width controls in millimetres. The scale is illustrative (1 scene unit = 10 mm), not certified CAD dimensions.
- Assembly connection mode: tap one part, then another to add a visible connector link. Links are saved with the project.
- Learning circuit demo: add a battery, switch, resistor and LED or bulb; connect the four parts into a loop (each has two links); turn the switch ON; press Run circuit. The light mesh glows when the demo's connection checks pass. Stop the simulation to turn the glow off.
- Save/load uses localStorage in the current browser on the current device.

## Use the circuit demo
1. Add a battery, switch, resistor and LED or bulb.
2. Turn **Connect parts** on. Tap pairs to make these links: battery–switch, switch–resistor, resistor–LED/bulb, LED/bulb–battery.
3. Select the switch and tap **Toggle switch** until it is ON.
4. Press **Run circuit**. A complete loop should glow; an incomplete loop shows a status message.
5. Press **Stop** to stop the simulation.

## Limitations
This is a learning prototype, not a manufacturing-grade CAD system or a validated electrical simulator. Parts and dimensions are approximate; connection links are visual assembly/electrical links rather than physical constraints; no true collision solver, mesh export, circuit voltage/current calculation, component datasheets or electrical safety checking is implemented. A glowing lamp demonstrates simple circuit logic only and does not guarantee a real circuit will work safely.

## Development
The page loads Three.js and OrbitControls from jsDelivr CDN, so the first load requires internet access. It is a static GitHub Pages site; no build step is required.


## Recent working-sandbox improvements

- The light demo now has a stronger emissive bulb/LED material, a visible halo, and a local point light when the simulation passes.
- Electrical wires use each part's terminal positions instead of connecting the centers of component bodies. The connection logic prefers unused terminals.
- A compatible mechanical connection can auto-align a shaft with a wheel, bearing, gear, pulley or motor; a bearing can seat into a wheel; two gears are positioned for meshing; and a nut/washer can be placed on a bolt.
- Added nut, pulley, L-bracket and hinge parts.
- A simple DC motor loop can run as battery → switch → motor → battery; the motor shaft animates while the loop is closed and the switch is ON.
- The demo bulb loop remains a simplified teaching model. It does not calculate real current, voltage drop, LED polarity, torque, gear teeth contact, collisions, or manufacturing tolerances. Always build real circuits separately and safely.
