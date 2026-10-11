const byId = id => document.getElementById(id);
const photoInput=byId('objectPhotoInput'),video=byId('objectCameraPreview'),canvas=byId('objectPhotoCanvas'),ctx=canvas.getContext('2d'),previewWrap=byId('objectPreviewWrap'),analyzeBtn=byId('analyzeObjectBtn'),captureBtn=byId('captureObjectBtn'),stopBtn=byId('stopObjectCameraBtn'),cameraBtn=byId('startObjectCameraBtn'),detectionsBox=byId('objectDetections'),visionStatus=byId('visionStatus');
let stream=null,detector=null,modelPromise=null,lastDetections=[],photoReady=false;
function status(msg){if(visionStatus)visionStatus.textContent=msg;}
function fitCanvas(source,w,h){const scale=Math.min(1,1000/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));ctx.drawImage(source,0,0,canvas.width,canvas.height);photoReady=true;previewWrap.hidden=false;canvas.hidden=false;analyzeBtn.disabled=false;detectionsBox.innerHTML='';lastDetections=[];status('Photo ready. Tap Identify object to run detection.');}
photoInput?.addEventListener('change',()=>{const file=photoInput.files?.[0];if(!file)return;const img=new Image();img.onload=()=>{fitCanvas(img,img.naturalWidth,img.naturalHeight);URL.revokeObjectURL(img.src);};img.onerror=()=>status('Could not open this image. Try JPG or PNG.');img.src=URL.createObjectURL(file);});
cameraBtn?.addEventListener('click',async()=>{try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access needs HTTPS and a supported browser.');stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});video.srcObject=stream;video.hidden=false;captureBtn.disabled=false;stopBtn.disabled=false;cameraBtn.disabled=true;status('Camera ready. Frame the object, then tap Capture.');}catch(e){status('Camera unavailable: '+(e.message||'allow camera permission or choose a photo instead.'));}});
captureBtn?.addEventListener('click',()=>{if(!stream||!video.videoWidth)return status('Wait for the camera preview to start.');fitCanvas(video,video.videoWidth,video.videoHeight);stopCamera();status('Photo captured. Tap Identify object to analyze it.');});
function stopCamera(){stream?.getTracks().forEach(t=>t.stop());stream=null;if(video){video.srcObject=null;video.hidden=true;}if(captureBtn)captureBtn.disabled=true;if(stopBtn)stopBtn.disabled=true;if(cameraBtn)cameraBtn.disabled=false;}
stopBtn?.addEventListener('click',stopCamera);
async function loadDetector(){
 if(detector)return detector;
 if(modelPromise)return modelPromise;
 modelPromise=(async()=>{status('Loading the browser vision model (first run may take a little while)…');const tf=await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/+esm');await tf.ready();const coco=await import('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/+esm');detector=await coco.load({base:'lite_mobilenet_v2'});return detector;})();
 try{return await modelPromise;}catch(e){modelPromise=null;throw e;}
}
function drawDetections(rows){ctx.drawImage(window.__objectPhotoOriginal||canvas,0,0,canvas.width,canvas.height);rows.forEach((d,i)=>{const [x,y,w,h]=d.bbox;ctx.lineWidth=Math.max(2,canvas.width/350);ctx.strokeStyle=['#6ce3c1','#80b5ff','#ffbd72','#e59cff'][i%4];ctx.strokeRect(x,y,w,h);ctx.fillStyle=ctx.strokeStyle;ctx.font='bold 15px system-ui';const label=d.class+' '+Math.round(d.score*100)+'%';const tw=ctx.measureText(label).width+12;ctx.fillRect(x,Math.max(0,y-24),tw,23);ctx.fillStyle='#071812';ctx.fillText(label,x+6,Math.max(16,y-7));});}
const projectHints={
 chair:{ideas:['Occupancy detector with an LED indicator','A clip-on reading light with adjustable arm','A removable bag hook / side tray'],parts:['Arduino Nano or ESP32','PIR or pressure sensor','LED + resistor','USB 5 V supply','Bracket / clamp'],note:'Avoid drilling a chair frame or weakening load-bearing joints.'},
 couch:{ideas:['Removable side-table attachment','Under-seat storage light','Seat-occupancy indicator'],parts:['LED strip','USB power bank','Switch or motion sensor','Removable clamp brackets'],note:'Keep wiring away from moving recliner mechanisms and pinch points.'},
 bed:{ideas:['Under-bed motion night light','Bedside reach-assist switch','Non-invasive sleep-environment monitor'],parts:['PIR sensor','LED strip','ESP32 / Arduino','USB 5 V supply','Cable clips'],note:'Use low-voltage USB power only near bedding; keep heat sources and mains wiring away.'},
 'dining table':{ideas:['Clamp-on overhead task light','Cable-management rail','Small rotating parts tray'],parts:['LED lamp module','Clamp bracket','Aluminium / printed rail','M3/M4 fasteners'],note:'Use a padded clamp so the table surface is not damaged.'},
 laptop:{ideas:['Adjustable cooling stand','USB status-light bar','Ergonomic height/angle stand'],parts:['Printed stand or plywood','Rubber feet','Optional 5 V fan','USB cable'],note:'Do not block vents or open the laptop battery enclosure.'},
 'cell phone':{ideas:['Adjustable phone mount','Desk charging dock','Camera-based hand-tracking experiment'],parts:['Printed cradle','Hinge or ball joint','USB cable','M3 fasteners'],note:'Keep the camera and charging port unobstructed; avoid unsupported battery modifications.'},
 bottle:{ideas:['Clip-on water-level reminder sleeve','Bottle carrier clip','Desk spill-alert tray'],parts:['Printed sleeve / holder','Optional capacitive sensor','LED + resistor','Coin cell only for low-power prototype'],note:'Keep electronics sealed and physically separate from drinking water.'},
 book:{ideas:['Adjustable book stand','Page-hold clips','Clip-on reading light'],parts:['Printed hinges','M3 screws','LED module','Spring clips'],note:'Use rounded edges and avoid clamps that damage pages.'},
 door:{ideas:['Door-open sensor + status LED','Low-voltage servo demonstrator on a cardboard mock-up','Automatic door concept with manual override'],parts:['Magnetic reed switch','ESP32 / Arduino','LED + resistor','Servo for tabletop prototype','External low-voltage supply'],note:'Do not motorize a real door until pinch protection, obstruction sensing, emergency release, and adult supervision are in place. Never connect DIY circuits directly to mains.'},
 table:{ideas:['Clamp-on cable organizer','Auto task light','Mini parts carousel / rotating tray'],parts:['Printed clamp','M3/M4 bolts and nuts','LED or 5 V motor','Switch / controller'],note:'Measure the edge thickness and keep the clamp removable.'},
 tv:{ideas:['Remote-control holder','Ambient-light sensor','Cable routing clips'],parts:['Printed holder','Light sensor','ESP32 / Arduino','USB power'],note:'Do not mount anything that blocks ventilation or risks tipping the display.'},
 bottle:{ideas:['Bottle carrier','Water-level reminder','Spill detection coaster'],parts:['Printed cradle','Capacitive sensor','LED + resistor'],note:'Keep electronics away from water.'}
};
function inferPlan(target,goal){
 const t=(target||'object').toLowerCase(),g=(goal||'').toLowerCase();
 let category=Object.keys(projectHints).find(k=>t.includes(k))||(/door|hinge|gate|drawer/.test(t)?'door':/chair|seat/.test(t)?'chair':/desk|table|shelf/.test(t)?'table':/phone|mobile/.test(t)?'cell phone':/laptop|computer/.test(t)?'laptop':null);
 const hint=projectHints[category]||{ideas:['Add a non-invasive sensor or indicator','Design a removable mount or attachment','Create a 3D-printed protective / organizer part'],parts:['ESP32 or Arduino Nano','Suitable sensor for the goal','LED + resistor','5 V USB power','Printed bracket / enclosure','M3 screws and nuts'],note:'Measure the object carefully and prototype with cardboard before making a permanent attachment.'};
 let ideas=[...hint.ideas];
 if(/open|close|automatic|motor|move/.test(g))ideas.unshift('Low-voltage motorized mechanism prototype with manual override');
 if(/light|lamp|glow|dark/.test(g))ideas.unshift('Automatic low-voltage LED lighting using a light or motion sensor');
 if(/track|detect|monitor|alert|sensor/.test(g))ideas.unshift('Sensor-based monitoring with a clear status indicator');
 if(/repair|fix|broken/.test(g))ideas.unshift('Measure, model, and 3D-print a replacement bracket or spacer');
 const dims=['Length: '+byId('objectLength').value+' cm','Height: '+byId('objectHeight').value+' cm','Depth: '+byId('objectDepth').value+' cm'];
 const goalText=goal.trim()||'Make a useful, removable engineering upgrade for this object';
 return {category:category||'general object',ideas:[...new Set(ideas)].slice(0,4),parts:hint.parts,note:hint.note,dims,goalText};
}
function renderProject(){
 const target=byId('objectTargetName').value.trim()||lastDetections[0]?.class||'room object';
 const goal=byId('objectGoal').value,plan=inferPlan(target,goal);
 const out=byId('objectProjectOutput');
 out.innerHTML='';
 const heading=document.createElement('h3');heading.textContent='Project plan: '+target;
 const intro=document.createElement('p');intro.textContent='Goal: '+plan.goalText+'. Object category guess: '+plan.category+'. Dimensions are user-entered estimates, not measured by the camera.';
 const dims=document.createElement('p');dims.textContent='Reference dimensions · '+plan.dims.join(' · ');
 const ideaTitle=document.createElement('h4');ideaTitle.textContent='Project options';
 const ideas=document.createElement('ol');plan.ideas.forEach(x=>{const li=document.createElement('li');li.textContent=x;ideas.appendChild(li);});
 const partsTitle=document.createElement('h4');partsTitle.textContent='Starter bill of materials';
 const parts=document.createElement('ul');plan.parts.forEach(x=>{const li=document.createElement('li');li.textContent=x;parts.appendChild(li);});
 const stepsTitle=document.createElement('h4');stepsTitle.textContent='Build sequence';
 const steps=document.createElement('ol');['Measure the object at three axes and photograph the attachment area with a ruler for scale.','Make a cardboard / foam mock-up; check access, clearance, and whether the attachment is removable.','Model the bracket or enclosure in CAD; use real datasheets for electronics and fasteners.','Prototype with low-voltage USB power, then test motion, heat, stability, and manual override.','Only after bench testing, mount it without damaging load-bearing or safety-critical parts.'].forEach(x=>{const li=document.createElement('li');li.textContent=x;steps.appendChild(li);});
 const warning=document.createElement('p');warning.className='project-warning';warning.textContent=plan.note+' This is a starter concept, not an automatically verified engineering design. Check loads, clearances, electrical ratings and pinch hazards before building.';
 const copy=document.createElement('button');copy.textContent='Copy project plan';copy.className='wide';copy.addEventListener('click',async()=>{const text=[heading.textContent,intro.textContent,dims.textContent,'Options:',...plan.ideas.map((x,i)=>(i+1)+'. '+x),'Parts:',...plan.parts.map(x=>'- '+x),'Build sequence:',...Array.from(steps.children,(x,i)=>(i+1)+'. '+x.textContent),'Safety: '+plan.note].join('\n');try{await navigator.clipboard.writeText(text);copy.textContent='Copied';}catch{const ta=document.createElement('textarea');ta.value=text;out.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();copy.textContent='Copied';}});
 out.append(heading,intro,dims,ideaTitle,ideas,partsTitle,parts,stepsTitle,steps,warning,copy);
}
byId('generateObjectProjectBtn')?.addEventListener('click',renderProject);
async function analyze(){
 if(!photoReady)return status('Choose a photo or capture one first.');
 analyzeBtn.disabled=true;
 try{
  const original=ctx.getImageData(0,0,canvas.width,canvas.height);
  const model=await loadDetector();
  ctx.putImageData(original,0,0);
  const predictions=await model.detect(canvas,20,.35);
  lastDetections=predictions.sort((a,b)=>b.score-a.score);
  ctx.putImageData(original,0,0);
  drawDetections(lastDetections);
  detectionsBox.innerHTML='';
  if(!lastDetections.length){status('No common object detected. You can still type the object name and generate a project plan.');return;}
  lastDetections.forEach((d,i)=>{const b=document.createElement('button');b.className='detection-chip';b.innerHTML='<b></b><span></span>';b.querySelector('b').textContent=d.class;b.querySelector('span').textContent=Math.round(d.score*100)+'% confidence · tap to use';b.addEventListener('click',()=>{byId('objectTargetName').value=d.class;document.querySelectorAll('.detection-chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');status('Selected '+d.class+'. Enter real dimensions and describe your project goal.');});detectionsBox.appendChild(b);});
  byId('objectTargetName').value=lastDetections[0].class;
  status('Detected '+lastDetections.length+' candidate(s). Select one, enter approximate dimensions, then generate a project plan.');
 }catch(e){console.error(e);status('Automatic vision could not load. Check internet access and try again, or enter the object name manually.');}
 finally{analyzeBtn.disabled=false;}
}
analyzeBtn?.addEventListener('click',analyze);
window.addEventListener('pagehide',stopCamera);
