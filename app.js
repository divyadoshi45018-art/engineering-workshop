import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = s => document.querySelector(s);
const viewport = $('#viewport'), viewportWrap = $('#viewportWrap'), statusEl = $('#status');
const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b1420');
const camera = new THREE.PerspectiveCamera(48,1,.1,1000); camera.position.set(7,6,9);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.target.set(0,.6,0);
scene.add(new THREE.HemisphereLight(0xdbeaff,0x263142,2.1));
const keyLight=new THREE.DirectionalLight(0xffffff,2.3);keyLight.position.set(5,9,6);keyLight.castShadow=true;scene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0x8cbcff,.65);fillLight.position.set(-6,4,-4);scene.add(fillLight);
const grid=new THREE.GridHelper(24,24,0x4a617d,0x26364b);grid.position.y=-.025;scene.add(grid);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x101927,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.05;floor.receiveShadow=true;scene.add(floor);

let parts=[],selected=null,nextId=1,moveMode=false,connectMode=false,drag=null,firstConnection=null,gridOn=true,simulationRunning=false;
let connections=[],connectionVisuals=[],history=[],colorIndex=0;
const HISTORY_LIMIT=50, colors=[0x6ce3c1,0x70aaff,0xffb86b,0xe59cff,0xf0f4f8,0xff7185,0xffd45e];
const glowingLights=new Map();
function say(s){statusEl.textContent=s;}
function material(color,metalness=.15,roughness=.38,extra={}){return new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});}
function addMesh(group,geometry,mat,pos=[0,0,0],rot=[0,0,0]){const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function metalMat(color=0x9aa9ba){return material(color,.78,.27);}
function makeGearGeometry(){const shape=new THREE.Shape(),teeth=14,outer=.92,root=.72;for(let i=0;i<teeth*4;i++){const a=i/(teeth*4)*Math.PI*2,r=(i%4===1||i%4===2)?outer:root,x=Math.cos(a)*r,z=Math.sin(a)*r;if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);}shape.closePath();const hole=new THREE.Path();hole.absellipse(0,0,.24,.24,0,Math.PI*2,true,0);shape.holes.push(hole);const g=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:8});g.rotateX(-Math.PI/2);g.computeVertexNormals();return g;}
function makeRingGeometry(ro,ri,depth){const s=new THREE.Shape();s.absarc(0,0,ro,0,Math.PI*2,false);const h=new THREE.Path();h.absarc(0,0,ri,0,Math.PI*2,true);s.holes.push(h);const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:32});g.rotateX(-Math.PI/2);return g;}
function addThread(group,radius,length,mat,turns=9){const pts=[];for(let i=0;i<=turns*16;i++){const t=i/(turns*16),a=t*turns*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,(t-.5)*length,Math.sin(a)*radius));}return addMesh(group,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),turns*20,.025,6,false),mat);}
function makeSpring(group){const pts=[];for(let i=0;i<=140;i++){const t=i/140,a=t*Math.PI*14;pts.push(new THREE.Vector3(Math.cos(a)*.27,(t-.5)*1.35,Math.sin(a)*.27));}addMesh(group,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),180,.045,8,false),metalMat(0xc1ccd8));}
function makeWirePiece(group){const pts=[new THREE.Vector3(-.8,0,0),new THREE.Vector3(-.55,.18,0),new THREE.Vector3(-.2,.22,.03),new THREE.Vector3(.25,.12,0),new THREE.Vector3(.8,0,0)];addMesh(group,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.04,8,false),material(0xe9a44c,.25,.32));}
function createPart(type,position=null,opts={}){
 const g=new THREE.Group();let name=type,mainColor=colors[(nextId-1)%colors.length],mainMat=material(mainColor),metal=metalMat(),dark=material(0x263443,.55,.4),accent=material(0x6ce3c1,.3,.3),lightMesh=null;
 switch(type){
 case'box':name='Block';addMesh(g,new THREE.BoxGeometry(1.5,1,1),mainMat);break;
 case'cylinder':name='Cylinder';addMesh(g,new THREE.CylinderGeometry(.6,.6,1.2,40),mainMat);break;
 case'sphere':name='Sphere';addMesh(g,new THREE.SphereGeometry(.65,32,24),mainMat);break;
 case'cone':name='Cone';addMesh(g,new THREE.ConeGeometry(.6,1.3,40),mainMat);break;
 case'torus':name='Ring';addMesh(g,new THREE.TorusGeometry(.48,.16,16,40),metal);break;
 case'gear':name='Gear';addMesh(g,makeGearGeometry(),metal);addMesh(g,new THREE.CylinderGeometry(.32,.32,.2,32),dark);addMesh(g,new THREE.CylinderGeometry(.13,.13,.23,24),metal);break;
 case'shaft':name='Shaft';addMesh(g,new THREE.CylinderGeometry(.13,.13,2.1,24),metal);addMesh(g,new THREE.CylinderGeometry(.2,.2,.12,24),dark,[0,.72,0]);addMesh(g,new THREE.CylinderGeometry(.2,.2,.12,24),dark,[0,-.72,0]);break;
 case'wheel':name='Wheel';addMesh(g,new THREE.CylinderGeometry(.65,.65,.32,40),dark,[0,0,0],[0,0,Math.PI/2]);addMesh(g,new THREE.TorusGeometry(.52,.075,12,40),material(0x343f4b),[0,0,0],[0,Math.PI/2,0]);addMesh(g,new THREE.CylinderGeometry(.18,.18,.4,24),metal,[0,0,0],[0,0,Math.PI/2]);break;
 case'bearing':name='Bearing';addMesh(g,makeRingGeometry(.58,.39,.18),metal);addMesh(g,makeRingGeometry(.34,.22,.2),metal);for(let i=0;i<8;i++){const a=i*Math.PI/4;addMesh(g,new THREE.SphereGeometry(.075,12,10),material(0xc8d4df,.9,.2),[Math.cos(a)*.365,.1,Math.sin(a)*.365]);}break;
 case'washer':name='Washer';addMesh(g,makeRingGeometry(.55,.25,.1),metal);break;
 case'nut':name='Hex nut';addMesh(g,new THREE.CylinderGeometry(.34,.34,.18,6),metal);addMesh(g,new THREE.CylinderGeometry(.19,.19,.205,24),dark);addMesh(g,new THREE.TorusGeometry(.19,.025,8,24),metal,[0,.105,0],[Math.PI/2,0,0]);break;
 case'pulley':name='Pulley';addMesh(g,new THREE.CylinderGeometry(.48,.48,.28,32),metal,[0,0,0],[0,0,Math.PI/2]);addMesh(g,new THREE.TorusGeometry(.38,.08,12,32),dark,[0,0,0],[0,Math.PI/2,0]);addMesh(g,new THREE.CylinderGeometry(.17,.17,.34,24),metal,[0,0,0],[0,0,Math.PI/2]);break;
 case'bracket':name='L bracket';addMesh(g,new THREE.BoxGeometry(1,.12,.22),metal,[0,0,0]);addMesh(g,new THREE.BoxGeometry(.12,.8,.22),metal,[-.44,.34,0]);for(let i=0;i<2;i++)addMesh(g,new THREE.TorusGeometry(.065,.018,8,20),dark,[-.44+i*.68,.07,.116],[0,0,0]);break;
 case'hinge':name='Hinge';addMesh(g,new THREE.BoxGeometry(.48,.12,.38),metal,[-.27,0,0]);addMesh(g,new THREE.BoxGeometry(.48,.12,.38),metal,[.27,0,0]);for(let i=0;i<3;i++)addMesh(g,new THREE.CylinderGeometry(.075,.075,.22,20),dark,[0,-.22+i*.22,0]);addMesh(g,new THREE.CylinderGeometry(.035,.035,.82,16),metal,[0,0,0]);break;
 case'bolt':name='Threaded bolt';addMesh(g,new THREE.CylinderGeometry(.13,.13,1.1,16),metal);addMesh(g,new THREE.CylinderGeometry(.28,.28,.22,6),metal,[0,.62,0]);addThread(g,.145,.82,metal,9);break;
 case'spring':name='Spring';makeSpring(g);addMesh(g,new THREE.CylinderGeometry(.3,.3,.08,24),dark,[0,-.72,0]);addMesh(g,new THREE.CylinderGeometry(.3,.3,.08,24),dark,[0,.72,0]);break;
 case'motor':name='DC motor';addMesh(g,new THREE.CylinderGeometry(.43,.43,1.05,32),material(0x526779,.65,.3),[0,0,0],[0,0,Math.PI/2]);addMesh(g,new THREE.CylinderGeometry(.38,.38,.16,32),dark,[-.57,0,0],[0,0,Math.PI/2]);addMesh(g,new THREE.CylinderGeometry(.38,.38,.16,32),metal,[.57,0,0],[0,0,Math.PI/2]);g.userData.motorShaft=addMesh(g,new THREE.CylinderGeometry(.09,.09,.72,20),metal,[.92,0,0],[0,0,Math.PI/2]);addMesh(g,new THREE.BoxGeometry(.22,.18,.2),material(0x202a36),[-.12,-.5,.12]);addMesh(g,new THREE.BoxGeometry(.22,.18,.2),material(0x202a36),[.15,-.5,.12]);break;
 case'battery':name='Battery';addMesh(g,new THREE.CylinderGeometry(.31,.31,1.12,32),material(0x2b7c63,.25,.3));addMesh(g,new THREE.CylinderGeometry(.12,.12,.09,20),metal,[0,.59,0]);addMesh(g,new THREE.CylinderGeometry(.1,.1,.07,20),material(0x293642),[0,-.59,0]);addMesh(g,new THREE.TorusGeometry(.29,.025,8,32),material(0xd5dfe8),[0,.35,0]);addMesh(g,new THREE.BoxGeometry(.35,.22,.025),material(0xeaf5f0),[0,.03,.315]);addMesh(g,new THREE.BoxGeometry(.035,.14,.035),material(0xd44747),[0,.03,.34]);break;
 case'led':name='LED';addMesh(g,new THREE.CylinderGeometry(.13,.13,.28,20),metal,[0,-.12,0]);lightMesh=addMesh(g,new THREE.SphereGeometry(.19,24,18),material(0xff4545,.1,.2,{emissive:0x000000}),[0,.1,0]);addMesh(g,new THREE.CylinderGeometry(.025,.025,.28,10),metal,[-.07,-.32,0]);addMesh(g,new THREE.CylinderGeometry(.025,.025,.28,10),metal,[.07,-.32,0]);break;
 case'bulb':name='Light bulb';addMesh(g,new THREE.CylinderGeometry(.15,.18,.24,24),metal,[0,-.27,0]);addMesh(g,new THREE.CylinderGeometry(.035,.035,.09,12),material(0xd4dbe2),[-.07,-.43,0]);addMesh(g,new THREE.CylinderGeometry(.035,.035,.09,12),material(0xd4dbe2),[.07,-.43,0]);addMesh(g,new THREE.TorusGeometry(.145,.025,8,24),material(0x4e5b6a),[0,-.15,0]);lightMesh=addMesh(g,new THREE.SphereGeometry(.28,28,20),material(0xd9f1ff,.05,.15,{transparent:true,opacity:.72,emissive:0x000000}),[0,.13,0]);const filamentPts=[new THREE.Vector3(-.08,-.05,0),new THREE.Vector3(-.04,.03,0),new THREE.Vector3(0,-.03,0),new THREE.Vector3(.04,.03,0),new THREE.Vector3(.08,-.05,0)];addMesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(filamentPts),24,.012,6,false),metal);break;
 case'switch':name='Switch';addMesh(g,new THREE.BoxGeometry(.85,.16,.58),dark,[0,-.1,0]);addMesh(g,new THREE.BoxGeometry(.72,.08,.45),material(0x263b4a),[0,0,0]);addMesh(g,new THREE.CylinderGeometry(.08,.08,.12,16),metal,[0,.08,0]);const lever=addMesh(g,new THREE.BoxGeometry(.12,.42,.13),material(0xe5ecf4),[0,.28,0]);lever.rotation.z=-.5;g.userData.lever=lever;g.userData.switchOn=false;addMesh(g,new THREE.CylinderGeometry(.045,.045,.12,12),material(0xd44d4d),[-.3,.04,0]);addMesh(g,new THREE.CylinderGeometry(.045,.045,.12,12),material(0x5cbe87),[.3,.04,0]);break;
 case'resistor':name='Resistor';addMesh(g,new THREE.CylinderGeometry(.13,.13,.68,24),material(0xd8b778,.15,.35),[0,0,0],[0,0,Math.PI/2]);for(let i=0;i<4;i++)addMesh(g,new THREE.CylinderGeometry(.14,.14,.045,24),material([0x9a4f2f,0x353535,0xc34b35,0xd5a83c][i]),[-.24+i*.15,0,0],[0,0,Math.PI/2]);addMesh(g,new THREE.CylinderGeometry(.025,.025,.45,10),metal,[-.55,0,0],[0,0,Math.PI/2]);addMesh(g,new THREE.CylinderGeometry(.025,.025,.45,10),metal,[.55,0,0],[0,0,Math.PI/2]);break;
 case'chip':name='IC chip';addMesh(g,new THREE.BoxGeometry(.68,.16,.68),dark);addMesh(g,new THREE.BoxGeometry(.42,.04,.42),material(0x111820),[0,.1,0]);for(let i=0;i<4;i++){const o=-.24+i*.16;addMesh(g,new THREE.BoxGeometry(.09,.035,.18),metal,[o,-.015,.4]);addMesh(g,new THREE.BoxGeometry(.09,.035,.18),metal,[o,-.015,-.4]);addMesh(g,new THREE.BoxGeometry(.18,.035,.09),metal,[.4,-.015,o]);addMesh(g,new THREE.BoxGeometry(.18,.035,.09),metal,[-.4,-.015,o]);}break;
 case'board':name='Base plate';addMesh(g,new THREE.BoxGeometry(1.7,.12,1.25),material(0x28634f,.25,.45));for(let x=-.65;x<=.66;x+=.22)for(let z=-.45;z<=.46;z+=.22)addMesh(g,new THREE.CylinderGeometry(.025,.025,.015,8),material(0xc7d6bd),[x,.07,z]);break;
 case'wire':name='Wire piece';makeWirePiece(g);break;
 default:return null;
 }
 g.userData.isPart=true;g.userData.type=type;g.userData.name=name;g.userData.id=opts.id??nextId++;g.userData.tint=mainColor;g.userData.lightMesh=lightMesh;g.userData.baseSize=new THREE.Vector3(1,1,1);
 if(opts.id!=null)nextId=Math.max(nextId,opts.id+1);
 g.position.copy(position||new THREE.Vector3((parts.length%4-1.5)*1.7,.65,Math.floor(parts.length/4)*1.55));
 scene.add(g);g.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(g);const sz=bb.getSize(new THREE.Vector3());g.userData.baseSize.set(Math.max(.05,sz.x),Math.max(.05,sz.y),Math.max(.05,sz.z));
 parts.push(g);
 if(!opts.silent){select(g);say(name+' added to bench');}
 return g;
}
function partById(id){return parts.find(p=>p.userData.id===id);}
function walkMaterials(obj,fn){obj.traverse(o=>{if(o.isMesh&&o.material)fn(o,o.material);});}
function setTint(p,color){p.userData.tint=color;walkMaterials(p,(m,mat)=>{if(m!==p.userData.lightMesh&&mat.color)mat.color.setHex(color);});}
function setGlow(p,on){
 const lm=p.userData.lightMesh;if(!lm)return;
 const bulb=p.userData.type==='bulb',glowColor=bulb?0xffbf38:0xff2525;
 lm.material.emissive.setHex(on?glowColor:0x000000);
 lm.material.emissiveIntensity=on?(bulb?3.8:4.5):0;
 if(lm.material.color)lm.material.color.setHex(on?(bulb?0xffe18a:0xff6464):(bulb?0xd9f1ff:0xff4545));
 if(bulb)lm.material.opacity=on?.98:.72;
 let halo=p.userData.glowHalo;
 if(on&&!halo){
   halo=new THREE.Mesh(new THREE.SphereGeometry(bulb?.43:.29,20,16),new THREE.MeshBasicMaterial({color:glowColor,transparent:true,opacity:bulb?.24:.18,depthWrite:false,blending:THREE.AdditiveBlending}));
   halo.position.copy(lm.position);halo.userData.isGlowHalo=true;p.add(halo);p.userData.glowHalo=halo;
 }
 if(halo)halo.visible=!!on;
 let light=glowingLights.get(p.userData.id);
 if(on&&!light){light=new THREE.PointLight(glowColor,bulb?5:3.5,bulb?6:4);light.position.copy(lm.position);p.add(light);glowingLights.set(p.userData.id,light);}
 if(light)light.visible=!!on;
 if(on){lm.scale.setScalar(bulb?1.08:1.16);}else{lm.scale.setScalar(1);}
}
function select(p){selected=p||null;$('#selectedName').textContent=p?p.userData.name+' #'+p.userData.id:'No selection';if(p){const b=p.userData.baseSize;$('#dimX').value=Math.max(1,Math.round(b.x*p.scale.x*10));$('#dimY').value=Math.max(1,Math.round(b.y*p.scale.y*10));$('#dimZ').value=Math.max(1,Math.round(b.z*p.scale.z*10));}}
function clearScene(){parts.forEach(p=>{scene.remove(p);walkMaterials(p,(m,mat)=>{if(m.geometry)m.geometry.dispose();if(Array.isArray(mat))mat.forEach(x=>x.dispose());else mat.dispose();});});parts=[];connections=[];connectionVisuals.forEach(w=>{scene.remove(w);w.geometry.dispose();w.material.dispose();});connectionVisuals=[];glowingLights.clear();select(null);updateCounts();updateCircuitStatus('Simulation stopped','');}
function serialize(){return {version:2,parts:parts.map(p=>({type:p.userData.type,name:p.userData.name,id:p.userData.id,position:p.position.toArray(),rotation:p.rotation.toArray(),scale:p.scale.toArray(),tint:p.userData.tint,switchOn:!!p.userData.switchOn})),connections:connections.map(c=>({...c}))};}
function checkpoint(){history.push(JSON.stringify(serialize()));if(history.length>HISTORY_LIMIT)history.shift();$('#undoBtn').disabled=history.length===0;}
function load(data){simulationRunning=false;clearScene();nextId=1;(data.parts||[]).forEach(d=>{const p=createPart(d.type,new THREE.Vector3(...d.position),{id:d.id,silent:true});if(!p)return;p.rotation.set(d.rotation[0],d.rotation[1],d.rotation[2]);p.scale.set(...d.scale);if(d.tint!=null)setTint(p,d.tint);if(p.userData.type==='switch'&&d.switchOn)toggleSwitch(p,true);});connections=(data.connections||[]).filter(c=>partById(c.a)&&partById(c.b));refreshConnectionVisuals();select(null);updateCounts();updateCircuitStatus('Simulation stopped','');}
function undo(){if(!history.length)return say('Nothing to undo');const d=JSON.parse(history.pop());load(d);$('#undoBtn').disabled=history.length===0;say('Last edit undone');}
function updateCounts(){$('#partCount').textContent=parts.length+' part'+(parts.length===1?'':'s');$('#connectionCount').textContent=connections.length+' link'+(connections.length===1?'':'s');}
function electricalPart(p){return !!p&&['battery','led','bulb','switch','resistor','chip','motor'].includes(p.userData.type);}
function localPorts(p){
 const t=p.userData.type;
 if(t==='battery')return [new THREE.Vector3(0,.64,0),new THREE.Vector3(0,-.61,0)];
 if(t==='switch')return [new THREE.Vector3(-.34,.08,0),new THREE.Vector3(.34,.08,0)];
 if(t==='resistor')return [new THREE.Vector3(-.78,0,0),new THREE.Vector3(.78,0,0)];
 if(t==='led')return [new THREE.Vector3(-.07,-.46,0),new THREE.Vector3(.07,-.46,0)];
 if(t==='bulb')return [new THREE.Vector3(-.07,-.43,0),new THREE.Vector3(.07,-.43,0)];
 if(t==='chip')return [new THREE.Vector3(-.4,0,0),new THREE.Vector3(.4,0,0)];
 if(t==='motor')return [new THREE.Vector3(-.16,-.58,.12),new THREE.Vector3(.17,-.58,.12)];
 if(t==='wire')return [new THREE.Vector3(-.8,0,0),new THREE.Vector3(.8,0,0)];
 return [new THREE.Vector3(0,0,0)];
}
function worldPorts(p){return localPorts(p).map(v=>p.localToWorld(v.clone()));}
function makeConnectionCurve(c){
 const a=partById(c.a),b=partById(c.b);if(!a||!b)return null;
 let start,end;
 if(c.kind==='electrical'){
   const ap=worldPorts(a),bp=worldPorts(b);
   start=ap[Math.max(0,Math.min(c.aPort||0,ap.length-1))];
   end=bp[Math.max(0,Math.min(c.bPort||0,bp.length-1))];
 }else{
   start=a.position.clone().add(new THREE.Vector3(0,.12,0));end=b.position.clone().add(new THREE.Vector3(0,.12,0));
 }
 const mid=start.clone().add(end).multiplyScalar(.5);mid.y+=Math.min(.9,Math.max(.18,start.distanceTo(end)*.18));
 return new THREE.CatmullRomCurve3([start,mid,end]);
}
function refreshConnectionVisuals(){
 connectionVisuals.forEach(w=>{scene.remove(w);w.geometry.dispose();w.material.dispose();});connectionVisuals=[];
 connections.forEach(c=>{if(c.kind==='assembly'&&c.autoFitted)return;const curve=makeConnectionCurve(c);if(!curve)return;const color=c.kind==='electrical'?(c.color||0xf1b65d):0x6ce3c1;
   const wire=new THREE.Mesh(new THREE.TubeGeometry(curve,32,c.kind==='electrical' ? .022 : .028,7,false),material(color,.35,.3,{emissive:color,emissiveIntensity:c.kind==='electrical' ? .28 : .13}));
   wire.userData.connection=true;scene.add(wire);connectionVisuals.push(wire);
 });updateCounts();
}
function autoFitMechanical(a,b){
 const ta=a.userData.type,tb=b.userData.type;
 const shaftTarget=(ta==='shaft'&&['wheel','bearing','gear','washer','torus','pulley','motor'].includes(tb))?{shaft:a,target:b}:
                  (tb==='shaft'&&['wheel','bearing','gear','washer','torus','pulley','motor'].includes(ta))?{shaft:b,target:a}:null;
 if(shaftTarget){
   const {shaft,target}=shaftTarget,tt=target.userData.type;
   if(tt==='motor'){shaft.rotation.set(0,0,Math.PI/2);shaft.position.copy(target.localToWorld(new THREE.Vector3(1.24,0,0)));}
   else if(tt==='wheel'){shaft.rotation.set(0,0,Math.PI/2);shaft.position.copy(target.position);}
   else if(tt==='bearing'){shaft.rotation.set(0,0,0);shaft.position.copy(target.position);}
   else {shaft.rotation.set(0,0,0);shaft.position.copy(target.position);}
   return 'Shaft aligned with '+target.userData.name.toLowerCase();
 }
 if((ta==='bearing'&&tb==='wheel')||(ta==='wheel'&&tb==='bearing')){
   const bearing=ta==='bearing'?a:b,wheel=ta==='wheel'?a:b;
   bearing.rotation.set(wheel.rotation.x,0,wheel.rotation.z+Math.PI/2);bearing.position.copy(wheel.position);
   return 'Bearing seated in wheel';
 }
 if(ta==='gear'&&tb==='gear'){
   b.position.copy(a.position).add(new THREE.Vector3(1.58,0,0));b.position.y=a.position.y;b.rotation.y=a.rotation.y;
   return 'Gears positioned for meshing';
 }
 if((ta==='bolt'&&tb==='nut')||(ta==='nut'&&tb==='bolt')){const bolt=ta==='bolt'?a:b,nut=ta==='nut'?a:b;nut.position.copy(bolt.position).add(new THREE.Vector3(0,-.22,0));return 'Nut fitted to threaded bolt';}
 if((ta==='pulley'&&tb==='shaft')||(ta==='shaft'&&tb==='pulley')){const pulley=ta==='pulley'?a:b,shaft=ta==='shaft'?a:b;shaft.rotation.set(0,0,Math.PI/2);shaft.position.copy(pulley.position);return 'Shaft aligned through pulley';}
 if((ta==='bolt'&&tb==='washer')||(ta==='washer'&&tb==='bolt')){
   const bolt=ta==='bolt'?a:b,washer=ta==='washer'?a:b;washer.position.copy(bolt.position).add(new THREE.Vector3(0,-.52,0));return 'Washer placed under bolt head';
 }
 if((ta==='bolt'&&tb==='bearing')||(ta==='bearing'&&tb==='bolt')){
   const bolt=ta==='bolt'?a:b,bearing=ta==='bearing'?a:b;bearing.position.copy(bolt.position);return 'Bolt aligned with bearing bore';
 }
 if((ta==='motor'&&tb==='wheel')||(ta==='wheel'&&tb==='motor')){
   const motor=ta==='motor'?a:b,wheel=ta==='wheel'?a:b;wheel.position.copy(motor.position).add(new THREE.Vector3(1.25,0,0));wheel.rotation.set(0,0,0);return 'Wheel aligned with motor shaft';
 }
 return '';
}
function electrical(p){return ['battery','led','bulb','switch','resistor','chip','motor'].includes(p.userData.type);}
function connectParts(a,b){
 if(!a||!b||a===b)return say('Choose two different parts');
 if(connections.some(c=>(c.a===a.userData.id&&c.b===b.userData.id)||(c.a===b.userData.id&&c.b===a.userData.id)))return say('Those parts are already connected');
 checkpoint();
 const isElectrical=electrical(a)&&electrical(b);
 let link={a:a.userData.id,b:b.userData.id,kind:isElectrical?'electrical':'assembly'};
 if(isElectrical){
   const ap=worldPorts(a),bp=worldPorts(b);let best=Infinity,ai=0,bi=0;
   const portUsed=(id,index)=>connections.some(c=>c.kind==='electrical'&&((c.a===id&&(c.aPort??0)===index)||(c.b===id&&(c.bPort??0)===index)));
   ap.forEach((pa,i)=>bp.forEach((pb,j)=>{const usedPenalty=(portUsed(a.userData.id,i)?1000:0)+(portUsed(b.userData.id,j)?1000:0);const d=pa.distanceToSquared(pb)+usedPenalty;if(d<best){best=d;ai=i;bi=j;}}));
   link.aPort=ai;link.bPort=bi;link.color=(a.userData.type==='battery'&&ai===0)||(b.userData.type==='battery'&&bi===0)?0xe95d5d:0xf1b65d;
 }else{
   const note=autoFitMechanical(a,b);if(note){link.autoFitted=true;say(note);}
 }
 connections.push(link);refreshConnectionVisuals();
 if(isElectrical)say('Wire joined terminal ↔ terminal');
 else if(!['gear','bearing','wheel','bolt','washer','motor','shaft'].includes(a.userData.type)&&!['gear','bearing','wheel','bolt','washer','motor','shaft'].includes(b.userData.type))say('Assembly link added');
 firstConnection=null;
}
function electronic(p){return electrical(p);}
function add(type){checkpoint();const p=createPart(type);updateCounts();return p;}
document.querySelectorAll('[data-part]').forEach(b=>b.addEventListener('click',()=>add(b.dataset.part)));
$('#undoBtn').addEventListener('click',undo);
$('#moveBtn').addEventListener('click',()=>{moveMode=!moveMode;connectMode=false;firstConnection=null;$('#connectModeBtn').textContent='＋ Connect parts: OFF';$('#moveBtn').textContent=moveMode?'✥ Drag move: ON':'✥ Drag move';controls.enabled=!moveMode;say(moveMode?'Move mode: drag a selected part':'Orbit mode: drag empty space to orbit');});
$('#rotateBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();selected.rotation.y+=Math.PI/12;refreshConnectionVisuals();select(selected);say('Rotated 15° around Y');});
$('#scaleBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();selected.scale.multiplyScalar(1.15);select(selected);refreshConnectionVisuals();say('Scaled up 15%');});
$('#scaleDownBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();selected.scale.multiplyScalar(.87);select(selected);refreshConnectionVisuals();say('Scaled down');});
document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();const [axis,amount]=b.dataset.move.split(',');selected.position[axis]+=Number(amount);refreshConnectionVisuals();say('Moved '+axis.toUpperCase());}));
document.querySelectorAll('[data-rotate]').forEach(b=>b.addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();const [axis,degrees]=b.dataset.rotate.split(',');selected.rotation[axis]+=Number(degrees)*Math.PI/180;refreshConnectionVisuals();say('Rotated '+axis.toUpperCase());}));
$('#applyDimensionsBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');const vals=['dimX','dimY','dimZ'].map(id=>Number($('#'+id).value));if(vals.some(v=>!Number.isFinite(v)||v<1||v>5000))return say('Enter dimensions from 1 to 5000 mm');checkpoint();const b=selected.userData.baseSize;selected.scale.set(vals[0]/(b.x*10),vals[1]/(b.y*10),vals[2]/(b.z*10));refreshConnectionVisuals();say('Approximate dimensions applied in mm');});
$('#duplicateBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();const old=selected,p=createPart(old.userData.type,old.position.clone().add(new THREE.Vector3(.55,0,.45)));p.rotation.copy(old.rotation);p.scale.copy(old.scale);setTint(p,old.userData.tint??colors[0]);say('Component duplicated');updateCounts();});
$('#deleteBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();const id=selected.userData.id;scene.remove(selected);walkMaterials(selected,(m,mat)=>{m.geometry.dispose();mat.dispose();});parts=parts.filter(p=>p!==selected);connections=connections.filter(c=>c.a!==id&&c.b!==id);glowingLights.delete(id);select(null);refreshConnectionVisuals();updateCounts();say('Component deleted');});
$('#colorBtn').addEventListener('click',()=>{if(!selected)return say('Select a part first');checkpoint();colorIndex=(colorIndex+1)%colors.length;setTint(selected,colors[colorIndex]);say('Main component colour changed');});
$('#connectModeBtn').addEventListener('click',()=>{connectMode=!connectMode;moveMode=false;controls.enabled=true;firstConnection=null;$('#moveBtn').textContent='✥ Drag move';$('#connectModeBtn').textContent=connectMode?'＋ Connect parts: ON':'＋ Connect parts: OFF';say(connectMode?'Tap one component, then another to connect them':'Connection mode off');});
$('#disconnectBtn').addEventListener('click',()=>{if(!connections.length)return say('No connections to remove');checkpoint();connections.pop();refreshConnectionVisuals();say('Last connection removed');updateCircuitStatus('Simulation stopped','');});
$('#resetViewBtn').addEventListener('click',()=>{camera.position.set(7,6,9);controls.target.set(0,.6,0);controls.update();say('Camera view reset');});
$('#gridBtn').addEventListener('click',()=>{gridOn=!gridOn;grid.visible=gridOn;$('#gridBtn').textContent='Grid: '+(gridOn?'ON':'OFF');});
$('#fullscreenBtn').addEventListener('click',()=>{viewportWrap.classList.toggle('fullscreen-mode');$('#fullscreenBtn').textContent=viewportWrap.classList.contains('fullscreen-mode')?'⤢':'⛶';setTimeout(resize,40);});
$('#clearBtn').addEventListener('click',()=>{if(!parts.length)return say('Bench is already empty');if(!confirm('Clear every part and connection from the bench?'))return;checkpoint();clearScene();updateCounts();say('Bench cleared');});
function setPointer(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
function rootPart(obj){let p=obj;while(p&&!p.userData.isPart)p=p.parent;return p||null;}
renderer.domElement.addEventListener('pointerdown',e=>{setPointer(e);const hits=raycaster.intersectObjects(parts,true);if(!hits.length){if(!moveMode&&!connectMode)select(null);return;}const p=rootPart(hits[0].object);if(!p)return;
 if(connectMode){if(!firstConnection){firstConnection=p;select(p);say('First part: '+p.userData.name+'. Now tap the second part.');}else if(firstConnection===p){say('Choose a different second part');}else connectParts(firstConnection,p);return;}
 select(p);if(moveMode){checkpoint();if(raycaster.ray.intersectPlane(plane,hit))drag={id:e.pointerId,obj:p,offset:p.position.clone().sub(hit)};renderer.domElement.setPointerCapture(e.pointerId);}
});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;setPointer(e);if(raycaster.ray.intersectPlane(plane,hit)){drag.obj.position.x=hit.x+drag.offset.x;drag.obj.position.z=hit.z+drag.offset.z;refreshConnectionVisuals();}});
function endDrag(e){if(drag&&drag.id===e.pointerId){drag=null;say('Part moved');}}renderer.domElement.addEventListener('pointerup',endDrag);renderer.domElement.addEventListener('pointercancel',endDrag);
function toggleSwitch(p,on=null){if(!p||p.userData.type!=='switch')return false;p.userData.switchOn=on==null?!p.userData.switchOn:!!on;const lever=p.userData.lever;if(lever){lever.rotation.z=p.userData.switchOn ? 0.5 : -0.5;lever.material.color.setHex(p.userData.switchOn?0x6ce3c1:0xe5ecf4);}return p.userData.switchOn;}
function getCircuitParts(){return {battery:parts.find(p=>p.userData.type==='battery'),switch:parts.find(p=>p.userData.type==='switch'),resistor:parts.find(p=>p.userData.type==='resistor'),lamp:parts.find(p=>['led','bulb'].includes(p.userData.type)),motor:parts.find(p=>p.userData.type==='motor')};}
function circuitIsClosed(){const c=getCircuitParts();if(!c.battery||!c.switch)return {ok:false,reason:'Add a battery and switch first.'};const hasEdge=(a,b)=>connections.some(link=>(link.a===a&&link.b===b)||(link.a===b&&link.b===a));let ids,expected,kind;if(c.lamp){if(!c.resistor)return {ok:false,reason:'Add a resistor in series with the LED/bulb.'};ids=[c.battery.userData.id,c.switch.userData.id,c.resistor.userData.id,c.lamp.userData.id];expected=[[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[3]],[ids[3],ids[0]]];kind='light';if(connections.filter(link=>ids.includes(link.a)&&ids.includes(link.b)).length!==4||!expected.every(([a,b])=>hasEdge(a,b)))return {ok:false,reason:'Wire the loop: battery → switch → resistor → light → battery.'};}else if(c.motor){ids=[c.battery.userData.id,c.switch.userData.id,c.motor.userData.id];expected=[[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]];kind='motor';if(connections.filter(link=>ids.includes(link.a)&&ids.includes(link.b)).length!==3||!expected.every(([a,b])=>hasEdge(a,b)))return {ok:false,reason:'Wire the motor loop: battery → switch → motor → battery.'};}else return {ok:false,reason:'Add an LED/bulb plus resistor, or use a DC motor.'};if(!c.switch.userData.switchOn)return {ok:false,reason:'Loop connected. Switch is OFF — toggle it ON.'};return {ok:true,reason:kind==='motor'?'Closed loop · motor powered':'Closed loop · light powered',kind};}
function updateCircuitStatus(text,kind){const el=$('#circuitStatus');el.className='circuit-status'+(kind?' '+kind:'');el.lastElementChild.textContent=text;}
function refreshSimulation(){parts.forEach(p=>{if(p.userData.lightMesh)setGlow(p,false);});const c=circuitIsClosed();if(!simulationRunning){updateCircuitStatus('Simulation stopped','');return;}if(!c.ok){updateCircuitStatus(c.reason,'fault');return;}setGlow(c.lamp,true);updateCircuitStatus(c.reason,'running');}
$('#demoCircuitBtn').addEventListener('click',()=>{if(parts.length&&!confirm('Build the demo circuit? This replaces the current bench.'))return;checkpoint();simulationRunning=false;clearScene();nextId=1;const battery=createPart('battery',new THREE.Vector3(-2.5,.65,0),{silent:true});const sw=createPart('switch',new THREE.Vector3(-.85,.65,0),{silent:true});const resistor=createPart('resistor',new THREE.Vector3(.85,.65,0),{silent:true});const lamp=createPart('bulb',new THREE.Vector3(2.5,.65,0),{silent:true});connections=[{a:battery.userData.id,b:sw.userData.id,kind:'electrical',aPort:0,bPort:0,color:0xe95d5d},{a:sw.userData.id,b:resistor.userData.id,kind:'electrical',aPort:1,bPort:0},{a:resistor.userData.id,b:lamp.userData.id,kind:'electrical',aPort:1,bPort:0},{a:lamp.userData.id,b:battery.userData.id,kind:'electrical',aPort:1,bPort:1}];refreshConnectionVisuals();select(sw);toggleSwitch(sw,false);updateCounts();refreshSimulation();say('Demo loop built. Tap Run, then switch ON to light the bulb.');});
$('#runCircuitBtn').addEventListener('click',()=>{simulationRunning=true;refreshSimulation();const c=circuitIsClosed();say(c.ok?'Circuit running: lamp glowing':'Simulation started: '+c.reason);});
$('#stopCircuitBtn').addEventListener('click',()=>{simulationRunning=false;refreshSimulation();say('Simulation stopped');});
$('#toggleSwitchBtn').addEventListener('click',()=>{let p=selected?.userData.type==='switch'?selected:parts.find(x=>x.userData.type==='switch');if(!p)return say('Add a switch first');checkpoint();const on=toggleSwitch(p);say('Switch '+(on?'ON':'OFF'));refreshSimulation();});
$('#saveBtn').addEventListener('click',()=>{try{localStorage.setItem('engineering-workshop-project',JSON.stringify(serialize()));say('Project saved on this device');}catch(e){say('Could not save in this browser');}});
$('#loadBtn').addEventListener('click',()=>{try{const saved=localStorage.getItem('engineering-workshop-project');if(!saved)return say('No saved project on this device yet');checkpoint();load(JSON.parse(saved));say('Saved project loaded');}catch(e){say('Could not load saved project');}});
let initialLoaded=false;try{const saved=localStorage.getItem('engineering-workshop-project');if(saved){load(JSON.parse(saved));initialLoaded=true;}}catch(e){}
if(!initialLoaded){createPart('board',new THREE.Vector3(0,.12,0));createPart('gear',new THREE.Vector3(-1,.75,0));createPart('shaft',new THREE.Vector3(1,.75,0));createPart('battery',new THREE.Vector3(-2,.65,1.4));createPart('led',new THREE.Vector3(2,.65,1.4));say('Workshop ready · sample parts on bench');}
updateCounts();select(null);
function resize(){const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(viewport);
function animate(){requestAnimationFrame(animate);controls.update();if(simulationRunning){const c=getCircuitParts();const result=circuitIsClosed();if(result.ok&&c.lamp){/* point light is parented to the lamp and follows it */}const motor=parts.find(p=>p.userData.type==='motor');if(motor&&result.ok){if(motor.userData.motorShaft)motor.userData.motorShaft.rotateY(.14);connections.filter(c=>c.kind==='assembly'&&(c.a===motor.userData.id||c.b===motor.userData.id)).forEach(c=>{const other=partById(c.a===motor.userData.id?c.b:c.a);if(other&&other.userData.type==='wheel')other.rotateX(.08);});}}renderer.render(scene,camera);}resize();animate();
