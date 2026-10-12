const byId = id => document.getElementById(id);
const photoInput=byId('objectPhotoInput'),video=byId('objectCameraPreview'),canvas=byId('objectPhotoCanvas'),ctx=canvas.getContext('2d'),previewWrap=byId('objectPreviewWrap'),analyzeBtn=byId('analyzeObjectBtn'),captureBtn=byId('captureObjectBtn'),stopBtn=byId('stopObjectCameraBtn'),cameraBtn=byId('startObjectCameraBtn'),detectionsBox=byId('objectDetections'),visionStatus=byId('visionStatus');
let stream=null,detector=null,modelPromise=null,lastDetections=[],photoReady=false,baseImageData=null;
function status(msg){if(visionStatus)visionStatus.textContent=msg;}
function fitCanvas(source,w,h){const scale=Math.min(1,1000/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));ctx.drawImage(source,0,0,canvas.width,canvas.height);baseImageData=ctx.getImageData(0,0,canvas.width,canvas.height);photoReady=true;previewWrap.hidden=false;canvas.hidden=false;analyzeBtn.disabled=false;detectionsBox.innerHTML='';lastDetections=[];status('Photo ready. Tap Identify object to run detection.');}
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
function drawDetections(rows){if(baseImageData)ctx.putImageData(baseImageData,0,0);rows.forEach((d,i)=>{const [x,y,w,h]=d.bbox;ctx.lineWidth=Math.max(2,canvas.width/350);ctx.strokeStyle=['#6ce3c1','#80b5ff','#ffbd72','#e59cff'][i%4];ctx.strokeRect(x,y,w,h);ctx.fillStyle=ctx.strokeStyle;ctx.font='bold 15px system-ui';const label=d.class+' '+Math.round(d.score*100)+'%';const tw=ctx.measureText(label).width+12;ctx.fillRect(x,Math.max(0,y-24),tw,23);ctx.fillStyle='#071812';ctx.fillText(label,x+6,Math.max(16,y-7));});}
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
 const start=document.createElement('button');start.textContent='＋ Add object proxy + starter parts to 3D bench';start.className='wide primary';start.addEventListener('click',()=>{const targetLower=target.toLowerCase(),goalLower=goal.toLowerCase();let types=['board','battery','switch','led','box'];if(/door|gate|drawer|hinge/.test(targetLower)||/open|close|motor|automatic/.test(goalLower))types=['hinge','motor','switch','battery','led','box'];else if(/chair|seat|table|desk|shelf/.test(targetLower))types=['bracket','bolt','board','led','box'];else if(/phone|laptop|computer|tablet/.test(targetLower))types=['chip','battery','switch','led','box'];types.forEach(type=>document.querySelector('.part[data-part="'+type+'"]')?.click());const dims=[Number(byId('objectLength').value)||60,Number(byId('objectHeight').value)||60,Number(byId('objectDepth').value)||40];const scale=50/Math.max(...dims);const normalized=dims.map(v=>Math.max(5,Math.round(v*scale)));byId('dimX').value=normalized[0];byId('dimY').value=normalized[1];byId('dimZ').value=normalized[2];byId('applyDimensionsBtn').click();document.getElementById('viewportWrap')?.scrollIntoView({behavior:'smooth',block:'center'});const workshopStatus=document.getElementById('status');if(workshopStatus)workshopStatus.textContent='Approximate object proxy and starter parts added. Adjust position, scale and dimensions before designing.';});
 const copy=document.createElement('button');copy.textContent='Copy project plan';copy.className='wide';copy.addEventListener('click',async()=>{const text=[heading.textContent,intro.textContent,dims.textContent,'Options:',...plan.ideas.map((x,i)=>(i+1)+'. '+x),'Parts:',...plan.parts.map(x=>'- '+x),'Build sequence:',...Array.from(steps.children,(x,i)=>(i+1)+'. '+x.textContent),'Safety: '+plan.note].join('\n');try{await navigator.clipboard.writeText(text);copy.textContent='Copied';}catch{const ta=document.createElement('textarea');ta.value=text;out.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();copy.textContent='Copied';}});
 out.append(heading,intro,dims,ideaTitle,ideas,partsTitle,parts,stepsTitle,steps,warning,start,copy);
}
byId('generateObjectProjectBtn')?.addEventListener('click',renderProject);
byId('addDetectedObjectToBenchBtn')?.addEventListener('click',()=>{
 const name=byId('objectTargetName')?.value.trim()||lastDetections[0]?.class||'Object reference';
 const lengthCm=Number(byId('objectLength')?.value),heightCm=Number(byId('objectHeight')?.value),depthCm=Number(byId('objectDepth')?.value);
 if([lengthCm,heightCm,depthCm].some(v=>!Number.isFinite(v)||v<=0))return status('Enter positive length, height and depth in cm first.');
 window.dispatchEvent(new CustomEvent('workshop:add-detected-object',{detail:{name,lengthCm,heightCm,depthCm,confidence:lastDetections[0]?.score||0}}));
 status('Sent '+name+' to the 3D bench as a dimension-based reference box. For real surface geometry, import a room/object scan.');
});

