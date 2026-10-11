# Engineering Workshop — 3D Design Lab

Live demo: https://divyadoshi45018-art.github.io/engineering-workshop/

A phone-friendly browser prototype for exploring mechanical assemblies and simple electrical circuits in a 3D bench.

## Current features
- Full-screen 3D viewport, orbit, zoom, grid toggle and responsive layout.
- Component library with grouped 3D geometry: blocks, cylinders, spheres, cones, rings, toothed gears, shafts, wheels, bearing rings/balls, washers, threaded bolts, springs, a DC motor, base plate, battery, LED, bulb, switch, resistor, capacitor, diode, buzzer, light sensor, IC chip and snap-connect wire.
- Select, drag-move, move in X/Y/Z, rotate around X/Y/Z, scale, duplicate, delete, recolour and undo.
- Approximate length/height/width controls in millimetres. The scale is illustrative (1 scene unit = 10 mm), not certified CAD dimensions.
- Assembly connection mode: tap one part, then another to add a visible connector link. Links are saved with the project.
- Circuit graph engine: connect component terminals directly or use wires; wire endpoints can snap to nearby free terminals. Closed paths through a battery, switch, resistor and one or more LEDs/bulbs power the lights. DC motor loops animate the motor shaft; a connected buzzer gets a visible active state. Capacitors block the simplified steady-DC path and diodes are directional.
- Save/load uses localStorage in the current browser on the current device.

## Use the circuit demo
1. Add a battery, switch, resistor, and one or more LEDs/bulbs.
2. Turn **Connect parts** on and connect the terminals in a closed loop, or add a wire and drag an endpoint close to a free terminal to snap it on.
3. Select the switch and tap **Switch ON/OFF** until it is ON.
4. Press **Run**. All lamps in a detected closed path glow; an incomplete path displays a status message.
5. Press **Stop** to turn the simulated outputs off.

## Limitations
This is a learning prototype, not a manufacturing-grade CAD system or a validated electrical simulator. Parts and dimensions are approximate; the circuit engine checks terminal connectivity and simple DC path logic, but it does not calculate numeric voltage/current, resistor power, transient capacitor behavior, real diode curves, component datasheets or electrical safety. Mechanical links are visual rather than physical constraints; no true collision solver or mesh export is implemented. A glowing lamp demonstrates the model's circuit logic only and does not guarantee a real circuit will work safely.

## Development
The page loads Three.js and OrbitControls from jsDelivr CDN, so the first load requires internet access. It is a static GitHub Pages site; no build step is required.


## Recent working-sandbox improvements

- The light demo now has a stronger emissive bulb/LED material, a visible halo, and a local point light when the simulation passes.
- Electrical wires use each part's terminal positions instead of connecting the centers of component bodies. The connection logic prefers unused terminals.
- A compatible mechanical connection can auto-align a shaft with a wheel, bearing, gear, pulley or motor; a bearing can seat into a wheel; two gears are positioned for meshing; and a nut/washer can be placed on a bolt.
- Added nut, pulley, L-bracket and hinge parts.
- A simple DC motor loop can run as battery → switch → motor → battery; the motor shaft animates while the loop is closed and the switch is ON.
- The demo bulb loop remains a simplified teaching model. It does not calculate real current, voltage drop, LED polarity, torque, gear teeth contact, collisions, or manufacturing tolerances. Always build real circuits separately and safely.
