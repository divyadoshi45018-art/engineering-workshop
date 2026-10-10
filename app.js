import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const viewport = document.querySelector('#viewport');
const statusEl = document.querySelector('#status');
const selectedName = document.querySelector('#selectedName');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0c1320');
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1000);
camera.position.set(7, 6, 9);
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.8, 0);
scene.add(new THREE.HemisphereLight(0xdbeaff, 0x263142, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2); keyLight.position.set(5,9,6); keyLight.castShadow=true; scene.add(keyLight);
const grid = new THREE.GridHelper(20,20,0x4a617d,0x26364b); grid.position.y=-0.02; scene.add(grid);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x101927,roughness:1})); floor.rotation.x=-Math.PI/2; floor.position.y=-0.04; floor.receiveShadow=true; scene.add(floor);
let parts=[]; let selected=null; let nextId=1; let moveMode=false; let drag=null; let colorIndex=0; const history=[]; const HISTORY_LIMIT=40;
const colors=[0x69e0c0,0x6ca8ff,0xffb86b,0xe59cff,0xf0f4f8,0xff6b7d];
function say(s){statusEl.textContent=s;}
function checkpoint(){history.push(JSON.stringify(serialize()));if(history.length>HISTORY_LIMIT)history.shift();document.querySelector('#undoBtn').disabled=history.length===0;}
function undo(){if(!history.length)return say('Nothing to undo');const previous=JSON.parse(history.pop());load(previous);document.querySelector('#undoBtn').disabled=history.length===0;say('Last edit undone');}
function makeGearGeometry(){const shape=new THREE.Shape();const teeth=12, outer=1.05, root=.78;for(let i=0;i<teeth*4;i++){const a=i/(teeth*4)*Math.PI*2;const step=i%4;const r=(step===1||step===2)?outer:root;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);}shape.closePath();const hole=new THREE.Path();hole.absellipse(0,0,.25,.25,0,Math.PI*2,true,0);shape.holes.push(hole);const g=new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false,curveSegments:8});g.rotateX(-Math.PI/2);g.computeVertexNormals();return g;}
function makeWasherGeometry(){const s=new THREE.Shape();s.absarc(0,0,.55,0,Math.PI*2,false);const h=new THREE.Path();h.absarc(0,0,.23,0,Math.PI*2,true);s.holes.push(h);const g=new THREE.ExtrudeGeometry(s,{depth:.12,bevelEnabled:false,curveSegments:24});g.rotateX(-Math.PI/2);return g;}
function makeSpringGeometry(){const pts=[];for(let i=0;i<=100;i++){const t=i/100;const a=t*Math.PI*12;pts.push(new THREE.Vector3(Math.cos(a)*.28,(t-.5)*1.5,Math.sin(a)*.28));}return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),120,.055,8,false);}
function makeWireGeometry(){const pts=[new THREE.Vector3(-.8,0,0),new THREE.Vector3(-.45,.25,0),new THREE.Vector3(0,.32,.05),new THREE.Vector3(.45,.15,0),new THREE.Vector3(.8,0,0)];return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),32,.045,8,false);}
function createPart(type, position){let geometry, name;switch(type){
case'box':geometry=new THREE.BoxGeometry(1.5,1,1);name='Block';break;
case'cylinder':geometry=new THREE.CylinderGeometry(.6,.6,1.2,32);name='Cylinder';break;
case'sphere':geometry=new THREE.SphereGeometry(.65,24,16);name='Sphere';break;
case'cone':geometry=new THREE.ConeGeometry(.6,1.3,32);name='Cone';break;
case'torus':geometry=new THREE.TorusGeometry(.48,.16,12,32);name='Ring';break;
case'gear':geometry=makeGearGeometry();name='Gear';break;
case'shaft':geometry=new THREE.CylinderGeometry(.13,.13,2,20);name='Shaft';break;
case'wheel':geometry=new THREE.CylinderGeometry(.62,.62,.28,32);name='Wheel';break;
case'bearing':geometry=new THREE.TorusGeometry(.43,.16,12,32);name='Bearing';break;
case'washer':geometry=makeWasherGeometry();name='Washer';break;
case'bolt':geometry=new THREE.CylinderGeometry(.13,.13,1.15,12);name='Bolt';break;
case'spring':geometry=makeSpringGeometry();name='Spring';break;
case'motor':geometry=new THREE.CylinderGeometry(.42,.42,1.15,24);name='DC Motor';break;
case'battery':geometry=new THREE.CylinderGeometry(.28,.28,1.1,20);name='Battery';break;
case'led':geometry=new THREE.SphereGeometry(.2,16,12);name='LED';break;
case'switch':geometry=new THREE.BoxGeometry(.8,.25,.55);name='Switch';break;
case'board':geometry=new THREE.BoxGeometry(1.5,.12,1);name='Circuit Board';break;
case'wire':geometry=makeWireGeometry();name='Wire';break;
default:return;}
const metal=['gear','shaft','wheel','bearing','washer','bolt','motor'].includes(type);
const material=new THREE.MeshStandardMaterial({color:type==='led'?0xff5555:colors[(nextId-1)%colors.length],metalness:metal?.55:.15,roughness:.35,emissive:type==='led'?0x330000:0x000000});
const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(position||new THREE.Vector3((parts.length%4-1.5)*1.7,.8,Math.floor(parts.length/4)*1.6));mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={id:nextId++,type,name};scene.add(mesh);parts.push(mesh);select(mesh);say(name+' added');return mesh;}
function select(mesh){if(selected&&selected.material&&selected.material.emissive)selected.material.emissive.setHex(0x000000);selected=mesh;if(selected){selected.material.emissive.setHex(0x142a32);selectedName.textContent=selected.userData.name+' #'+selected.userData.id;}else selectedName.textContent='None';}
function removeSelected(){if(!selected)return say('Select a part first');scene.remove(selected);selected.geometry.dispose();selected.material.dispose();parts=parts.filter(p=>p!==selected);select(null);say('Part deleted');}
function add(type){checkpoint();createPart(type);}
document.querySelectorAll('[data-part]').forEach(b=>b.addEventListener('click',()=>add(b.dataset.part)));
document.querySelector('#rotateBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();selected.rotation.y+=Math.PI/12;say('Rotated 15°');});
document.querySelector('#scaleBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();selected.scale.multiplyScalar(1.15);say('Scaled up');});
document.querySelector('#scaleDownBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();selected.scale.multiplyScalar(.87);say('Scaled down');});
document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();const [axis,amount]=b.dataset.move.split(',');selected.position[axis]+=Number(amount);say('Moved '+axis.toUpperCase());}));
document.querySelectorAll('[data-rotate]').forEach(b=>b.addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();const [axis,degrees]=b.dataset.rotate.split(',');selected.rotation[axis]+=Number(degrees)*Math.PI/180;say('Rotated '+axis.toUpperCase());}));
document.querySelector('#duplicateBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();const old=selected;const copy=createPart(old.userData.type,old.position.clone().add(new THREE.Vector3(.5,0,.5)));copy.rotation.copy(old.rotation);copy.scale.copy(old.scale);copy.material.color.copy(old.material.color);say('Part duplicated');});
document.querySelector('#deleteBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();removeSelected();});
document.querySelector('#undoBtn').addEventListener('click',undo);
document.querySelector('#colorBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();colorIndex=(colorIndex+1)%colors.length;selected.material.color.setHex(colors[colorIndex]);say('Colour changed');});
document.querySelector('#moveBtn').addEventListener('click',()=>{moveMode=!moveMode;document.querySelector('#moveBtn').textContent=moveMode?'Move: ON':'Move';controls.enabled=!moveMode;say(moveMode?'Move mode: drag a selected part':'Orbit mode: drag to rotate view');});
document.querySelector('#resetViewBtn').addEventListener('click',()=>{camera.position.set(7,6,9);controls.target.set(0,.8,0);controls.update();say('View reset');});
document.querySelector('#clearBtn').addEventListener('click',()=>{if(!confirm('Remove every part from this scene?'))return;checkpoint();parts.forEach(p=>{scene.remove(p);p.geometry.dispose();p.material.dispose();});parts=[];select(null);say('Scene cleared');});
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),0), hit=new THREE.Vector3();
function setPointer(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);}
renderer.domElement.addEventListener('pointerdown',e=>{setPointer(e);const hits=raycaster.intersectObjects(parts,false);if(hits.length){select(hits[0].object);if(moveMode){checkpoint();const obj=selected;if(raycaster.ray.intersectPlane(plane,hit))drag={id:e.pointerId,obj,offset:obj.position.clone().sub(hit)};renderer.domElement.setPointerCapture(e.pointerId);}}else if(!moveMode)select(null);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;setPointer(e);if(raycaster.ray.intersectPlane(plane,hit)){drag.obj.position.x=hit.x+drag.offset.x;drag.obj.position.z=hit.z+drag.offset.z;}});
function endDrag(e){if(drag&&drag.id===e.pointerId){drag=null;say('Part moved');}}renderer.domElement.addEventListener('pointerup',endDrag);renderer.domElement.addEventListener('pointercancel',endDrag);
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
function serialize(){return {version:1,parts:parts.map(p=>({type:p.userData.type,name:p.userData.name,id:p.userData.id,position:p.position.toArray(),rotation:p.rotation.toArray(),scale:p.scale.toArray(),color:p.material.color.getHex()}))};}
function load(data){parts.forEach(p=>{scene.remove(p);p.geometry.dispose();p.material.dispose();});parts=[];select(null);nextId=1;(data.parts||[]).forEach(d=>{const p=createPart(d.type,new THREE.Vector3(...d.position));p.userData.id=d.id;p.rotation.set(d.rotation[0],d.rotation[1],d.rotation[2]);p.scale.set(...d.scale);p.material.color.setHex(d.color);nextId=Math.max(nextId,d.id+1);});say('Project loaded');}
document.querySelector('#saveBtn').addEventListener('click',()=>{try{localStorage.setItem('engineering-workshop-project',JSON.stringify(serialize()));say('Project saved on this device');}catch(e){say('Could not save in this browser');}});
document.querySelector('#loadBtn').addEventListener('click',()=>{try{const saved=localStorage.getItem('engineering-workshop-project');if(!saved)return say('No saved project on this device yet');checkpoint();load(JSON.parse(saved));say('Saved project loaded');}catch(e){say('Could not load saved project');}});
try{const saved=localStorage.getItem('engineering-workshop-project');if(saved)load(JSON.parse(saved));else{createPart('box',new THREE.Vector3(-1,.6,0));createPart('gear',new THREE.Vector3(1,.15,0));createPart('shaft',new THREE.Vector3(1,1.25,0));say('Sample assembly ready');}}catch(e){say('Ready to build');}
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