async function analyze(){
 if(!photoReady)return status('Choose a photo or capture one first.');
 analyzeBtn.disabled=true;
 try{
  const original=ctx.getImageData(0,0,canvas.width,canvas.height);
  const model=await loadDetector();
  ctx.putImageData(original,0,0);
  const predictions=await model.detect(canvas,30,.25);
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


// Geometry estimate panel: image-plane ratios plus optional single-axis calibration.
// A single photograph cannot reveal true depth or perspective-correct dimensions.
(function addGeometryEstimator(){
 const host=byId('objectDetections'); if(!host || byId('geometryEstimatePanel')) return;
 const panel=document.createElement('section');
 panel.id='geometryEstimatePanel';
 panel.className='geometry-estimate-panel';
 panel.innerHTML=`
  <h3>Geometry & scale estimate</h3>
  <p>Choose a detected object. Ratios come from its 2D bounding box; calibration estimates only the visible plane, not hidden depth.</p>
  <div class="geometry-estimate-grid">
   <label>Known visible width (cm)<input id="scanKnownWidth" type="number" min="0.1" max="10000" step="0.1" placeholder="e.g. 30"></label>
   <label>Known visible height (cm)<input id="scanKnownHeight" type="number" min="0.1" max="10000" step="0.1" placeholder="optional"></label>
  </div>
  <div id="scanGeometryReadout" class="scan-geometry-readout">Analyze a photo, then select a detection.</div>
  <button type="button" id="applyScanEstimateBtn" class="wide" disabled>Use estimate for project dimensions</button>
  <p class="sketch-note">For better estimates: photograph the object straight-on, avoid wide-angle close-ups, and include a ruler in the same plane. This is not a metrology-grade 3D scan.</p>`;
 host.insertAdjacentElement('afterend',panel);
 let selectedDetection=null;
 const readout=byId('scanGeometryReadout'),apply=byId('applyScanEstimateBtn');
 function fmt(n){return Number.isFinite(n)?n.toFixed(2):'—';}
 function update(){
  if(!selectedDetection){readout.textContent='Analyze a photo, then select a detection.';apply.disabled=true;return;}
  const [x,y,w,h]=selectedDetection.bbox;
  const ratio=w/Math.max(1,h),kw=Number(byId('scanKnownWidth').value),kh=Number(byId('scanKnownHeight').value);
  const lines=[
   'Detected class: '+selectedDetection.class+' · confidence '+Math.round(selectedDetection.score*100)+'%',
   'Bounding box: '+Math.round(w)+' × '+Math.round(h)+' px',
   'Visible width : height ratio = '+fmt(ratio)+':1'
  ];
  if(kw>0) lines.push('Width-calibrated visible height ≈ '+fmt(kw/Math.max(ratio,.001))+' cm');
  if(kh>0) lines.push('Height-calibrated visible width ≈ '+fmt(kh*ratio)+' cm');
  if(kw>0&&kh>0)lines.push('Calibration consistency: '+fmt(Math.abs(kw/Math.max(ratio,.001)-kh))+' cm height difference');
  readout.replaceChildren(...lines.map(t=>{const p=document.createElement('div');p.textContent=t;return p;}));
  apply.disabled=!(kw>0||kh>0);
 }
 byId('scanKnownWidth').addEventListener('input',update);byId('scanKnownHeight').addEventListener('input',update);
 apply.addEventListener('click',()=>{
  if(!selectedDetection)return;
  const [x,y,w,h]=selectedDetection.bbox,kw=Number(byId('scanKnownWidth').value),kh=Number(byId('scanKnownHeight').value);
  let width=kw>0?kw:(kh>0?kh*w/Math.max(h,1):0);
  let height=kh>0?kh:(kw>0?kw*h/Math.max(w,1):0);
  if(!(width>0&&height>0))return;
  byId('objectLength').value=Math.max(1,Math.round(width*10)/10);
  byId('objectHeight').value=Math.max(1,Math.round(height*10)/10);
  byId('objectDepth').value=byId('objectDepth').value||'10';
  status('Visible-plane estimate copied to project dimensions. Measure depth separately; it cannot be inferred from one photo.');
 });
 // Keep a reference to the currently selected detection without replacing existing selection behavior.
 const originalAnalyze=analyze;
 // Selection chips are created after model inference, so observe chip clicks and match by displayed class.
 const observer=new MutationObserver(()=>{
  const chips=host.querySelectorAll('.detection-chip');
  chips.forEach((chip)=>{
   if(chip.dataset.geometryBound)return;chip.dataset.geometryBound='1';
   chip.addEventListener('click',()=>{
    const cls=chip.querySelector('b')?.textContent;
    selectedDetection=lastDetections.find(d=>d.class===cls)||null;update();
   });
  });
  if(lastDetections.length&&!selectedDetection){selectedDetection=lastDetections[0];update();}
 });
 observer.observe(host,{childList:true,subtree:true});
})();
