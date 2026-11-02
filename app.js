/* ———————————— constants ———————————— */
const PERSONAL="Personal (not deductible)";
const CATS=["Instruments & gear","Repairs & maintenance","Studio supplies","Software & subscriptions","Home studio (workspace-in-home)","Vehicle & fuel","Travel & accommodation","Meals & entertainment","Advertising & promo","Professional fees","Insurance","Phone & internet","Contract labour","Fitness on the road","Other",PERSONAL];
const CURS=["CAD","USD","EUR","GBP","AUD","JPY"];
const TAX=[{k:"GST5",l:"GST 5%",t:"GST",r:5},{k:"HST13",l:"HST 13% (ON)",t:"HST",r:13},{k:"HST15",l:"HST 15% (NS/NB/NL/PE)",t:"HST",r:15},{k:"NONE",l:"No tax",t:"None",r:0}];
const ROOT="/Guitar Man Finance";
const IMG_LIMIT=190000;
const GMAIL_RECEIPT_QUERY='-in:sent -from:payments.interac.ca -subject:(delivered OR delivery OR shipped OR "on the way" OR "on its way" OR package OR review OR "shared with you" OR "out for" OR expectations OR "coming up" OR "running out" OR "will renew") (category:purchases OR subject:(receipt OR reçu OR "order confirmed" OR "order confirmation" OR ordered OR "your order" OR "payment confirmation" OR "payment received" OR purchase OR "booking confirmation" OR "booking reference" OR itinerary OR "e-ticket" OR subscription OR renewal OR "your invoice" OR "invoice from" OR "payment to" OR "you paid" OR "trip with uber" OR "order with uber" OR "monthly payment" OR "parking"))';

const ICON={
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>',
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/></svg>'
};

/* ———————————— helpers ———————————— */
const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cleanText=s=>String(s??"").normalize("NFC").replace(/[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\u3164\u2800]/g,"").replace(/[\u00a0\u2007\u202f\t\r\n]+/g," ").replace(/\s{2,}/g," ").replace(/\s+([,.;:!?)])/g,"$1").replace(/([(])\s+/g,"$1").replace(/(\s*[–-]\s*)+$/,"").replace(/^\s*[–-]\s*/,"").trim();
const gmailOn=()=>S.settings.useGmail!==false&&!!S.mcp;const dropboxOn=()=>S.settings.useDropbox!==false&&!!S.mcp;
const newId=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const num=v=>{const n=Number(String(v??"").replace(/[^0-9.\-]/g,""));return isFinite(n)?n:0};
const money=(n,c="CAD")=>{try{return new Intl.NumberFormat("en-CA",{style:"currency",currency:c}).format(Number(n)||0)}catch{return "$"+(Number(n)||0).toFixed(2)}};
const plain=n=>{n=Math.round((Number(n)||0)*100)/100;return Number.isInteger(n)?String(n):n.toFixed(2)};
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const ddmmyy=d=>{const m=String(d||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1].slice(2)}`:esc(d)};
const yearOf=d=>d?Number(String(d).slice(0,4)):new Date().getFullYear();
const quarterOf=d=>Math.floor((Number(String(d).slice(5,7))-1)/3)+1;
const isCAD=x=>!x.currency||x.currency==="CAD";
const isPersonal=r=>r.category===PERSONAL;
const invTotals=inv=>{
  const items=inv.items||[];
  const sub=items.reduce((s,it)=>s+num(it.qty||1)*num(it.rate),0);
  const taxable=items.reduce((s,it)=>s+(it.taxable===false?0:num(it.qty||1)*num(it.rate)),0);
  const by={pay:0,perdiem:0,reimb:0};items.forEach(it=>{by[lineType(it)]+=num(it.qty||1)*num(it.rate)});
  let tax=0;
  if(inv.taxOverride!==null&&inv.taxOverride!==undefined&&inv.taxOverride!=="")tax=num(inv.taxOverride);
  else if(inv.taxType&&inv.taxType!=="None")tax=taxable*(num(inv.taxRate)/100);
  return{sub,tax,total:sub+tax,pay:by.pay,perdiem:by.perdiem,reimb:by.reimb};
};
const safeName=s=>(String(s||"receipt").replace(/[\\/:*?"<>|#%]/g,"-").replace(/\s+/g," ").trim().slice(0,40))||"receipt";
const reimbRe=/reimburs|parking|uber|über|flight|ferr|\bgas\b|bag fee|baggage|hotel|airbnb|mileage|taxi|rental car|tuner/i;
const pdRe=/per ?die|perdie|\bpd\b/i;
const LTYPES=[["pay","Pay"],["perdiem","Per diem"],["reimb","Reimb."]];
function lineType(it){if(it.type&&LTYPES.some(x=>x[0]===it.type))return it.type;const d=String(it.desc||"");if(pdRe.test(d))return "perdiem";if(reimbRe.test(d))return "reimb";return "pay"}
function guessType(desc){return pdRe.test(desc)?"perdiem":reimbRe.test(desc)?"reimb":"pay"}

/* ———————————— state ———————————— */
const DEFAULT_SETTINGS={businessName:"",tagline:"",address:"",phone:"",email:"",gstNumber:"",taxLabel:"GST/HST",defaultTaxType:"GST",defaultTaxRate:5,defaultCurrency:"CAD",gmailSyncedThrough:"",homePct:"",rentMonthly:"",utilMonthly:"",incomeGoal:"",vehPctManual:"",odo:{}};
const S={
  booted:false, persist:false, col:null,
  sample:null, canImages:false, mcp:null, downloads:null,
  settings:{...DEFAULT_SETTINGS},
  invoices:[], receipts:[], trips:[], incomes:[], incForm:null, drill:null, tripForm:null, tripErr:"", picker:null,
  tab:"dashboard", year:new Date().getFullYear(),
  invEdit:null, invViewId:null, invImport:null, invMail:"", mailMsg:"",
  recDraft:null, recFilter:"All", recSearch:"", imgView:null, imgCache:{},
  sf:null, sfDirty:false, armed:null, busy:{}, msg:{}, ctl:null, dbxOk:new Set(),
  sync:null, bulk:null
};

/* ———————————— capability boot ———————————— */
const use=n=>(window.claude&&window.claude.use)?window.claude.use(n).catch(()=>null):Promise.resolve(null);
const IDB={db:null,
  open(){return new Promise((res,rej)=>{let r;try{r=indexedDB.open("guitar-man-finance-offline",1)}catch(e){rej(e);return}r.onupgradeneeded=()=>r.result.createObjectStore("docs");r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>rej(r.error)})},
  st(m){return this.db.transaction("docs",m).objectStore("docs")},
  req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})},
  all(){return this.req(this.st("readonly").getAll())},clear(){return this.req(this.st("readwrite").clear())},get(id){return this.req(this.st("readonly").get(id))},put(id,d){return this.req(this.st("readwrite").put(d,id))},del(id){return this.req(this.st("readwrite").delete(id))}};
let emitT;function emitLocal(){clearTimeout(emitT);emitT=setTimeout(async()=>{const list=await IDB.all();const inv=[],rec=[],trips=[],incs=[];let st=null;
  list.forEach(x=>{if(x.kind==="invoice")inv.push(x);else if(x.kind==="receipt")rec.push(x);else if(x.kind==="trip")trips.push(x);else if(x.kind==="income")incs.push(x);else if(x.kind==="settings")st=x});
  S.invoices=inv;S.receipts=rec;S.trips=trips;S.incomes=incs;S.settings={...DEFAULT_SETTINGS,...(st||{})};S.persist=true;S.booted=true;render()},30)}
const LocalCol={doc(id){return{set:async d=>{await IDB.put(id,JSON.parse(JSON.stringify(d)));emitLocal();cloudDirty()},delete:async()=>{await IDB.del(id);emitLocal();cloudDirty()},get:async()=>{const d=await IDB.get(id);return{exists:!!d,data:()=>d}}}}};
const OFFLINE_DL={save:async({filename,data})=>{const a=document.createElement("a");a.href=URL.createObjectURL(data);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}};
async function boot(){
  S.sample=null;S.mcp=null;S.downloads=OFFLINE_DL;
  try{await IDB.open()}catch{S.booted=true;S.syncErr="This browser won't let the app save on this device (private browsing can block it). Try a normal window or another browser.";render(true);return}
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch{}
  S.fileWarn=location.protocol==="file:"&&(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1));
  S.col=LocalCol;await cloudLoad();await bkLoad();await dbxHandleRedirect();emitLocal();
  if("serviceWorker" in navigator&&location.protocol!=="file:"){try{navigator.serviceWorker.register("sw.js")}catch{}}
  const endSession=()=>{if(CLOUD.provider&&(cloudTimer||CLOUD.dirty)){clearTimeout(cloudTimer);cloudTimer=null;cloudBackupNow(false)}bkPersist()};
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")endSession()});window.addEventListener("pagehide",endSession);
  if(CLOUD.provider&&CLOUD.dirty)setTimeout(()=>cloudBackupNow(false),1500);
}
/* ———————————— persistence ———————————— */
function applyLocal(doc){
  if(doc.kind==="settings"){S.settings={...S.settings,...doc};return}
  const key=doc.kind==="invoice"?"invoices":doc.kind==="receipt"?"receipts":doc.kind==="trip"?"trips":doc.kind==="income"?"incomes":null;if(!key)return;
  const arr=S[key];const i=arr.findIndex(x=>x.id===doc.id);if(i>=0)arr[i]=doc;else arr.push(doc);
}
async function save(doc,quiet){
  applyLocal(doc); if(!quiet)render();
  if(!S.col)return true;
  try{await S.col.doc(doc.id).set(doc);return true}catch(e){toast(dbErr(e));return false}
}
async function removeDoc(id,kind){
  const key=kind==="invoice"?"invoices":kind==="trip"?"trips":kind==="income"?"incomes":"receipts";S[key]=S[key].filter(x=>x.id!==id);render();
  if(!S.col)return;try{await S.col.doc(id).delete()}catch(e){toast(dbErr(e))}
}
function dbErr(e){
  const c=e&&e.code;
  if(c==="quota_exceeded")return "Your saved books are full. Delete some old receipts, then try again.";
  if(c==="resource_exhausted")return "Saving too quickly. Wait a moment and try again.";
  if(c==="invalid_argument")return "That couldn't be saved here. Make sure you're signed in to Claude.";
  if(c==="revoked")return "Access to your saved books ended for this view.";
  return "Couldn't save just now. Check your connection and try again.";
}
let toastT;
function toast(msg){const t=$("#toast");t.textContent=typeof themedToast==="function"?themedToast(msg):msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true},5200)}

/* ———————————— error copy ———————————— */
function sampleErr(code){
  switch(code){
    case "cancelled":return "";
    case "not_granted":case "sampling_disabled":case "not_declared":case "capability_disabled":case "capability_removed":case "images_unavailable":
      return "Automatic reading isn't allowed in this view. Fill in the details below. Your photo is still kept.";
    case "image_rejected":return "That photo couldn't be opened as an image. Try a fresh photo, or a screenshot of it.";
    case "rate_limited":return "Too many reads in a row. Wait a minute, then try again.";
    case "session_expired":return "Your Claude sign-in expired. Sign in again, then try again.";
    case "invalid_json":case "empty_completion":case "refused":return "Couldn't make out the details. Retake the photo in good light, or type the details in.";
    default:return "The reader didn't answer. Try again.";
  }
}
function mcpErr(e,server){
  const c=e&&e.code;
  switch(c){
    case "server_not_connected":return `Add ${server} in claude.ai Settings → Connectors, then try again.`;
    case "needs_reauth":return `Reconnect ${server} in claude.ai Settings → Connectors, then try again.`;
    case "selection_required":return `Pick which ${server} account to use when Claude asks, then try again.`;
    case "not_in_manifest":case "approval_required":case "consent_required":return `${server} isn't allowed for this page yet. Tap again and choose Allow when asked.`;
    case "blocked_by_policy":return `Your organization blocks ${server} here.`;
    case "server_unavailable":case "upstream_error":case "cancelled":return `${server} didn't confirm. Check ${server} before trying again so you don't get a duplicate.`;
    case "tool_error":return `${server} reported a problem: ${String(e.message||"").slice(0,160)}`;
    case "not_granted":case "capability_disabled":case "capability_removed":return "Connected apps aren't available in this view. Open the page in Claude.";
    default:return `${server} didn't respond. Try again.`;
  }
}

/* ———————————— image prep ———————————— */
function loadScript(src){return Promise.reject(new Error("offline"))}
function loadImg(url){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error("decode"));i.src=url})}
function drawScaled(src,max){const w=src.width,h=src.height,s=Math.min(1,max/Math.max(w,h));const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*s));c.height=Math.max(1,Math.round(h*s));const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(src,0,0,c.width,c.height);return c}
function shrink(canvas,limit){for(const [d,q] of [[1100,.62],[900,.56],[720,.5],[560,.45],[440,.42]]){const u=drawScaled(canvas,d).toDataURL("image/jpeg",q);if(u.length<=limit)return u}return null}
async function pdfToCanvas(file){
  const V="3.11.174";
  await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${V}/pdf.min.js`);
  const lib=window.pdfjsLib;if(!lib)throw new Error("pdf");
  lib.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${V}/pdf.worker.min.js`;
  const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const page=await pdf.getPage(1);const base=page.getViewport({scale:1});
  const vp=page.getViewport({scale:Math.min(3,1700/Math.max(base.width,base.height))});
  const c=document.createElement("canvas");c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
  const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
  await page.render({canvasContext:ctx,viewport:vp}).promise;return c;
}
async function prepFile(file){
  const isPdf=file.type==="application/pdf"||/\.pdf$/i.test(file.name||"");
  let canvas=null;
  if(isPdf){try{canvas=await pdfToCanvas(file)}catch{throw new Error("Couldn't open that PDF here. Take a screenshot of it and upload the screenshot instead.")}}
  else{
    let src=null;
    try{src=await createImageBitmap(file,{imageOrientation:"from-image"})}catch{}
    if(!src){try{src=await loadImg(URL.createObjectURL(file))}catch{}}
    if(!src){
      if(["image/jpeg","image/png","image/webp","image/gif"].includes(file.type))return{blob:file,preview:null};
      throw new Error("This photo format can't be opened here (often an iPhone HEIC photo picked from Files). Use Take photo instead, or take a screenshot of the picture and upload that.");
    }
    canvas=drawScaled(src,1600);
  }
  const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",.86));
  if(!blob)throw new Error("Couldn't process that image. Try again with a fresh photo.");
  return{blob,preview:shrink(canvas,IMG_LIMIT)};
}

/* ———————————— Claude prompts ———————————— */
const RECEIPT_PROMPT=`The image is a photo of a purchase receipt for a self-employed Canadian musician (session guitarist and producer) who tracks business write-offs and GST/HST input tax credits.
Reply with only one JSON object:
{"vendor": string, "date": "YYYY-MM-DD" or null, "currency": 3-letter code (CAD unless the receipt clearly shows another currency or a non-Canadian address), "total": number (grand total paid), "tax": number (GST or HST shown; for a non-Canadian receipt, any VAT/sales tax shown; 0 if none; never include BC PST), "category": one of ${JSON.stringify(CATS)}, "note": short description of what was bought}`;
const INVOICE_PROMPT=`The image is an invoice that a Canadian musician previously issued to a client. Reply with only one JSON object:
{"number": string or null, "client": string, "clientAddress": string (newline-separated) or "", "clientEmail": string or null, "forLabel": string or "", "date": "YYYY-MM-DD" or null, "currency": 3-letter code, "items": [{"desc": string, "amount": number, "type": "pay" (fees, show/session/travel-day/rehearsal rates, production) or "perdiem" or "reimb" (expenses billed back: flights, bag fees, parking, rides, ferries, gas, gear bought for the client)}], "tax": number (GST/HST amount as printed, 0 if none), "total": number}`;
function emailBatchPrompt(batch){
  return `Each block below is one email from a self-employed Canadian musician's inbox (based in Canada). Decide whether each is a receipt for money he actually paid (purchases, subscriptions, flights, parking, rides, meals, bookings that were charged). Shipping updates, reminders, marketing, refunds, $0 changes, quotes, and bookings paid by someone else are NOT receipts.
Reply with only a JSON array, one object per email, in the same order:
{"id": the email id given, "isReceipt": boolean, "vendor": string, "date": "YYYY-MM-DD", "currency": 3-letter code of the amount charged (CAD if it says it was charged in CAD), "total": number (grand total charged), "tax": number (GST or HST only, as printed; 0 if not shown or foreign), "category": one of ${JSON.stringify(CATS)} (gym day passes and gym memberships go in "Fitness on the road"; use "${PERSONAL}" for clearly personal things like streaming, household, gifts, vacations), "note": short description}

${batch.map(b=>`=== EMAIL id=${b.id} | from: ${b.from} | subject: ${b.subject} | date: ${b.date}\n${b.text}`).join("\n\n")}`;
}

/* ———————————— receipts flow ———————————— */
function blankDraft(extra){return{id:newId(),vendor:"",date:today(),currency:"CAD",total:"",taxPaid:"",category:"Other",note:"",preview:null,blob:null,status:"manual",err:"",touched:{},...extra}}
async function onReceiptFile(file){
  if(!file)return;
  S.tab="receipts";S.imgView=null;if(S.ctl)S.ctl.abort();
  const d=blankDraft({status:"preparing"});S.recDraft=d;render(true);
  try{const p=await prepFile(file);if(S.recDraft!==d)return;d.blob=p.blob;d.preview=p.preview}
  catch(e){if(S.recDraft!==d)return;d.status="error";d.err=e.message;render(true);return}
  if(S.sample&&S.canImages)readDraft();
  else{d.status="manual";d.err="This offline version never sends anything off your device, so type the details in. The photo is kept with the receipt.";render(true)}
}
async function readDraft(){
  const d=S.recDraft;if(!d||!d.blob||!S.sample)return;
  d.status="reading";d.err="";render(true);
  const ctl=new AbortController();S.ctl=ctl;
  try{
    const x=await S.sample.json(RECEIPT_PROMPT,{images:[d.blob],signal:ctl.signal});
    if(S.recDraft!==d)return;
    const put=(k,v)=>{if(!d.touched[k]&&v!==undefined&&v!==null&&v!=="")d[k]=v};
    put("vendor",x.vendor);put("date",/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")?x.date:null);
    put("currency",CURS.includes(x.currency)?x.currency:null);
    put("total",x.total!=null?String(num(x.total)):null);put("taxPaid",x.tax!=null?String(num(x.tax)):null);
    put("category",CATS.includes(x.category)?x.category:null);put("note",x.note);
    d.status="read";
  }catch(e){if(S.recDraft!==d)return;d.status="error";d.err=sampleErr(e&&e.code)}
  render(true);
}
async function fileDraft(){
  const d=S.recDraft;if(!d)return;
  const prev=d.editOf?S.receipts.find(r=>r.id===d.editOf):null;
  const rec={...(prev||{}),kind:"receipt",id:prev?prev.id:"rec_"+d.id,stream:d.stream||"",vendor:(d.vendor||"").trim()||"Unnamed vendor",date:d.date||today(),currency:d.currency,total:num(d.total),taxPaid:num(d.taxPaid),category:d.category,note:(d.note||"").trim(),needsReview:false,
    hasImage:prev?!!prev.hasImage||!!d.preview:!!d.preview,backup:prev?(prev.backup==="done"&&(prev.category!==d.category||prev.date!==d.date)?"moved":prev.backup):(S.mcp?"pending":"off"),createdAt:prev?.createdAt||Date.now()};
  const img=d.preview;if(S.ctl)S.ctl.abort();
  S.recDraft=null;if(img)S.imgCache[rec.id]=img;
  await save(rec);
  if(img&&S.col){try{await S.col.doc("img_"+rec.id).set({kind:"image",data:img})}catch(e){toast("Receipt filed, but the photo copy couldn't be saved. "+dbErr(e))}}
  toast(prev?"Receipt updated.":"Receipt filed.");
  if(!prev&&dropboxOn())backupReceipt(rec.id);
}
async function getImage(id){
  if(S.imgCache[id])return S.imgCache[id];
  if(!S.col)return null;
  try{const s=await S.col.doc("img_"+id).get();const u=s.exists?s.data().data:null;if(u)S.imgCache[id]=u;return u}catch{return null}
}

/* ———————————— Gmail receipt sync ———————————— */
function pl(res){let p=res&&res.payload;if(typeof p==="string"){try{p=JSON.parse(p)}catch{}}return p||{}}
function gmailDate(d){return d.replace(/-/g,"/")}
async function syncGmail(auto){
  if(!S.mcp){toast("Connected apps aren't available in this view. Open the page in Claude.");return}
  if(!S.sample){toast("Claude reading isn't available in this view.");return}
  const since=S.settings.gmailSyncedThrough||`${new Date().getFullYear()}-01-01`;
  const ctl=new AbortController();
  S.sync={phase:"search",found:0,done:0,added:0,skipped:0,err:"",ctl};render(true);
  const known=new Set(S.receipts.map(r=>r.gid).filter(Boolean));
  try{
    let token="",msgs=[];
    for(let page=0;page<4;page++){
      const res=await S.mcp.callTool("Gmail","search_threads",{query:`after:${gmailDate(since)} ${GMAIL_RECEIPT_QUERY}`,pageSize:50,...(token?{pageToken:token}:{})},{cache:false});
      const p=pl(res);
      (p.threads||[]).forEach(t=>(t.messages||[]).forEach(m=>{if(!(m.labelIds||[]).includes("SENT")&&!known.has(m.id))msgs.push({id:m.id,from:m.sender||"",subject:m.subject||"",date:String(m.date||"").slice(0,10),url:m.viewUrl||""})}));
      token=p.nextPageToken||"";if(!token)break;
      if(ctl.signal.aborted)throw{code:"cancelled"};
    }
    const seen=new Set();msgs=msgs.filter(m=>!seen.has(m.id)&&seen.add(m.id));
    S.sync.found=msgs.length;S.sync.phase="read";render(true);
    for(let i=0;i<msgs.length;i+=5){
      if(ctl.signal.aborted)throw{code:"cancelled"};
      const batch=msgs.slice(i,i+5);
      for(const m of batch){
        try{const r=await S.mcp.callTool("Gmail","get_message",{messageId:m.id,messageFormat:"PLAIN_TEXT"},{cache:false});const p=pl(r);m.text=String(p.plaintextBody||p.snippet||"").replace(/\(?https?:\/\/\S+\)?/g,"").replace(/\n{3,}/g,"\n\n").slice(0,5000);m.url=p.viewUrl||m.url}
        catch{m.text=""}
      }
      let out=[];
      try{out=await S.sample.json(emailBatchPrompt(batch.filter(b=>b.text)),{signal:ctl.signal})}catch(e){if(e&&e.code==="cancelled")throw e;out=[]}
      for(const m of batch){
        const x=(Array.isArray(out)?out:[]).find(o=>String(o.id)===m.id);
        if(x&&x.isReceipt&&num(x.total)>0){
          const cur=CURS.includes(x.currency)?x.currency:"CAD";
          await save({kind:"receipt",id:"rec_g"+m.id,gid:m.id,source:"gmail",url:m.url,needsReview:true,vendor:cleanText(x.vendor||m.from).slice(0,80),date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")?x.date:m.date,currency:cur,total:num(x.total),taxPaid:cur==="CAD"?num(x.tax):0,category:CATS.includes(x.category)?x.category:"Other",note:cleanText(x.note||m.subject).slice(0,140),hasImage:false,backup:"off",createdAt:Date.now()},true);
          S.sync.added++;
        }else S.sync.skipped++;
        S.sync.done++;
      }
      render(true);
    }
    await save({...S.settings,kind:"settings",id:"settings",gmailSyncedThrough:today()},true);
    S.sync.phase="done";
    if(auto&&!S.sync.added){S.sync=null}else if(auto)toast(`Gmail checked: ${S.sync.added} new receipt${S.sync.added===1?"":"s"} added.`);
  }catch(e){
    S.sync.phase="error";
    S.sync.err=e&&e.code==="cancelled"?"Stopped. Anything already added stays.":(e&&e.code&&String(e.code).match(/not_granted|sampling|rate_limited|invalid_json|empty|refused|session/))?sampleErr(e.code):mcpErr(e,"Gmail");
  }
  render(true);
}

/* ———————————— Dropbox ———————————— */
async function ensureFolders(paths){
  for(const p of paths){
    if(S.dbxOk.has(p))continue;
    try{await S.mcp.callTool("Dropbox","create_folder",{path:p})}catch(e){if(e.code!=="tool_error")throw e}
    S.dbxOk.add(p);
  }
}
async function dbxCreate(path,content){
  try{await S.mcp.callTool("Dropbox","create_file",{path,content})}
  catch(e){const blob=String(e.message||"")+JSON.stringify(e.result||"");if(e.code==="tool_error"&&/ALREADY_EXISTS|already exists|conflict/i.test(blob))return;throw e}
}
function receiptHTML(r,img){
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receipt ${esc(r.date)} ${esc(r.vendor)}</title></head><body style="font-family:Arial,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#222">
<h2 style="margin-bottom:4px">${esc(r.vendor)}</h2><div style="color:#666">${esc(r.date)} · filed with Guitar Man Finance on ${today()}</div>
<table cellpadding="6" style="margin-top:14px;border-collapse:collapse">
<tr><td style="color:#666">Total</td><td>${money(r.total,r.currency)} ${esc(r.currency)}</td></tr>
<tr><td style="color:#666">GST/HST</td><td>${money(r.taxPaid,r.currency)}${isCAD(r)?"":" (foreign, not claimable)"}${r.taxEstimated?" (estimated)":""}</td></tr>
<tr><td style="color:#666">Category</td><td>${esc(r.category)}</td></tr>
<tr><td style="color:#666">Note</td><td>${esc(r.note)}</td></tr>
${r.url?`<tr><td style="color:#666">Original email</td><td><a href="${esc(r.url)}">Open in Gmail</a></td></tr>`:""}</table>
${img?`<img src="${img}" alt="Receipt photo" style="max-width:100%;border:1px solid #ccc;margin-top:16px">`:""}
</body></html>`;
}
async function setBackup(id,status,err){const r=S.receipts.find(x=>x.id===id);if(!r)return;await save({...r,backup:status,backupErr:err||""},!!S.bulk)}
async function backupReceipt(id){return false;/* replaced by real files saved through the share menu */if(!dropboxOn())return false;
  const r=S.receipts.find(x=>x.id===id);if(!r||!S.mcp)return false;
  await setBackup(id,"pending");
  try{
    const img=r.hasImage?await getImage(id):null;
    const y=yearOf(r.date),cat=safeName(r.category);
    await ensureFolders([ROOT,ROOT+"/Receipts",`${ROOT}/Receipts/${y}`,`${ROOT}/Receipts/${y}/${cat}`]);
    await dbxCreate(`${ROOT}/Receipts/${y}/${cat}/${r.date} ${safeName(r.vendor)} ${id.slice(-6)}.html`,receiptHTML(r,img));
    await setBackup(id,"done");return true;
  }catch(e){await setBackup(id,"failed",mcpErr(e,"Dropbox"));return false}
}
async function backupAll(){
  if(!S.mcp){toast("Connected apps aren't available in this view. Open the page in Claude.");return}
  const list=S.receipts.filter(r=>r.backup!=="done").sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  if(!list.length){toast("Every receipt is already in Dropbox.");return}
  S.bulk={total:list.length,done:0,failed:0,stop:false};render(true);
  for(const r of list){
    if(S.bulk.stop)break;
    const ok=await backupReceipt(r.id);
    S.bulk.done++;if(!ok)S.bulk.failed++;
    if(S.bulk.failed>=3&&S.bulk.done===S.bulk.failed){S.bulk.err=(S.receipts.find(x=>x.id===r.id)||{}).backupErr||"Dropbox isn't accepting files right now.";break}
    render(true);
  }
  const b=S.bulk;S.bulk=null;
  toast(b.err?b.err:`Dropbox backup: ${b.done-b.failed} saved${b.failed?`, ${b.failed} failed (tap Retry on those)`:""}${b.stop?" — stopped early":""}.`);
  render(true);
}
async function backupLedger(){
  if(!S.mcp){toast("Connected apps aren't available in this view. Open the page in Claude.");return}
  S.busy.ledger=true;S.msg.ledger="";render();
  try{
    const stamp=new Date().toISOString().slice(0,16).replace(/[:T]/g,"-");
    await ensureFolders([ROOT,ROOT+"/Backups"]);
    await dbxCreate(`${ROOT}/Backups/books-${stamp}.json`,JSON.stringify({exported:new Date().toISOString(),settings:S.settings,invoices:S.invoices,receipts:S.receipts},null,1));
    await dbxCreate(`${ROOT}/Backups/summary-${S.year}-${stamp}.html`,summaryHTML(S.year));
    S.msg.ledger="ok:Books and the "+S.year+" summary are in Dropbox › Guitar Man Finance › Backups.";
  }catch(e){S.msg.ledger="err:"+mcpErr(e,"Dropbox")}
  S.busy.ledger=false;render();
}

/* ———————————— invoices ———————————— */
function nextNumber(){const n=Math.max(0,...S.invoices.map(i=>parseInt(i.number,10)).filter(x=>isFinite(x)&&x<100000));return String(n+1)}
function blankInvoice(){const s=S.settings;return{kind:"invoice",id:"inv_"+newId(),number:nextNumber(),client:"",clientAddress:"",clientEmail:"",forLabel:"",date:today(),dueDate:"",items:[{desc:"",qty:"1",rate:"",taxable:true,type:"pay"}],currency:s.defaultCurrency||"CAD",taxType:s.defaultTaxType||"GST",taxRate:s.defaultTaxRate??5,taxOverride:null,status:"draft",notes:"",isNew:true}}
async function onInvoiceFile(file){
  if(!file)return;
  S.tab="invoices";S.invViewId=null;S.invImport={status:"preparing",err:""};render(true);
  let p;try{p=await prepFile(file)}catch(e){S.invImport={status:"error",err:e.message};render(true);return}
  if(!(S.sample&&S.canImages)){S.invImport={status:"error",err:"Automatic reading isn't available in this view. Use New invoice and type it in."};render(true);return}
  S.invImport={status:"reading",err:""};render(true);
  try{
    const x=await S.sample.json(INVOICE_PROMPT,{images:[p.blob]});
    const cur=CURS.includes(x.currency)?x.currency:"CAD";
    const items=Array.isArray(x.items)&&x.items.length?x.items.map(it=>{const ty=["pay","perdiem","reimb"].includes(it.type)?it.type:guessType(String(it.desc||""));return{desc:String(it.desc||"Services"),qty:"1",rate:String(num(it.amount)),type:ty,taxable:ty==="pay"}}):[{desc:"Imported invoice",qty:"1",rate:String(num(x.total)-num(x.tax)),taxable:true}];
    S.invEdit={kind:"invoice",id:"inv_"+newId(),number:x.number||nextNumber(),client:x.client||"",clientAddress:x.clientAddress||"",clientEmail:x.clientEmail||"",forLabel:x.forLabel||"",date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")?x.date:today(),dueDate:"",items,currency:cur,taxType:num(x.tax)>0?"GST":"None",taxRate:5,taxOverride:num(x.tax)>0?num(x.tax):null,status:"paid",notes:"",isNew:true,imported:true};
    S.invImport=null;
  }catch(e){S.invImport={status:"error",err:sampleErr(e&&e.code)}}
  render(true);
}
const docTitle=inv=>inv.status==="quote"?"QUOTE":"INVOICE";
function taxLine(inv){const s=S.settings;return inv.taxType==="HST"?`HST(#${s.gstNumber})`:`${s.taxLabel||"hst/GST"}(#${s.gstNumber})`}
function firstName(n){return String(n||"").split(/[\s\-]/)[0]||"there"}
function signOff(){const n=String(S.settings.businessName||"").trim().split(/\s+/)[0];return n?"-"+n:"Thanks again"}
function reminderBody(inv){const t=invTotals(inv);return `Hi ${firstName(inv.client)}!\n\nJust a friendly reminder about invoice #${inv.number} for ${inv.items[0]?.desc||"the work"} (${money(t.total,inv.currency)}), sent ${ddmmyy(inv.date)}. I've attached it again here. Let me know if you need anything from me.\n\nThanks!\n${signOff()}`}
function defaultMailBody(inv){if(inv.status==="quote")return `Hi ${firstName(inv.client)}!\n\nHere's my quote for ${inv.items[0]?.desc||"the work"}. Let me know if it works for you!\n\n${signOff()}`;return `Hi ${firstName(inv.client)}!\n\nSending over the bill for ${inv.items[0]?.desc||"the work"}.${(inv.items||[]).some(it=>it.rid)?" Receipts for the expenses are attached too.":""} Thanks for having me!\n\n${signOff()}`}
function pdfName(inv){return `${safeName(inv.client)} ${inv.status==="quote"?"quote ":""}${inv.number}.pdf`.replace(/\s+/g," ")}
function printHTML(html){let pa=document.getElementById("printArea");if(!pa){pa=document.createElement("div");pa.id="printArea";document.body.appendChild(pa)}pa.innerHTML=html;setTimeout(()=>window.print(),80)}
async function receiptsPrintHTML(inv){const list=rcsOf(inv);let out="";for(const [k,{r,it}] of list.entries()){const img=r.hasImage?await getImage(r.id):null;out+=`<div class="pgbrk pr-rc" style="font-family:Arial,sans-serif;color:#111;background:#fff;padding:10px"><h2 style="margin:0 0 4px">Receipt ${k+1} of ${list.length}: ${esc(r.vendor)}</h2><p style="margin:0 0 10px;color:#555">${esc(fmtDate(r.date,"mmm d, yyyy"))} · ${money(r.total,r.currency)} ${esc(r.currency||"CAD")}${num(r.taxPaid)?` · GST/HST ${money(r.taxPaid,r.currency)}`:""} · billed on “${esc(it.desc)}”</p>${img?`<img src="${img}" alt="">`:`<p>${esc(r.note||r.category)}</p>`}</div>`}return out}
async function downloadInvoicePdf(inv){printHTML(sheetHTML(inv))}
async function emailInvoice(inv){
  if(!S.mcp){S.invMail="err:Connected apps aren't available in this view. Open the page in Claude.";render();return}
  const to=[...new Set((String(inv.clientEmail||"").match(/[^@\s<>"',;]+@[^@\s<>"',;]+\.[a-z]{2,}/gi)||[]).map(x=>x.toLowerCase()))];
  if(!to.length){S.invMail="err:Add the client's email address first (Edit).";render();return}
  S.busy.mail=true;S.invMail="";render();
  try{
    const doc=await buildInvoicePdf(inv);const b64=doc.output("datauristring").split(",")[1];
    const body=(S.mailBody??defaultMailBody(inv));
    const atts=[{content:b64,filename:pdfName(inv),mimeType:"application/pdf"}];
    let nrc=0;if(S.attachRc!==false&&rcCount(inv)){const {doc:rd,originals}=await buildReceiptsPdf(inv);if(rd){nrc=rcCount(inv);atts.push({content:rd.output("datauristring").split(",")[1],filename:`Receipts for ${pdfName(inv)}`,mimeType:"application/pdf"});atts.push(...originals)}}
    await S.mcp.callTool("Gmail","create_draft",{to,subject:isOverdue(inv)?`Reminder: invoice #${inv.number}`:`${inv.items[0]?.desc?String(inv.items[0].desc).slice(0,60)+" ":""}${inv.status==="quote"?"quote":"invoice"}`.replace(/^"|"$/g,""),body,attachments:atts});
    S.invMail=`ok:Draft with the invoice${nrc?` and ${nrc} receipt${nrc===1?"":"s"}`:""} attached is in your Gmail. Open Gmail, check it and press Send.`;
    if(inv.status==="draft"){await save({...inv,status:"sent"});autoBackupInv(inv.id)}
  }catch(e){S.invMail="err:"+(e&&e.message==="load"?"Couldn't load the PDF maker. Check your connection.":mcpErr(e,"Gmail"))}
  S.busy.mail=false;render();
}


/* ———————————— send packet (Dropbox / downloads) ———————————— */
async function pdfB64(doc){return doc.output("datauristring").split(",")[1]}
async function buildPacketHTML(inv){
  const s=S.settings,to=emailsIn(inv._to??inv.clientEmail).join(", ");const body=S.mailFor===inv.id&&S.mailBody?S.mailBody:defaultMailBody(inv);
  let invB64="",rcB64="",originals=[];
  try{invB64=await pdfB64(await buildInvoicePdf(inv))}catch{}
  if(rcCount(inv)){try{const r=await buildReceiptsPdf(inv,{mode:S.rcMode||"best"});if(r.doc)rcB64=await pdfB64(r.doc);originals=r.originals}catch{}}
  const rc=[];for(const [k,{r,it}] of rcsOf(inv).entries()){
    let inner="";
    if(r.hasImage){const img=await getImage(r.id);if(img)inner=`<img src="${img}" alt="Receipt photo">`}
    else if(r.gid&&S.mcp){try{const p=await emailParts(r.gid);if(p.html){const sn=await htmlSnapshot(p.html);inner=`<img src="${sn.c.toDataURL("image/jpeg",.72)}" alt="Copy of the emailed receipt">`}}catch{}}
    if(!inner)inner=`<p>${esc(r.vendor)} · ${esc(r.date)} · ${money(r.total,r.currency)} ${esc(r.currency||"CAD")}${r.note?" · "+esc(r.note):""}</p>`;
    rc.push(`<section class="rc"><h3>Receipt ${k+1}: ${esc(r.vendor)} · ${money(r.total,r.currency)}</h3><p class="sm">${esc(r.date)} · billed on line “${esc(it.desc)}”${r.url?` · <a href="${esc(r.url)}">original email</a>`:""}</p>${inner}</section>`);
  }
  const dl=(b64,name)=>b64?`<a class="dl" download="${esc(name)}" href="data:application/pdf;base64,${b64}">⬇ ${esc(name)}</a>`:"";
  let html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ready to send: ${esc(docTitle(inv))} ${esc(inv.number)} ${esc(inv.client)}</title><style>${SHEET_CSS}${TPL_CSS}
.box{background:#fff;border-radius:6px;padding:16px;margin:14px 0;font:14px Arial,sans-serif;color:#222}.box pre{white-space:pre-wrap;font:14px Arial,sans-serif;background:#f6f6f6;padding:10px;border-radius:4px}.dl{display:inline-block;margin:4px 8px 4px 0;padding:8px 12px;background:#1f2a44;color:#fff;border-radius:4px;text-decoration:none;font:14px Arial}.rc img{max-width:100%;border:1px solid #ddd}.rc h3{margin:0 0 4px}.sm{color:#666;font-size:13px;margin:0 0 8px}</style></head><body><div class="wrapx">
<div class="box"><b>Ready to send</b> · saved by Guitar Man Finance on ${today()}<br>To: ${esc(to||"(add the client's email)")}<br>Subject: ${esc(`${inv.items[0]?.desc?String(inv.items[0].desc).slice(0,60)+" ":""}${inv.status==="quote"?"quote":"invoice"}`)}<pre>${esc(body)}</pre>
<div>${dl(invB64,pdfName(inv))}${dl(rcB64,`Receipts for ${pdfName(inv)}`)}${originals.map(o=>dl(o.content,o.filename)).join("")}</div>
<p class="sm">Tap a button to save that PDF, then attach them to an email to ${esc(inv.client)}.</p></div>
${sheetHTML(inv)}
${rc.length?`<div class="box"><b>Receipts</b>${rc.join("")}</div>`:""}
</div></body></html>`;
  if(html.length>4.9e6){html=html.replace(/<a class="dl" download="[^"]*" href="data:application\/pdf;base64,[^"]*">[^<]*<\/a>/g,"").replace("<p class=\"sm\">Tap a button","<p class=\"sm\">(The PDFs were too big to fit in one Dropbox file; download them from the app.) Tap a button")}
  return html;
}
async function savePacket(inv){
  if(!S.mcp){S.packetMsg="err:Connected apps aren't available in this view. Open the page in Claude.";render(true);return}
  S.busy.packet=true;S.packetMsg="";render(true);
  try{
    const html=await buildPacketHTML(inv);if(html.length>5e6)throw{code:"too_big"};
    const y=yearOf(inv.date),cl=safeName(clientKey(inv.client));const n=new Date();const stamp=`${today()} ${String(n.getHours()).padStart(2,"0")}${String(n.getMinutes()).padStart(2,"0")}`;
    await ensureFolders([ROOT,ROOT+"/Invoices",`${ROOT}/Invoices/${y}`,`${ROOT}/Invoices/${y}/${cl}`]);
    await dbxCreate(`${ROOT}/Invoices/${y}/${cl}/${inv.date} ${inv.status==="quote"?"Quote":"Invoice"} ${safeName(inv.number)} ${cl} - ready to send ${stamp}.html`,html);
    S.packetMsg=`ok:Saved to Dropbox › Guitar Man Finance › Invoices › ${y} › ${cl}. Open the “ready to send” file to get the invoice, the receipts and the message.`;
  }catch(e){S.packetMsg="err:"+(e&&e.code==="too_big"?"That's too big for one Dropbox file. Use Download the PDFs instead.":e&&e.message==="load"?"Couldn't load the PDF maker. Check your connection.":mcpErr(e,"Dropbox"))}
  S.busy.packet=false;render(true);
}
async function downloadAll(inv){printHTML(sheetHTML(inv)+await receiptsPrintHTML(inv))}
async function receiptsPrintHTML(inv){const list=rcsOf(inv);let out="";for(const [k,{r,it}] of list.entries()){const img=r.hasImage?await getImage(r.id):null;out+=`<div class="pgbrk pr-rc" style="font-family:Arial,sans-serif;color:#111;background:#fff;padding:10px"><h2 style="margin:0 0 4px">Receipt ${k+1} of ${list.length}: ${esc(r.vendor)}</h2><p style="margin:0 0 10px;color:#555">${esc(fmtDate(r.date,"mmm d, yyyy"))} · ${money(r.total,r.currency)} ${esc(r.currency||"CAD")}${num(r.taxPaid)?` · GST/HST ${money(r.taxPaid,r.currency)}`:""} · billed on “${esc(it.desc)}”</p>${img?`<img src="${img}" alt="">`:`<p>${esc(r.note||r.category)}</p>`}</div>`}return out}
/* ———————————— real files (PDF invoices, JPEG/PNG receipt photos) saved through the phone's share menu: pick Dropbox there ———————————— */
function dataUrlBlob(u){const m=String(u||"").match(/^data:([^;,]+)(;base64)?,(.*)$/s);if(!m)return null;const bin=m[2]?atob(m[3]):decodeURIComponent(m[3]);return new Blob([binToBytes(bin)],{type:m[1]})}
const imgExt=t=>t==="image/png"?"png":t==="image/webp"?"webp":"jpg";
const fileBase=s=>safeName(s).replace(/[.\s]+$/,"")||"file";
function invFileName(inv){return `${inv.date} ${inv.status==="quote"?"Quote":"Invoice"} ${fileBase(inv.number)} ${fileBase(clientKey(inv.client))}.pdf`}
const canvasBlob=(c,type,q)=>new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("image")),type,q));
async function receiptSummaryPdf(r,name){
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"pt",format:"letter"});const M=48;let y=64;
  doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text(doc.splitTextToSize(`Receipt: ${cleanText(r.vendor)}`,612-2*M)[0],M,y);y+=34;doc.setFontSize(11);
  [["Date",fmtDate(r.date,"mmm d, yyyy")],["Total",`${money(r.total,r.currency)} ${r.currency||"CAD"}`],["GST/HST",num(r.taxPaid)?money(r.taxPaid,r.currency):"none shown"],["Category",r.category],["What it was",cleanText(r.note)||"-"]].forEach(([a,b])=>{doc.setFont("helvetica","bold");doc.text(a,M,y);doc.setFont("helvetica","normal");doc.splitTextToSize(String(b||""),612-2*M-110).forEach((l,n)=>doc.text(l,M+110,y+n*14));y+=24});
  if(r.emailText){const lines=String(r.emailText).split(/\n/).map(l=>l.trim()).filter(l=>l&&/\d/.test(l)&&l.length<110).slice(0,24);if(lines.length){y+=10;doc.setFont("helvetica","bold");doc.text("From the email",M,y);y+=16;doc.setFont("helvetica","normal");doc.setFontSize(9.5);lines.forEach(l=>{doc.text(l,M,y);y+=12})}}
  return{blob:doc.output("blob"),name}
}
/* one "entry" = one thing the person recognises (the invoice, a receipt); it can produce more than one file (an email with two PDFs) */
function receiptEntry(r){const base=`${r.date} ${fileBase(r.vendor)} receipt`;
  return{label:`${r.vendor} · ${money(r.total,r.currency)}`,make:async()=>{
    if(r.hasImage){const u=await getImage(r.id);const b=dataUrlBlob(u);if(b)return[{blob:b,name:`${base}.${imgExt(b.type)}`}]}
    if(r.gid&&S.mcp){let p=null;try{p=await emailParts(r.gid)}catch{}
      if(p&&p.pdfs.length)return p.pdfs.map((x,n)=>({blob:new Blob([binToBytes(atob(x.b64))],{type:"application/pdf"}),name:`${base}${p.pdfs.length>1?" "+(n+1):""}.pdf`}));
      if(p&&p.html){try{const s=await htmlSnapshot(p.html);return[{blob:await canvasBlob(s.c,"image/jpeg",.86),name:`${base}.jpg`}]}catch{}}}
    return[await receiptSummaryPdf(r,`${base}.pdf`)]}}}
function invoiceEntries(inv){return[{label:`${inv.status==="quote"?"Quote":"Invoice"} #${inv.number} (PDF)`,make:async()=>[{blob:(await buildInvoicePdf(inv)).output("blob"),name:invFileName(inv)}]},...rcsOf(inv).map(({r})=>receiptEntry(r))]}
const saveWord=()=>dropboxOn()?"Save to Dropbox":"Save files";
function startSave(title,entries){if(!S.downloads){toast("Saving files isn't available in this view. Open the page in the Claude app.");return}
  if(S.saveQ&&S.saveQ.busy)return;S.saveQ={title,items:entries.map(e=>({...e,status:"wait",files:null,fi:0,err:""})),i:0,busy:false,stopped:false};
  let el=$("#sqRoot");if(!el){el=document.createElement("div");el.id="sqRoot";document.body.appendChild(el)}runSave()}
async function runSave(){const q=S.saveQ;if(!q||q.busy)return;q.busy=true;q.stopped=false;q.note="";sqDraw();
  while(S.saveQ===q&&q.i<q.items.length){const it=q.items[q.i];
    if(!it.files){it.status="making";sqDraw();try{it.files=await it.make();it.fi=0}catch(e){it.status="err";it.err=e&&e.message==="load"?"Couldn't load the PDF maker. Check your connection.":(e&&e.message)||"Couldn't make this file.";q.i++;continue}}
    if(it.fi>=it.files.length){it.status="saved";q.i++;continue}
    const f=it.files[it.fi];it.status="saving";sqDraw();
    try{await S.downloads.save({filename:f.name,data:f.blob});it.fi++;if(it.fi>=it.files.length){it.status="saved";q.i++}await new Promise(r=>setTimeout(r,350))}
    catch(e){const c=e&&e.code;
      if(c==="rate_limited"&&!it.retried){it.retried=true;await new Promise(r=>setTimeout(r,1500));continue}
      it.retried=false;it.status="wait";q.stopped=true;
      q.note=c==="declined"?`“${f.name}” wasn't saved. Tap Save next to try it again, or skip it.`:c==="rate_limited"?"Your phone needed a moment. Tap Save next to carry on.":c==="too_large"?`“${f.name}” is too big to save here.`:c==="unavailable"||c==="not_granted"?"Saving files isn't available in this view.":`Couldn't save “${f.name}”.`;
      if(c==="too_large"){it.status="err";it.err="Too big to save";q.i++}break}}
  q.busy=false;sqDraw()}
function sqDraw(){const el=$("#sqRoot"),q=S.saveQ;if(!el)return;if(!q){el.innerHTML="";return}
  const done=q.i>=q.items.length,nSaved=q.items.filter(x=>x.status==="saved").length;
  const ic={wait:"○",making:'<span class="spin"></span>',saving:'<span class="spin"></span>',saved:"✓",err:"!"};
  el.innerHTML=`<div class="saveq" role="dialog" aria-label="${esc(saveWord())}"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${esc(saveWord())} · ${esc(q.title)}</b>${q.busy?"":`<button class="btn sm ghost" data-act="sqClose">${done?"Done":"Close"}</button>`}</div>
<p class="note" style="margin:6px 0 8px">${done?`${nSaved} of ${q.items.length} saved.`:dropboxOn()?"Your share menu opens for each file. Tap <b>Dropbox</b> (or <b>Save to Files › Dropbox</b>) and pick the folder.":"Your share menu opens for each file. Choose where it goes."}</p>
<ul class="sqlist">${q.items.map((x,k)=>`<li class="sq-${x.status}"><span class="sqi">${ic[x.status]||"○"}</span><span>${esc(x.label)}${x.files&&x.files.length>1?` <span class="dim">(${x.files.length} files)</span>`:""}${x.err?` <span class="err">${esc(x.err)}</span>`:""}</span></li>`).join("")}</ul>
${q.note?`<p class="note" style="margin:8px 0 0">${esc(q.note)}</p>`:""}
${!q.busy&&!done?`<div class="row" style="margin-top:10px"><button class="btn sm gold" data-act="sqNext">Save next</button><button class="btn sm ghost" data-act="sqSkip">Skip this one</button></div>`:""}</div>`}

/* ———————————— other income streams ———————————— */
const STREAM_TYPES=[["business","A second business (self-employed)"],["employment","A job with a pay stub (T4)"],["rental","Rental income"],["other","Other income"]];
function streamTypeLabel(k){return (STREAM_TYPES.find(x=>x[0]===k)||["","Other"])[1]}
function vOther(){
  const st=yearStats(S.year),ss=S.settings.streams||[];if(!S.incForm)S.incForm={date:today(),stream:ss[0]?.id||"",amount:"",withheld:"",note:""};const f=S.incForm;const cur=ss.find(x=>x.id===f.stream);
  return `<div class="row">${yearPicker()}</div>
<div class="grid3">${st.streams.map(s=>`<div class="panel"><div class="label">${esc(s.name)}</div><div class="big">${money(s.net)}</div><div class="note">${esc(streamTypeLabel(s.type))}${s.type==="business"?` · ${money(s.inc)} in − ${money(s.ex)} expenses`:""}${s.wh?` · ${money(s.wh)} tax withheld`:""}</div></div>`).join("")}</div>
<section class="panel hot"><span class="plaque" style="cursor:default">Add income</span>
<div class="grid3" style="margin-top:12px">
<div class="field"><label class="label" for="oi-stream">Income stream</label><select id="oi-stream" data-bind="incForm.stream" data-rerender="1">${ss.map(x=>`<option value="${x.id}" ${f.stream===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></div>
<div class="field"><label class="label" for="oi-date">Date</label><input id="oi-date" type="date" data-bind="incForm.date" value="${esc(f.date)}"></div>
<div class="field"><label class="label" for="oi-amt">${cur&&cur.type==="employment"?"Gross pay":"Amount"}</label><input id="oi-amt" class="mono" inputmode="decimal" data-bind="incForm.amount" value="${esc(f.amount)}"></div>
${cur&&cur.type==="employment"?`<div class="field"><label class="label" for="oi-wh">Income tax taken off (from the pay stub)</label><input id="oi-wh" class="mono" inputmode="decimal" data-bind="incForm.withheld" value="${esc(f.withheld)}"></div>`:""}
<div class="field" style="grid-column:1/-1"><label class="label" for="oi-note">Note</label><input id="oi-note" data-bind="incForm.note" value="${esc(f.note)}" placeholder="${cur&&cur.type==="employment"?"Pay period":cur&&cur.type==="rental"?"Month and unit":"What it was for"}"></div></div>
<div class="row" style="margin-top:10px"><button class="btn gold" data-act="incSave">Add it</button></div>${(S.settings.streams||[]).some(x=>x.type==="business")?`<p class="note" style="margin-top:8px">Expenses for a second business: file the receipt as usual and pick that business under “Which business?”.</p>`:""}</section>
${(()=>{const es=S.incomes.filter(e=>yearOf(e.date)===S.year).sort((a,b)=>(b.date||"").localeCompare(a.date||""));return es.length?`<div class="list">${es.map(e=>{const s=ss.find(x=>x.id===e.stream);const arm=S.armed==="inc:"+e.id;return `<div class="panel item"><span class="mono dim" style="font-size:12.5px;min-width:86px">${esc(e.date)}</span><span class="grow">${esc(s?s.name:"Removed stream")}${e.note?`<span class="dim"> · ${esc(e.note)}</span>`:""}${num(e.withheld)?`<br><span class="dim" style="font-size:12.5px">${money(e.withheld)} tax withheld</span>`:""}</span><span class="mono">${money(e.amount)}</span><button class="btn sm ${arm?"armed":"danger"}" data-act="incDel" data-v="${e.id}" aria-label="Delete">${arm?"Tap again":"×"}</button></div>`}).join("")}</div>`:`<div class="panel empty"><h2>No other income yet</h2><p class="note">Add pay stubs, rent or side-business income here. It's counted in your tax estimate on the Reports tab.</p></div>`})()}`;
}
function streamsSettings(){
  const ss=S.settings.streams||[];const nf=S.newStream||{name:"",type:"business"};
  return `<details class="panel" style="max-width:640px" ${S.streamsOpen?"open":""} data-streams="1"><summary class="label" style="cursor:pointer">More: other income streams</summary>
<p class="note" style="margin:10px 0">Music isn't your only income? Add a day job, rental income or a second business. You get an Other income tab, and it all counts in your tax estimate.</p>
${ss.length?`<div class="list" style="margin-bottom:10px">${ss.map(x=>{const arm=S.armed==="stream:"+x.id;return `<div class="rowline"><span>${esc(x.name)} <span class="dim">· ${esc(streamTypeLabel(x.type))}</span></span><button class="btn sm ${arm?"armed":"danger"}" data-act="streamDel" data-v="${x.id}">${arm?"Tap again to remove":"Remove"}</button></div>`}).join("")}</div>`:""}
<div class="grid3"><div class="field"><label class="label" for="ns-name">Name</label><input id="ns-name" data-bind="newStream.name" value="${esc(nf.name)}" placeholder="e.g. Teaching, Day job, Basement suite"></div>
<div class="field"><label class="label" for="ns-type">Type</label><select id="ns-type" data-bind="newStream.type">${STREAM_TYPES.map(([k,l])=>`<option value="${k}" ${nf.type===k?"selected":""}>${l}</option>`).join("")}</select></div>
<div class="field" style="justify-content:flex-end"><button class="btn" data-act="streamAdd">Add income stream</button></div></div></details>`;
}


/* ———————————— privacy, backup file, delete everything ———————————— */
const OFFLINE=true;const PWA=true;
function privacySection(){
  const del=S.armed==="wipe";
  const hosted=`<p class="note" style="margin:8px 0">Your invoices, receipts and settings are saved in your own private space in this app, tied to your Claude login. Nobody else who uses the app can see them, including the person who shared it with you. Gmail and Dropbox are only used if you switch them on and approve them when Claude asks, and files go to your own Dropbox. When Claude reads a receipt photo or email, it goes through your own Claude account. The app doesn't send your data anywhere else. It only downloads fonts and its PDF tool from public sites, and no personal information goes with those requests.</p>`;
  const off=`<p class="note" style="margin:8px 0">Your books are saved on this device, inside this app. There's no account and no server: the app can only talk to Google Drive or Dropbox, and only after you connect one below and sign in to your own account. The person who shared the app with you can't see anything you put in it. ${CLOUD.provider?`A copy goes to your own ${esc(cloudName())}${CLOUD.encrypt?", locked with your passphrase":""}.`:"Right now nothing leaves this device, so download a backup file now and then, or connect your own Drive or Dropbox."}</p>`;
  return `<section class="panel" style="max-width:640px"><span class="plaque" style="cursor:default">Privacy</span>${OFFLINE?off:hosted}
<div class="row"><button class="btn sm" data-act="exportBk">Download a backup file</button><label tabindex="0" role="button" class="btn sm ghost" for="jsonIn">Restore from a backup file</label></div>
${typeof cloudSection==="function"?cloudSection():""}
${eraseSection()}
${S.wipeMsg?msgLine(S.wipeMsg):""}</section>`;
}

/* ———————————— erase everything: hidden, two separate confirmations ———————————— */
function eraseSection(){
  const e=S.erase||{step:0,word:""};
  const cloud=typeof cloudConnected==="function"&&cloudConnected();
  return `<details class="erase" ${S.eraseOpen?"open":""} data-erase="1" style="margin-top:16px"><summary class="note" style="cursor:pointer">Advanced: erase everything</summary>
<div class="panel" style="margin-top:10px;border-color:var(--red)">
${e.step<2?`<p style="margin:0 0 8px"><b>Erase all of your books from ${OFFLINE?"this device":"this app"}.</b> Invoices, receipts, photos, mileage, income and settings are all deleted, and it can't be undone.</p>
<p class="note" style="margin:0 0 10px">Tip: tap <b>Download a backup file</b> above first, just in case.</p>
<div class="field"><label class="label" for="erase-word">Step 1 of 2: type ERASE to continue</label><input id="erase-word" data-bind="erase.word" value="${esc(e.word||"")}" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ERASE"></div>
<div class="row" style="margin-top:10px"><button class="btn sm danger" data-act="eraseNext">Continue</button></div>${e.err?`<div class="err" style="margin-top:6px">${esc(e.err)}</div>`:""}`
:`<p style="margin:0 0 8px"><b>Step 2 of 2: last chance.</b> Press and hold the red button for 3 seconds to erase everything. Let go to cancel.</p>
${cloud?`<label class="chk" style="margin:6px 0 10px"><input type="checkbox" data-erasecloud="1" ${e.cloud?"checked":""}> Also delete my backup copy in ${esc(cloudName())}</label>`:""}
<div class="row"><button class="btn holdbtn" data-hold="erase" aria-label="Press and hold for 3 seconds to erase everything"><span class="holdfill"></span><span class="holdtxt">Hold to erase everything</span></button><button class="btn sm ghost" data-act="eraseCancel">Cancel</button></div>`}
</div></details>`;
}
let holdT=null,holdStart=0;
function holdBegin(btn){if(holdT)return;holdStart=Date.now();const fill=btn.querySelector(".holdfill");holdT=setInterval(()=>{const p=Math.min(1,(Date.now()-holdStart)/3000);if(fill)fill.style.width=(p*100)+"%";if(p>=1){holdEnd(btn,true)}},50)}
function holdEnd(btn,done){clearInterval(holdT);holdT=null;const fill=btn&&btn.querySelector(".holdfill");if(fill)fill.style.width="0";if(done){const cloud=!!(S.erase&&S.erase.cloud);S.erase=null;S.eraseOpen=false;wipeAll(cloud)}}
document.addEventListener("pointerdown",e=>{const b=e.target.closest&&e.target.closest("[data-hold]");if(b){e.preventDefault();holdBegin(b)}});
["pointerup","pointercancel","pointerleave"].forEach(ev=>document.addEventListener(ev,e=>{if(holdT){const b=document.querySelector("[data-hold]");holdEnd(b,false)}},true));
document.addEventListener("keydown",e=>{const b=e.target.closest&&e.target.closest("[data-hold]");if(b&&(e.key==="Enter"||e.key===" ")){e.preventDefault();if(!e.repeat)holdBegin(b)}});
document.addEventListener("keyup",e=>{const b=e.target.closest&&e.target.closest("[data-hold]");if(b&&holdT)holdEnd(b,false)});

async function exportBackup(){
  const imgs={};
  if(OFFLINE){for(const r of S.receipts){if(r.hasImage){const u=await getImage(r.id);if(u)imgs[r.id]=u}}}
  const json=JSON.stringify({app:"Guitar Man Finance",exported:new Date().toISOString(),settings:S.settings,invoices:S.invoices,receipts:S.receipts,trips:S.trips,incomes:S.incomes,images:imgs});
  const name=`guitar-man-finance-backup-${today()}.json`;const blob=new Blob([json],{type:"application/json"});
  if(S.downloads){try{await S.downloads.save({filename:name,data:blob})}catch(e){if(!(e&&e.code==="declined"))toast("Couldn't save the backup.")}return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
}
async function wipeAll(cloudToo){
  if(cloudToo&&typeof cloudErase==="function"){try{await cloudErase()}catch{}}
  if(!S.col){S.wipeMsg="err:Nothing is saved in this view.";render(true);return}
  const docs=[...S.invoices.map(x=>[x.id,"invoice"]),...S.receipts.map(x=>[x.id,"receipt"]),...S.trips.map(x=>[x.id,"trip"]),...S.incomes.map(x=>[x.id,"income"])];
  const imgs=S.receipts.filter(r=>r.hasImage).map(r=>"img_"+r.id);
  const cn=cloudName();
  try{for(const id of imgs){try{await S.col.doc(id).delete()}catch{}}for(const [id,k] of docs){await S.col.doc(id).delete()}await S.col.doc("settings").delete();clearTimeout(cloudTimer);await cloudForget();try{await IDB.clear()}catch{}
    S.invoices=[];S.receipts=[];S.trips=[];S.incomes=[];S.settings={...DEFAULT_SETTINGS};S.imgCache={};S.wipeMsg="ok:Everything has been deleted from this device."+(cn?(cloudToo?` The backup in your ${cn} was deleted too, and the app is disconnected from it.`:` The app is disconnected from your ${cn}. The backup file there is still in your account.`):"");}
  catch(e){S.wipeMsg="err:"+dbErr(e)}
  render(true);
}

/* ———————————— reports ———————————— */
const clientKey=n=>String(n||"No client").replace(/(\s+(Music|INC|Inc\.?|Ltd\.?))+$/i,"").trim()||"No client";
const isLive=i=>i.status==="sent"||i.status==="paid";
const T2125={"Advertising & promo":["8521","Advertising"],"Meals & entertainment":["8523","Meals and entertainment (50%)"],"Insurance":["8690","Insurance"],"Software & subscriptions":["8810","Office expenses"],"Studio supplies":["8811","Office stationery and supplies"],"Professional fees":["8860","Professional fees"],"Repairs & maintenance":["8960","Repairs and maintenance"],"Travel & accommodation":["9200","Travel expenses"],"Phone & internet":["9220","Telephone and utilities"],"Vehicle & fuel":["9281","Motor vehicle expenses"],"Home studio (workspace-in-home)":["9945","Business-use-of-home expenses"],"Instruments & gear":["9936","Capital cost allowance (instruments, Class 8)"],"Contract labour":["9270","Other expenses (contract labour)"],"Fitness on the road":["9270","Other expenses (fitness on the road)"],"Other":["9270","Other expenses"]};
function monthsIn(y){const n=new Date();return y<n.getFullYear()?12:y>n.getFullYear()?0:n.getMonth()+1}
function factors(y){
  const s=S.settings,trips=S.trips.filter(t=>yearOf(t.date)===y);
  const bizKm=trips.reduce((a,t)=>a+num(t.km),0);
  const o=(s.odo||{})[y]||{};const totalKm=num(o.end)-num(o.start);
  let veh=1,vehSrc="Counted at 100%. Log trips on the Mileage tab to set your business-use %.";
  if(totalKm>0&&bizKm>0){veh=Math.min(1,bizKm/totalKm);vehSrc=`${Math.round(veh*100)}% business use, from your mileage log (${Math.round(bizKm).toLocaleString()} of ${Math.round(totalKm).toLocaleString()} km)`}
  else if(String(s.vehPctManual??"")!==""){veh=Math.min(1,Math.max(0,num(s.vehPctManual)/100));vehSrc=`${Math.round(veh*100)}% business use (entered on the Mileage tab)`}
  const home=Math.min(1,Math.max(0,num(s.homePct)/100));
  return{veh,vehSrc,bizKm,totalKm,trips,home};
}
function deductible(r,f){
  if(!isCAD(r)||isPersonal(r))return 0;let v=num(r.total)-num(r.taxPaid);
  if(r.category==="Meals & entertainment")v*=.5;
  if(r.category==="Vehicle & fuel")v*=f.veh;
  if(r.category==="Home studio (workspace-in-home)")v*=f.home;
  return v;
}
function claimable(r,f){
  if(!isCAD(r)||isPersonal(r))return 0;let t=num(r.taxPaid);
  if(r.category==="Meals & entertainment")t*=.5;
  if(f&&r.category==="Vehicle & fuel")t*=f.veh;
  if(f&&r.category==="Home studio (workspace-in-home)")t*=f.home;
  return t;
}
function taxEst(n,other=0,withheld=0){
  n=Math.max(0,n);other=Math.max(0,other);
  const base=n>3500?(Math.min(n,74600)-3500)*.119:0,cpp2=Math.max(0,Math.min(n,85000)-74600)*.08,cpp=base+cpp2;
  const ded=base*.5+base*.5*(1/5.95)+cpp2,cr=base*.5*(4.95/5.95),ti=Math.max(0,n+other-ded);
  const br=(x,b)=>{let t=0,p=0;for(const [lim,r] of b){if(x>p)t+=(Math.min(x,lim)-p)*r;p=lim}return t};
  const fed=Math.max(0,br(ti,[[58523,.14],[117045,.205],[181440,.26],[258482,.29],[1e12,.33]])-.14*(16452+cr));
  const bc=Math.max(0,br(ti,[[50363,.056],[100728,.077],[115648,.105],[140430,.1229],[190405,.147],[265545,.168],[1e12,.205]])-.056*(13216+cr));
  const total=cpp+fed+bc;return{cpp,fed,bc,total,taxable:ti,withheld,due:Math.max(0,total-withheld)};
}
function daysOut(inv){return Math.max(0,Math.floor((Date.now()-Date.parse(inv.date+"T12:00:00"))/864e5))}
const isOverdue=inv=>inv.status==="sent"&&daysOut(inv)>30;
function yearStats(y){
  const f=factors(y);
  const inv=S.invoices.filter(i=>yearOf(i.date)===y),rec=S.receipts.filter(r=>yearOf(r.date)===y);
  const ci=inv.filter(isCAD),cr=rec.filter(r=>isCAD(r)&&!isPersonal(r));
  const live=ci.filter(isLive),paidI=ci.filter(i=>i.status==="paid");
  const paid=paidI.reduce((s,i)=>s+invTotals(i).sub,0);
  const billed=live.reduce((s,i)=>s+invTotals(i).sub,0);
  const payB=live.reduce((s,i)=>s+invTotals(i).pay,0),pdB=live.reduce((s,i)=>s+invTotals(i).perdiem,0),reB=live.reduce((s,i)=>s+invTotals(i).reimb,0);
  const payPaid=paidI.reduce((s,i)=>s+invTotals(i).pay,0);
  const outstanding=ci.filter(i=>i.status==="sent").reduce((s,i)=>s+invTotals(i).total,0);
  const homeRent=(num(S.settings.rentMonthly)+num(S.settings.utilMonthly))*monthsIn(y)*f.home;
  const crOwn=cr.filter(r=>!r.billedTo&&!r.stream),crBilled=cr.filter(r=>r.billedTo&&!r.stream);
  const cats=CATS.filter(c=>c!==PERSONAL).map(c=>[c,crOwn.filter(r=>r.category===c).reduce((s,r)=>s+deductible(r,f),0)]).filter(([,v])=>v>0);
  const billedBack=crBilled.reduce((s,r)=>s+deductible(r,f),0);
  const ownExp=cats.reduce((s,[,v])=>s+v,0)+homeRent,expenses=ownExp+billedBack;
  const personal=rec.filter(isPersonal).reduce((s,r)=>s+(isCAD(r)?num(r.total):0),0);
  const collected=live.reduce((s,i)=>s+invTotals(i).tax,0);
  const claimed=cr.reduce((s,r)=>s+claimable(r,f),0);
  const quarters=[1,2,3,4].map(q=>{const c=live.filter(i=>quarterOf(i.date)===q).reduce((s,i)=>s+invTotals(i).tax,0);const cl=cr.filter(r=>quarterOf(r.date)===q).reduce((s,r)=>s+claimable(r,f),0);return{q,c,cl,net:c-cl}});
  const foreign={};inv.filter(i=>!isCAD(i)&&i.status==="paid").forEach(i=>{foreign[i.currency]=(foreign[i.currency]||0)+invTotals(i).total});
  const fexp={};rec.filter(r=>!isCAD(r)&&!isPersonal(r)).forEach(r=>{fexp[r.currency]=(fexp[r.currency]||0)+num(r.total)});
  const mealsTax=cr.filter(r=>r.category==="Meals & entertainment").reduce((s,r)=>s+num(r.taxPaid),0);
  const review=rec.filter(r=>r.needsReview).length;
  const gross=payB+pdB+reB,netInc=gross-expenses;
  const streams=(S.settings.streams||[]).map(sx=>{const es=S.incomes.filter(e=>e.stream===sx.id&&yearOf(e.date)===y);const inc=es.reduce((a,e)=>a+num(e.amount),0),wh=es.reduce((a,e)=>a+num(e.withheld),0);const ex=sx.type==="business"?rec.filter(r=>r.stream===sx.id&&isCAD(r)&&!isPersonal(r)).reduce((a,r)=>a+deductible(r,f),0):0;return{...sx,inc,wh,ex,net:inc-ex,entries:es}});
  const seOther=streams.filter(s=>s.type==="business").reduce((a,s)=>a+s.net,0),otherInc=streams.filter(s=>s.type!=="business").reduce((a,s)=>a+s.net,0),withheld=streams.reduce((a,s)=>a+s.wh,0);
  const tax=taxEst(netInc+seOther,otherInc,withheld);
  const clients={};live.forEach(i=>{const k=clientKey(i.client);const t=invTotals(i);clients[k]=clients[k]||{pay:0,other:0,n:0};clients[k].pay+=t.pay;clients[k].other+=t.perdiem+t.reimb;clients[k].n++});
  const byClient=Object.entries(clients).sort((a,b)=>b[1].pay-a[1].pay);
  return{streams,seOther,otherInc,withheld,f,crBilled,billedBack,ownExp,inv,rec,live,paid,billed,payB,pdB,reB,payPaid,outstanding,expenses,homeRent,personal,collected,claimed,net:collected-claimed,quarters,cats,foreign,fexp,mealsTax,review,gross,netInc,tax,byClient};
}
function summaryHTML(y){
  const st=yearStats(y),s=S.settings;
  const cat=st.cats.map(([c,v])=>`<tr><td>${esc((T2125[c]||["9270"])[0])} ${esc(c)}</td><td align="right">${money(v)}</td></tr>`).join("")+(st.homeRent?`<tr><td>9945 Home studio share of rent &amp; utilities</td><td align="right">${money(st.homeRent)}</td></tr>`:"")+(st.billedBack?`<tr><td>Expenses billed back to clients</td><td align="right">${money(st.billedBack)}</td></tr>`:"");
  const q=st.quarters.map(x=>`<tr><td>Q${x.q}</td><td align="right">${money(x.c)}</td><td align="right">${money(x.cl)}</td><td align="right">${money(x.net)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.businessName)} ${y} summary</title></head><body style="font-family:Arial,sans-serif;max-width:820px;margin:24px auto;padding:0 16px">
<h1>${esc(s.businessName)}: ${y} year-end summary</h1><p>GST/HST # ${esc(s.gstNumber)} · Generated ${today()}</p>
<p>Pay billed: <b>${money(st.payB)}</b><br>Per diems billed: <b>${money(st.pdB)}</b><br>Expense reimbursements billed: <b>${money(st.reB)}</b><br>Gross business income: <b>${money(st.gross)}</b><br>Deductible expenses: <b>${money(st.expenses)}</b><br>Net business income: <b>${money(st.netInc)}</b><br>Estimated income tax + CPP: <b>${money(st.tax.total)}</b><br>GST/HST collected ${money(st.collected)} · ITCs ${money(st.claimed)} · Net ${st.net>=0?"owing":"refund"} <b>${money(Math.abs(st.net))}</b></p>
<h3>Expenses by CRA T2125 line</h3><table cellpadding="4">${cat||"<tr><td>None recorded</td></tr>"}</table>
<h3>GST/HST by quarter</h3><table cellpadding="4"><tr><th align="left">Quarter</th><th>Collected</th><th>ITCs</th><th>Net</th></tr>${q}</table>
<p style="color:#666">CAD items only; personal items excluded. Meals at 50%. Vehicle: ${esc(st.f.vehSrc)}. Home studio: ${Math.round(st.f.home*100)}%. Working figures; verify before filing.</p></body></html>`;
}
async function yearEndPdf(){const h=summaryHTML(S.year);const b=h.slice(h.indexOf("<body"),h.lastIndexOf("</body>"));printHTML(`<div style="background:#fff;color:#111;font-family:Arial,sans-serif;padding:10px">${b.replace(/^<body[^>]*>/,"")}</div>`)}
/* ———————————— invoice template ———————————— */
const DEFAULT_TPL={title:"INVOICE",font:"helvetica",layout:"classic",table:"lines",accent:"#1f2a44",titleColor:"#6b7280",nameColor:"#111111",nameCase:"as-is",billToLabel:"Bill To:",forHead:"For:",descHeader:"DESCRIPTION",amountHeader:"AMOUNT",totalLabel:"TOTAL",dateFormat:"mmm d, yyyy",
  footer:"Payment by e-transfer to **{email}**\nQuestions about this invoice? {phone} · {email}\nGST/HST # {gst}",thanks:"Thank you for your business!",showLogo:false};
const TPL_ENUM={font:["helvetica","times","courier"],layout:["classic","centered","banner"],table:["boxed","lines","minimal"],nameCase:["upper","as-is"],dateFormat:["dd/mm/yy","yyyy-mm-dd","mmm d, yyyy","mm/dd/yyyy"]};
function normTpl(x){
  const o={...DEFAULT_TPL};if(!x||typeof x!=="object")return o;
  for(const k of Object.keys(DEFAULT_TPL)){const v=x[k];if(v===undefined||v===null)continue;
    if(TPL_ENUM[k]){if(TPL_ENUM[k].includes(v))o[k]=v}
    else if(/Color$|^accent$/.test(k)){if(/^#[0-9a-f]{6}$/i.test(String(v)))o[k]=String(v)}
    else if(k==="showLogo")o[k]=!!v;
    else o[k]=String(v).slice(0,k==="footer"?600:120)}
  return o;
}
const tplOf=()=>normTpl(S.settings.tpl);
const FONT_CSS={helvetica:"Helvetica,Arial,sans-serif",times:"'Times New Roman',Times,Georgia,serif",courier:"'Courier New',Courier,monospace"};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d,f){const m=String(d||"").match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return String(d||"");const [_,y,mo,da]=m;
  return f==="yyyy-mm-dd"?`${y}-${mo}-${da}`:f==="mmm d, yyyy"?`${MON[+mo-1]} ${+da}, ${y}`:f==="mm/dd/yyyy"?`${mo}/${da}/${y}`:`${da}/${mo}/${y.slice(2)}`}
function fillTpl(str){const s=S.settings;return String(str||"").replace(/\{name\}/g,s.businessName||"").replace(/\{tagline\}/g,s.tagline||"").replace(/\{phone\}/g,s.phone||"").replace(/\{email\}/g,s.email||"").replace(/\{gst\}/g,s.gstNumber||"").replace(/\{address\}/g,String(s.address||"").replace(/\n/g,", ")).replace(/\s+[–-]\s*$/,"")}
const richHTML=line=>esc(line).split("**").map((p,i)=>i%2?`<b>${p}</b>`:p).join("");
const TPL_CSS=`.sheet{--acc:#111}.sheet tbody tr.it td{padding:9px 7px;border-bottom:1px solid #c8c8c8;line-height:1.4}.sheet tbody tr.it td:first-child{overflow-wrap:anywhere;word-break:break-word;padding-right:14px}.sheet.tb-minimal tbody tr.it td{border-bottom-color:#eee}.sheet .lg{display:block;max-height:58px;max-width:190px;margin-bottom:8px}
.sheet.t-centered .top{flex-direction:column;align-items:center;text-align:center;gap:6px}.sheet.t-centered .inv{font-size:20px;letter-spacing:2px}
.sheet.t-banner{padding-top:0}.sheet.t-banner .top{background:var(--acc);color:#fff;margin:0 -26px;padding:22px 26px;align-items:center}.sheet.t-banner .top .nm,.sheet.t-banner .top .inv{color:#fff!important}.sheet.t-banner .meta{margin-top:16px}
.sheet.tb-lines th{border:none;border-bottom:2px solid var(--acc)}.sheet.tb-lines td{border:none;border-bottom:1px solid #ddd}.sheet.tb-lines tr.fill td{height:40px;border-bottom:1px solid #ddd}.sheet.tb-lines tr.tax td,.sheet.tb-lines tr.tot td{border:none}.sheet.tb-lines tr.tot td{border-top:2px solid var(--acc)}
.sheet.tb-minimal th{border:none;color:var(--acc);text-align:left!important;font-size:11px;letter-spacing:1px}.sheet.tb-minimal th:last-child{text-align:right!important}.sheet.tb-minimal td{border:none}.sheet.tb-minimal tr.fill td{height:30px}.sheet.tb-minimal tr.tax td,.sheet.tb-minimal tr.tot td{border:none}.sheet.tb-minimal tr.tot td{border-top:1px solid #999}
@media (max-width:520px){.sheet.t-banner .top{margin:0 -14px;padding:18px 14px}}`;
document.head.insertAdjacentHTML("beforeend",`<style>${TPL_CSS}</style>`);
function sheetHTML(inv,tplOverride){
  const t=invTotals(inv),s=S.settings,T=tplOverride||tplOf();const bill=[inv.client,...String(inv.clientAddress||"").split("\n")].filter(Boolean);
  const title=inv.status==="quote"?"QUOTE":T.title;const nm=T.nameCase==="upper"?String(s.businessName).toUpperCase():s.businessName;
  const lg=T.showLogo?logoImgTag():"";
  return `<div class="sheet t-${T.layout} tb-${T.table}" style="--acc:${T.accent};font-family:${FONT_CSS[T.font]}">
<div class="top"><div>${lg}<div class="nm" style="color:${T.nameColor};font-family:${FONT_CSS[T.font]}">${esc(nm)}</div></div><div class="inv" style="color:${T.titleColor};font-family:${FONT_CSS[T.font]}">${esc(title)}</div></div>
<div class="meta"><div>${esc(s.businessName)}<div style="padding-left:4px;margin-top:4px">${esc(s.address).replace(/\n/g,"<br>")}</div></div>
<div style="align-self:flex-end"><b>${esc(title)}:${esc(inv.number)}</b><br><b>DATE:&nbsp; ${esc(fmtDate(inv.date,T.dateFormat))}</b></div></div>
<div class="bill"><div>${esc(T.billToLabel)}<br>${bill.map(esc).join("<br>")}</div>${T.forHead?`<div>${esc(T.forHead)}<br>${esc(inv.forLabel)}</div>`:"<div></div>"}</div>
<table style="font-family:${FONT_CSS[T.font]}"><thead><tr><th style="font-family:inherit">${esc(T.descHeader)}</th><th style="width:92px;font-family:inherit">${esc(T.amountHeader)}</th></tr></thead><tbody>
${inv.items.map(it=>`<tr class="it"><td style="font-family:inherit">${esc(it.desc)}</td><td class="a" style="font-family:inherit">${plain(num(it.qty||1)*num(it.rate))}</td></tr>`).join("")}
<tr class="fill last"><td style="height:${Math.max(16,150-inv.items.length*34)}px"></td><td></td></tr>
${t.tax||inv.taxType!=="None"?`<tr class="tax"><td style="font-family:inherit">${esc(taxLine(inv))}</td><td class="a" style="font-family:inherit">${plain(t.tax)}</td></tr>`:""}
<tr class="tot"><td style="font-family:inherit">${esc(T.totalLabel)}</td><td class="a" style="font-family:inherit">${plain(t.total)}</td></tr></tbody></table>
${inv.currency!=="CAD"?`<div style="margin-top:8px">Amounts in ${esc(inv.currency)}</div>`:""}
<div class="foot">${fillTpl(T.footer).split("\n").map(richHTML).join("<br>")}${inv.notes?`<br><br>${esc(inv.notes).replace(/\n/g,"<br>")}`:""}</div>
${T.thanks?`<div class="thanks">${richHTML(fillTpl(T.thanks))}</div>`:""}
</div>`;
}
async function buildInvoicePdf(inv,tplOverride){
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const {jsPDF}=window.jspdf;const s=S.settings,t=invTotals(inv),T=tplOverride||tplOf(),F=T.font;
  const doc=new jsPDF({unit:"pt",format:"letter"});const L=40,R=572,MID=306;
  const rgb=h=>{const n=parseInt(String(h||"#000000").slice(1),16)||0;return[(n>>16)&255,(n>>8)&255,n&255]};
  const acc=rgb(T.accent),ttl=rgb(T.titleColor),nmc=rgb(T.nameColor);
  const title=inv.status==="quote"?"QUOTE":T.title;const nm=T.nameCase==="upper"?String(s.businessName||"").toUpperCase():String(s.businessName||"");
  const fit=(txt,max,size)=>{let fs=size;doc.setFontSize(fs);while(doc.getTextWidth(txt)>max&&fs>12){fs--;doc.setFontSize(fs)}return fs};
  let logo=null;if(T.showLogo){try{logo=await logoPng()}catch{}}
  let off=0;
  if(T.layout==="banner"){
    doc.setFillColor(...acc);doc.rect(0,0,612,92,"F");let x=L;
    if(logo){const h=52,w=Math.min(170,logo.w/logo.h*h);doc.addImage(logo.url,"PNG",L,20,w,h);x=L+w+12}
    doc.setFont(F,"bold");doc.setTextColor(255,255,255);doc.setFontSize(24);const tw=doc.getTextWidth(title);fit(nm,R-x-tw-30,24);doc.text(nm,x,56);doc.setFontSize(24);doc.text(title,R,56,{align:"right"});off=36;
  }else if(T.layout==="centered"){
    let y=58;if(logo){const h=48,w=Math.min(180,logo.w/logo.h*h);doc.addImage(logo.url,"PNG",MID-w/2,22,w,h);y=96}
    doc.setFont(F,"bold");doc.setTextColor(...nmc);fit(nm,R-L,26);doc.text(nm,MID,y,{align:"center"});doc.setFontSize(14);doc.setTextColor(...ttl);doc.text(title,MID,y+20,{align:"center"});off=y+20-64;
  }else{
    let x=L;if(logo){const h=44,w=Math.min(150,logo.w/logo.h*h);doc.addImage(logo.url,"PNG",L,30,w,h);x=L+w+10}
    doc.setFont(F,"bold");doc.setFontSize(27);const tw=doc.getTextWidth(title);doc.setTextColor(...nmc);fit(nm,R-x-tw-24,27);doc.text(nm,x,64);doc.setFontSize(27);doc.setTextColor(...ttl);doc.text(title,R,64,{align:"right"});
  }
  doc.setTextColor(0);
  doc.setFont(F,"normal");doc.setFontSize(9);doc.text(s.businessName||"",L,88+off);
  String(s.address||"").split("\n").forEach((l,i)=>doc.text(l,L+4,100+off+i*11));
  doc.setFont(F,"bold");doc.text(`${title}:${inv.number}`,440,104+off);doc.text(`DATE:  ${fmtDate(inv.date,T.dateFormat)}`,440,115+off);
  const y=170+off;doc.text(T.billToLabel,L,y);if(T.forHead)doc.text(T.forHead,300,y);
  [inv.client,...String(inv.clientAddress||"").split("\n")].filter(Boolean).forEach((l,i)=>doc.text(l,L,y+11+i*11));
  if(T.forHead)doc.splitTextToSize(inv.forLabel||"",250).forEach((l,i)=>doc.text(l,300,y+11+i*11));
  const top=266+off,ac=480,PH=792,LIM=716;doc.setLineWidth(.7);doc.setDrawColor(0);
  const head=y0=>{doc.setFont(F,"bold");doc.setFontSize(8.5);
    if(T.table==="boxed"){doc.rect(L,y0,R-L,16);doc.line(ac,y0,ac,y0+16);doc.text(T.descHeader,(L+ac)/2,y0+11,{align:"center"});doc.text(T.amountHeader,(ac+R)/2,y0+11,{align:"center"})}
    else if(T.table==="lines"){doc.setDrawColor(...acc);doc.setLineWidth(1.6);doc.line(L,y0+16,R,y0+16);doc.setLineWidth(.7);doc.setDrawColor(0);doc.text(T.descHeader,L+6,y0+11);doc.text(T.amountHeader,R-6,y0+11,{align:"right"})}
    else{doc.setTextColor(...acc);doc.text(T.descHeader,L+6,y0+11);doc.text(T.amountHeader,R-6,y0+11,{align:"right"});doc.setTextColor(0)}
    doc.setFont(F,"normal");doc.setFontSize(9.5)};
  const sides=(y0,y1)=>{if(T.table==="boxed"){doc.setDrawColor(0);doc.line(L,y0,L,y1);doc.line(ac,y0,ac,y1);doc.line(R,y0,R,y1)}};
  head(top);let segTop=top+16,ry=top+16,firstPage=true;
  inv.items.forEach((it,k)=>{
    doc.setFontSize(9.5);const lines=doc.splitTextToSize(String(it.desc||"").replace(/\s+/g," "),ac-L-18);const h=lines.length*12+12;
    if(ry+h>LIM){sides(segTop,ry);if(T.table==="boxed")doc.line(L,ry,R,ry);doc.addPage();firstPage=false;ry=50;head(ry);ry+=16;segTop=ry}
    lines.forEach((l,n)=>doc.text(l,L+7,ry+15+n*12));doc.text(plain(num(it.qty||1)*num(it.rate)),R-7,ry+15,{align:"right"});ry+=h;
    if(k<inv.items.length-1){doc.setDrawColor(T.table==="minimal"?232:200);doc.line(L,ry,T.table==="boxed"?R:R,ry);doc.setDrawColor(0)}
  });
  const bodyBot=firstPage?Math.max(ry+10,Math.min(556,ry+120)):ry+10;
  sides(segTop,bodyBot);if(T.table==="boxed")doc.line(L,bodyBot,R,bodyBot);
  doc.setFontSize(9);
  let yy=bodyBot;if(yy+60>PH-30){doc.addPage();yy=60}const hasTax=t.tax||inv.taxType!=="None";
  if(hasTax){if(T.table==="boxed"){doc.line(ac,yy,ac,yy+17);doc.line(R,yy,R,yy+17);doc.line(L,yy+17,R,yy+17)}doc.text(taxLine(inv),ac-5,yy+12,{align:"right"});doc.text(plain(t.tax),R-5,yy+12,{align:"right"});yy+=17}
  doc.setFont(F,"bold");
  if(T.table==="boxed"){doc.rect(ac-60,yy,R-ac+60,17);doc.line(ac,yy,ac,yy+17)}else{doc.setDrawColor(...(T.table==="lines"?acc:[150,150,150]));doc.setLineWidth(T.table==="lines"?1.6:.7);doc.line(ac-60,yy,R,yy);doc.setLineWidth(.7);doc.setDrawColor(0)}
  doc.text(T.totalLabel,ac-8,yy+12,{align:"right"});doc.text(plain(t.total),R-5,yy+12,{align:"right"});
  doc.setFont(F,"normal");doc.setFontSize(9);let fy=yy+50;const fl0=fillTpl(T.footer).split("\n");if(fy+fl0.length*11+(inv.notes?60:0)+60>PH-20){doc.addPage();fy=60}
  if(inv.currency&&inv.currency!=="CAD")doc.text(`Amounts in ${inv.currency}`,L,fy-18);
  const rich=(line,x,y0)=>{let cx=x;line.split("**").forEach((part,i)=>{doc.setFont(F,i%2?"bold":"normal");doc.text(part,cx,y0);cx+=doc.getTextWidth(part)});doc.setFont(F,"normal")};
  const fl=fl0.flatMap(l=>l.includes("**")?[l]:doc.splitTextToSize(l,R-L));fl.forEach((l,i)=>rich(l,L,fy+i*11));let ny=fy+fl.length*11+8;
  if(inv.notes){doc.splitTextToSize(inv.notes,R-L).forEach((l,i)=>doc.text(l,L,ny+i*11));ny+=doc.splitTextToSize(inv.notes,R-L).length*11+8}
  if(T.thanks){doc.setFont(F,"bold");doc.text(fillTpl(T.thanks).replace(/\*\*/g,""),MID,Math.max(ny+24,fy+80),{align:"center"})}
  return doc;
}
const TEMPLATE_PROMPT=`The image shows an invoice design the user wants to use as the template for their own invoices. Describe its LOOK and WORDING (not its numbers) as JSON.
Replace that business's own details with placeholders: {name} = the person/business name, {tagline} = a brand or company name, {phone}, {email}, {address}, {gst} = tax/GST number. Wrap text that is bold in the footer in **double asterisks**.
Reply with only one JSON object with exactly these keys:
{"title": heading word(s) like "INVOICE" or "Tax Invoice",
 "font": "helvetica" (sans-serif) | "times" (serif) | "courier" (monospace),
 "layout": "classic" (name top-left, title top-right) | "centered" (name and title centered) | "banner" (solid colour band across the top),
 "table": "boxed" (full grid/borders) | "lines" (horizontal rules only) | "minimal" (no rules),
 "accent": "#rrggbb" main accent/line/band colour, "titleColor": "#rrggbb", "nameColor": "#rrggbb",
 "nameCase": "upper" | "as-is",
 "billToLabel": e.g. "Bill To:", "forHead": label of a project/for field or "" if none,
 "descHeader": description column heading, "amountHeader": amount column heading, "totalLabel": e.g. "TOTAL",
 "dateFormat": "dd/mm/yy" | "yyyy-mm-dd" | "mmm d, yyyy" | "mm/dd/yyyy",
 "footer": footer text with placeholders, lines separated by \\n,
 "thanks": closing/thank-you line with placeholders, or "",
 "showLogo": true if the design has a logo/image}`;

/* ———————————— custom logo ———————————— */
let DEFAULT_LOGO_HTML=(document.getElementById("logoBox")||{}).innerHTML||"";
function sanitizeSvg(src){
  const m=String(src||"").match(/<svg[\s\S]*<\/svg>/i);if(!m)return null;
  const doc=new DOMParser().parseFromString(m[0],"image/svg+xml");const svg=doc.documentElement;if(!svg||svg.nodeName.toLowerCase()!=="svg"||doc.querySelector("parsererror"))return null;
  svg.querySelectorAll("script,foreignObject,iframe,object,embed,audio,video,animate[attributeName^='on'],set").forEach(n=>n.remove());
  const pre="u"+Math.random().toString(36).slice(2,6)+"-";const ids={};
  svg.querySelectorAll("[id]").forEach(n=>{ids[n.id]=pre+n.id;n.id=pre+n.id});
  const all=[svg,...svg.querySelectorAll("*")];
  for(const n of all){for(const a of [...n.attributes]){const k=a.name.toLowerCase();let v=a.value;
    if(k.startsWith("on")){n.removeAttribute(a.name);continue}
    if((k==="href"||k==="xlink:href")){if(v.startsWith("#")&&ids[v.slice(1)])n.setAttribute(a.name,"#"+ids[v.slice(1)]);else if(!v.startsWith("#")&&!/^data:image\/(png|jpe?g|gif|webp);/i.test(v))n.removeAttribute(a.name);continue}
    if(/url\(/i.test(v)){v=v.replace(/url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/g,(x,id)=>ids[id]?`url(#${ids[id]})`:"none").replace(/url\(\s*['"]?(?!#)[^)]*\)/gi,"none");n.setAttribute(a.name,v)}}
    if(n.nodeName.toLowerCase()==="style")n.textContent=n.textContent.replace(/@import[^;]*;?/gi,"").replace(/url\(\s*['"]?(?!#)[^)]*\)/gi,"none").replace(/#([A-Za-z][\w-]*)/g,(x,id)=>ids[id]?"#"+ids[id]:x);
  }
  if(!svg.getAttribute("viewBox")){const w=parseFloat(svg.getAttribute("width"))||640,h=parseFloat(svg.getAttribute("height"))||190;svg.setAttribute("viewBox",`0 0 ${w} ${h}`)}
  svg.removeAttribute("width");svg.removeAttribute("height");svg.setAttribute("class","logo");svg.setAttribute("role","img");svg.setAttribute("aria-label",S.settings.businessName||"Logo");
  const out=new XMLSerializer().serializeToString(svg);return out.length<=90000?out:null;
}
function currentLogoHTML(){const s=S.settings;if(s.logoSvg)return s.logoSvg;if(s.logoImg)return `<img class="logo" src="${esc(s.logoImg)}" alt="${esc(s.businessName||"Logo")}">`;return themeWordmark()||DEFAULT_LOGO_HTML}
function applyLogo(){const box=document.getElementById("logoBox");if(!box)return;const h=currentLogoHTML();if(box.dataset.cur!==h){box.innerHTML=h;box.dataset.cur=h}}
function logoImgTag(){const s=S.settings;if(s.logoImg)return `<img class="lg" src="${esc(s.logoImg)}" alt="">`;const svg=s.logoSvg||DEFAULT_LOGO_HTML;return `<img class="lg" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgForImage(svg))}" alt="">`}
function svgForImage(svgHtml){const box=document.createElement("div");box.innerHTML=svgHtml;const el=box.querySelector("svg");if(!el)return svgHtml;el.setAttribute("xmlns","http://www.w3.org/2000/svg");el.setAttribute("width","640");el.setAttribute("height",String(Math.round(640*((el.viewBox&&el.viewBox.baseVal&&el.viewBox.baseVal.height)||190)/((el.viewBox&&el.viewBox.baseVal&&el.viewBox.baseVal.width)||640))));return new XMLSerializer().serializeToString(el)}
async function logoPng(){
  const s=S.settings;const src=s.logoImg||("data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svgForImage(s.logoSvg||DEFAULT_LOGO_HTML)));
  const img=await loadImg(src);const w=img.naturalWidth||640,h=img.naturalHeight||190,k=Math.min(2,1280/w);
  const c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  return{url:c.toDataURL("image/png"),w:c.width,h:c.height};
}
const LOGO_PROMPT=(desc,hasRef)=>`Design an ORIGINAL logo as a single SVG for the header of a personal finance app used by a touring musician.
Wordmark text: "${(S.settings.logoText||"Guitar Man Finance").replace(/"/g,"'")}" (unless the description below asks for different text).
What the user wants: ${desc||"something bold and cool that suits a rock musician"}
${hasRef?"The attached image is a style reference the user uploaded. Use it for mood, colours and lettering feel, but do not copy any real band, brand or company logo or trademark; make something new.":""}
Rules: reply with ONLY the <svg>…</svg> markup. viewBox about "0 0 640 190", wide and short so it fits a phone header. It sits on a very dark navy background (#0d0e12), so make it read well there. Use paths, shapes, gradients and filters freely. For lettering, either draw it as paths or use <text> with font-family stacks that exist everywhere (Impact, "Arial Black", Arial, Georgia, "Times New Roman", "Courier New"). No <script>, no <foreignObject>, no external URLs or images, no CSS @import. Keep it under 40 KB.`;
function sampleInv(){return{number:nextNumber(),date:today(),client:"Sample Client",clientAddress:"123 Main Street\nVancouver, BC",forLabel:"Session guitar work",items:[{desc:"Show days x 2 @ 400",qty:1,rate:800,type:"pay",taxable:true},{desc:"Per diem $40/day x 2",qty:1,rate:80,type:"perdiem",taxable:false}],currency:"CAD",taxType:"GST",taxRate:5,status:"draft",notes:""}}
function vCustomize(){
  const s=S.settings,T=tplOf(),d=S.tplDraft,L=S.logoDraft||{};
  const sample=sampleInv();
  const sel=(k,opts)=>`<select data-bind="tplDraft.${k}" data-tplrr="1">${opts.map(([v,l])=>`<option value="${v}" ${d[k]===v?"selected":""}>${l}</option>`).join("")}</select>`;
  return `<details class="panel" style="max-width:720px" ${S.custOpen?"open":""} data-cust="1"><summary class="label" style="cursor:pointer">Customize look: invoice template &amp; logo</summary>
<div style="margin-top:14px"><span class="plaque" style="cursor:default">Invoice template</span>
<p class="note" style="margin:8px 0 10px">Adjust how your invoices look: layout, colours, font, wording and footer.</p>
<div class="row">${d?"":`<button class="btn sm ghost" data-act="tplEdit">Adjust current template</button>`}${s.tpl?`<button class="btn sm ${S.armed==="tplReset"?"armed":"ghost"}" data-act="tplReset">${S.armed==="tplReset"?"Tap again to go back to the original":"Back to the standard template"}</button>`:""}</div>
${S.tplMsg?msgLine(S.tplMsg):""}
${d?`<div class="grid3" style="margin-top:12px">
<div class="field"><label class="label">Heading</label><input data-bind="tplDraft.title" data-tplrr="1" value="${esc(d.title)}"></div>
<div class="field"><label class="label">Font</label>${sel("font",[["helvetica","Sans-serif"],["times","Serif"],["courier","Typewriter"]])}</div>
<div class="field"><label class="label">Layout</label>${sel("layout",[["classic","Name left, title right"],["centered","Centered"],["banner","Colour band on top"]])}</div>
<div class="field"><label class="label">Table</label>${sel("table",[["boxed","Boxed"],["lines","Lines"],["minimal","Minimal"]])}</div>
<div class="field"><label class="label">Accent colour</label><input type="color" data-bind="tplDraft.accent" data-tplrr="1" value="${esc(d.accent)}" style="height:40px;padding:2px"></div>
<div class="field"><label class="label">Heading colour</label><input type="color" data-bind="tplDraft.titleColor" data-tplrr="1" value="${esc(d.titleColor)}" style="height:40px;padding:2px"></div>
<div class="field"><label class="label">Date style</label>${sel("dateFormat",[["dd/mm/yy","24/10/26"],["mmm d, yyyy","Oct 24, 2026"],["yyyy-mm-dd","2026-10-24"],["mm/dd/yyyy","10/24/2026"]])}</div>
<div class="field"><label class="label">Name style</label>${sel("nameCase",[["upper","CAPITALS"],["as-is","As typed"]])}</div>
<div class="field" style="justify-content:flex-end"><label class="chk" style="padding:10px 0"><input type="checkbox" data-tplcheck="showLogo" ${d.showLogo?"checked":""}> Put my logo on invoices</label></div>
<div class="field" style="grid-column:1/-1"><label class="label">Footer ({name}, {tagline}, {phone}, {email}, {gst} fill in automatically; **bold**)</label><textarea data-bind="tplDraft.footer" data-tplrr="1">${esc(d.footer)}</textarea></div>
<div class="field" style="grid-column:1/-1"><label class="label">Closing line</label><input data-bind="tplDraft.thanks" data-tplrr="1" value="${esc(d.thanks)}"></div></div>
<div class="label" style="margin:14px 0 8px">Preview</div><div style="overflow-x:auto">${sheetHTML(sample,normTpl(d))}</div>
<div class="row" style="margin-top:12px"><button class="btn gold" data-act="tplSave">Use this template</button><button class="btn" data-act="tplPdf">Preview as PDF</button><button class="btn ghost" data-act="tplCancel">Cancel</button></div>`:""}
</div>
<div style="margin-top:22px;border-top:1px solid var(--line);padding-top:16px"><span class="plaque" style="cursor:default">App logo</span>
<p class="note" style="margin:8px 0 10px">Use your own image as the app logo.</p>
<div class="field"><label class="label" for="lg-desc">What should it look like?</label><textarea id="lg-desc" data-bind="logoDraft.desc" placeholder="e.g. 70s hard-rock chrome letters with lightning, or a clean gold monogram NIM">${esc(L.desc||"")}</textarea></div>
<div class="field" style="margin-top:8px"><label class="label" for="lg-text">Logo text</label><input id="lg-text" data-bind="logoDraft.text" value="${esc(L.text??(s.logoText||"Guitar Man Finance"))}"></div>
<div class="row" style="margin-top:8px"><label tabindex="0" role="button" class="btn sm ghost" for="logoRefIn">${ICON.up}${L.refName?`Reference: ${esc(L.refName)}`:"Add an inspiration image"}</label>${L.refName?`<button class="btn sm ghost" data-act="logoRefClear">Remove image</button>`:""}</div>
<div class="row" style="margin-top:10px">${L.busy?`<button class="btn sm ghost" data-act="logoStop">Stop</button>`:""}<label tabindex="0" role="button" class="btn" for="logoImgIn">${ICON.up}Use my own image</label>${(s.logoSvg||s.logoImg)?`<button class="btn sm ${S.armed==="logoReset"?"armed":"ghost"}" data-act="logoReset">${S.armed==="logoReset"?"Tap again":"Back to the Guitar Man logo"}</button>`:""}</div>
${L.err?`<div class="err" style="margin-top:8px">${esc(L.err)}</div>`:""}
${L.svg||L.img?`<div class="panel" style="margin-top:12px;background:#0d0e12"><div class="label" style="margin-bottom:8px">New logo</div><div class="logoprev">${L.svg||`<img class="logo" src="${esc(L.img)}" alt="">`}</div>
<div class="row" style="margin-top:10px"><button class="btn gold" data-act="logoUse">Use this logo</button>${L.svg?`<button class="btn" data-act="logoMake">Try another</button>`:""}<button class="btn ghost" data-act="logoDiscard">Discard</button></div></div>`:""}
</div></details>`;
}
async function onTplFile(file){
  if(!file)return;S.custOpen=true;S.tplMsg="ok:Reading the template…";render(true);
  let p;try{p=await prepFile(file)}catch(e){S.tplMsg="err:"+e.message;render(true);return}
  if(!(S.sample&&S.canImages)){S.tplMsg="err:Reading images isn't available in this view. Use “Adjust current template” to set it up by hand.";render(true);return}
  try{const x=await S.sample.json(TEMPLATE_PROMPT,{images:[p.blob]});S.tplDraft=normTpl({...tplOf(),...x});S.tplMsg="ok:Here's your template. Adjust anything below, then tap Use this template."}
  catch(e){S.tplMsg="err:"+sampleErr(e&&e.code)}
  render(true);
}
async function onLogoImg(file,asRef){
  if(!file)return;S.custOpen=true;const L=S.logoDraft=S.logoDraft||{};
  try{
    let src=null;try{src=await createImageBitmap(file)}catch{}if(!src)src=await loadImg(URL.createObjectURL(file));
    const c=drawScaled(src,asRef?1200:900);
    if(asRef){L.ref=await new Promise(r=>c.toBlob(r,"image/jpeg",.85));L.refName=file.name||"image";}
    else{const tryP=c.toDataURL("image/png");const url=tryP.length<=220000?tryP:shrink(c,200000);if(!url)throw new Error("big");L.img=url;L.svg=null;L.err=""}
  }catch{L.err="Couldn't open that image. Try a PNG or JPG, or a screenshot of it."}
  render(true);
}
async function makeLogo(){
  const L=S.logoDraft=S.logoDraft||{};if(!S.sample){L.err="Claude isn't available in this view. Open the page in Claude.";render(true);return}
  if(L.ref&&!S.canImages){L.err="Sending images to Claude isn't available here. Remove the image and describe it instead.";render(true);return}
  if(L.text!==undefined)S.settings.logoText=L.text;
  L.busy=true;L.err="";L.ctl=new AbortController();render(true);
  try{
    const r=await S.sample(LOGO_PROMPT(L.desc,!!L.ref)+(L.svg?"\nMake it noticeably different from the last attempt.":""),{...(L.ref?{images:[L.ref]}:{}),signal:L.ctl.signal,cache:false});
    const svg=sanitizeSvg(r.text);if(!svg)throw{code:"bad_svg"};L.svg=svg;L.img=null;
  }catch(e){L.err=e&&e.code==="bad_svg"?"Claude's drawing didn't come through cleanly. Tap Make it with Claude again.":e&&e.code==="cancelled"?"":sampleErr(e&&e.code)}
  L.busy=false;render(true);
}


/* ———————————— themes ———————————— */
const THEMES=[["lizzy","Thin Lizzy","Chrome and brass on stage black. The original look.",["#0d0e12","#f2cf80","#9dbcff","#ece8df"],"tl"],["acdc","AC/DC","Black and red with amber highlights, bold condensed headings.",["#0b0a0a","#d8261c","#ffb547","#f6f1ea"],"ac"],["apple","Apple","Clean and calm: light surfaces, system type, soft blue. Follows your phone's dark mode.",["#f5f5f7","#0071e3","#ffffff","#1d1d1f"],"ap"]];
function themeNow(){const s=S.settings.theme;if(s&&THEMES.some(x=>x[0]===s))return s;try{const l=localStorage.getItem("gmf-theme");if(THEMES.some(x=>x[0]===l))return l}catch{}return "lizzy"}
function applyTheme(){const th=themeNow();if(document.documentElement.dataset.theme!==th)document.documentElement.dataset.theme=th;try{localStorage.setItem("gmf-theme",th)}catch{}}
const BOLT='<svg viewBox="0 0 42 58" aria-hidden="true"><defs><linearGradient id="wmb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".5" stop-color="#ffb547"/><stop offset="1" stop-color="#d8261c"/></linearGradient></defs><path d="M26 1 4 33h14L12 57 38 21H23L32 1z" fill="url(#wmb)" stroke="#2a0703" stroke-width="2" stroke-linejoin="round"/></svg>';
function themeWordmark(){const th=themeNow();const nm=esc(S.settings.logoText||"Guitar Man Finance");const parts=nm.split(/\s+/);const last=parts.length>1?parts.pop():"";
  if(th==="apple")return `<div class="wm-apple" role="img" aria-label="${nm}">${parts.join(" ")}${last?` <span>${last}</span>`:""}</div>`;
  if(th==="acdc")return `<div class="wm-acdc" role="img" aria-label="${nm}">${BOLT}<div><div class="t1">${parts.join(" ")}</div>${last?`<div class="t2">${last}</div>`:""}</div></div>`;
  return null}
applyTheme();


/* ———————————— AC/DC stage dressing ———————————— */
const GUITAR_SVG='<svg class="guitar" viewBox="0 0 220 80" aria-hidden="true"><defs><linearGradient id="gtb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b3261b"/><stop offset=".55" stop-color="#7d140e"/><stop offset="1" stop-color="#3d0805"/></linearGradient><linearGradient id="gtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3519"/><stop offset="1" stop-color="#2e1a0b"/></linearGradient></defs>'+
 '<path d="M10 40c0-14 8-24 22-24 6 0 10 3 16 2 7-1 10-11 22-12-5 6-7 11-4 16 4 6 14 6 20 6v24c-6 0-16 0-20 6-3 5-1 10 4 16-12-1-15-11-22-12-6-1-10 2-16 2C18 64 10 54 10 40z" fill="url(#gtb)" stroke="#1a0302" stroke-width="2"/>'+
 '<path d="M24 31l14 4M24 49l14-4" stroke="#f2e6c8" stroke-width="3" stroke-linecap="round" opacity=".85"/><rect x="44" y="33" width="12" height="14" rx="2" fill="#111" stroke="#c9a24d"/><rect x="62" y="33" width="10" height="14" rx="2" fill="#111" stroke="#c9a24d"/>'+
 '<rect x="88" y="36" width="104" height="8" rx="2" fill="url(#gtn)" stroke="#1a0d05"/><g stroke="#d9d0c0" stroke-width=".6" opacity=".8"><path d="M98 36v8M108 36v8M118 36v8M127 36v8M136 36v8M144 36v8M152 36v8M159 36v8M166 36v8M172 36v8M178 36v8M184 36v8"/></g>'+
 '<path d="M192 33l22-6c3 0 4 2 4 4v18c0 2-1 4-4 4l-22-6z" fill="#1a1110" stroke="#000"/><g fill="#d9d0c0"><circle cx="200" cy="31" r="1.6"/><circle cx="207" cy="29.5" r="1.6"/><circle cx="214" cy="28.5" r="1.6"/><circle cx="200" cy="49" r="1.6"/><circle cx="207" cy="50.5" r="1.6"/><circle cx="214" cy="51.5" r="1.6"/></g>'+
 '<g stroke="#f4efe6" stroke-width=".5" opacity=".9"><path d="M30 38.5H192M30 39.7H192M30 40.9H192M30 42.1H192"/></g></svg>';
function ampStrip(){const k=(n,r)=>`<span class="knob"><i style="--r:${r}deg"></i>${n}</span>`;return `<div class="ampstrip" aria-hidden="true"><span class="sw"></span>${k("Presence",110)}${k("Bass",150)}${k("Middle",90)}${k("Treble",160)}${k("Master",170)}${k("Volume",200)}<span class="jewel"></span></div>`}
const ACDC_TEXT={"Pay billed":"Money Talks · pay billed","Reimbursements billed":"Ride On · reimbursements","Waiting on payment":"For Those About to Pay","Business write-offs":"Dirty Deeds · write-offs","GST/HST owing":"High Voltage · GST/HST owing","GST/HST refund":"High Voltage · GST/HST refund","Set aside for tax":"Hells Bells · set aside for tax","Recent activity":"Thunderstruck · recent activity",
 "Sync Gmail":"Thunderstruck · sync Gmail","Print year-end report":"Rock or Bust · year-end PDF","Back up books to Dropbox":"Back in Black · Dropbox backup","New invoice":"Shoot to Bill · new invoice","Voice invoice":"Rock 'n' Roll Singer · voice invoice","Import past invoice":"Jailbreak · import invoice",
 "Create Gmail draft with PDF":"For Those About to Pay · Gmail draft","Create reminder draft with PDF":"Hells Bells · reminder draft","Mark paid":"Money Talks · mark paid","Save invoice":"Shoot to Bill · save it","Take photo":"Flick of the Switch · take photo","Review them":"Whole Lotta Receipts · review",
 "Log a trip":"Highway to the Gig · log a trip","Business km":"Highway to Hell · business km","Look":"Let There Be Rock · look","Your invoice details":"Who Made Who · your details","Receipts for this invoice":"Whole Lotta Receipts","Send it":"For Those About to Pay (We Salute You)","Nothing on the books yet":"Let There Be Rock… and some books",
 "GST/HST collected":"High Voltage · GST/HST collected","Input tax credits":"Back in Black · tax credits","By quarter":"Hard as a Rock · by quarter","Fill in the invoice":"Rock 'n' Roll Singer · fill it in","Voice invoice ":"Rock 'n' Roll Singer","Customize look: invoice template & logo":"Let There Be Rock · customize template & logo",
 "Dashboard":"Dashboard","Invoices":"Invoices"};
function acdcize(root){
  if(themeNow()!=="acdc"||!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.closest(".sheet,textarea,select,option,input,.suggbtn,.lineitem,.rowline,script,style"))return NodeFilter.FILTER_REJECT;return ACDC_TEXT[n.nodeValue.trim()]?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});
  const hits=[];while(w.nextNode())hits.push(w.currentNode);
  hits.forEach(n=>{const k=n.nodeValue.trim();n.nodeValue=n.nodeValue.replace(k,ACDC_TEXT[k])});
}
const ACDC_TOAST=[[/^Invoice saved/,"⚡ Invoice saved. For those about to pay, we salute you."],[/^Quote saved/,"⚡ Quote saved. It's a long way to the top."],[/^Marked paid/,"⚡ Money talks! Marked paid."],[/^Receipt filed/,"⚡ Whole lotta receipt: filed."],[/^Receipt updated/,"⚡ Receipt updated. Back in black."],[/^Trip added/,m=>"⚡ Highway to the gig: "+m.replace(/^Trip added:?\s*/,"")],[/^Gmail (checked|synced)/,m=>"⚡ Thunderstruck! "+m],[/^Settings saved/,"⚡ Settings saved. Let there be rock."]];
function themedToast(msg){if(themeNow()!=="acdc")return msg;for(const [re,out] of ACDC_TOAST)if(re.test(msg))return typeof out==="function"?out(msg):out;return msg}
function setlist(){return `<section class="panel setlist"><div class="label">Tonight's set list</div><div class="note" style="margin-top:8px;line-height:1.7">
1. Shoot to Bill (new invoice) · 2. Thunderstruck (sync Gmail) · 3. Whole Lotta Receipts · 4. Ride On (reimbursements) · 5. Highway to the Gig (mileage) · 6. High Voltage (GST/HST) · 7. Hells Bells (tax set-aside) · 8. Money Talks (getting paid) · Encore: For Those About to Pay (We Salute You)</div></section>`}

/* ———————————— rendering ———————————— */
function editingNow(){return (S.tab==="invoices"&&S.invEdit)||(S.tab==="receipts"&&S.recDraft&&S.recDraft.status!=="preparing"&&S.recDraft.status!=="reading")||(S.tab==="settings"&&(S.sfDirty||S.tplDraft||S.logoDraft||S.erase||(S.cloudUI&&(S.cloudUI.pass||S.cloudUI.pass2))))||(S.tab==="invoices"&&S.voice)||(S.tab==="other"&&S.incForm&&(S.incForm.amount||S.incForm.note))||(S.tab==="mileage"&&S.tripDirty)}
function renderChrome(){
  applyTheme();applyLogo();const deco=$("#themeDeco");if(deco){const want=themeNow()==="acdc"?"acdc":"";if(deco.dataset.t!==want){deco.dataset.t=want;deco.innerHTML=want?GUITAR_SVG+ampStrip():""}}
  const sync=$("#sync");
  sync.innerHTML=!S.booted?'<span class="dot"></span>Connecting…':S.persist?(S.fileWarn?'<span class="dot warn"></span>Not saving: a phone throws away anything typed into a file opened from Files, Dropbox or email. Open the app from its web link instead.':'<span class="dot ok"></span>'+esc(localStatus())):`<span class="dot warn"></span>${esc(S.syncErr||"Not saving. Open this page in Claude while signed in to keep your books.")}`;
  $("#bizline").textContent=[S.settings.tagline,S.settings.gstNumber?("GST/HST "+S.settings.gstNumber):""].filter(Boolean).join(" · ");
  const tabs=[["dashboard","Dashboard"],["invoices","Invoices"],["receipts","Receipts"],["mileage","Mileage"],["gst","GST / HST"],...((S.settings.streams||[]).length?[["other","Other income"]]:[]),["reports","Reports"],["settings","Settings"]];
  $("#tabs").innerHTML=tabs.map(([k,l])=>`<button class="plaque ${S.tab===k?"":"off"}" data-act="tab" data-v="${k}" aria-current="${S.tab===k}">${l}</button>`).join("");
}
function render(force){renderChrome();if(!force&&editingNow())return;$("#view").innerHTML=({dashboard:vDash,invoices:vInvoices,receipts:vReceipts,mileage:vMileage,gst:vGst,other:vOther,reports:vReports,settings:vSettings}[S.tab]||vDash)()+(S.tab==="dashboard"&&themeNow()==="acdc"?setlist():"");acdcize($("#view"))}
function msgLine(m){if(!m)return"";const [k,...r]=m.split(":");return `<div class="${k==="ok"?"ok":"err"}">${esc(r.join(":"))}</div>`}
function years(){const ys=new Set([new Date().getFullYear()]);S.invoices.forEach(i=>ys.add(yearOf(i.date)));S.receipts.forEach(r=>ys.add(yearOf(r.date)));return[...ys].sort((a,b)=>b-a)}
function yearPicker(){return `<div class="row" role="group" aria-label="Year">${years().map(y=>`<button class="btn sm ${y===S.year?"gold":"ghost"}" data-act="year" data-v="${y}">${y}</button>`).join("")}</div>`}
function captureButtons(){return `<label tabindex="0" role="button" class="btn gold" for="camIn">${ICON.cam}Take photo</label><label tabindex="0" role="button" class="btn" for="libIn">${ICON.up}Upload photo or PDF</label>`}

function syncButton(){if(!gmailOn())return "";const sy=S.sync,busy=sy&&(sy.phase==="search"||sy.phase==="read");return `<button class="btn gold" data-act="sync" ${busy?"disabled":""}>${busy?'<span class="spin"></span> Syncing Gmail…':ICON.mail+"Sync Gmail"}</button>`}
function gmailCard(){if(!gmailOn())return "";const sy=S.sync,busy=sy&&(sy.phase==="search"||sy.phase==="read");const last=S.settings.gmailSyncedThrough;
  return `<section class="panel gmcard"><div class="gmrow"><div style="min-width:0"><div class="label">Gmail receipts</div><div class="gmhead">${busy?"Syncing your Gmail…":last?`Last synced ${esc(fmtDate(String(last).replace(/\//g,"-"),"mmm d, yyyy"))}`:"Not synced yet"}</div><p class="note" style="margin:4px 0 0">Pulls in new receipts and bookings from your email.</p></div><button class="btn gold gmbtn" data-act="sync" ${busy?"disabled":""}>${busy?'<span class="spin"></span> Syncing…':ICON.mail+"Sync Gmail"}</button></div>${sy?`<div style="margin-top:10px">${syncPanel()}</div>`:""}</section>`}
function syncPanel(){
  if(!gmailOn())return "";const sy=S.sync;if(!sy)return S.settings.gmailSyncedThrough?`<p class="note">Gmail last synced ${esc(S.settings.gmailSyncedThrough)}. Tap Sync Gmail to pull in newer receipts.</p>`:"";
  return `<div class="panel ${sy.phase==="error"?"":"hot"}">${sy.phase==="search"?'<span class="spin"></span> Searching Gmail since '+esc(S.settings.gmailSyncedThrough||"January 1")+"…":sy.phase==="read"?`<span class="spin"></span> Reading ${sy.done} of ${sy.found} emails · ${sy.added} receipts added<div class="progress"><i style="width:${sy.found?Math.round(sy.done/sy.found*100):0}%"></i></div>`:sy.phase==="done"?`<div class="ok">Gmail synced: ${sy.added} new receipt${sy.added===1?"":"s"} added${sy.found?` from ${sy.found} emails`:""}.${sy.added?" They're marked Check for a quick review.":""}</div>`:`<div class="err">${esc(sy.err)}</div>`}
<div class="row" style="margin-top:8px">${sy.phase==="search"||sy.phase==="read"?'<button class="btn sm ghost" data-act="stopSync">Stop</button>':'<button class="btn sm ghost" data-act="clearSync">Dismiss</button>'}</div></div>`;
}
function card(key,label,value,cls,note){return `<button class="panel card ${S.drill===key?"on":""}" data-act="drill" data-v="${key}" aria-expanded="${S.drill===key}"><div class="label">${label}</div><div class="big ${cls||""}">${value}</div><div class="note">${note}</div><div class="more">${S.drill===key?"Hide details ▴":"See what's in it ▾"}</div></button>`}
function invRow(i,amt,extra){return `<button class="rowline rowbtn" data-act="openInv" data-v="${i.id}"><span class="mono dim" style="min-width:86px;font-size:12.5px">${esc(i.date)}</span><span style="flex:1;min-width:0">#${esc(i.number)} ${esc(i.client)}${extra?`<span class="dim"> · ${extra}</span>`:""}</span><span class="mono">${amt}</span></button>`}
function recRow(r,amt){return `<button class="rowline rowbtn" data-act="editRec" data-v="${r.id}"><span class="mono dim" style="min-width:86px;font-size:12.5px">${esc(r.date)}</span><span style="flex:1;min-width:0">${esc(r.vendor)}${r.note?`<span class="dim"> · ${esc(r.note)}</span>`:""}</span><span class="mono">${amt}</span></button>`}
function drillView(st){
  const k=S.drill;if(!k)return "";const byDate=(a,b)=>(b.date||"").localeCompare(a.date||"");
  let title="",body="";
  if(k==="pay"){title="Pay billed, by invoice";body=[...st.live].filter(isCAD).sort(byDate).map(i=>invRow(i,money(invTotals(i).pay),i.status==="paid"?"paid":"waiting")).join("")}
  else if(k==="reimb"){title="Per diems and expense reimbursements";body=[...st.live].filter(isCAD).sort(byDate).flatMap(i=>i.items.filter(it=>lineType(it)!=="pay").map(it=>invRow(i,money(num(it.qty||1)*num(it.rate)),`${lineType(it)==="perdiem"?"Per diem":"Reimb."}: ${esc(it.desc)}`))).join("")}
  else if(k==="out"){title="Waiting on payment";body=st.inv.filter(i=>i.status==="sent").sort(byDate).map(i=>invRow(i,money(invTotals(i).total,i.currency),`${daysOut(i)} days${isOverdue(i)?" · overdue":""}`)).join("")}
  else if(k==="exp"){title="Business write-offs by category (deductible amount)";const f=st.f;
    body=st.cats.map(([c,v])=>`<details class="drillcat"><summary><span>${esc((T2125[c]||["9270"])[0])} · ${esc(c)}</span><span class="mono">${money(v)}</span></summary>${st.rec.filter(r=>r.category===c&&isCAD(r)).sort(byDate).map(r=>recRow(r,money(deductible(r,f)))).join("")}</details>`).join("")+(st.homeRent?`<div class="rowline"><span>Home studio share of rent &amp; utilities</span><span class="mono">${money(st.homeRent)}</span></div>`:"")+(st.crBilled.length?`<details class="drillcat"><summary><span>Billed back to clients (not counted above)</span><span class="mono">${money(st.billedBack)}</span></summary>${st.crBilled.sort(byDate).map(r=>recRow(r,money(deductible(r,f))+` · ${esc(r.billedLabel||"")}`)).join("")}</details>`:"")}
  else if(k==="gst"){title="GST/HST collected and claimed";const f=st.f;
    body=`<details class="drillcat" open><summary><span>Collected on invoices</span><span class="mono">${money(st.collected)}</span></summary>${[...st.live].filter(i=>isCAD(i)&&invTotals(i).tax).sort(byDate).map(i=>invRow(i,money(invTotals(i).tax))).join("")}</details>
<details class="drillcat"><summary><span>Credits on receipts</span><span class="mono">${money(st.claimed)}</span></summary>${st.rec.filter(r=>claimable(r,f)>0).sort(byDate).map(r=>recRow(r,money(claimable(r,f))+(r.taxEstimated?" est.":""))).join("")}</details>`}
  else if(k==="tax"){title="Set aside for income tax and CPP";const t=st.tax;
    body=`<div class="rowline"><span>Net business income so far</span><span class="mono">${money(st.netInc)}</span></div><div class="rowline"><span>CPP (self-employed, both halves)</span><span class="mono">${money(t.cpp)}</span></div><div class="rowline"><span>Federal income tax</span><span class="mono">${money(t.fed)}</span></div><div class="rowline"><span>BC income tax</span><span class="mono">${money(t.bc)}</span></div><div class="rowline"><span><b>Total</b></span><span class="mono"><b>${money(t.total)}</b></span></div><div class="row" style="margin-top:8px"><button class="btn sm" data-act="tab" data-v="reports">Open full report</button></div>`}
  return `<section class="panel hot"><div class="row" style="justify-content:space-between"><div class="label">${title}</div><button class="btn sm ghost" data-act="drill" data-v="${k}">Close</button></div><div style="margin-top:8px">${body||'<div class="note">Nothing here for '+S.year+" yet.</div>"}</div></section>`;
}
function welcomePanel(){if(S.settings.businessName)return "";return `<section class="panel hot"><span class="plaque" style="cursor:default">Welcome</span>
<p style="margin:10px 0 6px">Let's set up your books. It takes a minute:</p>
<ol class="note" style="margin:0 0 12px 18px;padding:0;line-height:1.7"><li>Add your name, address, email and GST/HST number.</li><li>Optional: adjust how your invoices look (Settings › Customize look).</li><li>Pick a theme you like: Thin Lizzy, AC/DC or Apple.</li><li>Everything stays on this device. To keep a safe copy, connect your own Google Drive or Dropbox in Settings › Privacy, or download a backup file now and then.</li></ol>
<div class="row"><button class="btn gold" data-act="tab" data-v="settings">Set up my details</button></div></section>`}
function vDash(){
  const st=yearStats(S.year);if(!S.settings.businessName&&!S.invoices.length&&!S.receipts.length)return homeBackupCard()+welcomePanel()+vDash0(st);return homeBackupCard()+welcomePanel()+vDash0(st)}
function vDash0(st){
  if(!S.invoices.length&&!S.receipts.length&&S.booted){
    return `<section class="panel empty"><div class="label">Your books for ${S.year}</div><h2>Nothing on the books yet</h2>
<p class="note" style="max-width:60ch">Snap a receipt or pull them in from Gmail. Create invoices on your own template and send them through Gmail.</p>
<div class="row">${captureButtons()}${syncButton()}<button class="btn" data-act="newInvoice">${ICON.pen}New invoice</button></div></section>${gmailCard()}`;
  }
  const goal=num(S.settings.incomeGoal),pct=goal?Math.min(100,Math.round(st.payB/goal*100)):0;
  const over=st.inv.filter(isOverdue);
  const recent=[...st.inv.filter(i=>i.status!=="quote").map(i=>({d:i.date,t:`Invoice ${i.number} · ${i.client||"no client"}`,v:invTotals(i).total,c:i.currency||"CAD",pos:true,act:"openInv",id:i.id})),...st.rec.map(r=>({d:r.date,t:`${r.vendor} · ${r.category}`,v:num(r.total),c:r.currency||"CAD",pos:false,act:"editRec",id:r.id}))].sort((a,b)=>(b.d||"").localeCompare(a.d||"")).slice(0,8);
  return `${gmailCard()}<div class="row">${yearPicker()}</div>
<div class="row">
  <button class="btn sm" data-act="pdf" ${S.busy.pdf?"disabled":""}>${S.busy.pdf?'<span class="spin"></span> Building PDF…':"Print year-end report"}</button>
  ${dropboxOn()?`<button class="btn sm" data-act="ledger" ${S.busy.ledger?"disabled":""}>${S.busy.ledger?'<span class="spin"></span> Backing up…':"Back up books to Dropbox"}</button>`:""}
</div>${msgLine(S.msg.pdf)}${msgLine(S.msg.ledger)}
${goal?`<div class="panel"><div class="row" style="justify-content:space-between"><span class="label">${S.year} income goal</span><span class="mono">${money(st.payB)} of ${money(goal)} · ${pct}%</span></div><div class="progress"><i style="width:${pct}%"></i></div></div>`:""}
<div class="grid4">${[`${card("pay","Pay billed",money(st.payB),"",`${money(st.payPaid)} received so far`)}`,`${card("reimb","Reimbursements billed",money(st.reB+st.pdB),"",`${money(st.reB)} expenses + ${money(st.pdB)} per diems`)}`,`${card("out","Waiting on payment",money(st.outstanding),"goldc",`${st.inv.filter(i=>i.status==="sent").length} invoices${over.length?` · ${over.length} over 30 days`:""}`)}`,`${card("exp","Business write-offs",money(st.ownExp),"",`Your own costs, before GST${st.billedBack?` · plus ${money(st.billedBack)} billed back to clients`:""}`)}`,`${card("gst",st.net>=0?"GST/HST owing":"GST/HST refund",money(Math.abs(st.net)),st.net>=0?"red":"green",`${money(st.collected)} collected − ${money(st.claimed)} credits`)}`,`${card("tax","Set aside for tax",money(st.tax.due),"goldc",`Income tax + CPP on ${money(st.netInc)} net · about ${st.gross?Math.round(st.tax.total/st.gross*100):0}% of income`)}`].map((c,ix)=>c+(S.drill===["pay","reimb","out","exp","gst","tax"][ix]?`<div style="grid-column:1/-1">${drillView(st)}</div>`:"")).join("")}</div>
${st.review?`<div class="panel hot row" style="justify-content:space-between"><span><b>${st.review}</b> receipts pulled from Gmail are waiting for a quick category check.</span><button class="btn sm gold" data-act="reviewFilter">Review them</button></div>`:""}
<div class="panel"><div class="label" style="margin-bottom:8px">Recent activity</div>
${recent.length?recent.map(r=>`<button class="rowline rowbtn" data-act="${r.act}" data-v="${r.id}"><span class="mono dim" style="min-width:86px;font-size:12.5px">${esc(r.d)}</span><span style="flex:1;min-width:0">${esc(r.t)}</span><span class="mono ${r.pos?"green":""}">${r.pos?"":"−"}${money(r.v,r.c)}</span></button>`).join(""):`<div class="note">Nothing dated ${S.year} yet.</div>`}
</div>`;
}

/* mileage */
function blankTrip(x){return{date:today(),from:"",to:"",km:"",round:true,purpose:"",...x}}
function vMileage(){
  const st=yearStats(S.year),f=st.f,o=(S.settings.odo||{})[S.year]||{};
  if(!S.tripForm)S.tripForm=blankTrip();const t=S.tripForm;
  const routes=[];const seen=new Set();[...S.trips].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).forEach(x=>{const k=`${x.from}|${x.to}|${x.oneWay}`;if(!seen.has(k)&&routes.length<8){seen.add(k);routes.push(x)}});
  const list=f.trips.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  return `<div class="row">${yearPicker()}</div>
<div class="grid3">
<div class="panel"><div class="label">Business km</div><div class="big">${Math.round(f.bizKm).toLocaleString()}</div><div class="note">${f.trips.length} trips logged in ${S.year}</div></div>
<div class="panel"><div class="label">Vehicle business use</div><div class="big goldc">${Math.round(f.veh*100)}%</div><div class="note">${esc(f.vehSrc)}</div></div>
<div class="panel"><div class="label">Vehicle write-off</div><div class="big">${money((st.cats.find(c=>c[0]==="Vehicle & fuel")||[0,0])[1])}</div><div class="note">Vehicle &amp; fuel receipts × business use</div></div></div>
<section class="panel hot"><span class="plaque" style="cursor:default">Log a trip</span>
${routes.length?`<div class="row" style="margin-top:12px">${routes.map((r,i)=>`<button class="btn sm ghost" data-act="route" data-v="${i}">${esc(r.from)} → ${esc(r.to)} · ${plain(r.oneWay)} km</button>`).join("")}</div>`:""}
<div class="grid3" style="margin-top:12px">
<div class="field"><label class="label" for="tf-date">Date</label><input id="tf-date" type="date" data-bind="tripForm.date" value="${esc(t.date)}"></div>
<div class="field"><label class="label" for="tf-from">From</label><input id="tf-from" data-bind="tripForm.from" value="${esc(t.from)}"></div>
<div class="field"><label class="label" for="tf-to">To</label><input id="tf-to" data-bind="tripForm.to" value="${esc(t.to)}" placeholder="Venue, studio, airport…"></div>
<div class="field"><label class="label" for="tf-km">km one way</label><input id="tf-km" class="mono" inputmode="decimal" data-bind="tripForm.km" value="${esc(t.km)}"></div>
<div class="field"><label class="label" for="tf-purpose">Purpose</label><input id="tf-purpose" data-bind="tripForm.purpose" value="${esc(t.purpose)}" placeholder="Gig, session, rehearsal, gear pickup…"></div>
<div class="field" style="justify-content:flex-end"><label class="chk" style="padding:10px 0"><input type="checkbox" id="tf-round" data-trip-round="1" ${t.round?"checked":""}> Return trip (counts both ways)</label></div></div>
<div class="row" style="margin-top:10px"><button class="btn gold" data-act="saveTrip">Add trip</button></div>
${S.tripErr?`<div class="err">${esc(S.tripErr)}</div>`:""}</section>
<section class="panel"><div class="label">Total km driven in ${S.year} (for the business-use %)</div>
<p class="note" style="margin:6px 0 10px">CRA wants your odometer at the start and end of the year. Business km ÷ total km sets how much of your vehicle costs you can write off.</p>
<div class="grid3"><div class="field"><label class="label" for="odo-s">Odometer Jan 1</label><input id="odo-s" class="mono" inputmode="numeric" data-odo="start" value="${esc(o.start??"")}"></div>
<div class="field"><label class="label" for="odo-e">Odometer Dec 31 (or today)</label><input id="odo-e" class="mono" inputmode="numeric" data-odo="end" value="${esc(o.end??"")}"></div>
<div class="field"><label class="label" for="veh-man">Or business use % directly</label><input id="veh-man" class="mono" inputmode="decimal" data-vehpct="1" value="${esc(S.settings.vehPctManual??"")}" placeholder="e.g. 60"></div></div></section>
${list.length?`<div class="list">${list.map(x=>{const arm=S.armed==="trip:"+x.id;return `<div class="panel item"><span class="mono dim" style="font-size:12.5px;min-width:86px">${esc(x.date)}</span><span class="grow">${esc(x.from)} → ${esc(x.to)}${x.round?' <span class="dim">(return)</span>':""}${x.purpose?`<br><span class="dim" style="font-size:12.5px">${esc(x.purpose)}</span>`:""}</span><span class="mono">${plain(x.km)} km</span><button class="btn sm ${arm?"armed":"danger"}" data-act="delTrip" data-v="${x.id}" aria-label="Delete trip">${arm?"Tap again":"×"}</button></div>`}).join("")}</div>`:`<div class="panel empty"><h2>No trips yet</h2><p class="note">Log drives to gigs, sessions, rehearsals and the airport. Saved routes appear as one-tap buttons.</p></div>`}`;
}

/* reports */
function vReports(){
  const st=yearStats(S.year),t=st.tax,f=st.f;
  const y=S.year,instal=t.total>3000;
  return `<div class="row">${yearPicker()}<button class="btn sm" data-act="pdf" ${S.busy.pdf?"disabled":""}>${S.busy.pdf?'<span class="spin"></span> Building PDF…':"Print year-end report"}</button></div>${msgLine(S.msg.pdf)}
<section class="panel"><div class="label" style="margin-bottom:8px">Profit &amp; loss · ${y} so far (CAD)</div>
<div class="rowline"><span>Pay billed</span><span class="mono">${money(st.payB)}</span></div>
<div class="rowline"><span>Per diems billed</span><span class="mono">${money(st.pdB)}</span></div>
<div class="rowline"><span>Expense reimbursements billed</span><span class="mono">${money(st.reB)}</span></div>
<div class="rowline"><span><b>Gross business income</b> <span class="dim">(T2125 line 8299)</span></span><span class="mono"><b>${money(st.gross)}</b></span></div>
${st.cats.map(([c,v])=>`<div class="rowline"><span><span class="mono dim">${esc((T2125[c]||["9270"])[0])}</span> ${esc((T2125[c]||["",c])[1])}${c==="Vehicle & fuel"?` <span class="dim">× ${Math.round(f.veh*100)}%</span>`:""}${c==="Home studio (workspace-in-home)"?` <span class="dim">× ${Math.round(f.home*100)}%</span>`:""}</span><span class="mono">−${money(v)}</span></div>`).join("")}
${st.homeRent?`<div class="rowline"><span><span class="mono dim">9945</span> Home studio share of rent &amp; utilities <span class="dim">× ${Math.round(f.home*100)}%</span></span><span class="mono">−${money(st.homeRent)}</span></div>`:""}
${st.billedBack?`<div class="rowline"><span>Expenses billed back to clients <span class="dim">(offsets the reimbursements above)</span></span><span class="mono">−${money(st.billedBack)}</span></div>`:""}
<div class="rowline"><span><b>Net business income</b> <span class="dim">(line 9946)</span></span><span class="mono"><b>${money(st.netInc)}</b></span></div>
<p class="note" style="margin-top:10px">Line numbers are the CRA T2125 expense lines your accountant uses. Meals count at 50%. Instruments are shown at full cost here; bigger purchases are normally depreciated over several years (Class 8), so confirm those with your accountant. Foreign-currency receipts and invoices aren't converted and are left out.</p></section>
<section class="panel"><div class="label" style="margin-bottom:8px">Set aside for tax · rough ${y} estimate</div>
<div class="rowline"><span>CPP, self-employed (both halves)</span><span class="mono">${money(t.cpp)}</span></div>
<div class="rowline"><span>Federal income tax</span><span class="mono">${money(t.fed)}</span></div>
<div class="rowline"><span>BC income tax</span><span class="mono">${money(t.bc)}</span></div>
${st.streams.length?`<div class="rowline"><span>Includes other income of ${money(st.seOther+st.otherInc)}</span><span class="mono"></span></div><div class="rowline"><span>Tax already taken off your pay</span><span class="mono">−${money(t.withheld)}</span></div>`:""}
<div class="rowline"><span><b>${st.streams.length?"Still to set aside":"Total to set aside"}</b></span><span class="mono goldc"><b>${money(t.due)}</b></span></div>
<p class="note" style="margin-top:10px">That's about <b>${st.gross?Math.round(t.total/st.gross*100):0}%</b> of what you bill. It uses 2026 federal and BC rates on your net business income only, with basic personal credits. Other income, RRSP contributions and other credits will change it. ${instal?`Because it's over $3,000, CRA may ask for quarterly instalments (March 15, June 15, September 15, December 15). Their reminder letter tells you the amounts to pay.`:""}</p>
<p class="note">GST/HST ${st.net>=0?"owing":"refund"} for ${y}: <b>${money(Math.abs(st.net))}</b>. As an annual filer, the return is due June 15 and any payment is due April 30.</p></section>
<section class="panel"><div class="label" style="margin-bottom:8px">Income by client · ${y}</div>
${st.byClient.length?st.byClient.map(([c,v])=>`<div class="rowline"><span>${esc(c)} <span class="dim">· ${v.n} invoice${v.n===1?"":"s"}</span></span><span class="mono">${money(v.pay)}${v.other?` <span class="dim">+ ${money(v.other)}</span>`:""}</span></div>`).join(""):`<div class="note">No invoices for ${y}.</div>`}
<p class="note" style="margin-top:8px">Pay first; the dim amount is per diems and reimbursements.</p></section>`;
}

/* invoices */
function taxSelect(scope,obj,disabled){
  const cur=TAX.find(p=>p.t===obj.taxType&&p.r===num(obj.taxRate));const key=cur?cur.k:"CUSTOM";
  return `<div class="row" style="flex-wrap:nowrap"><select id="${scope}-tax" data-tax="${scope}" ${disabled?"disabled":""}>${TAX.map(p=>`<option value="${p.k}" ${p.k===key?"selected":""}>${p.l}</option>`).join("")}<option value="CUSTOM" ${key==="CUSTOM"?"selected":""}>Custom rate…</option></select>
${key==="CUSTOM"&&!disabled?`<input id="${scope}-rate" style="width:84px" inputmode="decimal" data-bind="${scope}.taxRate" value="${esc(obj.taxRate)}" aria-label="Tax rate percent">`:""}</div>`;
}
function vInvoices(){
  if(S.invEdit)return vInvEdit();
  if(S.invViewId){const inv=S.invoices.find(i=>i.id===S.invViewId);if(inv)return vInvView(inv);S.invViewId=null}
  const imp=S.invImport;
  const list=[...S.invoices].filter(i=>yearOf(i.date)===S.year).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const out=list.filter(i=>i.status==="sent");
  return `${S.voice?voicePanel():""}<div class="row"><button class="btn gold" data-act="newInvoice">${ICON.pen}New invoice</button>
</div>
${imp?`<div class="panel ${imp.status==="error"?"":"hot"}">${imp.status==="error"?`<div class="err">${esc(imp.err)}</div><div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="clearImport">Dismiss</button></div>`:`<span class="spin"></span> ${imp.status==="reading"?"Reading the invoice. This can take up to a minute.":"Opening the file…"}`}</div>`:""}
<div class="row">${yearPicker()}<span class="note">${list.length} invoices · ${out.length} waiting on payment</span></div>

${list.length?(()=>{const st=yearStats(S.year);return `<div class="panel splitline"><span>Pay <b>${money(st.payB)}</b></span><span>Per diems <b>${money(st.pdB)}</b></span><span>Expense reimbursements <b>${money(st.reB)}</b></span><span>GST/HST <b>${money(st.collected)}</b></span></div>`})():""}
${list.length?`<div class="list">${list.map(inv=>{const t=invTotals(inv);const col=inv.status==="paid"?"green":inv.status==="sent"?"goldc":inv.status==="quote"?"ice":"dim";return `<div class="panel item">
<span class="mono dim" style="font-size:12.5px;min-width:86px">${esc(inv.date)}</span><span class="mono" style="font-size:13px">#${esc(inv.number)}</span>
<span class="grow">${esc(inv.client)||'<i class="dim">no client</i>'}<br><span class="dim" style="font-size:12.5px">${esc((inv.items[0]||{}).desc||"").slice(0,70)}</span>${t.perdiem||t.reimb?`<br><span class="dim" style="font-size:12.5px">Pay ${money(t.pay,inv.currency)} · Reimb. ${money(t.reimb+t.perdiem,inv.currency)}</span>`:""}</span>${!isCAD(inv)?`<span class="chip goldc">${esc(inv.currency)}</span>`:""}
<span class="chip ${col}">${esc(inv.status)}</span>${isOverdue(inv)?`<span class="chip red">${daysOut(inv)} days</span>`:""}<span class="mono" style="font-weight:600">${money(t.total,inv.currency)}</span>
<button class="btn sm ghost" data-act="openInv" data-v="${inv.id}">Open</button></div>`}).join("")}</div>`
:`<div class="panel empty"><h2>No invoices for ${S.year}</h2><p class="note">Create one on your template, or import a past invoice from a photo or PDF.</p></div>`}`;
}
function pickerCands(v){
  const d0=Date.parse((v.date||today())+"T12:00:00");const used=new Set(v.items.map(it=>it.rid).filter(Boolean));
  return S.receipts.filter(r=>!isPersonal(r)&&!used.has(r.id)&&(!r.billedTo||r.billedTo===v.id)&&Math.abs(Date.parse(r.date+"T12:00:00")-d0)<=60*864e5)
    .sort((a,b)=>Math.abs(Date.parse(a.date)-d0)-Math.abs(Date.parse(b.date)-d0)).slice(0,40);
}
function pickerView(v){
  const c=pickerCands(v);
  return `<div class="panel" style="margin-top:10px;background:var(--bg)"><div class="label">Bill receipts back to ${esc(v.client||"this client")}</div>
<p class="note" style="margin:4px 0 8px">Receipts within 60 days of the invoice date. Ticked ones become reimbursement lines, and the receipt is marked as billed.</p>
${c.length?c.map(r=>`<label class="rowline" style="cursor:pointer"><span style="display:flex;gap:8px;align-items:center;flex:1;min-width:0"><input type="checkbox" data-pick="${r.id}" style="width:auto" ${S.picker.has(r.id)?"checked":""}><span class="mono dim" style="font-size:12.5px">${esc(r.date)}</span><span>${esc(r.vendor)}<span class="dim"> · ${esc(r.note||r.category)}</span></span></span><span class="mono">${money(r.total,r.currency)}</span></label>`).join(""):'<div class="note">No unbilled receipts near this date.</div>'}
<div class="row" style="margin-top:8px"><button class="btn sm gold" data-act="addPicked">Add ${S.picker.size||""} selected</button><button class="btn sm ghost" data-act="closePicker">Close</button></div></div>`;
}


/* ———————————— cloud backup: the user's own Google Drive or Dropbox (optional) ———————————— */
const CFG=window.GMF_CONFIG||{};
const CLOUD_FILE="guitar-man-finance-backup.json";
let CLOUD={provider:null,encrypt:false,salt:"",check:"",lastSync:"",lastErr:"",gFileId:"",dbx:null};
let cloudKey=null,gToken=null,gExp=0,cloudBusy=false,cloudTimer=null,cloudPending=false;
const b64e=buf=>{let s="";const u=buf instanceof Uint8Array?buf:new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
const b64d=s=>binToBytes(atob(s));
const b64url=buf=>b64e(buf).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
async function cloudLoad(){try{const c=await IDB.get("cloudcfg");if(c)CLOUD={...CLOUD,...c}}catch{}}
async function cloudPersist(){try{await IDB.put("cloudcfg",JSON.parse(JSON.stringify({...CLOUD,kind:"cloudcfg"})))}catch{}}
function cloudConnected(){return !!CLOUD.provider}
function cloudName(){return CLOUD.provider==="google"?"Google Drive":CLOUD.provider==="dropbox"?"Dropbox":""}
function localStatus(){return "Saved on this device"+(CLOUD.provider?` · backing up to your ${cloudName()}${CLOUD.encrypt?" (locked)":""}`:"")}
function redrawSoon(){try{const ae=document.activeElement;render(!(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)))}catch{}}
/* encryption: AES-GCM 256 with a key from the passphrase (PBKDF2-SHA256, 310,000 rounds). The passphrase never leaves the device and is never saved. */
async function deriveKey(pass,saltB64){const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pass),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:b64d(saltB64),iterations:310000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function aesSeal(key,str){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(str));return{iv:b64e(iv),data:b64e(ct)}}
async function aesOpen(key,o){const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64d(o.iv)},key,b64d(o.data));return new TextDecoder().decode(pt)}
async function sealData(str){if(!CLOUD.encrypt)return str;const s=await aesSeal(cloudKey,str);return JSON.stringify({gmf:"encrypted",v:1,kdf:"PBKDF2-SHA256",iter:310000,salt:CLOUD.salt,...s})}
async function backupObj(){const imgs={};for(const r of S.receipts){if(r.hasImage){const u=await getImage(r.id);if(u)imgs[r.id]=u}}return{app:"Guitar Man Finance",exported:new Date().toISOString(),settings:S.settings,invoices:S.invoices,receipts:S.receipts,trips:S.trips,incomes:S.incomes,images:imgs}}
async function restoreObj(j){
  for(const x of (j.invoices||[]))if(x&&x.id&&x.kind==="invoice")await save(x,true);
  for(const x of (j.receipts||[]))if(x&&x.id&&x.kind==="receipt")await save(x,true);
  for(const x of (j.trips||[]))if(x&&x.id&&x.kind==="trip")await save(x,true);
  for(const x of (j.incomes||[]))if(x&&x.id&&x.kind==="income")await save(x,true);
  for(const [id,u] of Object.entries(j.images||{}))if(typeof u==="string"&&u.startsWith("data:image/"))await S.col.doc("img_"+id).set({kind:"image",data:u});
  if(j.settings&&typeof j.settings==="object")await save({...S.settings,...j.settings,kind:"settings",id:"settings"},true);
}
/* Google Drive: only the "drive.file" permission, so the app can see nothing in Drive except the backup file it made itself */
function loadGis(){return new Promise((res,rej)=>{if(window.google&&google.accounts&&google.accounts.oauth2)return res();const s=document.createElement("script");s.src="https://accounts.google.com/gsi/client";s.async=true;s.onload=()=>res();s.onerror=()=>rej(new Error("Couldn't reach Google. Check your connection."));document.head.appendChild(s)})}
async function gAuth(interactive){
  if(gToken&&Date.now()<gExp-60000)return gToken;
  if(!interactive)throw new Error("Google needs you to sign in again. Tap Back up now.");
  await loadGis();
  return new Promise((res,rej)=>{const tc=google.accounts.oauth2.initTokenClient({client_id:CFG.googleClientId,scope:"https://www.googleapis.com/auth/drive.file",callback:r=>{if(r.error)return rej(new Error("Google sign-in didn't finish."));gToken=r.access_token;gExp=Date.now()+(Number(r.expires_in)||3600)*1000;res(gToken)},error_callback:()=>rej(new Error("Google sign-in was closed."))});tc.requestAccessToken()});
}
async function gFetch(url,opt={},interactive){const tok=await gAuth(interactive);const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),Authorization:"Bearer "+tok}});if(r.status===401){gToken=null;throw new Error("Google sign-in expired. Tap Back up now.")}if(!r.ok&&r.status!==404)throw new Error("Google Drive didn't accept that ("+r.status+").");return r}
async function gFindFile(i){const q=encodeURIComponent(`name='${CLOUD_FILE}' and trashed=false`);const r=await gFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&spaces=drive`,{},i);const j=await r.json();return j.files&&j.files[0]}
async function gUpload(str,i){let id=CLOUD.gFileId||((await gFindFile(i))||{}).id;
  if(id){const r=await gFetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:str},i);if(r.status===404)id=""}
  if(!id){const bd="gmf"+newId();const meta={name:CLOUD_FILE,mimeType:"application/json",description:"Guitar Man Finance backup"};const r=await gFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+bd},body:`--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${str}\r\n--${bd}--`},i);id=(await r.json()).id}
  CLOUD.gFileId=id;
}
async function gDownload(i){const f=CLOUD.gFileId?{id:CLOUD.gFileId}:await gFindFile(i);if(!f)return null;const r=await gFetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,{},i);return r.status===404?null:r.text()}
async function gDelete(i){const f=CLOUD.gFileId?{id:CLOUD.gFileId}:await gFindFile(i);if(f)await gFetch(`https://www.googleapis.com/drive/v3/files/${f.id}`,{method:"DELETE"},i)}
/* Dropbox: "App folder" access only (Dropbox › Apps › your app name), signed in with PKCE so no secret is stored in the app */
const appUrl=()=>location.origin+location.pathname;
async function dbxConnect(){const v=b64url(crypto.getRandomValues(new Uint8Array(32)));const c=b64url(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));const st=newId();await IDB.put("dbxpkce",{kind:"pkce",v,st});
  location.href=`https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(CFG.dropboxAppKey)}&response_type=code&code_challenge=${c}&code_challenge_method=S256&token_access_type=offline&redirect_uri=${encodeURIComponent(appUrl())}&state=${st}`}
async function dbxHandleRedirect(){
  const p=new URLSearchParams(location.search);const code=p.get("code"),st=p.get("state");if(!code&&!p.get("error"))return;
  history.replaceState(null,"",appUrl());if(!code){CLOUD.lastErr="Dropbox wasn't connected.";return}
  const saved=await IDB.get("dbxpkce");if(!saved||saved.st!==st){CLOUD.lastErr="Dropbox sign-in didn't match. Try connecting again.";return}
  try{const r=await fetch("https://api.dropboxapi.com/oauth2/token",{method:"POST",body:new URLSearchParams({code,grant_type:"authorization_code",client_id:CFG.dropboxAppKey,redirect_uri:appUrl(),code_verifier:saved.v})});if(!r.ok)throw 0;const j=await r.json();
    const was=CLOUD.provider==="dropbox";CLOUD={...CLOUD,provider:"dropbox",lastErr:"",relink:false,dbx:{refresh:j.refresh_token,access:j.access_token,exp:Date.now()+(Number(j.expires_in)||14400)*1000}};await IDB.del("dbxpkce");await cloudPersist();setTimeout(()=>dbxAfterConnect(was),500)}
  catch{CLOUD.lastErr="Dropbox didn't finish connecting. Try again."}
}
async function hasBooksDB(){try{return (await IDB.all()).some(x=>x&&["invoice","receipt","trip","income"].includes(x.kind))}catch{return false}}
async function dbxAfterConnect(was){
  const mine=await hasBooksDB();
  if(was){toast("Dropbox re-linked.");if(mine)cloudBackupNow(true);else cloudRestore();return}
  let remote=null;try{remote=await dbxDownload()}catch{}
  if(remote&&!mine){toast("Dropbox linked. Bringing your books back…");await cloudRestore();return}
  if(remote&&mine){CLOUD.conflict=true;await cloudPersist();redrawSoon();return}
  toast("Dropbox linked.");cloudBackupNow(true)}
async function dbxToken(){const d=CLOUD.dbx||{};if(d.access&&Date.now()<d.exp-60000)return d.access;const r=await fetch("https://api.dropboxapi.com/oauth2/token",{method:"POST",body:new URLSearchParams({grant_type:"refresh_token",refresh_token:d.refresh||"",client_id:CFG.dropboxAppKey})});if(!r.ok){if(r.status===400||r.status===401){CLOUD.relink=true;await cloudPersist()}throw new Error("Dropbox needs to be re-linked. Your books are safe on this device.")}const j=await r.json();d.access=j.access_token;d.exp=Date.now()+(Number(j.expires_in)||14400)*1000;CLOUD.dbx=d;await cloudPersist();return d.access}
const DBX_PATH="/"+CLOUD_FILE;
async function dbxUpload(str){const r=await fetch("https://content.dropboxapi.com/2/files/upload",{method:"POST",headers:{Authorization:"Bearer "+await dbxToken(),"Dropbox-API-Arg":JSON.stringify({path:DBX_PATH,mode:"overwrite",mute:true}),"Content-Type":"application/octet-stream"},body:new TextEncoder().encode(str)});if(r.status===401){CLOUD.relink=true;await cloudPersist();throw new Error("Dropbox needs to be re-linked. Your books are safe on this device.")}if(!r.ok)throw new Error("Dropbox didn't accept the backup ("+r.status+").")}
async function dbxDownload(){const r=await fetch("https://content.dropboxapi.com/2/files/download",{method:"POST",headers:{Authorization:"Bearer "+await dbxToken(),"Dropbox-API-Arg":JSON.stringify({path:DBX_PATH})}});if(r.status===409)return null;if(!r.ok)throw new Error("Couldn't download from Dropbox ("+r.status+").");return r.text()}
async function dbxDelete(){const r=await fetch("https://api.dropboxapi.com/2/files/delete_v2",{method:"POST",headers:{Authorization:"Bearer "+await dbxToken(),"Content-Type":"application/json"},body:JSON.stringify({path:DBX_PATH})});if(!r.ok&&r.status!==409)throw new Error("Couldn't delete the Dropbox copy.")}
/* shared */
async function cloudBackupNow(manual){
  if(!CLOUD.provider||CLOUD.relink)return;if(cloudBusy){cloudPending=true;return}
  if(!manual&&(CLOUD.conflict||!(await hasBooksDB())))return;
  if(CLOUD.encrypt&&!cloudKey){CLOUD.lastErr="Your cloud backup is locked. Enter your passphrase in Settings › Privacy to keep backing up.";redrawSoon();return}
  cloudBusy=true;CLOUD.lastErr="";if(manual)redrawSoon();
  try{const str=await sealData(JSON.stringify(await backupObj()));if(CLOUD.provider==="google")await gUpload(str,manual);else await dbxUpload(str);CLOUD.lastSync=new Date().toISOString();CLOUD.dirty=false;CLOUD.conflict=false;if(manual)toast(`Backed up to your ${cloudName()}.`)}
  catch(e){CLOUD.lastErr=(e&&e.message)||"The backup didn't finish."}
  await cloudPersist();cloudBusy=false;redrawSoon();if(cloudPending){cloudPending=false;cloudDirty()}
}
function cloudDirty(now){bkCount();if(!CLOUD.provider)return;if(!CLOUD.dirty){CLOUD.dirty=true;cloudPersist()}clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>cloudBackupNow(false),now?600:20000)}
async function cloudRestore(){
  const ui=S.cloudUI||{};CLOUD.lastErr="";
  try{const str=CLOUD.provider==="google"?await gDownload(true):await dbxDownload();if(!str){CLOUD.lastErr=`There's no backup in your ${cloudName()} yet.`;redrawSoon();return}
    let o=JSON.parse(str);
    if(o&&o.gmf==="encrypted"){let key=cloudKey;if(!key||o.salt!==CLOUD.salt){if(!ui.pass){CLOUD.lastErr="This backup is locked. Type its passphrase in the box, then tap Restore again.";redrawSoon();return}key=await deriveKey(ui.pass,o.salt)}
      try{o=JSON.parse(await aesOpen(key,o))}catch{CLOUD.lastErr="That passphrase didn't open the backup.";redrawSoon();return}}
    await restoreObj(o);S.cloudUI={};CLOUD.conflict=false;await cloudPersist();toast(`Your books are back from ${cloudName()}.`);
  }catch(e){CLOUD.lastErr=(e&&e.message)||"Couldn't restore."}
  redrawSoon();
}
async function cloudErase(){if(!CLOUD.provider)return;if(CLOUD.provider==="google")await gDelete(true);else await dbxDelete()}
async function cloudForget(){CLOUD={relink:false,conflict:false,dirty:false,provider:null,encrypt:false,salt:"",check:"",lastSync:"",lastErr:"",gFileId:"",dbx:null};cloudKey=null;gToken=null;try{await IDB.del("cloudcfg")}catch{}try{if(window.google&&google.accounts&&google.accounts.oauth2&&gToken)google.accounts.oauth2.revoke(gToken)}catch{}}
async function lockOn(){const ui=S.cloudUI||{};if(String(ui.pass||"").length<8){CLOUD.lastErr="Use a passphrase of at least 8 characters.";redrawSoon();return}if(ui.pass!==ui.pass2){CLOUD.lastErr="The two passphrases don't match.";redrawSoon();return}
  CLOUD.salt=b64e(crypto.getRandomValues(new Uint8Array(16)));cloudKey=await deriveKey(ui.pass,CLOUD.salt);CLOUD.check=JSON.stringify(await aesSeal(cloudKey,"gmf-ok"));CLOUD.encrypt=true;S.cloudUI={};await cloudPersist();toast("Cloud backups are now locked with your passphrase.");cloudBackupNow(true)}
async function unlock(){const ui=S.cloudUI||{};try{const k=await deriveKey(ui.pass||"",CLOUD.salt);if(await aesOpen(k,JSON.parse(CLOUD.check))!=="gmf-ok")throw 0;cloudKey=k;S.cloudUI={};CLOUD.lastErr="";toast("Unlocked.");cloudDirty(true)}catch{CLOUD.lastErr="That passphrase isn't right."}redrawSoon()}
async function lockOff(){if(!cloudKey){CLOUD.lastErr="Unlock first, then you can remove the lock.";redrawSoon();return}CLOUD.encrypt=false;CLOUD.salt="";CLOUD.check="";cloudKey=null;await cloudPersist();toast("Lock removed. Future backups aren't encrypted.");cloudBackupNow(true)}
function cloudSection(){
  const ui=S.cloudUI||{};const gOk=!!CFG.googleClientId,dOk=!!CFG.dropboxAppKey;const online=location.protocol==="https:"||location.hostname==="localhost";
  const when=CLOUD.lastSync?new Date(CLOUD.lastSync).toLocaleString():"not yet";
  if(gOk&&online&&(!CLOUD.provider||CLOUD.provider==="google"))setTimeout(()=>loadGis().catch(()=>{}),0);
  if(!CLOUD.provider)return `<div class="panel" style="background:var(--bg);margin-top:12px"><div class="label">Cloud backup (optional)</div>
<p class="note" style="margin:6px 0 10px">Keep a copy of your books in your own Google Drive or Dropbox. The app only ever touches its own backup file, and it can't see anything else in your account. Leave this off and nothing leaves your device.</p>
<div class="row"><button class="btn sm" data-act="cloudGoogle" ${gOk&&online?"":"disabled"}>Connect Google Drive</button><button class="btn sm" data-act="cloudDropbox" ${dOk&&online?"":"disabled"}>Connect Dropbox</button></div>
${!gOk||!dOk?`<p class="note" style="margin-top:6px">${!gOk&&!dOk?"Cloud backup":!gOk?"Google Drive":"Dropbox"} hasn't been set up on this copy of the app yet.</p>`:""}${CLOUD.lastErr?`<div class="err" style="margin-top:6px">${esc(CLOUD.lastErr)}</div>`:""}</div>`;
  const offArm=S.armed==="cloudOff",resArm=S.armed==="cloudRes";
  return `<div class="panel" style="background:var(--bg);margin-top:12px"><div class="label">Cloud backup · ${esc(cloudName())}</div>
<p class="note" style="margin:6px 0">Backs up automatically about 20 seconds after each change. Last backup: <b>${esc(when)}</b>${CLOUD.encrypt?` · <b>locked with your passphrase</b>${cloudKey?"":" (enter it below to keep backing up)"}`:""}.</p>
${CLOUD.lastErr?`<div class="err" style="margin:6px 0">${esc(CLOUD.lastErr)}</div>`:""}
<div class="row"><button class="btn sm gold" data-act="cloudNow" ${cloudBusy?"disabled":""}>${cloudBusy?'<span class="spin"></span> Backing up…':"Back up now"}</button><button class="btn sm ${resArm?"armed":""}" data-act="cloudRes">${resArm?"Tap again to restore":`Restore from ${esc(cloudName())}`}</button><button class="btn sm ${offArm?"armed":"ghost"}" data-act="cloudOff">${offArm?"Tap again to disconnect":"Disconnect"}</button></div>
<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px">
${!CLOUD.encrypt?`<div class="label">Lock your cloud backups (recommended)</div><p class="note" style="margin:4px 0 8px">Encrypts the backup on this device before it's uploaded, so ${esc(cloudName())} only ever stores scrambled data. If you forget the passphrase, nobody can open the backup, not even the person who shared the app with you.</p>
<div class="grid3"><input type="password" autocomplete="new-password" data-bind="cloudUI.pass" placeholder="Passphrase (8+ characters)" value="${esc(ui.pass||"")}"><input type="password" autocomplete="new-password" data-bind="cloudUI.pass2" placeholder="Type it again" value="${esc(ui.pass2||"")}"><button class="btn sm" data-act="lockOn">Lock my backups</button></div>`
:!cloudKey?`<div class="label">Unlock to keep backing up, or to restore</div><div class="row" style="margin-top:6px;flex-wrap:nowrap"><input type="password" autocomplete="current-password" data-bind="cloudUI.pass" placeholder="Passphrase" value="${esc(ui.pass||"")}"><button class="btn sm" data-act="unlock">Unlock</button></div>`
:`<div class="row"><span class="note">Unlocked for now. You'll need the passphrase again next time you open the app.</span><button class="btn sm ghost" data-act="lockOff">Remove the lock</button></div>`}
</div></div>`;
}

/* ———————————— the backup card on the home page ———————————— */
let BK={lastFile:"",changes:0};
async function bkLoad(){try{const m=await IDB.get("bkmeta");if(m)BK={...BK,...m}}catch{}}
async function bkPersist(){try{await IDB.put("bkmeta",{...BK,kind:"bkmeta"})}catch{}}
let bkT=null;function bkCount(){BK.changes++;clearTimeout(bkT);bkT=setTimeout(bkPersist,500)}
const hasBooks=()=>!!(S.invoices.length||S.receipts.length||S.trips.length||S.incomes.length);
const isInstalled=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch{return false}};
const isPhone=()=>/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
function ago(iso){if(!iso)return "";const m=(Date.now()-Date.parse(iso))/6e4;if(m<1.5)return "just now";if(m<60)return Math.round(m)+" min ago";if(m<36*60)return Math.round(m/60)+" h ago";return new Date(iso).toLocaleDateString(undefined,{month:"short",day:"numeric"})}
async function shareBackupFile(){
  const json=JSON.stringify(await backupObj());const base=`Guitar Man Finance backup ${today()}`;let done=false;
  try{if(navigator.canShare){for(const [n,type] of [[base+".json","application/json"],[base+".txt","text/plain"]]){const f=new File([json],n,{type});if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"Guitar Man Finance backup"});done=true;break}}}}
  catch(e){if(e&&e.name==="AbortError"){toast("Backup not saved.");return}}
  if(!done){await OFFLINE_DL.save({filename:base+".json",data:new Blob([json],{type:"application/json"})});done=true}
  BK.lastFile=new Date().toISOString();BK.changes=0;await bkPersist();toast("Backup saved.");render(true)}
async function gAfterConnect(){
  const mine=await hasBooksDB();let has=null;try{has=await gFindFile(true)}catch{}
  if(has){CLOUD.gFileId=has.id;await cloudPersist();if(mine){CLOUD.conflict=true;await cloudPersist();redrawSoon();return}toast("Google Drive linked. Bringing your books back…");await cloudRestore();return}
  toast("Google Drive linked.");cloudBackupNow(true)}
function homeBackupCard(){
  const online=location.protocol==="https:"||location.hostname==="localhost";const dOk=!!CFG.dropboxAppKey&&online,gOk=!!CFG.googleClientId&&online;
  if(gOk&&!CLOUD.provider)setTimeout(()=>loadGis().catch(()=>{}),0);
  const tip=isPhone()&&!isInstalled()?`<p class="note" style="margin:10px 0 0">📱 Add this app to your Home Screen (Share › Add to Home Screen) so your phone keeps your books and remembers your backup.</p>`:"";
  const where=dOk&&gOk?"Dropbox or Google Drive":gOk?"Google Drive":"Dropbox";
  const card=(cls,title,body,btns)=>`<section class="panel bkcard ${cls}"><div class="label">Backup${CLOUD.provider?" · "+esc(cloudName()):""}</div><div class="bkhead">${title}</div>${body?`<p class="note" style="margin:6px 0 10px">${body}</p>`:""}<div class="row">${btns}</div>${tip}</section>`;
  const linkBtns=(cls)=>`${dOk?`<button class="btn ${cls}" data-act="cloudDropbox">Link Dropbox</button>`:""}${gOk?`<button class="btn ${dOk?"":cls}" data-act="cloudGoogle">Link Google Drive</button>`:""}`;
  const loadBtn=`<label tabindex="0" role="button" class="btn sm ghost" for="jsonIn">Load a backup file</label>`;
  if(CLOUD.provider){const nm=esc(cloudName()),g=CLOUD.provider==="google";
    if(CLOUD.relink)return card("bad",`${nm} needs to be re-linked`,"Your books are safe on this phone. Re-link it and backups start again.",`<button class="btn gold" data-act="cloudRelink">Re-link ${nm}</button>`);
    if(CLOUD.conflict)return card("warn",`There's already a backup in your ${nm}`,"It may be from another phone. Bring it in to add those books to this phone, or replace it with what's on this phone.",`<button class="btn gold" data-act="bkMerge">Bring it in</button><button class="btn" data-act="bkReplace">Replace it</button>`);
    if(CLOUD.encrypt&&!cloudKey)return card("warn","Backups are paused until you unlock","Your backup is locked with your passphrase. Enter it in Settings › Privacy to keep backing up.",`<button class="btn gold" data-act="tab" data-v="settings">Unlock</button>`);
    const needSign=g&&CLOUD.lastErr&&/sign in|sign-in/i.test(CLOUD.lastErr);
    if(needSign)return card("warn",CLOUD.dirty?"Changes waiting to back up":"Google needs you to sign in","Google keeps the app signed in for about an hour at a time. Tap below to sign in and back up.",`<button class="btn gold" data-act="cloudNow">Sign in and back up</button>`);
    return card(CLOUD.lastErr?"bad":"good",cloudBusy?`<span class="spin"></span> Backing up to ${nm}…`:CLOUD.lastErr?esc(CLOUD.lastErr):CLOUD.lastSync?`✓ Backed up to ${nm} ${ago(CLOUD.lastSync)}`:`Linked to ${nm}`,g?"Saves on its own after changes while you're signed in to Google.":"Saves on its own a few seconds after each change and when you close the app.",`<button class="btn sm gold" data-act="cloudNow" ${cloudBusy?"disabled":""}>Back up now</button>${CLOUD.lastErr&&/re-link/i.test(CLOUD.lastErr)?`<button class="btn sm" data-act="cloudRelink">Re-link</button>`:""}`)}
  if((dOk||gOk)&&!hasBooks())return card("warn","Been here before?",`Link your ${where} to bring your books back, or start fresh below.`,`${linkBtns("gold")}${loadBtn}`);
  if(dOk||gOk)return card("bad","Your books are only on this phone",`Link ${where} once and your books are saved there as you go. Lose your phone and they come right back.`,`${linkBtns("gold")}<button class="btn sm ghost" data-act="bkShare">Save a backup file</button>`);
  const st=BK.lastFile?`Last saved ${ago(BK.lastFile)}${BK.changes?` · ${BK.changes} change${BK.changes===1?"":"s"} since`:" · up to date"}`:hasBooks()?"Not backed up yet":"Back up your books";
  return card(BK.lastFile&&!BK.changes?"good":hasBooks()?"bad":"",esc(st),"Tap Save, then pick <b>Dropbox</b> or <b>Google Drive</b> in the share menu (or Save to Files). On a new phone, use Load a backup file.",`<button class="btn gold" data-act="bkShare">Save backup</button>${loadBtn}`)}

/* ———————————— receipts attached to invoices ———————————— */
function rcLine(r,invCur){const cur=r.currency||"CAD",fx=cur!==(invCur||"CAD");return{desc:`${cleanText(r.vendor)}${cleanText(r.note)&&cleanText(r.note).toLowerCase()!==cleanText(r.vendor).toLowerCase()?" – "+cleanText(r.note):""}${fx?` (${cur} ${plain(r.total)})`:""}`.slice(0,110),qty:"1",rate:String(num(r.total)),type:"reimb",taxable:false,rid:r.id}}
function addRcLine(r){const v=S.invEdit;if(!v)return;
  if(S.rcTarget!=null&&v.items[S.rcTarget]){const it=v.items[S.rcTarget];const empty=!String(it.desc||"").trim()&&!num(it.rate);v.items.forEach(x=>{if(x.rid===r.id&&x!==it)delete x.rid});it.rid=r.id;if(!num(it.rate))it.rate=String(num(r.total));if(!String(it.desc||"").trim())it.desc=rcLine(r,v.currency).desc;if(empty){it.type="reimb";it.taxable=false;it.typeTouched=true}S.rcTarget=null;return}
  if(v.items.some(it=>it.rid===r.id))return;const ln=rcLine(r,v.currency);const blank=v.items.findIndex(it=>!it.desc&&!num(it.rate));if(blank>=0)v.items[blank]=ln;else v.items.push(ln)}
function lineRcChip(it,i){const r=it.rid&&S.receipts.find(x=>x.id===it.rid);
  if(!r&&it._find==="searching")return `<span class="note"><span class="spin"></span> Looking for this receipt in Gmail…</span>`;
  if(r)return `<span class="rcchip">📎 ${esc(r.vendor)} · ${money(r.total,r.currency)}${r.hasImage?" · photo":r.gid?" · email":""}${it._find==="found"?` · found automatically${it.rcNote?`, ${esc(it.rcNote)}`:""}, check it`:""}</span>${r.url?`<a class="lnk" href="${esc(r.url)}" target="_blank" rel="noopener">view</a>`:""}<button type="button" class="btn sm ghost" data-act="lineRcRm" data-v="${i}" aria-label="Remove receipt from this line">×</button>`;
  return `${it._find==="none"?'<span class="note">No matching receipt found in Gmail.</span>':""}<button type="button" class="btn sm ghost ${S.rcTarget===i?"gold":""}" data-act="lineRc" data-v="${i}">📎 ${S.rcTarget===i?"Pick a receipt below…":"Attach receipt"}</button>${gmailOn()&&lineType(it)==="reimb"&&it._find!=="none"?`<button type="button" class="btn sm ghost" data-act="lineFind" data-v="${i}">🔎 Find in Gmail</button>`:""}`}
function rcBox(v){
  const att=v.items.map((it,i)=>({it,i,r:it.rid&&S.receipts.find(x=>x.id===it.rid)})).filter(x=>x.r);
  const st=S.invRc;
  return `<section class="rcbox"><div class="label">Receipts for this invoice</div>
${S.rcTarget!=null&&v.items[S.rcTarget]?`<div class="panel hot row" style="justify-content:space-between;margin:6px 0 10px;padding:10px 12px"><span>Attaching a receipt to line ${S.rcTarget+1}: <b>${esc(v.items[S.rcTarget].desc||"(empty line)")}</b></span><button class="btn sm ghost" data-act="lineRcCancel">Cancel</button></div>`:`<p class="note" style="margin:4px 0 10px">Tap 📎 Attach receipt on any line, or add receipts here to make new reimbursement lines. They go out with the invoice email.</p>`}
${att.length?`<div class="list" style="margin-bottom:10px">${att.map(x=>`<div class="rowline"><span>📎 ${esc(x.r.vendor)} <span class="dim">· ${esc(x.r.date)}${x.r.hasImage?" · photo":x.r.gid?" · email":""}</span></span><span class="mono">${money(num(x.it.rate),v.currency)}</span></div>`).join("")}</div>`:""}
<div class="row">${gmailOn()?`<button class="btn sm" data-act="gfindOpen">${ICON.mail}Find in Gmail</button>`:""}<label tabindex="0" role="button" class="btn sm" for="rcInvCam">${ICON.cam}Take photo</label><label tabindex="0" role="button" class="btn sm" for="rcInvLib">${ICON.up}Screenshot or PDF</label><button class="btn sm ghost" data-act="openPicker">From my receipts</button></div>
${st?`<div style="margin-top:8px">${st.status==="preparing"?'<span class="note"><span class="spin"></span> Opening the image…</span>':st.status==="reading"?'<span class="note"><span class="spin"></span> Reading the receipt…</span>':st.status==="done"?`<span class="ok">${esc(st.msg)}</span>`:`<span class="err">${esc(st.err||"")}</span>`}</div>`:""}
${S.gfind?gfindView():""}
${S.picker?pickerView(v):""}</section>`;
}
const GSYN=[
 [/^(hotels?|lodging|accommodations?|rooms?|stays?|motels?|airbnbs?)$/,"marriott OR hilton OR hyatt OR ihg OR holidayinn OR sandman OR bestwestern OR fairmont OR radisson OR accor OR wyndham OR choicehotels OR airbnb OR booking.com OR hotels.com OR expedia OR alt-hotels OR germain OR delta OR travelodge OR ramada","hotel OR hotels OR inn OR suites OR resort OR lodge OR motel OR folio OR \"your stay\" OR accommodation",'-subject:("car rental" OR blocks OR deadlines)'],
 [/^(flights?|air|airfare|airlines?|planes?)$/,"aircanada OR westjet OR flyflair OR flyporter OR aeroplan OR united OR delta OR alaskaair OR expedia OR flighthub","flight OR \"booking confirmation\" OR \"e-ticket\" OR itinerary OR \"booking reference\"",""],
 [/^(parking|park)$/,"jetset OR impark OR honk OR easypark OR parknfly OR yvr OR paybyphone OR hotspot","parking OR \"park\"",""],
 [/^(uber|rides?|taxis?|cabs?|lyft)$/,"uber OR lyft OR taxi","trip OR ride",'-subject:("uber eats" OR "your order")'],
 [/^(car rentals?|rentals?|rental cars?)$/,"enterprise OR avis OR budget OR hertz OR nationalcar OR alamo OR turo OR expedia","\"car rental\" OR rental",""],
 [/^(gas|fuel|petro)$/,"petro-canada OR esso OR shell OR chevron OR husky OR co-op","fuel OR gas",""],
 [/^(food|meals?|restaurants?|dinner|lunch|eats)$/,"ubereats OR uber OR doordash OR skipthedishes OR toasttab OR square","\"uber eats\" OR order OR receipt",""],
 [/^(gear|guitars?|strings|music store|pedals?)$/,"long-mcquade OR tomleemusic OR sweetwater OR reverb OR guitarcenter OR thomann OR musiciansfriend","order OR receipt OR shipped",""]
];
const GPAID='(receipt OR confirmation OR confirmed OR reservation OR booking OR invoice OR folio OR paid OR payment OR total OR itinerary OR order)';
const GNOISE='-subject:(review OR rate OR reward OR rewards OR promo OR deal OR deals OR sale OR "last chance" OR "book now" OR unlocked OR newsletter OR survey OR "check out faster" OR "digital checkout" OR points OR offer OR "% off" OR invited OR "preferences")';
function gExpand(q){const w=q.trim().toLowerCase();for(const [re,from,subj,extra] of GSYN)if(re.test(w))return `{from:(${from}) subject:(${subj})} ${GPAID} ${extra}`;const raw=/[()"{}]|:/.test(q)?q:`(${q})`;return `${raw} ${GPAID}`}
function gRange(r){const y=new Date().getFullYear();return r==="90d"?" newer_than:90d":r==="year"?` after:${y}/01/01`:r==="last"?` after:${y-1}/01/01 before:${y}/01/01`:""}
function gfindView(){const g=S.gfind;const rc=g.results.filter(m=>m.rc!==false),oth=g.results.filter(m=>m.rc===false);
  const btn=(m)=>`<button type="button" class="suggbtn" data-act="gfindPick" data-v="${g.results.indexOf(m)}" ${g.busy?"disabled":""}><b>${esc(m.subject||"(no subject)")}</b><span class="dim">${esc(m.from)} · ${esc(m.date)}${m.label?` · <span class="goldc">${esc(m.label)}</span>`:""}${m.have?" · already in your receipts":""}</span><span class="dim">${esc(String(m.snippet||"").replace(/[͏‌﻿]/g,"").replace(/\s+/g," ").slice(0,120))}</span></button>`;
  return `<div class="panel" style="background:var(--bg);margin-top:10px"><div class="row" style="flex-wrap:nowrap"><input id="gf-q" data-bind="gfind.q" value="${esc(g.q)}" placeholder="hotels, flights, parking, uber, a company…" autocomplete="off" enterkeyhint="search"><button class="btn sm gold" data-act="gfindGo" ${g.loading?"disabled":""}>Search</button></div>
<div class="row" style="margin-top:8px;gap:6px">${[["any","Any time"],["90d","Last 90 days"],["year","This year"],["last","Last year"]].map(([k,l])=>`<button class="btn sm ${g.range===k?"gold":"ghost"}" data-act="gfindRange" data-v="${k}">${l}</button>`).join("")}</div>
${g.err?`<div class="err" style="margin-top:8px">${esc(g.err)}</div>`:""}
${g.results.length?`<div class="note" style="margin-top:8px">${S.sample?(g.sorting?'<span class="spin"></span> Sorting out the real receipts…':`${rc.length} look like receipts or bookings you paid for`):`${g.results.length} emails`}</div>`:""}
<div class="sugg" style="margin-top:6px">${rc.map(btn).join("")}</div>
${oth.length?`<details style="margin-top:8px"><summary class="note" style="cursor:pointer">${oth.length} other emails (deals, reminders, forwards)</summary><div class="sugg" style="margin-top:6px">${oth.map(btn).join("")}</div></details>`:""}
${g.loading?'<div class="note" style="margin-top:8px"><span class="spin"></span> Searching Gmail…</div>':""}
${g.busy?'<div class="note" style="margin-top:8px"><span class="spin"></span> Reading that email…</div>':""}
<div class="row" style="margin-top:8px">${g.token&&!g.loading?`<button class="btn sm" data-act="gfindMore">Show more</button>`:""}${!g.token&&g.results.length&&!g.loading?'<span class="note">That\'s everything that matched.</span>':""}<button class="btn sm ghost" data-act="gfindClose">Close</button></div></div>`}
async function gfindGo(more){
  const g=S.gfind;if(!g)return;const q=String(g.q||"").trim();if(!q)return;
  if(!S.mcp){g.err="Connected apps aren't available in this view. Open the page in Claude.";render(true);return}
  if(!more){g.results=[];g.token="";g.seen=new Set()}
  g.loading=true;g.err="";render(true);
  const seq=g.seq=(g.seq||0)+1;
  try{
    const query=`${gExpand(q)} -in:sent -category:promotions -category:social ${GNOISE}${gRange(g.range)}`;
    const p=pl(await S.mcp.callTool("Gmail","search_threads",{query,pageSize:20,...(more&&g.token?{pageToken:g.token}:{})},{cache:false}));
    if(seq!==g.seq||S.gfind!==g)return;
    const have=new Set(S.receipts.map(r=>r.gid).filter(Boolean));
    const add=(p.threads||[]).map(t=>{const ms=(t.messages||[]).filter(m=>!(m.labelIds||[]).includes("SENT"));const m=ms[0]||(t.messages||[])[0];return m&&{id:m.id,from:m.sender||"",subject:m.subject||"",date:String(m.date||"").slice(0,10),snippet:m.snippet||"",url:m.viewUrl||t.viewUrl||"",have:have.has(m.id)}}).filter(m=>m&&!g.seen.has(m.id));
    add.forEach(m=>g.seen.add(m.id));g.results.push(...add);g.token=p.nextPageToken||"";
    if(!g.results.length)g.err=g.range==="any"?"Nothing found. Try the company name, like “air canada” or “sandman”.":"Nothing in that date range. Try Any time.";
    g.loading=false;render(true);
    if(add.length&&S.sample){g.sorting=true;render(true);
      try{
        const out=await S.sample.json(`These are email previews from a self-employed musician's Gmail (${S.settings.businessName||"the user"}, in Canada). For each one, decide if it is a receipt, invoice, order or booking confirmation for something HE paid for (true), or not (false): marketing, deals, rewards, review requests, check-out reminders, newsletters, event announcements, or bookings forwarded by someone else who paid. Reply with only a JSON array: [{"i": number, "receipt": boolean, "label": short label like "Hotel booking" or "Flight receipt", with the amount if visible}]\n\n`+add.map((m,k)=>`${k}. from: ${m.from} | subject: ${m.subject} | date: ${m.date} | preview: ${String(m.snippet).replace(/\s+/g," ").slice(0,220)}`).join("\n"));
        if(S.gfind!==g)return;(Array.isArray(out)?out:[]).forEach(o=>{const m=add[Number(o.i)];if(m){m.rc=!!o.receipt;m.label=o.receipt?String(o.label||"").slice(0,50):""}});
      }catch{}
      g.sorting=false;render(true);
    }
  }catch(e){if(S.gfind!==g)return;g.loading=false;g.sorting=false;g.err=mcpErr(e,"Gmail");render(true)}
}
async function importGmailReceipt(m){
  const ex=S.receipts.find(r=>r.gid===m.id);if(ex)return{rec:ex,existed:true};
  const r=pl(await S.mcp.callTool("Gmail","get_message",{messageId:m.id,messageFormat:"PLAIN_TEXT"},{cache:false}));
  const text=String(r.plaintextBody||m.snippet||"").replace(/\(?https?:\/\/\S+\)?/g,"").replace(/\n{3,}/g,"\n\n");
  if(!S.sample)throw{code:"not_granted"};
  const out=await S.sample.json(emailBatchPrompt([{id:m.id,from:m.from,subject:m.subject,date:m.date,text:text.slice(0,5000)}]));
  const x=(Array.isArray(out)?out[0]:out)||{};const cur=CURS.includes(x.currency)?x.currency:"CAD";
  const rec={kind:"receipt",id:"rec_g"+m.id,gid:m.id,source:"gmail",url:r.viewUrl||m.url,vendor:cleanText(x.vendor||m.from).slice(0,80),date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")?x.date:m.date,currency:cur,total:num(x.total),taxPaid:cur==="CAD"?num(x.tax):0,category:CATS.includes(x.category)&&x.category!==PERSONAL?x.category:"Travel & accommodation",note:cleanText(x.note||m.subject).slice(0,140),emailText:text.slice(0,6000),needsReview:!num(x.total),hasImage:false,backup:S.mcp?"pending":"off",createdAt:Date.now()};
  await save(rec,true);backupReceipt(rec.id);return{rec,existed:false,notReceipt:x.isReceipt===false};
}
async function gfindPick(i){
  const g=S.gfind,m=g&&g.results[i];if(!m||!S.invEdit)return;
  g.busy=true;g.err="";render(true);
  try{const {rec,existed,notReceipt}=await importGmailReceipt(m);addRcLine(rec);S.gfind=null;const cur=rec.currency||"CAD";
    S.invRc={status:"done",msg:existed?`Added ${rec.vendor} ${money(rec.total,cur)} from your receipts.`:num(rec.total)?`Added ${rec.vendor} ${money(rec.total,cur)} from Gmail.${notReceipt?" It didn't look like a receipt, so double-check it.":""}${cur!==S.invEdit.currency?` It's in ${cur}, so check the amount.`:""}`:"Added it, but couldn't find the amount. Type it in on the new line."};
    render(true);
  }catch(e){g.busy=false;g.err=e&&e.code&&/not_granted|sampling|rate_limited|invalid_json|empty|refused|session/.test(String(e.code))?sampleErr(e.code):mcpErr(e,"Gmail");render(true)}
}
/* auto-find a reimbursement's receipt */
const gDay=(d,n)=>{const x=new Date(Date.parse((d||today())+"T12:00:00")+n*864e5);return `${x.getFullYear()}/${String(x.getMonth()+1).padStart(2,"0")}/${String(x.getDate()).padStart(2,"0")}`};
function lineSearchTerms(desc){
  const words=String(desc||"").toLowerCase().replace(/reimburs\w*|receipts?|\$?\d+(?:[.,]\d+)?|[@x×*\/–\-:,()]|\b(per|day|days|for|the|and|to|from|a|an|of|my|on|at|trip|return|one|way|fee|fees|cost|costs|expense|expenses)\b/g," ").split(/\s+/).filter(w=>w.length>1).slice(0,4);
  for(const w of words)for(const [re,from,subj] of GSYN)if(re.test(w))return `{from:(${from}) subject:(${subj})}`;
  const s=words.join(" ");
  if(/air ?canada/.test(s))return `{from:(aircanada) subject:(booking OR "air canada")}`;
  return words.length?`(${words.map(w=>`"${w}"`).join(" ")})`:"";
}
function setLineFind(i,state){const v=S.invEdit,it=v&&v.items[i];if(!it)return;it._find=state;const el=document.getElementById("ie-rc"+i);if(el)el.innerHTML=lineRcChip(it,i);else render(true)}
async function autoFindReceipt(i){
  const v=S.invEdit,it=v&&v.items[i];if(!it||it.rid||it._find==="searching"||lineType(it)!=="reimb")return;
  const amt=num(it.rate)||(parseQty(it.desc)||{}).amt||0;const lineRef=it;
  setLineFind(i,"searching");
  const done=(state,rec)=>{const idx=S.invEdit?S.invEdit.items.indexOf(lineRef):-1;if(idx<0)return;if(rec){lineRef.rid=rec.id;if(!num(lineRef.rate)){lineRef.rate=String(num(rec.total));const r=document.getElementById("ie-r"+idx);if(r)r.value=lineRef.rate;refreshTotals()}lineRef.rcNote=rec.currency&&rec.currency!==S.invEdit.currency?`in ${rec.currency}`:(amt&&Math.abs(num(rec.total)-amt)>.011?`receipt says ${money(rec.total,rec.currency)}`:"")}setLineFind(idx,state)};
  const local=amt?S.receipts.filter(r=>!isPersonal(r)&&(!r.billedTo||r.billedTo===v.id)&&Math.abs(num(r.total)-amt)<=.011&&!v.items.some(x=>x.rid===r.id)).map(r=>({r,dd:Math.abs(dayDiff(v.date,r.date))})).filter(x=>x.dd<=150).sort((a,b)=>a.dd-b.dd)[0]:null;
  if(local){done("found",local.r);return}
  if(!gmailOn()){done("none");return}
  try{
    const range=` -in:sent after:${gDay(v.date,-150)} before:${gDay(v.date,15)}`;
    const grab=async q=>{const p=pl(await S.mcp.callTool("Gmail","search_threads",{query:q,pageSize:12},{cache:false}));return (p.threads||[]).map(t=>{const m=(t.messages||[]).find(m=>!(m.labelIds||[]).includes("SENT"))||(t.messages||[])[0];return m&&{id:m.id,from:m.sender||"",subject:m.subject||"",date:String(m.date||"").slice(0,10),snippet:String(m.snippet||"").replace(/\s+/g," ").slice(0,200),url:m.viewUrl||""}}).filter(Boolean)};
    let c=[];
    if(amt)c=await grab(`"${amt.toFixed(2)}"${range}`);
    if(!c.length){const k=lineSearchTerms(it.desc);if(k)c=await grab(`${k} ${GPAID} -category:promotions -category:social ${GNOISE}${range}`)}
    if(!c.length){done("none");return}
    let pick=-1;
    if(S.sample){try{const o=await S.sample.json(`An invoice line billed back to a client: "${it.desc}"${amt?`, amount ${amt.toFixed(2)}`:""}, invoice dated ${v.date}. Which of these emails is the receipt or booking confirmation the user paid for that this line reimburses? Prefer an exact amount match. Reply with only {"i": index, or -1 if none fits}.\n\n`+c.map((m,k)=>`${k}. from: ${m.from} | subject: ${m.subject} | date: ${m.date} | ${m.snippet}`).join("\n"),{modelTier:"quick"});pick=Number(o&&o.i);if(!(pick>=0&&pick<c.length))pick=-1}catch{pick=c.length===1&&amt?0:-1}}
    else if(c.length===1&&amt)pick=0;
    if(pick<0){done("none");return}
    const {rec}=await importGmailReceipt(c[pick]);done("found",rec);
  }catch{done("none")}
}
async function autoFindAll(){const v=S.invEdit;if(!v)return;for(const it of [...v.items]){if(S.invEdit!==v)return;const i=v.items.indexOf(it);if(i>=0&&lineType(it)==="reimb"&&!it.rid)await autoFindReceipt(i)}}
async function onInvReceiptFile(file){
  if(!file||!S.invEdit)return;
  S.invRc={status:"preparing"};render(true);
  let p;try{p=await prepFile(file)}catch(e){S.invRc={status:"error",err:e.message};render(true);return}
  let x={},readErr="";
  if(S.sample&&S.canImages){S.invRc={status:"reading"};render(true);try{x=await S.sample.json(RECEIPT_PROMPT,{images:[p.blob]})||{}}catch(e){readErr=sampleErr(e&&e.code)}}
  if(!S.invEdit)return;
  const cur=CURS.includes(x.currency)?x.currency:"CAD";
  const rec={kind:"receipt",id:"rec_"+newId(),vendor:cleanText(x.vendor||"Receipt").slice(0,80),date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")?x.date:today(),currency:cur,total:num(x.total),taxPaid:cur==="CAD"?num(x.tax):0,category:CATS.includes(x.category)&&x.category!==PERSONAL?x.category:"Travel & accommodation",note:cleanText(x.note||"").slice(0,140),needsReview:!num(x.total),hasImage:!!p.preview,backup:S.mcp?"pending":"off",source:"invoice",createdAt:Date.now()};
  if(p.preview)S.imgCache[rec.id]=p.preview;
  await save(rec,true);
  if(p.preview&&S.col){try{await S.col.doc("img_"+rec.id).set({kind:"image",data:p.preview})}catch{}}
  addRcLine(rec);
  S.invRc=num(x.total)?{status:"done",msg:`Added ${rec.vendor} ${money(rec.total,cur)}. Check the amount on the new line.${cur!==S.invEdit.currency?` It's in ${cur}.`:""}`}:{status:readErr?"error":"done",err:(readErr?readErr+" ":"")+"The photo is attached; type the amount on the new line.",msg:"The photo is attached. Couldn't read the amount, so type it on the new line."};
  render(true);if(S.mcp)backupReceipt(rec.id);
}
/* email receipt parts: original PDFs, HTML snapshot */
S.mailCache={};
function b64ToBin(s){s=String(s||"").replace(/[\s]/g,"").replace(/-/g,"+").replace(/_/g,"/");s+="=".repeat((4-s.length%4)%4);return atob(s)}
function binToBytes(b){const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i)&255;return u}
function qpToBin(s){return s.replace(/=\r?\n/g,"").replace(/=([0-9A-F]{2})/gi,(m,h)=>String.fromCharCode(parseInt(h,16)))}
function mimeLeaves(str,depth=0){
  const k=str.search(/\r?\n\r?\n/);if(k<0)return[];const head=str.slice(0,k),body=str.slice(k).replace(/^\r?\n\r?\n/,"");
  const H={};head.replace(/\r?\n[ \t]+/g," ").split(/\r?\n/).forEach(l=>{const c=l.indexOf(":");if(c>0)H[l.slice(0,c).trim().toLowerCase()]=l.slice(c+1).trim()});
  const ct=H["content-type"]||"text/plain";const bm=ct.match(/boundary="?([^";]+)"?/i);
  if(/^multipart\//i.test(ct)&&bm&&depth<6){const out=[];for(const part of body.split("--"+bm[1]).slice(1)){if(/^--/.test(part))break;out.push(...mimeLeaves(part.replace(/^\r?\n/,""),depth+1))}return out}
  const enc=(H["content-transfer-encoding"]||"").toLowerCase();const fn=((H["content-disposition"]||"").match(/filename\*?="?([^";]+)"?/i)||ct.match(/name="?([^";]+)"?/i)||[])[1]||"";
  const bin=enc==="base64"?(()=>{try{return b64ToBin(body)}catch{return ""}})():enc==="quoted-printable"?qpToBin(body):body;
  return[{ct:ct.split(";")[0].trim().toLowerCase(),charset:(ct.match(/charset="?([^";]+)"?/i)||[])[1]||"utf-8",filename:fn.replace(/^utf-8''/i,""),bin}];
}
async function emailParts(gid){
  if(S.mailCache[gid])return S.mailCache[gid];
  const p=pl(await S.mcp.callTool("Gmail","get_message",{messageId:gid,messageFormat:"RAW"},{cache:false}));
  const raw=p.raw||p.message&&p.message.raw;if(!raw)throw new Error("no raw");
  const leaves=mimeLeaves(b64ToBin(raw));const dec=l=>{try{return new TextDecoder(l.charset).decode(binToBytes(l.bin))}catch{return l.bin}};
  const html=leaves.find(l=>l.ct==="text/html"&&!l.filename);const text=leaves.find(l=>l.ct==="text/plain"&&!l.filename);
  const pdfs=leaves.filter(l=>l.ct==="application/pdf"||/\.pdf$/i.test(l.filename)).map(l=>({filename:l.filename||"receipt.pdf",b64:btoa(l.bin)}));
  return S.mailCache[gid]={html:html?dec(html):"",text:text?dec(text):"",pdfs};
}
async function htmlSnapshot(html){
  const doc=new DOMParser().parseFromString(html,"text/html");
  doc.querySelectorAll("script,iframe,object,embed,link,meta,base,form,video,audio").forEach(n=>n.remove());
  doc.querySelectorAll("img").forEach(n=>{const s=n.getAttribute("src")||"";if(!/^data:image\//i.test(s)){const alt=n.getAttribute("alt");if(alt&&alt.length<40){const sp=doc.createElement("span");sp.textContent=alt;n.replaceWith(sp)}else n.remove()}});
  doc.querySelectorAll("*").forEach(n=>{for(const a of [...n.attributes]){if(/^on/i.test(a.name))n.removeAttribute(a.name);else if(/url\(/i.test(a.value))n.setAttribute(a.name,a.value.replace(/url\([^)]*\)/gi,"none"))}});
  doc.querySelectorAll("style").forEach(s=>{s.textContent=s.textContent.replace(/@import[^;]*;?/gi,"").replace(/url\([^)]*\)/gi,"none")});
  const W=680;const host=document.createElement("div");host.style.cssText=`position:fixed;left:-10000px;top:0;width:${W}px;background:#fff;color:#111;font:14px Arial,sans-serif`;
  const inner=document.createElement("div");inner.setAttribute("xmlns","http://www.w3.org/1999/xhtml");inner.style.cssText=`width:${W}px;background:#fff;color:#111;font:14px Arial,sans-serif;padding:12px;box-sizing:border-box`;
  doc.head.querySelectorAll("style").forEach(s=>inner.appendChild(s.cloneNode(true)));[...doc.body.childNodes].forEach(n=>inner.appendChild(document.importNode(n,true)));
  host.appendChild(inner);document.body.appendChild(host);
  const H=Math.min(3600,Math.max(200,inner.scrollHeight));
  const xhtml=new XMLSerializer().serializeToString(inner);host.remove();
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const img=await loadImg("data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg));
  const c=document.createElement("canvas");c.width=Math.round(W*1.25);c.height=Math.round(H*1.25);const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.scale(1.25,1.25);x.drawImage(img,0,0);
  return{c,W,H};
}
function rcsOf(inv){return (inv.items||[]).map((it,idx)=>({it,idx,r:it.rid&&S.receipts.find(x=>x.id===it.rid)})).filter(x=>x.r).filter((x,k,a)=>a.findIndex(y=>y.r.id===x.r.id)===k)}
async function buildReceiptsPdf(inv,opts={}){
  const mode=opts.mode||S.rcMode||"best";const list=rcsOf(inv);if(!list.length)return{doc:null,originals:[]};
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"pt",format:"letter"});const W=612,H=792,M=42;const originals=[];let first=true;
  const header=(r,it,k,sub)=>{if(!first)doc.addPage();first=false;
    doc.setFillColor(244,244,244);doc.rect(0,0,W,86,"F");doc.setTextColor(30);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text(`Receipt ${k+1} of ${list.length}: ${r.vendor}`.slice(0,70),M,36);
    doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(80);doc.text(`${fmtDate(r.date,"mmm d, yyyy")}   ·   ${money(r.total,r.currency)} ${r.currency||"CAD"}${num(r.taxPaid)?`   ·   GST/HST ${money(r.taxPaid,r.currency)}`:""}`,M,54);
    doc.text(doc.splitTextToSize(`Billed on ${docTitle(inv).toLowerCase()} #${inv.number} (${inv.client}), line: ${it.desc}`,W-2*M)[0],M,70);
    if(sub){doc.setFontSize(9);doc.setTextColor(120);doc.text(sub,M,100)}doc.setTextColor(0);return sub?112:104};
  const placeCanvas=(c,cw,ch,y0)=>{const maxW=W-2*M;const s=maxW/cw;let srcY=0;let y=y0;
    while(srcY<ch){const room=(H-M-y)/s;const take=Math.min(ch-srcY,room);const piece=document.createElement("canvas");const k=c.width/cw;piece.width=c.width;piece.height=Math.round(take*k);piece.getContext("2d").drawImage(c,0,srcY*k,c.width,take*k,0,0,c.width,take*k);
      doc.setDrawColor(210);doc.rect(M-1,y-1,maxW+2,take*s+2);doc.addImage(piece.toDataURL("image/jpeg",.72),"JPEG",M,y,maxW,take*s);srcY+=take;if(srcY<ch){doc.addPage();y=M}}};
  for(let k=0;k<list.length;k++){
    const {r,it}=list[k];
    if(r.hasImage){const img=await getImage(r.id);const y0=header(r,it,k,"Photo of the receipt");if(img){const pr=doc.getImageProperties(img);const s=Math.min((W-2*M)/pr.width,(H-y0-M)/pr.height);doc.setDrawColor(210);doc.rect(M-1,y0-1,pr.width*s+2,pr.height*s+2);doc.addImage(img,"JPEG",M,y0,pr.width*s,pr.height*s)}continue}
    let parts=null;if(r.gid&&S.mcp&&mode!=="summary"){try{parts=await emailParts(r.gid)}catch{}}
    if(parts&&parts.pdfs.length&&mode==="best"){parts.pdfs.forEach((p,n)=>originals.push({content:p.b64,filename:`Receipt ${k+1} - ${safeName(r.vendor)}${parts.pdfs.length>1?` (${n+1})`:""}.pdf`,mimeType:"application/pdf"}));
      const y0=header(r,it,k,"");doc.setFontSize(11);doc.text(doc.splitTextToSize(`The original receipt from ${r.vendor} is attached to the email as its own PDF: ${parts.pdfs.map((p,n)=>`Receipt ${k+1} - ${safeName(r.vendor)}${parts.pdfs.length>1?` (${n+1})`:""}.pdf`).join(", ")}.`,W-2*M),M,y0+10);continue}
    if(parts&&parts.html){try{const snap=await htmlSnapshot(parts.html);const y0=header(r,it,k,"Copy of the emailed receipt");placeCanvas(snap.c,snap.W,snap.H,y0);continue}catch{}}
    const y0=header(r,it,k,r.gid?"Summary of the emailed receipt":"Receipt details");let y=y0+10;doc.setFontSize(11);
    const rows=[["Vendor",r.vendor],["Date",fmtDate(r.date,"mmm d, yyyy")],["Total",`${money(r.total,r.currency)} ${r.currency||"CAD"}`],["GST/HST",num(r.taxPaid)?money(r.taxPaid,r.currency):"none shown"],["What it was",r.note||r.category]];
    rows.forEach(([a,b])=>{doc.setFont("helvetica","bold");doc.text(a,M,y);doc.setFont("helvetica","normal");doc.splitTextToSize(String(b),W-2*M-110).forEach((l,n)=>doc.text(l,M+110,y+n*14));y+=22});
    const txt=String((parts&&parts.text)||r.emailText||"").split(/\n/).map(l=>l.trim()).filter(l=>l&&/\d/.test(l)&&/\$|total|tax|gst|hst|amount|paid|fare|fee|subtotal|charged/i.test(l)&&l.length<120).slice(0,14);
    if(txt.length){y+=8;doc.setFont("helvetica","bold");doc.text("From the email",M,y);y+=16;doc.setFont("helvetica","normal");doc.setFontSize(10);txt.forEach(l=>{doc.text(l,M,y);y+=13})}
  }
  return{doc,originals};
}
const rcCount=inv=>new Set((inv.items||[]).map(it=>it.rid).filter(Boolean)).size;


/* ———————————— smart line amounts ———————————— */
function parseQty(desc){
  const s=" "+String(desc||"").toLowerCase().replace(/,/g,"").replace(/×/g,"x")+" ";const N="(\\d+(?:\\.\\d+)?)";
  const rateAt=s.match(new RegExp("(?:@|\\bat\\b)\\s*\\$?\\s*"+N));
  let cnt=s.match(new RegExp("(?:[\\s\\d]x|\\btimes\\b|\\*)\\s*"+N));
  if(!cnt)cnt=s.match(new RegExp(N+"\\s*x(?![a-z0-9])"))||s.match(new RegExp(N+"\\s*x\\s+(?=[a-z])"));
  let rate=null,n=null;
  if(rateAt){rate=+rateAt[1];if(cnt)n=+cnt[1];else{const c=s.match(new RegExp(N+"\\s*(?:days?|shows?|nights?|gigs?|hours?|hrs?|sessions?|songs?|tracks?|rehearsals?|per diems?)\\b"));if(c&&c.index!==rateAt.index)n=+c[1]}}
  else if(cnt){
    n=+cnt[1];
    const r=s.match(new RegExp("\\$\\s*"+N))||s.match(new RegExp(N+"\\s*\\$"))||s.match(new RegExp(N+"\\s*(?:\\/|per\\b|a\\b|an\\b|each\\b|a day|/day)"));
    if(r&&+r[1]!==n||r&&s.split(r[1]).length>2)rate=+r[1];
    else{const all=[...s.matchAll(new RegExp(N,"g"))].map(m=>m[1]);const used=all.indexOf(cnt[1]);const other=all.filter((x,k)=>k!==used);if(other.length)rate=+other[0]}
  }
  if(!(rate>0&&n>0&&n<=400))return null;
  return{rate,n,amt:Math.round(rate*n*100)/100};
}
function lineHint(it){const i=S.invEdit?S.invEdit.items.indexOf(it):-1;const fix=it.fix&&it.fix!==it.desc?`<span class="note">✎ Did you mean “${esc(it.fix)}”?</span> <button type="button" class="btn sm ghost" data-act="useFix" data-v="${i}">Use it</button> <button type="button" class="btn sm ghost" data-act="noFix" data-v="${i}">Keep mine</button>`:"";return fix+lineHint0(it)}
function lineHint0(it){const q=parseQty(it.desc);if(!q)return "";const ok=Math.abs(num(it.rate)-q.amt)<.005;return ok?`<span class="ok">= ${money(q.amt)} (${plain(q.rate)} × ${plain(q.n)})</span>`:`<span class="note">${plain(q.rate)} × ${plain(q.n)} = ${money(q.amt)}</span> <button type="button" class="btn sm ghost" data-act="useQty" data-v="${S.invEdit?S.invEdit.items.indexOf(it):""}">Use it</button>`}
function onLineDesc(i){
  const v=S.invEdit,it=v&&v.items[i];if(!it)return;it.fix="";
  const q=parseQty(it.desc);
  if(q&&(String(it.rate).trim()===""||it.autoAmt)){it.rate=String(q.amt);it.autoAmt=true;const r=document.getElementById("ie-r"+i);if(r)r.value=it.rate}
  if(!it.typeTouched&&!it.rid){const ty=guessType(String(it.desc||""));if(ty!==lineType(it)||it.type!==ty){it.type=ty;it.taxable=ty==="pay"&&v.currency==="CAD";const sel=document.getElementById("ie-y"+i);if(sel)sel.value=ty;const cb=document.getElementById("ie-t"+i);if(cb)cb.checked=it.taxable}}
  const h=document.getElementById("ie-h"+i);if(h)h.innerHTML=lineHint(it);
}
function safeCalc(x){const tk=x.match(/\d+(?:\.\d+)?|\.\d+|[()+\-*/]/g)||[];if(tk.join("")!==x)return NaN;let i=0;
  const factor=()=>{const k=tk[i];if(k==="-"){i++;return -factor()}if(k==="+"){i++;return factor()}if(k==="("){i++;const v=expr();if(tk[i]!==")")throw 0;i++;return v}if(k!==undefined&&/^[\d.]/.test(k)){i++;return parseFloat(k)}throw 0};
  const term=()=>{let v=factor();while(tk[i]==="*"||tk[i]==="/"){const o=tk[i++];const r=factor();v=o==="*"?v*r:v/r}return v};
  const expr=()=>{let v=term();while(tk[i]==="+"||tk[i]==="-"){const o=tk[i++];const r=term();v=o==="+"?v+r:v-r}return v};
  try{const v=expr();return i===tk.length?v:NaN}catch{return NaN}}
function evalAmt(s){const x=String(s||"").replace(/[$,\s]/g,"").replace(/[x×]/gi,"*");if(!/^[\d.+\-*/()]+$/.test(x)||!/[+\-*/]/.test(x))return null;const r=safeCalc(x);return isFinite(r)?Math.round(r*100)/100:null}


/* ———————————— voice invoices ———————————— */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
ICON.mic='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const MIC_HELP="The Claude app won't let this page use your microphone directly. Tap the box above, then tap the 🎤 on your phone's keyboard and talk (on a Mac press Fn twice, on Windows press Win+H). Then tap Fill in the invoice.";
function micBlocked(){try{return localStorage.getItem("gmf-mic")==="blocked"}catch{return false}}
function setMicBlocked(){try{localStorage.setItem("gmf-mic","blocked")}catch{}}
function startListening(target){
  const st=target==="fix"?S.vfix:S.voice;if(!st)return;
  const boxId=target==="fix"?"vf-text":"vq-text";
  const fallback=msg=>{st.rec=null;st.err=msg||MIC_HELP;setMicBlocked();render(true);setTimeout(()=>{const b=document.getElementById(boxId);if(b)b.focus()},50)};
  if(!SR||micBlocked()){fallback();return}
  if(st.rec){try{st.rec.stop()}catch{}return}
  let rec;try{rec=new SR()}catch{fallback();return}
  rec.lang="en-CA";rec.interimResults=true;rec.continuous=true;const base=String(st.text||"").trim();let finalTxt="",got=false;
  rec.onresult=e=>{got=true;let interim="";for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)finalTxt+=r[0].transcript+" ";else interim+=r[0].transcript}
    st.text=(base?base+" ":"")+finalTxt+interim;const box=document.getElementById(boxId);if(box)box.value=st.text};
  rec.onerror=e=>{if(e.error==="no-speech"&&got)return;if(e.error==="aborted")return;st.failed=e.error||"error"};
  rec.onend=()=>{clearTimeout(st.watch);st.rec=null;if(!got){fallback(st.failed==="no-speech"?"Didn't hear anything. "+MIC_HELP:MIC_HELP)}else render(true)};
  st.rec=rec;st.err="";st.failed="";
  st.watch=setTimeout(()=>{if(!got&&st.rec){try{rec.abort()}catch{}fallback()}},6000);
  try{rec.start()}catch{clearTimeout(st.watch);fallback();return}
  render(true);
}
function voiceClients(){return clientBook().slice(-60).map(c=>{const last=[...S.invoices].filter(i=>String(i.client||"").trim().toLowerCase()===c.client.toLowerCase()).sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0];return{client:c.client,email:emailsIn(c.email).join(", "),address:c.address,lastFor:last?.forLabel||"",lastLines:(last?.items||[]).slice(0,6).map(it=>`${it.desc} = ${plain(num(it.qty||1)*num(it.rate))}`)}})}
const VOICE_SCHEMA=`{"client": exact name from the client list if it matches, else as said, "clientEmail": string or "", "clientAddress": string or "", "forLabel": short "For" text like "Session guitar work" or "Music Production", "date": "YYYY-MM-DD", "currency": "CAD" unless another is said, "taxType": "GST" | "HST" | "None", "taxRate": number, "status": "draft" | "quote", "notes": string or "",
 "items": [{"desc": line description written the way a musician writes invoice lines, e.g. "Show days x 2 @ 400", "Travel days x 2 @ 150 / day", "Per diem x 3 @ 40 / day", "Air Canada flight reimbursement", "amount": number (the line total, rate times quantity), "type": "pay" | "perdiem" | "reimb"}]}`;
function voicePrompt(said,current){
  return `You turn what a self-employed Canadian musician (${S.settings.businessName||"the user"}, charges ${S.settings.defaultTaxType||"GST"} on fees) said into ${current?"an UPDATED version of the invoice below":"a new invoice draft"}.
Today is ${today()}. Rules: fees, show/session/rehearsal/travel-day rates and production are "pay"; per diems are "perdiem"; flights, bag fees, parking, Ubers, ferries, gas, gear bought for the client are "reimb". GST applies to pay lines only. If no date is said, use today. If a client from the list is meant (even roughly or by first name), use that exact name and their email and address; if they say "same as last time", copy that client's last lines. Never invent amounts that weren't said or implied by the client's last invoice; if an amount is missing use 0. When he says "reimbursement" for something, make it a "reimb" line whose description names the vendor or item (e.g. "Air Canada flight reimbursement", "YVR parking reimbursement").
Known clients (JSON): ${JSON.stringify(voiceClients())}
${current?`Current invoice (JSON): ${JSON.stringify(current)}\nChange only what the instruction asks; keep everything else.`:""}
What he said: """${String(said).slice(0,3000)}"""
Spell every word correctly (place names, venues, companies) and use single spaces, even if the speech-to-text garbled them.
Reply with only one JSON object: ${VOICE_SCHEMA}`;
}
function invFromVoice(x,base){
  const cur=CURS.includes(x.currency)?x.currency:"CAD";const book=clientBook();
  const name=String(x.client||"").trim();const hit=book.find(c=>c.client.toLowerCase()===name.toLowerCase())||book.find(c=>name&&c.client.toLowerCase().includes(name.toLowerCase()));
  const items=(Array.isArray(x.items)?x.items:[]).map(it=>{const ty=["pay","perdiem","reimb"].includes(it.type)?it.type:guessType(String(it.desc||""));const q=parseQty(it.desc);const amt=num(it.amount)||(q?q.amt:0);return{desc:cleanText(it.desc).slice(0,140),qty:"1",rate:amt?String(amt):"",type:ty,taxable:ty==="pay"&&cur==="CAD",typeTouched:true}}).filter(it=>it.desc||it.rate);
  const tt=cur!=="CAD"?"None":(["GST","HST","None"].includes(x.taxType)?x.taxType:"GST");
  return{...base,client:hit?hit.client:(name||base.client),clientEmail:String(x.clientEmail||"").trim()||(hit?hit.email:"")||base.clientEmail||"",clientAddress:String(x.clientAddress||"").trim()||(hit?hit.address:"")||base.clientAddress||"",
    forLabel:String(x.forLabel||base.forLabel||""),date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")?x.date:(base.date||today()),currency:cur,taxType:tt,taxRate:tt==="HST"?(num(x.taxRate)||13):tt==="GST"?5:0,taxOverride:null,
    status:x.status==="quote"?"quote":(base.status||"draft"),notes:String(x.notes??base.notes??""),items:items.length?items:base.items,voice:true};
}
async function runVoice(){
  const st=S.voice;if(!st)return;const said=String(st.text||"").trim();if(!said){st.err="Say or type who to bill and what for first.";render(true);return}
  if(!S.sample){st.err="Claude isn't available in this view. Open the page in Claude.";render(true);return}
  if(st.rec){try{st.rec.stop()}catch{}}
  st.busy=true;st.err="";st.ctl=new AbortController();render(true);
  try{const x=await S.sample.json(voicePrompt(said,null),{signal:st.ctl.signal,cache:false});
    S.invEdit=invFromVoice(x||{},blankInvoice());S.invEdit.heard=said;S.voice=null;S.invViewId=null;S.gfind=null;S.invRc=null;S.picker=null;setTimeout(()=>{proofLines(S.invEdit?S.invEdit.items.map((_,i)=>i):[],true);autoFindAll()},50);}
  catch(e){st.err=e&&e.code==="cancelled"?"":sampleErr(e&&e.code)}
  if(S.voice)S.voice.busy=false;render(true);window.scrollTo({top:0});
}
async function runVoiceFix(){
  const st=S.vfix,v=S.invEdit;if(!st||!v)return;const said=String(st.text||"").trim();if(!said)return;
  if(!S.sample){st.err="Claude isn't available in this view.";render(true);return}
  if(st.rec){try{st.rec.stop()}catch{}}
  st.busy=true;st.err="";render(true);
  const cur={client:v.client,clientEmail:v.clientEmail,clientAddress:v.clientAddress,forLabel:v.forLabel,date:v.date,currency:v.currency,taxType:v.taxType,taxRate:v.taxRate,status:v.status,notes:v.notes,items:v.items.map(it=>({desc:it.desc,amount:num(it.rate),type:lineType(it)}))};
  try{const x=await S.sample.json(voicePrompt(said,cur),{cache:false});const keepRid=new Map(v.items.filter(it=>it.rid).map(it=>[it.desc,it.rid]));
    const nv=invFromVoice(x||{},v);nv.items=nv.items.map(it=>keepRid.has(it.desc)?{...it,rid:keepRid.get(it.desc)}:it);S.invEdit=nv;S.vfix={text:"",done:`Changed: “${said}”`};setTimeout(()=>{proofLines(S.invEdit?S.invEdit.items.map((_,i)=>i):[],true);autoFindAll()},50)}
  catch(e){st.err=sampleErr(e&&e.code);st.busy=false}
  render(true);
}
function voicePanel(){
  const st=S.voice;
  return `<section class="panel hot"><span class="plaque" style="cursor:default">Voice invoice</span>
<p class="note" style="margin:8px 0 10px">Say who to bill and what for, like: <i>“Bill Jane Smith for Saturday's show, 450, two travel days at 150, per diem 3 days at 30, and the flight reimbursement 289.50.”</i> Claude fills in the invoice, then you check it before saving or making the Gmail draft.</p>
<textarea id="vq-text" data-bind="voice.text" style="min-height:110px" placeholder="Tap here, then tap the 🎤 on your keyboard and talk, or just type">${esc(st.text||"")}</textarea>
<div class="row" style="margin-top:10px">${SR&&!micBlocked()?`<button class="btn ${st.rec?"armed":""}" data-act="vqMic">${ICON.mic}${st.rec?"Stop listening":"Talk"}</button>`:""}<button class="btn gold" data-act="vqGo" ${st.busy?"disabled":""}>${st.busy?'<span class="spin"></span> Filling in the invoice…':"Fill in the invoice"}</button><button class="btn ghost" data-act="vqClose">Cancel</button></div>
${st.rec?'<div class="note" style="margin-top:8px"><span class="spin"></span> Listening… start talking.</div>':""}${st.err?`<div class="err" style="margin-top:8px">${esc(st.err)}</div>`:""}${!st.err&&(!SR||micBlocked())?`<p class="note" style="margin-top:8px">Tip: tap the box, then the 🎤 on your keyboard to talk.</p>`:""}</section>`;
}
function voiceFixBox(v){
  const st=S.vfix||{};
  return `<div class="panel" style="background:var(--bg);margin-bottom:12px"><div class="label">Fix it by voice</div>
${v.heard?`<p class="note" style="margin:6px 0">You said: “${esc(v.heard)}”. Check every line below.</p>`:""}
<div class="row" style="flex-wrap:nowrap;margin-top:6px"><input id="vf-text" data-bind="vfix.text" value="${esc(st.text||"")}" placeholder="e.g. make it 4 days of per diem, change the date to the 18th" autocomplete="off" enterkeyhint="go">${SR&&!micBlocked()?`<button class="btn sm ${st.rec?"armed":""}" data-act="vfMic" aria-label="Talk">${ICON.mic}</button>`:""}<button class="btn sm gold" data-act="vfGo" ${st.busy?"disabled":""}>${st.busy?'<span class="spin"></span>':"Change"}</button></div>
${st.err?`<div class="err" style="margin-top:6px">${esc(st.err)}</div>`:""}${st.done?`<div class="ok" style="margin-top:6px">${esc(st.done)}</div>`:""}</div>`;
}


/* ———————————— spelling & typos on lines ———————————— */
const PROOF_PROMPT=list=>`Proofread these invoice line descriptions for a Canadian touring musician. Fix spelling mistakes, typos, doubled or missing spaces and obvious capitalisation (place names like Saskatoon, Montréal; company names like Air Canada, Uber, BC Ferries, YVR). Keep the meaning, every number, symbols like @ x / $, and short forms like PD, w/, YVR, GST exactly as they are. Don't rephrase or add words. Reply with only a JSON array of the corrected strings, same order and count.\n\n${JSON.stringify(list)}`;
async function proofLines(idx,auto){
  const v=S.invEdit;if(!v||!S.sample)return;
  const items=idx.map(i=>v.items[i]).filter(it=>it&&String(it.desc||"").trim().length>2&&it._checked!==it.desc);if(!items.length)return;
  const before=items.map(it=>it.desc);
  let out;try{out=await S.sample.json(PROOF_PROMPT(before),{modelTier:"quick"})}catch{return}
  if(S.invEdit!==v||!Array.isArray(out))return;
  items.forEach((it,k)=>{const fixed=cleanText(out[k]);it._checked=it.desc;if(!fixed||it.desc!==before[k])return;
    const same=fixed.toLowerCase().replace(/\s/g,"")===String(it.desc).toLowerCase().replace(/\s/g,"")&&fixed===it.desc;if(same)return;
    if(Math.abs(fixed.length-it.desc.length)>Math.max(8,it.desc.length*.4))return;
    if(auto){it.desc=fixed;it._checked=fixed}else it.fix=fixed;
    const i=v.items.indexOf(it);const d=document.getElementById("ie-d"+i);if(auto&&d)d.value=it.desc;const h=document.getElementById("ie-h"+i);if(h)h.innerHTML=lineHint(it)});
}
const proofT={};
function queueProof(i){clearTimeout(proofT[i]);proofT[i]=setTimeout(()=>proofLines([i],false),400)}

function vInvEdit(){
  const v=S.invEdit,foreign=v.currency!=="CAD",t=invTotals(v);const ov=v.taxOverride!==null&&v.taxOverride!==undefined&&v.taxOverride!=="";
  return `<section class="panel hot">
<span class="plaque" style="cursor:default">${v.isNew?(v.imported?"Check imported invoice":"New invoice"):"Edit invoice"}</span>
${v.imported?`<p class="note" style="margin-top:10px">Read from your file. Check every number before saving.</p>`:""}
${v.voice?`<p class="note" style="margin:10px 0">Filled in from what you said. Check the client, email, date and every line, then Save. The Gmail draft button is on the next screen.</p>`:""}
<div style="margin-top:12px">${voiceFixBox(v)}</div>
<div class="grid3" style="margin-top:14px">
<div class="field"><label class="label" for="ie-num">Invoice #</label><input id="ie-num" data-bind="invEdit.number" value="${esc(v.number)}"></div>
<div class="field"><label class="label" for="ie-date">Date</label><input id="ie-date" type="date" data-bind="invEdit.date" value="${esc(v.date)}"></div>
<div class="field"><label class="label" for="ie-status">Status</label><select id="ie-status" data-bind="invEdit.status">${["quote","draft","sent","paid"].map(s=>`<option value="${s}" ${v.status===s?"selected":""}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}</select></div>
<div class="field"><label class="label" for="ie-client">Bill to</label><input id="ie-client" autocomplete="off" data-bind="invEdit.client" value="${esc(v.client)}" placeholder="Start typing a client or artist"><div class="sugg" id="sugg-client"></div></div>
<div class="field"><label class="label" for="ie-for">For</label><input id="ie-for" data-bind="invEdit.forLabel" value="${esc(v.forLabel)}" placeholder="Session guitar work"></div>
<div class="field"><label class="label" for="ie-email">Client email(s)</label><input id="ie-email" type="text" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" data-bind="invEdit.clientEmail" value="${esc(v.clientEmail)}" placeholder="Tap for suggestions, or type"><div class="sugg" id="sugg-email"></div></div>
<div class="field" style="grid-column:1/-1"><label class="label" for="ie-addr">Client address (shown under Bill to)</label><textarea id="ie-addr" data-bind="invEdit.clientAddress" placeholder="Street&#10;City, Province&#10;Postal code">${esc(v.clientAddress)}</textarea></div>
<div class="field"><label class="label" for="ie-cur">Currency</label><select id="ie-cur" data-act-change="invCurrency">${CURS.map(c=>`<option ${c===v.currency?"selected":""}>${c}</option>`).join("")}</select></div>
<div class="field"><label class="label" for="invEdit-tax">Tax</label>${taxSelect("invEdit",v,foreign)}</div>
</div>
${foreign?`<p class="note">Foreign-currency invoice: no GST/HST is charged, and it stays out of your GST/HST totals.</p>`:""}
<div class="label" style="margin:14px 0 8px">Lines: mark each as pay, per diem or reimbursement (GST goes on pay lines only)</div>
<div class="list">${v.items.map((it,i)=>`<div class="lineitem">
<input class="desc" id="ie-d${i}" placeholder="e.g. per diem $40/day x 3, show days x 5 @ 400" data-bind="invEdit.items.${i}.desc" value="${esc(it.desc)}" aria-label="Description">
<input id="ie-r${i}" class="mono" inputmode="decimal" placeholder="Amount" data-bind="invEdit.items.${i}.rate" value="${esc(it.rate)}" aria-label="Amount">
<select id="ie-y${i}" data-ty="${i}" aria-label="Line type">${LTYPES.map(([k,l])=>`<option value="${k}" ${lineType(it)===k?"selected":""}>${l}</option>`).join("")}</select>
<label class="chk"><input type="checkbox" id="ie-t${i}" data-tx="${i}" ${it.taxable!==false?"checked":""}> GST</label>
<button class="btn sm danger" data-act="rmLine" data-v="${i}" aria-label="Remove line">×</button><div class="lhint" id="ie-h${i}">${lineHint(it)}</div><div class="lrc" id="ie-rc${i}">${lineRcChip(it,i)}</div></div>`).join("")}</div>
<div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="addLine">+ Add line</button>
${ov?`<span class="note">Tax fixed at ${money(v.taxOverride)} as on the original. <button class="btn sm ghost" data-act="clearOverride">Recalculate</button></span>`:""}</div>
${rcBox(v)}
<div class="field" style="margin-top:14px"><label class="label" for="ie-notes">Note on the invoice (optional)</label><textarea id="ie-notes" data-bind="invEdit.notes">${esc(v.notes)}</textarea></div>
<div class="mono dim" id="ie-totals" style="margin:14px 0">${totalsLine(v,t)}</div>
<div class="row"><button class="btn gold" data-act="saveInv">Save invoice</button><button class="btn ghost" data-act="cancelInv">Cancel</button></div>
</section>`;
}
function totalsLine(v,t){return `Pay ${money(t.pay,v.currency)} · Per diem ${money(t.perdiem,v.currency)} · Reimb. ${money(t.reimb,v.currency)}<br>Subtotal ${money(t.sub,v.currency)}${t.tax?` · ${esc(v.taxType==="HST"?"HST":"GST")} ${money(t.tax,v.currency)}`:""} · <span style="color:var(--text);font-weight:600">Total ${money(t.total,v.currency)}</span>`}
const SHEET_CSS=`body{margin:0;background:#e9e9e9;font-family:Helvetica,Arial,sans-serif}.wrapx{max-width:720px;margin:20px auto;padding:0 12px}.stat{font-size:13px;color:#444;margin:0 0 10px;line-height:1.5}
.sheet{background:#fff;color:#111;border-radius:4px;padding:28px 26px 30px;max-width:680px;font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.35;overflow-x:auto}
.sheet .top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.sheet .nm{font-weight:800;font-size:30px;letter-spacing:.3px;line-height:1}
.sheet .inv{font-weight:800;font-size:30px;color:#8a8a8a;line-height:1}
.sheet .meta{display:flex;justify-content:space-between;gap:12px;margin-top:10px;flex-wrap:wrap}
.sheet .meta b{font-weight:700}
.sheet .bill{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:26px;font-weight:700}
.sheet table{width:100%;border-collapse:collapse;margin-top:30px}
.sheet table,.sheet th,.sheet td{color:#111;background:#fff;font-family:Helvetica,Arial,sans-serif;font-size:12px;text-align:left}
.sheet th{text-align:center!important}
@media (max-width:520px){.sheet{padding:20px 14px}.sheet .nm,.sheet .inv{font-size:24px}}
.sheet th{border:1px solid #111;font-weight:700;padding:4px 6px;font-size:11.5px}
.sheet td{border-left:1px solid #111;border-right:1px solid #111;padding:4px 6px;vertical-align:top}
.sheet td.a{text-align:right!important;width:92px;white-space:nowrap}
.sheet tr.fill td{height:150px}
.sheet tr.last td{border-bottom:1px solid #111}
.sheet tr.tax td{border:1px solid #111;border-top:none;text-align:right!important}
.sheet tr.tax td:first-child{border-left:none;border-bottom:1px solid #111}
.sheet tr.tot td{border:1px solid #111;text-align:right!important;font-weight:700}
.sheet tr.tot td:first-child{border-left:none;border-bottom:none}
.sheet .foot{margin-top:26px;font-size:11.5px}
.sheet .thanks{text-align:center;font-weight:700;margin-top:28px;font-size:11.5px}
`;
function invSig(inv){const x=JSON.stringify([inv.number,inv.client,inv.clientAddress,inv.clientEmail,inv.forLabel,inv.date,inv.items,inv.currency,inv.taxType,inv.taxRate,inv.taxOverride,inv.status,inv.notes,inv.paidNote]);let h=5381;for(let k=0;k<x.length;k++)h=((h<<5)+h+x.charCodeAt(k))|0;return String(h>>>0)}
function invoiceBackupHTML(inv){const t=invTotals(inv);return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docTitle(inv))} ${esc(inv.number)} ${esc(inv.client)}</title><style>${SHEET_CSS}${TPL_CSS}</style></head><body><div class="wrapx">
<p class="stat"><b>Status:</b> ${esc(inv.status)}${inv.paidNote?` · ${esc(inv.paidNote)}`:""} · Pay ${money(t.pay,inv.currency)} · Per diems ${money(t.perdiem,inv.currency)} · Reimbursements ${money(t.reimb,inv.currency)} · ${esc(inv.taxType==="HST"?"HST":"GST")} ${money(t.tax,inv.currency)}${emailsIn(inv.clientEmail).length?` · Sent to ${esc(emailsIn(inv.clientEmail).join(", "))}`:""}<br>Backed up by Guitar Man Finance on ${today()}${inv.gmailUrl?` · <a href="${esc(inv.gmailUrl)}">Original email</a>`:""}</p>
${sheetHTML(inv)}</div></body></html>`}
async function backupInvoice(id,quiet){return false;if(!dropboxOn())return false;
  const inv=S.invoices.find(x=>x.id===id);if(!inv||!S.mcp)return false;
  const sig=invSig(inv);if(inv.backup==="done"&&inv.bkSig===sig)return true;
  try{
    const y=yearOf(inv.date),cl=safeName(clientKey(inv.client));
    await ensureFolders([ROOT,ROOT+"/Invoices",`${ROOT}/Invoices/${y}`,`${ROOT}/Invoices/${y}/${cl}`]);
    const n=new Date(),stamp=`${today()} ${String(n.getHours()).padStart(2,"0")}${String(n.getMinutes()).padStart(2,"0")}`;
    const base=`${inv.date} ${inv.status==="quote"?"Quote":"Invoice"} ${safeName(inv.number)} ${cl}`;
    await dbxCreate(`${ROOT}/Invoices/${y}/${cl}/${base}${inv.bkSig?` (updated ${stamp})`:""}.html`,invoiceBackupHTML(inv));
    const cur=S.invoices.find(x=>x.id===id)||inv;await save({...cur,backup:"done",bkSig:sig,backupErr:""},true);if(!quiet)render(true);return true;
  }catch(e){const cur=S.invoices.find(x=>x.id===id)||inv;await save({...cur,backup:"failed",backupErr:mcpErr(e,"Dropbox")},true);if(!quiet)render(true);return false}
}
function autoBackupInv(id){return;if(dropboxOn())backupInvoice(id).then(ok=>{if(!ok){const i=S.invoices.find(x=>x.id===id);if(i&&i.backupErr)toast("Invoice saved, but the Dropbox copy failed: "+i.backupErr)}})}
async function backupAllInvoices(){
  if(!S.mcp){toast("Connected apps aren't available in this view. Open the page in Claude.");return}
  const list=S.invoices.filter(i=>!(i.backup==="done"&&i.bkSig===invSig(i))).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  if(!list.length){toast("Every invoice is already in Dropbox.");return}
  S.bulkInv={total:list.length,done:0,failed:0,stop:false};render(true);
  for(const i of list){if(S.bulkInv.stop)break;const ok=await backupInvoice(i.id,true);S.bulkInv.done++;if(!ok)S.bulkInv.failed++;
    if(S.bulkInv.failed>=3&&S.bulkInv.done===S.bulkInv.failed){S.bulkInv.err=(S.invoices.find(x=>x.id===i.id)||{}).backupErr||"Dropbox isn't accepting files right now.";break}render(true)}
  const b=S.bulkInv;S.bulkInv=null;toast(b.err?b.err:`Dropbox: ${b.done-b.failed} invoices saved${b.failed?`, ${b.failed} failed`:""}${b.stop?" (stopped early)":""}.`);render(true);
}
function vInvView(inv){
  const t=invTotals(inv),s=S.settings;const arm=S.armed==="inv:"+inv.id;
  if(S.mailFor!==inv.id){S.mailFor=inv.id;S.mailBody=isOverdue(inv)?reminderBody(inv):defaultMailBody(inv)}
  const bill=[inv.client,...String(inv.clientAddress||"").split("\n")].filter(Boolean);
  return `<div class="row"><button class="btn ghost" data-act="backInv">← Invoices</button>
<button class="btn gold" data-act="readBack" data-v="${inv.id}">Read back</button>
<button class="btn" data-act="pdfInv" data-v="${inv.id}">Print / save PDF</button>${rcCount(inv)?`<button class="btn" data-act="pdfRc" data-v="${inv.id}">Print receipts</button>`:""}
<button class="btn" data-act="editInv" data-v="${inv.id}">${ICON.pen}Edit</button>
${inv.status==="quote"?`<button class="btn gold" data-act="convertQuote" data-v="${inv.id}">Turn into invoice</button>`:""}
${inv.status==="draft"?`<button class="btn" data-act="status" data-v="${inv.id}" data-s="sent">Mark sent</button>`:""}
${inv.status==="quote"?"":inv.status!=="paid"?`<button class="btn green" data-act="status" data-v="${inv.id}" data-s="paid">Mark paid</button>`:`<button class="btn ghost" data-act="status" data-v="${inv.id}" data-s="sent">Mark unpaid</button>`}
<button class="btn ${arm?"armed":"danger"}" data-act="delInv" data-v="${inv.id}">${arm?"Tap again to delete":"Delete"}</button></div>
${inv.paidNote?`<div class="note">Payment: ${esc(inv.paidNote)}</div>`:""}
${inv.status==="sent"?`<div class="note ${isOverdue(inv)?"red":""}">Sent ${daysOut(inv)} days ago${isOverdue(inv)?". Over 30 days: the message below is set up as a friendly reminder.":"."}</div>`:""}
${inv.gmailUrl?`<div><a class="lnk" href="${esc(inv.gmailUrl)}" target="_blank" rel="noopener">Open the email this was sent in</a></div>`:""}
<div class="panel splitline"><span>Pay <b>${money(t.pay,inv.currency)}</b></span><span>Per diems <b>${money(t.perdiem,inv.currency)}</b></span><span>Expense reimbursements <b>${money(t.reimb,inv.currency)}</b></span><span>${esc(inv.taxType==="HST"?"HST":"GST")} <b>${money(t.tax,inv.currency)}</b></span></div>
${sheetHTML(inv)}
<section class="panel">
<div class="row" style="justify-content:space-between"><div class="label">Send it</div>${rbStatus(inv)}</div>
<div class="field" style="margin-top:8px"><label class="label" for="mail-to">To</label><input id="mail-to" value="${esc(inv._to??inv.clientEmail)}" data-mailto="${inv.id}" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="email" placeholder="Tap for suggestions"><div class="sugg" id="sugg-mailto"></div></div>
<div class="field" style="margin-top:8px"><label class="label" for="mail-body">Message</label><textarea id="mail-body" data-bind="mailBody" style="min-height:110px">${esc(S.mailBody)}</textarea></div>
${rcCount(inv)?`<label class="chk" style="margin-top:8px"><input type="checkbox" data-attachrc="1" ${S.attachRc!==false?"checked":""}> Attach the ${rcCount(inv)} receipt${rcCount(inv)===1?"":"s"}</label>
<div class="field" style="margin-top:8px"><label class="label" for="rc-mode">Emailed receipts go in as</label><select id="rc-mode" data-rcmode="1"><option value="best" ${(S.rcMode||"best")==="best"?"selected":""}>The original PDF if the email has one, otherwise a copy of the email</option><option value="snapshot" ${S.rcMode==="snapshot"?"selected":""}>A copy of the email (like a screenshot)</option><option value="summary" ${S.rcMode==="summary"?"selected":""}>A short summary page</option></select></div>`:""}
<div class="row" style="margin-top:10px">${gmailOn()?`<button class="btn gold" data-act="mail" data-v="${inv.id}" ${S.busy.mail?"disabled":""}>${S.busy.mail?'<span class="spin"></span> Creating Gmail draft…':ICON.mail+(isOverdue(inv)?"Create reminder draft with PDF":"Create Gmail draft with PDF")}</button>`:`<button class="btn gold" data-act="dlAll" data-v="${inv.id}">Print / save as PDF</button><button class="btn" data-act="copyMsg">Copy the message</button>`}</div>${gmailOn()?"":`<p class="note" style="margin-top:6px">Print or save the PDF (on a phone: Share › Print, then pinch to save as PDF), copy the message, and send it from your own email app.</p>`}
<div class="row" style="margin-top:8px">${OFFLINE?"":`<button class="btn sm" data-act="saveInvFiles" data-v="${inv.id}">${esc(saveWord())}${rcCount(inv)?`: invoice + ${rcCount(inv)} receipt${rcCount(inv)===1?"":"s"}`:": invoice PDF"}</button>`}</div>
${msgLine(S.invMail)}${msgLine(S.packetMsg||"")}
${S.invMail&&S.invMail.startsWith("err:")?`<p class="note" style="margin-top:6px">Gmail sometimes times out with big attachments. Check your Gmail Drafts first, since the draft may have been made anyway. To be safe, tap <b>${esc(saveWord())}</b> to keep the invoice PDF and the receipt files, then send them from any email app.</p>`:""}
</section>${rbPromptHTML(inv)}`;
}

/* ———————————— read back: proofread the invoice and its receipts before it goes out ———————————— */
const taxNm=inv=>inv.taxType==="HST"?"HST":"GST";
function rbChecks(inv){
  const t=invTotals(inv),cur=inv.currency||"CAD",out=[],add=(lvl,txt)=>out.push({lvl,txt});
  const items=inv.items||[],tn=taxNm(inv),rate=inv.taxType&&inv.taxType!=="None"?num(inv.taxRate):0;
  if(!String(inv.client||"").trim())add("bad","There's no name under Bill to.");
  const em=emailsIn(inv.clientEmail);
  if(inv.status!=="paid"){if(!em.length)add("warn","There's no client email yet, so there's nowhere to send it.");else add("ok",`Going to ${em.join(", ")}.`)}
  const num0=String(inv.number||"").trim();const dup=S.invoices.find(x=>x.id!==inv.id&&x.status!=="quote"&&inv.status!=="quote"&&String(x.number||"").trim()===num0);
  if(dup)add("bad",`Invoice #${num0} is already used on another invoice (${dup.client||"no name"}, ${fmtDate(dup.date,"mmm d, yyyy")}).`);
  if(!inv.date)add("bad","The invoice has no date.");else{const d=(Date.parse(inv.date)-Date.parse(today()))/864e5;if(d>14)add("warn",`It's dated ${fmtDate(inv.date,"mmm d, yyyy")}, more than two weeks from today.`);else if(d<-120&&inv.status==="draft")add("warn",`It's dated ${fmtDate(inv.date,"mmm d, yyyy")}, over four months ago.`)}
  const seen={},rcSeen={};
  items.forEach((it,i)=>{const n=i+1,d=String(it.desc||"").trim(),a=num(it.qty||1)*num(it.rate),ty=lineType(it),nm=d?`Line ${n} (${d.length>40?d.slice(0,38)+"…":d})`:`Line ${n}`;
    if(!d)add("warn",`Line ${n} has no description.`);
    if(!a)add("warn",`${nm} is $0.`);else if(a<0)add("warn",`${nm} is a negative amount. Fine if it's a discount or deposit.`);
    const q=parseQty(d);if(q){if(Math.abs(q.amt-a)>.005)add("bad",`${nm}: ${plain(q.rate)} × ${plain(q.n)} = ${money(q.amt,cur)}, but the line says ${money(a,cur)}.`);else add("ok",`Line ${n}: ${plain(q.rate)} × ${plain(q.n)} = ${money(q.amt,cur)}.`)}
    if(rate&&ty!=="pay"&&it.taxable!==false)add("warn",`${nm} is a ${ty==="reimb"?"reimbursement":"per diem"} with ${tn} on it. Usually only pay lines get ${tn}.`);
    if(rate&&ty==="pay"&&it.taxable===false)add("warn",`${nm} is pay but has no ${tn} on it.`);
    const k=d.toLowerCase()+"|"+a;if(d&&seen[k]!=null)add("warn",`Lines ${seen[k]+1} and ${n} are exactly the same. Billed twice?`);else seen[k]=i;
    const r=it.rid&&S.receipts.find(x=>x.id===it.rid);
    if(ty==="reimb"&&!r)add("warn",`${nm} is a reimbursement with no receipt attached.`);
    if(r){const rc=r.currency||"CAD";
      if(rcSeen[r.id]!=null)add("bad",`The ${r.vendor} receipt is attached to lines ${rcSeen[r.id]+1} and ${n}.`);rcSeen[r.id]=i;
      if(rc===cur&&Math.abs(num(r.total)-a)>.01)add("bad",`${nm} says ${money(a,cur)}, but the ${r.vendor} receipt is ${money(r.total,rc)}.`);
      else if(rc!==cur)add("warn",`The ${r.vendor} receipt is in ${rc} (${money(r.total,rc)}) and line ${n} is ${money(a,cur)} ${cur}. Check the conversion.`);
      else add("ok",`Line ${n} matches the ${r.vendor} receipt (${money(r.total,rc)}).`);
      if(r.billedTo&&r.billedTo!==inv.id){const o=S.invoices.find(x=>x.id===r.billedTo);if(o)add("bad",`The ${r.vendor} receipt is already billed on invoice #${o.number} (${o.client}).`)}
      if(r.date&&inv.date&&Math.abs(Date.parse(inv.date)-Date.parse(r.date))/864e5>120)add("warn",`The ${r.vendor} receipt is from ${fmtDate(r.date,"mmm d, yyyy")}, more than four months from the invoice date.`);
    }
  });
  if(cur==="CAD"){
    if(t.tax&&!String(S.settings.gstNumber||"").trim())add("warn",`You're charging ${tn}, but your GST/HST number isn't in Settings, so it won't be on the invoice.`);
    if(!t.tax&&t.pay>0&&String(S.settings.gstNumber||"").trim())add("warn",`There's no GST/HST on this invoice. You're registered, so check that's right.`);
    const ov=inv.taxOverride!==null&&inv.taxOverride!==undefined&&inv.taxOverride!=="";
    if(ov&&rate){const exp=items.reduce((s,it)=>s+(it.taxable===false?0:num(it.qty||1)*num(it.rate)),0)*rate/100;if(Math.abs(exp-t.tax)>.02)add("warn",`${tn} is fixed at ${money(t.tax)}; ${plain(rate)}% of the taxable lines would be ${money(exp)}.`)}
  }
  add("ok",`It adds up: ${money(t.sub,cur)}${t.tax?` + ${money(t.tax,cur)} ${tn}`:""} = ${money(t.total,cur)}${cur!=="CAD"?" "+cur:""}.`);
  return out;
}
function rbSpeech(inv){
  const t=invTotals(inv),cur=inv.currency||"CAD",m=x=>money(x,cur)+(cur!=="CAD"?" "+cur:"");const rc=rcsOf(inv);
  const parts=[`${inv.status==="quote"?"Quote":"Invoice"} number ${inv.number}, to ${inv.client||"no name yet"}, dated ${fmtDate(inv.date,"mmm d, yyyy")}${inv.forLabel?`, for ${inv.forLabel}`:""}.`];
  (inv.items||[]).forEach((it,i)=>parts.push(`Line ${i+1}: ${cleanText(it.desc)||"no description"}, ${m(num(it.qty||1)*num(it.rate))}${lineType(it)==="reimb"?", reimbursement":lineType(it)==="perdiem"?", per diem":""}.`));
  parts.push(`Total ${m(t.total)}. That's ${[t.pay?m(t.pay)+" pay":"",t.perdiem?m(t.perdiem)+" in per diems":"",t.reimb?m(t.reimb)+" in reimbursements":"",t.tax?m(t.tax)+" "+taxNm(inv):""].filter(Boolean).join(", ")}.`);
  parts.push(rc.length?`${rc.length} receipt${rc.length===1?"":"s"} attached: ${rc.map(x=>`${x.r.vendor}, ${money(x.r.total,x.r.currency)}`).join("; ")}.`:"No receipts attached.");
  const ck=rbChecks(inv).filter(c=>c.lvl!=="ok");const ai=S.rb&&S.rb.ai;const aiIss=ai&&ai.issues?ai.issues:[];
  if(ck.length||aiIss.length){parts.push(`${ck.length+aiIss.length} thing${ck.length+aiIss.length===1?"":"s"} to check.`);[...ck,...aiIss].forEach(c=>parts.push(c.txt))}else parts.push("Everything checks out.");
  return parts.join(" ");
}
function rbSay(text){const ss=window.speechSynthesis;if(!ss){toast("Reading aloud isn't available on this device.");return}
  if(ss.speaking){ss.cancel();S.rb&&(S.rb.speaking=false);rbDraw();return}
  const u=new SpeechSynthesisUtterance(text.replace(/\bGST\b/g,"G S T").replace(/\bHST\b/g,"H S T").replace(/#/g,"number "));
  const vs=ss.getVoices().filter(v=>v.localService!==false&&/^en/i.test(v.lang));const pick=vs.find(v=>/en-CA/i.test(v.lang))||vs.find(v=>v.default)||vs[0];if(pick)u.voice=pick;
  u.rate=1.02;u.onend=u.onerror=()=>{if(S.rb){S.rb.speaking=false;rbDraw()}};S.rb.speaking=true;ss.speak(u);rbDraw()}
const RB_PROMPT=(inv,rc)=>`You are proofreading an invoice a Canadian self-employed musician is about to send. Read it back in plain words and check it.

Invoice:
${JSON.stringify({number:inv.number,date:inv.date,status:inv.status,billTo:inv.client,clientAddress:inv.clientAddress,clientEmail:inv.clientEmail,for:inv.forLabel,currency:inv.currency,tax:inv.taxType==="None"?"none":`${inv.taxType} ${inv.taxRate}%`,lines:(inv.items||[]).map((it,i)=>({line:i+1,description:it.desc,amount:num(it.qty||1)*num(it.rate),type:lineType(it),taxed:it.taxable!==false,receipt:it.rid?(rc.find(x=>x.r.id===it.rid)||{}).r?.vendor||"attached":null})),note:inv.notes,totals:invTotals(inv)})}

Receipts attached:
${rc.length?rc.map(({r,it,idx})=>`- line ${idx+1}: ${r.vendor}, ${r.date}, ${r.total} ${r.currency||"CAD"}${r.note?`, "${r.note}"`:""}${r.category?`, category ${r.category}`:""}`).join("\n"):"none"}

Check: spelling and typos in the client name, descriptions and note; odd spacing or capitals; whether each receipt actually fits the line it's attached to (vendor, kind of expense, date near the work); per diem or quantity math written in a description; lines that look duplicated or missing; anything a client would question. Don't repeat simple facts as issues. Don't flag things that are fine.

Reply with only JSON: {"readback": "2 to 4 short sentences, friendly and plain, saying who it bills, for what, the total and how it breaks down", "issues": [{"level": "bad" or "warn", "text": "one short sentence, name the line number"}]}`;
async function rbAI(inv){const rb=S.rb;if(!rb||!S.sample)return;const sig=invSig(inv);S.rbCache=S.rbCache||{};
  if(S.rbCache[sig]){rb.ai=S.rbCache[sig];rbDraw();return}
  rb.ai={loading:true};rbDraw();
  try{const x=await S.sample.json(RB_PROMPT(inv,rcsOf(inv)),{cache:false});const ai={readback:cleanText(x&&x.readback||""),issues:(Array.isArray(x&&x.issues)?x.issues:[]).filter(i=>i&&i.text).slice(0,8).map(i=>({lvl:i.level==="bad"?"bad":"warn",txt:cleanText(String(i.text))}))};S.rbCache[sig]=ai;if(S.rb===rb){rb.ai=ai;rbDraw()}}
  catch(e){if(S.rb===rb){rb.ai={err:e&&e.code?sampleErr(e.code):"Claude couldn't read it back just now. The checks above still apply."};rbDraw()}}
}
async function rbLoadRc(inv){const rb=S.rb;for(const {r} of rcsOf(inv)){if(S.rb!==rb)return;const slot=rb.rc[r.id]={status:"loading"};rbDraw();
  try{if(r.hasImage){const u=await getImage(r.id);if(u){slot.url=u;slot.kind="photo"}}
    else if(r.gid&&S.mcp){const p=await emailParts(r.gid);
      if(p.pdfs.length){try{const bin=atob(p.pdfs[0].b64);const c=await pdfToCanvas(new Blob([binToBytes(bin)],{type:"application/pdf"}));slot.url=drawScaled(c,1200).toDataURL("image/jpeg",.8);slot.kind="the PDF from the email"}catch{}}
      if(!slot.url&&p.html){const s=await htmlSnapshot(p.html);slot.url=s.c.toDataURL("image/jpeg",.8);slot.kind="the email"}
      if(!slot.url&&p.text)slot.text=p.text.slice(0,1500)}
  }catch{}
  slot.status="done";rbDraw()}}
function rbOpen(id){const inv=S.invoices.find(i=>i.id===id);if(!inv)return;S.rbPrompt=null;S.rb={id,rc:{},ai:null,speaking:false};
  let el=$("#rbRoot");if(!el){el=document.createElement("div");el.id="rbRoot";document.body.appendChild(el)}
  document.body.classList.add("rbopen");rbDraw();el.querySelector(".rbsheet")?.focus();rbLoadRc(inv);rbAI(inv)}
function rbClose(){try{window.speechSynthesis&&window.speechSynthesis.cancel()}catch{}S.rb=null;const el=$("#rbRoot");if(el)el.innerHTML="";document.body.classList.remove("rbopen")}
function rbDraw(){const el=$("#rbRoot"),rb=S.rb;if(!el)return;if(!rb){el.innerHTML="";return}const inv=S.invoices.find(i=>i.id===rb.id);if(!inv){rbClose();return}
  const sc=el.querySelector(".rbsheet");const top=sc?sc.scrollTop:0;
  const ck=rbChecks(inv),bad=ck.filter(c=>c.lvl==="bad"),warn=ck.filter(c=>c.lvl==="warn"),good=ck.filter(c=>c.lvl==="ok");
  const ai=rb.ai,aiIss=ai&&ai.issues||[];const nBad=bad.length+aiIss.filter(i=>i.lvl==="bad").length,nAll=bad.length+warn.length+aiIss.length;
  const ico={bad:"✕",warn:"!",ok:"✓"};const li=c=>`<li class="rb-${c.lvl}"><span class="rbico" aria-hidden="true">${ico[c.lvl]}</span><span>${esc(c.txt)}</span></li>`;
  const t=invTotals(inv),cur=inv.currency||"CAD";const rcs=rcsOf(inv);
  el.innerHTML=`<div class="rbback" data-act="rbClose"></div><div class="rbsheet" role="dialog" aria-modal="true" aria-label="Read back" tabindex="-1">
<div class="rbhead"><div><div class="label">Read back</div><div class="rbtitle">${inv.status==="quote"?"Quote":"Invoice"} #${esc(inv.number)} · ${esc(inv.client||"no name")}</div></div><button class="btn sm ghost" data-act="rbClose" aria-label="Close">Close</button></div>
<div class="rbverdict ${nBad?"bad":nAll?"warn":ai&&ai.loading?"":"good"}">${nBad?`<b>${nBad} thing${nBad===1?"":"s"} to fix</b>${nAll>nBad?` and ${nAll-nBad} to check`:""} before you send it.`:nAll?`<b>${nAll} thing${nAll===1?"":"s"} to check.</b> Nothing looks wrong, just worth a look.`:ai&&ai.loading?`The basics check out. Claude is still reading it…`:`<b>Everything checks out.</b> ${money(t.total,cur)}${cur!=="CAD"?" "+cur:""} to ${esc(inv.client||"")}${rcs.length?`, with ${rcs.length} receipt${rcs.length===1?"":"s"}`:""}.`}</div>
<div class="row" style="margin:10px 0 4px"><button class="btn sm" data-act="rbSay">${rb.speaking?"■ Stop reading":"🔊 Read it aloud"}</button></div>
${S.sample?`<div class="rbai">${!ai||ai.loading?`<span class="note"><span class="spin"></span> Claude is reading it back…</span>`:ai.err?`<span class="note">${esc(ai.err)}</span>`:`<p>${esc(ai.readback)}</p>`}</div>`:""}
${bad.length||warn.length||aiIss.length?`<ul class="rblist">${[...bad,...aiIss.filter(i=>i.lvl==="bad"),...warn,...aiIss.filter(i=>i.lvl!=="bad")].map(li).join("")}</ul>`:""}
<details class="rbok"><summary class="note">${good.length} check${good.length===1?"":"s"} passed</summary><ul class="rblist">${good.map(li).join("")}</ul></details>
<div class="label" style="margin:16px 0 8px">The invoice</div>
<div class="rbdoc">${sheetHTML(inv)}</div>
<div class="label" style="margin:18px 0 8px">${rcs.length?`Receipts going with it (${rcs.length})`:"Receipts"}</div>
${rcs.length?rcs.map(({r,it,idx},k)=>{const s=rb.rc[r.id]||{status:"loading"};const amt=num(it.qty||1)*num(it.rate);const match=(r.currency||"CAD")===cur&&Math.abs(num(r.total)-amt)<=.01;
  return `<div class="rbrc"><div class="rbrchead"><span><b>${k+1}. ${esc(r.vendor)}</b> <span class="dim">· ${esc(fmtDate(r.date,"mmm d, yyyy"))} · ${money(r.total,r.currency)}${(r.currency||"CAD")!=="CAD"?" "+esc(r.currency):""}</span></span><span class="${match?"ok":"note"}">Line ${idx+1}: ${money(amt,cur)} ${match?"✓":""}</span></div>
${s.status==="loading"?`<div class="note" style="padding:14px"><span class="spin"></span> Loading the receipt…</div>`:s.url?`<img src="${s.url}" alt="${esc(r.vendor)} receipt"><div class="note" style="padding:4px 2px 0">Showing ${esc(s.kind)}.</div>`:`<div class="rbsum">${[["Vendor",r.vendor],["Date",fmtDate(r.date,"mmm d, yyyy")],["Total",money(r.total,r.currency)+" "+(r.currency||"CAD")],["GST/HST",num(r.taxPaid)?money(r.taxPaid,r.currency):"none shown"],["What it was",r.note||r.category]].map(([a,b])=>`<div><span class="dim">${a}</span><span>${esc(b)}</span></div>`).join("")}${s.text?`<pre>${esc(s.text)}</pre>`:""}<p class="note" style="margin:6px 0 0">${r.gid&&!S.mcp?"The email copy can only be opened in the version connected to Gmail.":r.gid?"Couldn't open the email copy, so this is the summary.":"No photo saved with this receipt."}</p></div>`}</div>`}).join(""):`<p class="note">No receipts attached. ${t.reimb?"This invoice has reimbursement lines, so you may want to attach them.":""}</p>`}
<div class="rbfoot"><button class="btn gold" data-act="rbOk">${nBad?"Send it anyway":"Looks good"}</button><button class="btn" data-act="rbFix">Fix something</button></div>
</div>`;
  const ns=el.querySelector(".rbsheet");if(ns)ns.scrollTop=top;
}
function rbPromptHTML(inv){return S.rbPrompt===inv.id&&!S.rb?`<div class="rbpop" role="status"><span><b>${inv.status==="quote"?"Quote":"Invoice"} saved.</b> Read it back before you send it?</span><span class="row" style="gap:8px;flex-wrap:nowrap"><button class="btn sm gold" data-act="readBack" data-v="${inv.id}">Read back</button><button class="btn sm ghost" data-act="rbLater">Not now</button></span></div>`:""}
function rbStatus(inv){return inv.rbSig&&inv.rbSig===invSig(inv)?`<span class="ok">✓ Read back and checked</span>`:`<span class="note">Not read back yet. <button class="btn sm ghost" data-act="readBack" data-v="${inv.id}">Read back</button></span>`}

/* receipts */
function vReceipts(){
  const RL=reimbLines();
  const d=S.recDraft,q=S.recSearch.trim().toLowerCase();
  const rec=S.receipts.filter(r=>yearOf(r.date)===S.year).filter(r=>S.recFilter==="All"||(S.recFilter==="Needs review"?r.needsReview:S.recFilter==="Billed to clients"?!!r.billedTo:S.recFilter==="Maybe billed to clients"?!!billMatch(r,RL):r.category===S.recFilter)).filter(r=>!q||(r.vendor+" "+r.note+" "+r.category).toLowerCase().includes(q)).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||0)-(a.createdAt||0));
  const st=yearStats(S.year);const notBacked=S.receipts.filter(r=>r.backup!=="done").length;
  const sy=S.sync,bk=S.bulk;
  return `<div class="row">${captureButtons()}${syncButton()}<button class="btn ghost" data-act="manualRec">${ICON.pen}Add without photo</button></div>
${syncPanel()}
${(()=>{const n=S.receipts.filter(r=>yearOf(r.date)===S.year&&billMatch(r,RL)).length;return n&&S.recFilter!=="Maybe billed to clients"?`<div class="panel hot row" style="justify-content:space-between"><span><b>${n}</b> receipts match reimbursement lines on your invoices. Linking them keeps them out of your own write-offs.</span><button class="btn sm gold" data-act="showMaybeBilled">Check them</button></div>`:""})()}
${d?`<div id="recDraftBox" style="scroll-margin-top:12px">${vDraft(d)}</div>`:""}
${S.imgView?`<div class="panel">${S.imgView.loading?'<span class="spin"></span> Loading the photo…':S.imgView.url?`<img class="shot" src="${S.imgView.url}" alt="Receipt photo">`:'<div class="note">No saved photo for this receipt.</div>'}<div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="closeImg">Close</button></div></div>`:""}
<div class="row">${yearPicker()}</div>
<div class="row"><select id="recFilter" style="width:auto" data-act-change="recFilter" aria-label="Filter"><option>All</option><option ${S.recFilter==="Needs review"?"selected":""}>Needs review</option><option ${S.recFilter==="Billed to clients"?"selected":""}>Billed to clients</option><option ${S.recFilter==="Maybe billed to clients"?"selected":""}>Maybe billed to clients</option>${CATS.map(c=>`<option ${c===S.recFilter?"selected":""}>${esc(c)}</option>`).join("")}</select>
<input id="recSearch" type="search" placeholder="Search vendor or note" value="${esc(S.recSearch)}" data-search="1" style="flex:1;min-width:160px"></div>

${st.cats.length?`<details class="panel"><summary class="label" style="cursor:pointer">${S.year} write-offs by category (CAD, before tax) · ${money(st.expenses)}</summary>${st.cats.map(([c,v])=>`<div class="rowline"><span>${esc(c)}</span><span class="mono">${money(v)}</span></div>`).join("")}<div class="rowline dim"><span>${PERSONAL}</span><span class="mono">${money(st.personal)}</span></div></details>`:""}
<div class="row" style="justify-content:space-between"><p class="note" style="margin:0">${rec.length} shown${(()=>{const n=rec.filter(r=>r.needsReview).length;return n?` · ${n} to check`:""})()}</p>${(()=>{const n=rec.filter(r=>r.needsReview).length;return n?`<button class="btn sm ${S.armed==="revAll"?"armed":"ghost"}" data-act="revAll">${S.armed==="revAll"?`Tap again to say yes to all ${n}`:`Yes to all ${n} shown`}</button>`:""})()}</div>
${rec.length?`<div class="list">${rec.map(r=>{const arm=S.armed==="rec:"+r.id;const m=billMatch(r,RL);return `<div class="panel item">
<span class="mono dim" style="font-size:12.5px;min-width:86px">${esc(r.date)}</span>
<span class="grow">${esc(r.vendor)}${r.note?`<span class="dim"> · ${esc(r.note)}</span>`:""}<br><span class="${isPersonal(r)?"dim":"goldc"}" style="font-size:12.5px">${esc(r.category)}</span>${r.needsReview?' <span class="chip ice">Check</span>':""}${r.url?` <a class="lnk" href="${esc(r.url)}" target="_blank" rel="noopener">email</a>`:""}</span>
${!isCAD(r)?`<span class="chip goldc">${esc(r.currency)}</span>`:""}
<span class="mono">${money(r.total,r.currency)}</span>
${r.hasImage?`<button class="btn sm ghost" data-act="viewImg" data-v="${r.id}">Photo</button>`:""}
${OFFLINE?"":`<button class="btn sm ghost" data-act="saveRcFile" data-v="${r.id}" title="${esc(saveWord())}">Save</button>`}<button class="btn sm ghost" data-act="editRec" data-v="${r.id}">Edit</button>
<button class="btn sm ${arm?"armed":"danger"}" data-act="delRec" data-v="${r.id}" aria-label="Delete receipt">${arm?"Tap again":"×"}</button>${!r.billedTo&&!m&&S.billPick!==r.id&&!r.needsReview&&!isPersonal(r)?`<button class="btn sm ghost" data-act="billPick" data-v="${r.id}">Billed?</button>`:""}${billBar(r,m)}${r.needsReview&&S.billPick!==r.id?revBar(r):""}</div>`}).join("")}</div>`
:(!d?`<div class="panel empty"><h2>No receipts match</h2><p class="note">Change the filter, take a photo of a receipt, or check Gmail for new ones.</p></div>`:"")}`;
}
function reimbLines(){
  const taken=new Set(S.receipts.filter(r=>r.billedTo&&r.billedLine!=null).map(r=>r.billedTo+"#"+r.billedLine));
  const out=[];S.invoices.filter(i=>i.status!=="quote").forEach(i=>(i.items||[]).forEach((it,idx)=>{if(lineType(it)==="reimb"&&!it.rid&&!taken.has(i.id+"#"+idx))out.push({inv:i,idx,it,amt:num(it.qty||1)*num(it.rate)})}));return out;
}
const dayDiff=(a,b)=>Math.round((Date.parse(a+"T12:00:00")-Date.parse(b+"T12:00:00"))/864e5);
function billMatch(r,lines){if(r.billedTo||r.notBilled||isPersonal(r))return null;let best=null;for(const l of (lines||reimbLines())){const dd=dayDiff(l.inv.date,r.date);if(Math.abs(l.amt-num(r.total))<=.01&&dd>=-30&&dd<=100&&(!best||Math.abs(dd)<Math.abs(best.dd)))best={...l,dd}}return best}
function billPicker(r){
  const lines=reimbLines().map(l=>({...l,dd:dayDiff(l.inv.date,r.date)})).filter(l=>l.dd>=-45&&l.dd<=120).sort((a,b)=>(Math.abs(a.amt-num(r.total))<=.01?0:1)-(Math.abs(b.amt-num(r.total))<=.01?0:1)||Math.abs(a.dd)-Math.abs(b.dd)).slice(0,12);
  const invs=S.invoices.filter(i=>i.status!=="quote").map(i=>({i,dd:dayDiff(i.date,r.date)})).filter(x=>x.dd>=-45&&x.dd<=120).sort((a,b)=>Math.abs(a.dd)-Math.abs(b.dd)).slice(0,6);
  return `<div class="revbar" style="flex-direction:column;align-items:stretch"><span class="note">Which invoice did you bill this on?</span>
${lines.map(l=>`<button class="suggbtn" data-act="billLink" data-v="${r.id}" data-inv="${l.inv.id}" data-line="${l.idx}"><b>#${esc(l.inv.number)} ${esc(l.inv.client)} · ${money(l.amt)}${Math.abs(l.amt-num(r.total))<=.01?" ✓ same amount":""}</b><span class="dim">${esc(l.inv.date)} · ${esc(l.it.desc)}</span></button>`).join("")||'<span class="note">No reimbursement lines on invoices near this date.</span>'}
${invs.length?`<span class="note" style="margin-top:4px">Or link it to an invoice without picking a line:</span><div class="row">${invs.map(x=>`<button class="btn sm ghost" data-act="billLink" data-v="${r.id}" data-inv="${x.i.id}" data-line="">#${esc(x.i.number)} ${esc(x.i.client)}</button>`).join("")}</div>`:""}
<div class="row"><button class="btn sm ghost" data-act="billCancel">Cancel</button></div></div>`;
}
function billBar(r,m){
  if(S.billPick===r.id)return billPicker(r);
  if(r.billedTo){const i=S.invoices.find(x=>x.id===r.billedTo);return `<div class="revbar"><span class="chip goldc">Billed back</span><span class="note">On ${i?`invoice #${esc(i.number)} ${esc(i.client)}`:esc(r.billedLabel||"an invoice")}${i&&r.billedLine!=null&&i.items[r.billedLine]?` · ${esc(i.items[r.billedLine].desc)}`:""}. Not counted in your own write-offs.</span><button class="btn sm ghost" data-act="unbill" data-v="${r.id}">Not billed — undo</button></div>`}
  if(m)return `<div class="revbar"><span class="note">Looks like this is on <b>invoice #${esc(m.inv.number)} ${esc(m.inv.client)}</b> as “${esc(m.it.desc)}”.</span><button class="btn sm gold" data-act="billLink" data-v="${r.id}" data-inv="${m.inv.id}" data-line="${m.idx}">Yes, I billed it</button><button class="btn sm ghost" data-act="billNo" data-v="${r.id}">No, it's my cost</button></div>`;
  return "";
}
function revBar(r){
  if(S.revNo===r.id)return `<div class="revbar"><span class="note">What's wrong with it?</span><button class="btn sm" data-act="revPersonal" data-v="${r.id}">It's personal</button><button class="btn sm" data-act="billPick" data-v="${r.id}">I billed it to a client</button><button class="btn sm danger" data-act="revDelete" data-v="${r.id}">Not a real receipt — remove</button><button class="btn sm ghost" data-act="revEditOne" data-v="${r.id}">Fix details</button><button class="btn sm ghost" data-act="revCancel">Back</button></div>`;
  return `<div class="revbar"><span class="note">Right category?</span><select data-revcat="${r.id}" aria-label="Category" style="width:auto;max-width:230px;padding:6px 8px;font-size:13.5px">${CATS.map(c=>`<option ${c===r.category?"selected":""}>${esc(c)}</option>`).join("")}</select><button class="btn sm green" data-act="revYes" data-v="${r.id}">✓ Yes</button><button class="btn sm danger" data-act="revNo" data-v="${r.id}">✗ No</button>${r.billedTo?"":`<button class="btn sm ghost" data-act="billPick" data-v="${r.id}">Billed to a client</button>`}</div>`;
}
function vDraft(d){
  if(d.status==="preparing")return `<div class="panel hot"><span class="spin"></span> Opening the photo…</div>`;
  const reading=d.status==="reading";
  return `<section class="panel hot">
<div class="row" style="align-items:flex-start;gap:16px">${d.preview?`<img class="thumb" src="${d.preview}" alt="Receipt photo">`:""}
<div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px"><span class="plaque" style="cursor:default;align-self:flex-start">${d.editOf?"Edit receipt":"Check &amp; file"}</span>
${reading?`<div class="note"><span class="spin"></span> Reading the receipt. Usually 10 to 40 seconds.</div><div><button class="btn sm ghost" data-act="stopRead">Stop</button></div>`:""}
${d.status==="read"?`<div class="ok">Read it. Check the numbers, then file it.</div>`:""}${d.err?`<div class="err">${esc(d.err)}</div>`:""}</div></div>
<div class="grid3" style="margin-top:14px">
<div class="field"><label class="label" for="rd-vendor">Vendor</label><input id="rd-vendor" data-bind="recDraft.vendor" value="${esc(d.vendor)}" ${reading?"disabled":""}></div>
<div class="field"><label class="label" for="rd-date">Date</label><input id="rd-date" type="date" data-bind="recDraft.date" value="${esc(d.date)}" ${reading?"disabled":""}></div>
<div class="field"><label class="label" for="rd-cur">Currency</label><select id="rd-cur" data-bind="recDraft.currency" data-rerender="1" ${reading?"disabled":""}>${CURS.map(c=>`<option ${c===d.currency?"selected":""}>${c}</option>`).join("")}</select></div>
<div class="field"><label class="label" for="rd-total">Total paid (with tax)</label><input id="rd-total" class="mono" inputmode="decimal" data-bind="recDraft.total" value="${esc(d.total)}" ${reading?"disabled":""}></div>
<div class="field"><label class="label" for="rd-tax">${d.currency==="CAD"?"GST/HST on receipt":"Foreign tax (not claimable)"}</label><input id="rd-tax" class="mono" inputmode="decimal" data-bind="recDraft.taxPaid" value="${esc(d.taxPaid)}" ${reading?"disabled":""}></div>
${(S.settings.streams||[]).some(x=>x.type==="business")?`<div class="field"><label class="label" for="rd-stream">Which business?</label><select id="rd-stream" data-bind="recDraft.stream"><option value="">${esc(S.settings.tagline||"Music")} (main)</option>${(S.settings.streams||[]).filter(x=>x.type==="business").map(x=>`<option value="${x.id}" ${d.stream===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></div>`:""}
<div class="field"><label class="label" for="rd-cat">Category</label><select id="rd-cat" data-bind="recDraft.category" data-rerender="1" ${reading?"disabled":""}>${CATS.map(c=>`<option ${c===d.category?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
<div class="field" style="grid-column:1/-1"><label class="label" for="rd-note">Note</label><input id="rd-note" data-bind="recDraft.note" value="${esc(d.note)}" placeholder="What it was for" ${reading?"disabled":""}></div></div>
${d.currency!=="CAD"?`<p class="note">Foreign receipt: kept as a record; its tax never enters your GST/HST claim.</p>`:""}
${d.category===PERSONAL?`<p class="note">Personal items stay out of write-offs and GST/HST credits.</p>`:""}
${d.category==="Vehicle & fuel"?`<p class="note">Vehicle costs count at your business-use % (${Math.round(factors(yearOf(d.date)).veh*100)}%), set on the Mileage tab.</p>`:""}
${d.category==="Home studio (workspace-in-home)"?`<p class="note">Home studio costs count at the studio's share of your home (${Math.round(factors(yearOf(d.date)).home*100)}%), set in Settings.</p>`:""}
${d.category==="Meals & entertainment"?`<p class="note">Meals &amp; entertainment GST/HST is claimed at 50%.</p>`:""}
<div class="row" style="margin-top:6px"><button class="btn gold" data-act="fileRec" ${reading?"disabled":""}>${d.editOf?"Save":"File it"}</button>
${d.blob&&S.sample&&S.canImages&&!reading?`<button class="btn" data-act="readAgain">Read again</button>`:""}
<button class="btn ghost" data-act="discardRec">${d.editOf?"Cancel":"Discard"}</button></div></section>`;
}

/* gst */
function vGst(){
  const st=yearStats(S.year);
  return `<div class="row">${yearPicker()}</div>
<div class="grid3">
<div class="panel"><div class="label">GST/HST collected</div><div class="big goldc">${money(st.collected)}</div><div class="note">On sent and paid invoices</div></div>
<div class="panel"><div class="label">Input tax credits</div><div class="big green">${money(st.claimed)}</div><div class="note">GST/HST paid on business receipts</div></div>
<div class="panel"><div class="label">${st.net>=0?"Net owing":"Net refund"}</div><div class="big ${st.net>=0?"red":"green"}">${money(Math.abs(st.net))}</div><div class="note">For ${S.year}</div></div></div>
<div class="panel"><div class="label" style="margin-bottom:8px">By quarter</div>
<div class="tablebox"><table class="q"><thead><tr><th>Period</th><th>Collected</th><th>ITCs</th><th>Net</th></tr></thead><tbody>
${st.quarters.map(x=>`<tr><td>Q${x.q} ${S.year}</td><td>${money(x.c)}</td><td>${money(x.cl)}</td><td class="${x.net>0?"red":x.net<0?"green":"dim"}">${money(x.net)}</td></tr>`).join("")}
</tbody></table></div>
<p class="note" style="margin-top:12px;max-width:70ch">Only CAD invoices (sent or paid) and CAD business receipts count. Foreign-currency items, foreign taxes and personal items are left out. Meals &amp; entertainment credits count at 50%${st.mealsTax?` (${money(st.mealsTax)} paid, ${money(st.mealsTax*.5)} claimable)`:""}. Vehicle credits follow your business-use % (${Math.round(st.f.veh*100)}%). Some GST amounts from emailed receipts (mostly Uber rides and Amazon orders) were estimated from the total. This is a working tally, not a filed return.</p></div>`;
}

/* settings */
function vSettings(){
  if(!S.sfDirty||!S.sf)S.sf={...S.settings};const s=S.sf;const th=themeNow();
  return `<section class="panel" style="max-width:720px"><span class="plaque" style="cursor:default">Look</span>
<div class="themepick" role="radiogroup" aria-label="Theme">${THEMES.map(([k,n,d,sw,cls])=>`<button type="button" class="themecard ${cls} ${th===k?"on":""}" role="radio" aria-checked="${th===k}" data-act="setTheme" data-v="${k}"><span class="nm">${n}</span><span class="sw">${sw.map(c=>`<i style="background:${c}"></i>`).join("")}</span><small>${d}</small></button>`).join("")}</div></section>
<section class="panel" style="max-width:640px"><span class="plaque" style="cursor:default">Your invoice details</span>
<div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">
<div class="field"><label class="label" for="st-name">Name at the top of invoices</label><input id="st-name" data-bind="sf.businessName" value="${esc(s.businessName)}"></div>
<div class="field"><label class="label" for="st-tag">Business name in the thank-you line</label><input id="st-tag" data-bind="sf.tagline" value="${esc(s.tagline)}"></div>
<div class="field"><label class="label" for="st-addr">Your address</label><textarea id="st-addr" data-bind="sf.address">${esc(s.address)}</textarea></div>
<div class="grid3"><div class="field"><label class="label" for="st-phone">Phone</label><input id="st-phone" data-bind="sf.phone" value="${esc(s.phone)}"></div>
<div class="field"><label class="label" for="st-email">Email</label><input id="st-email" type="email" data-bind="sf.email" value="${esc(s.email)}"></div>
<div class="field"><label class="label" for="st-gst">GST/HST number</label><input id="st-gst" class="mono" data-bind="sf.gstNumber" value="${esc(s.gstNumber)}"></div></div>
<div class="grid3"><div class="field"><label class="label" for="st-tl">Tax line label</label><input id="st-tl" data-bind="sf.taxLabel" value="${esc(s.taxLabel)}"></div>
<div class="field"><label class="label" for="sf-tax">Default tax</label>${taxSelect("sf",{taxType:s.defaultTaxType,taxRate:s.defaultTaxRate},false)}</div>
<div class="field"><label class="label" for="st-cur">Default currency</label><select id="st-cur" data-bind="sf.defaultCurrency">${CURS.map(c=>`<option ${c===s.defaultCurrency?"selected":""}>${c}</option>`).join("")}</select></div></div>
<div class="row"><button class="btn gold" data-act="saveSettings">Save</button>${S.sfDirty?`<button class="btn ghost" data-act="resetSettings">Undo changes</button>`:""}</div></div></section>
<section class="panel" style="max-width:640px"><span class="plaque" style="cursor:default">Home studio &amp; goals</span>
<div class="grid3" style="margin-top:14px">
<div class="field"><label class="label" for="st-home">Studio share of home %</label><input id="st-home" class="mono" inputmode="decimal" data-bind="sf.homePct" value="${esc(s.homePct)}" placeholder="e.g. 15"></div>
<div class="field"><label class="label" for="st-rent">Monthly rent</label><input id="st-rent" class="mono" inputmode="decimal" data-bind="sf.rentMonthly" value="${esc(s.rentMonthly)}"></div>
<div class="field"><label class="label" for="st-util">Monthly hydro, heat &amp; tenant insurance</label><input id="st-util" class="mono" inputmode="decimal" data-bind="sf.utilMonthly" value="${esc(s.utilMonthly)}"></div>
<div class="field"><label class="label" for="st-goal">Yearly income goal (pay)</label><input id="st-goal" class="mono" inputmode="decimal" data-bind="sf.incomeGoal" value="${esc(s.incomeGoal)}" placeholder="e.g. 70000"></div></div>
<p class="note" style="margin-top:10px">Studio share = studio floor area ÷ whole home. That share of rent and utilities, plus receipts in Home studio, becomes your business-use-of-home write-off.</p>
<div class="row" style="margin-top:10px"><button class="btn gold" data-act="saveSettings">Save</button></div></section>
${vCustomize()}
<section class="panel" style="max-width:640px"><div class="label">Bring in earlier books</div>
<p class="note" style="margin:6px 0 10px">${OFFLINE?"Load a backup file (.json) you saved from this app before, on this device or another one.":"Load a books backup file (.json) from Dropbox › Guitar Man Finance › Backups."}</p>
<label tabindex="0" role="button" class="btn" for="jsonIn">${ICON.up}Load backup file</label>${msgLine(S.msg.import)}</section>

${streamsSettings()}
${privacySection()}`;
}


/* ———————————— client & email suggestions ———————————— */
let suggT,suggSeq=0;
const junkRe=/no-?reply|notifications?@|mailer-daemon|bounce|donotreply|@(.*\.)?(facebook|instagram|google|apple|amazon|uber|interac|paypal|squareup|stripe)\./i;
function emailsIn(s){return (String(s||"").match(/[^@\s<>"',;]+@[^@\s<>"',;]+\.[a-z]{2,}/gi)||[]).map(x=>x.toLowerCase())}
function clientBook(){const m=new Map();[...S.invoices].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach(i=>{const n=String(i.client||"").trim();if(!n)return;const k=n.toLowerCase(),prev=m.get(k)||{};m.set(k,{client:n,email:i.clientEmail||prev.email||"",address:i.clientAddress||prev.address||""})});return[...m.values()]}
function suggTarget(){
  const a=document.activeElement&&document.activeElement.id;
  if(a==="mail-to"){const inv=S.invoices.find(i=>i.id===S.invViewId);if(!inv)return null;const val=document.activeElement.value||"";const typed=val.split(/[,;]/).pop().trim();return typed&&!emailsIn(typed).length?{box:"mailto",q:typed,kind:"addr",ctx:"view",cur:val}:{box:"mailto",q:String(inv.client||"").trim(),kind:"name",ctx:"view",cur:val}}
  const v=S.invEdit;if(!v)return null;
  const typed=String(v.clientEmail||"").split(/[,;]/).pop().trim();
  if(a==="ie-client")return{box:"client",q:String(v.client||"").trim(),kind:"name"};
  if(a==="ie-email")return typed?{box:"email",q:typed,kind:"addr"}:{box:"email",q:String(v.client||"").trim(),kind:"name"};
  return null;
}
function queueSuggest(now){clearTimeout(suggT);suggT=setTimeout(runSuggest,now?0:350)}
async function runSuggest(){
  const tg=suggTarget();if(!tg){S.sugg=null;drawSugg();return}
  const v=S.invEdit,seq=++suggSeq,ql=tg.q.toLowerCase(),have=new Set(emailsIn(tg.ctx==="view"?tg.cur:(v?v.clientEmail:"")));
  let local=[];
  if(tg.box==="client"){if(ql)local=clientBook().filter(c=>c.client.toLowerCase().includes(ql)).slice(0,5).map(c=>({kind:"client",...c}))}
  else if(tg.kind==="name"){if(ql)local=[...new Set(clientBook().filter(c=>c.client.toLowerCase().includes(ql)).flatMap(c=>emailsIn(c.email)))].filter(e=>!have.has(e)).slice(0,5).map(e=>({kind:"email",email:e,note:"used on a past invoice"}))}
  else local=[...new Set(S.invoices.flatMap(i=>emailsIn(i.clientEmail)))].filter(e=>e.includes(ql)&&!have.has(e)).slice(0,5).map(e=>({kind:"email",email:e,note:"used on a past invoice"}));
  const canGmail=gmailOn()&&ql.replace(/[^a-z0-9]/g,"").length>=3;
  S.sugg={...tg,local,gmail:[],loading:canGmail,err:""};drawSugg();
  if(!canGmail)return;
  const q=tg.q.replace(/["()]/g," ").trim();
  const query=tg.kind==="name"?`(to:"${q}" OR from:"${q}" OR "${q}")`:`(to:${q} OR from:${q})`;
  let p;
  try{p=pl(await S.mcp.callTool("Gmail","search_threads",{query,pageSize:25,view:"THREAD_VIEW_METADATA_ONLY"}))}
  catch(e){if(seq!==suggSeq||!S.sugg)return;S.sugg.loading=false;S.sugg.err=mcpErr(e,"Gmail");drawSugg();return}
  if(seq!==suggSeq||!S.sugg)return;
  const me=String(S.settings.email||"").toLowerCase(),score=new Map(),toks=ql.split(/[^a-z0-9]+/).filter(x=>x.length>=3);
  const add=(raw,w)=>{const e=emailsIn(raw)[0];if(!e||e===me||junkRe.test(e))return;score.set(e,(score.get(e)||0)+w)};
  (p.threads||[]).forEach(t=>(t.messages||[]).forEach(m=>{
    const sent=(m.labelIds||[]).includes("SENT")||emailsIn(m.sender)[0]===me;
    if(sent){(m.toRecipients||[]).forEach(a=>add(a,3));(m.ccRecipients||[]).forEach(a=>add(a,1.5))}
    else{add(m.sender,1);(m.ccRecipients||[]).forEach(a=>add(a,.3))}
  }));
  let list=[...score.entries()];
  if(tg.kind==="addr")list=list.filter(([e])=>e.includes(ql));
  list=list.map(([e,s])=>[e,s+(toks.some(k=>e.split("@")[0].includes(k)||e.split("@")[1].includes(k))?4:0)]).sort((a,b)=>b[1]-a[1]);
  const shown=new Set([...have,...local.flatMap(x=>emailsIn(x.email))]);
  S.sugg.gmail=list.filter(([e])=>!shown.has(e)).slice(0,5).map(([e])=>({kind:"email",email:e,note:"from Gmail"}));
  S.sugg.loading=false;drawSugg();
}
function drawSugg(){
  document.querySelectorAll(".sugg").forEach(b=>{b.innerHTML=""});
  const s=S.sugg;if(!s)return;const box=document.getElementById("sugg-"+s.box);if(!box)return;
  const items=[...s.local,...s.gmail];
  const row=(x,i)=>x.kind==="client"
    ?`<button type="button" class="suggbtn" data-act="sugg" data-v="${i}"><b>${esc(x.client)}</b><span class="dim">${x.email?esc(emailsIn(x.email).join(", ")):"no email saved"} · past client</span></button>`
    :`<button type="button" class="suggbtn" data-act="sugg" data-v="${i}"><b>${esc(x.email)}</b><span class="dim">${esc(x.note)}</span></button>`;
  box.innerHTML=items.map(row).join("")+(s.loading?`<div class="note" style="padding:4px 2px"><span class="spin"></span> Looking in Gmail…</div>`:"")+(s.err?`<div class="err">${esc(s.err)}</div>`:"")+(!items.length&&!s.loading&&!s.err&&s.q.length>=3?`<div class="note" style="padding:4px 2px">No matches in past invoices or Gmail.</div>`:"");
}
function addEmail(e){const v=S.invEdit;const cur=emailsIn(v.clientEmail);const typed=String(v.clientEmail||"").split(/[,;]/).pop().trim();if(typed&&!emailsIn(typed).length&&e.includes(typed.toLowerCase())){}if(!cur.includes(e))cur.push(e);v.clientEmail=cur.join(", ")}
document.addEventListener("focusin",e=>{const id=e.target.id;if(id==="ie-client"||id==="ie-email"||id==="mail-to")queueSuggest(true);else if(!(e.target.closest&&e.target.closest(".sugg"))&&S.sugg){S.sugg=null;drawSugg()}});

/* ———————————— events ———————————— */
function setPath(path,val){const ks=path.split(".");let o=S;for(let i=0;i<ks.length-1;i++){if(o[ks[i]]==null)o[ks[i]]={};o=o[ks[i]]}o[ks[ks.length-1]]=val}
function refreshTotals(){const box=$("#ie-totals");if(box&&S.invEdit)box.innerHTML=totalsLine(S.invEdit,invTotals(S.invEdit))}
let searchT;
document.addEventListener("input",e=>{
  const el=e.target;
  if(el.dataset&&el.dataset.search){S.recSearch=el.value;clearTimeout(searchT);searchT=setTimeout(()=>{const pos=el.selectionStart;render(true);const n=$("#recSearch");if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch{}}},250);return}
  if(el.dataset&&el.dataset.mailto){const inv=S.invoices.find(i=>i.id===el.dataset.mailto);if(inv)inv._to=el.value;queueSuggest();return}
  const p=el.dataset&&el.dataset.bind;if(!p)return;
  setPath(p,el.value);
  if(p.startsWith("sf."))S.sfDirty=true;
  if(p.startsWith("tripForm."))S.tripDirty=true;
  if(p.startsWith("recDraft.")&&S.recDraft)S.recDraft.touched[p.split(".")[1]]=true;
  if(/^ie-d\d+$/.test(el.id))onLineDesc(Number(el.id.slice(4)));
  if(/^ie-r\d+$/.test(el.id)&&S.invEdit){const it=S.invEdit.items[Number(el.id.slice(4))];if(it){it.autoAmt=false;const h=document.getElementById("ie-h"+el.id.slice(4));if(h)h.innerHTML=lineHint(it)}}
  if(p.startsWith("invEdit."))refreshTotals();
  if(el.id==="ie-client"||el.id==="ie-email")queueSuggest();
});
document.addEventListener("change",e=>{
  const el=e.target;
  if(el.dataset.pick&&S.picker){if(el.checked)S.picker.add(el.dataset.pick);else S.picker.delete(el.dataset.pick);const b=document.querySelector('[data-act="addPicked"]');if(b)b.textContent=`Add ${S.picker.size||""} selected`;return}
  if(el.dataset.tripRound&&S.tripForm){S.tripForm.round=el.checked;S.tripDirty=true;return}
  if(el.dataset.odo){const y=S.year,odo={...(S.settings.odo||{})};odo[y]={...(odo[y]||{}),[el.dataset.odo]:el.value.trim()};save({...S.settings,kind:"settings",id:"settings",odo},true).then(()=>render(true));return}
  if(el.dataset.vehpct){save({...S.settings,kind:"settings",id:"settings",vehPctManual:el.value.trim()},true).then(()=>render(true));return}
  if(/^ie-d\d+$/.test(el.id)&&S.invEdit){const i=Number(el.id.slice(4)),it=S.invEdit.items[i];if(it){const c=cleanText(el.value);if(c!==el.value){it.desc=c;el.value=c}it.fix="";queueProof(i)}}
  if(/^ie-d\d+$/.test(el.id)&&S.invEdit&&/reimburs/i.test(el.value)){const i=Number(el.id.slice(4)),it=S.invEdit.items[i];if(it&&!it.rid){if(lineType(it)!=="reimb"){it.type="reimb";it.taxable=false;const s=$("#ie-y"+i);if(s)s.value="reimb";const cb=$("#ie-t"+i);if(cb)cb.checked=false;refreshTotals()}autoFindReceipt(i)}return}
  if(/^ie-r\d+$/.test(el.id)&&S.invEdit){const it=S.invEdit.items[Number(el.id.slice(4))];const r=evalAmt(el.value);if(it&&r!=null){it.rate=String(r);el.value=it.rate;refreshTotals();const h=document.getElementById("ie-h"+el.id.slice(4));if(h)h.innerHTML=lineHint(it)}return}
  if(el.dataset.ty!==undefined&&S.invEdit){const it=S.invEdit.items[Number(el.dataset.ty)];it.type=el.value;it.typeTouched=true;it.taxable=el.value==="pay"&&S.invEdit.currency==="CAD";render(true);return}
  if(el.dataset.revcat){const r=S.receipts.find(x=>x.id===el.dataset.revcat);if(r)save({...r,category:el.value,needsReview:false},true).then(()=>{toast(`${r.vendor} → ${el.value}`);render(true)});return}
  if(el.dataset.attachrc){S.attachRc=el.checked;return}
  if(el.dataset.erasecloud){S.erase=S.erase||{step:2};S.erase.cloud=el.checked;return}
  if(el.dataset.rcmode){S.rcMode=el.value;return}
  if(el.dataset.tplrr&&S.tplDraft){if(el.dataset.bind)setPath(el.dataset.bind,el.value);render(true);return}
  if(el.dataset.tplcheck&&S.tplDraft){S.tplDraft[el.dataset.tplcheck]=el.checked;render(true);return}
  if(el.dataset.tx!==undefined&&S.invEdit){S.invEdit.items[Number(el.dataset.tx)].taxable=el.checked;refreshTotals();return}
  if(el.dataset.mailto){const inv=S.invoices.find(i=>i.id===el.dataset.mailto);if(inv&&el.value.trim()!==inv.clientEmail)save({...inv,clientEmail:el.value.trim()},true);return}
  if(el.dataset.bind&&el.tagName==="SELECT"){setPath(el.dataset.bind,el.value);if(el.dataset.bind.startsWith("sf."))S.sfDirty=true;if(el.dataset.bind.startsWith("recDraft.")&&S.recDraft)S.recDraft.touched[el.dataset.bind.split(".")[1]]=true;if(el.dataset.rerender)render(true);refreshTotals()}
  if(el.dataset.tax){
    const sc=el.dataset.tax,k=el.value,p=TAX.find(x=>x.k===k);
    if(sc==="invEdit"){if(p){S.invEdit.taxType=p.t;S.invEdit.taxRate=p.r}else{if(S.invEdit.taxType==="None")S.invEdit.taxType="GST";S.invEdit.taxRate=num(S.invEdit.taxRate)||5}S.invEdit.taxOverride=null}
    else{S.sfDirty=true;if(p){S.sf.defaultTaxType=p.t;S.sf.defaultTaxRate=p.r}else{if(S.sf.defaultTaxType==="None")S.sf.defaultTaxType="GST";S.sf.defaultTaxRate=num(S.sf.defaultTaxRate)||5}}
    render(true);
  }
  if(el.dataset.actChange==="invCurrency"){S.invEdit.currency=el.value;if(el.value!=="CAD"){S.invEdit.taxType="None";S.invEdit.taxRate=0;S.invEdit.taxOverride=null}else if(S.invEdit.taxType==="None"){S.invEdit.taxType=S.settings.defaultTaxType||"GST";S.invEdit.taxRate=S.settings.defaultTaxRate??5}render(true)}
  if(el.dataset.actChange==="recFilter"){S.recFilter=el.value;render(true)}
});
function showAfterPick(sel){try{document.activeElement&&document.activeElement.blur()}catch{}const go=()=>{const el=document.querySelector(sel);if(el)el.scrollIntoView({block:"start"});else window.scrollTo({top:0})};requestAnimationFrame(go);setTimeout(go,350)}
$("#camIn").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";onReceiptFile(f);if(f)showAfterPick("#recDraftBox")});
$("#libIn").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";onReceiptFile(f);if(f)showAfterPick("#recDraftBox")});
$("#invIn").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";onInvoiceFile(f)});
$("#invCamIn").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";onInvoiceFile(f)});
$("#rcInvCam").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";onInvReceiptFile(f);if(f)showAfterPick(".rcbox")});
$("#rcInvLib").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";onInvReceiptFile(f);if(f)showAfterPick(".rcbox")});
$("#tplIn").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";onTplFile(f)});
$("#logoRefIn").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";onLogoImg(f,true)});
$("#logoImgIn").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";onLogoImg(f,false)});
document.addEventListener("toggle",e=>{if(e.target&&e.target.dataset&&e.target.dataset.cust)S.custOpen=e.target.open;if(e.target&&e.target.dataset&&e.target.dataset.streams)S.streamsOpen=e.target.open;if(e.target&&e.target.dataset&&e.target.dataset.erase){S.eraseOpen=e.target.open;if(!e.target.open)S.erase=null}},true);
$("#jsonIn").addEventListener("change",async e=>{
  const f=e.target.files&&e.target.files[0];e.target.value="";if(!f)return;
  try{
    const j=JSON.parse(await f.text());const invs=Array.isArray(j.invoices)?j.invoices:[],recs=Array.isArray(j.receipts)?j.receipts:[],trs=Array.isArray(j.trips)?j.trips:[],incs=Array.isArray(j.incomes)?j.incomes:[];
    if(!invs.length&&!recs.length)throw new Error("empty");
    S.msg.import="ok:Loading "+(invs.length+recs.length)+" items…";render(true);
    for(const i of invs){if(i&&i.id&&i.kind==="invoice")await save(i,true)}
    for(const r of recs){if(r&&r.id&&r.kind==="receipt")await save(r,true)}
    for(const x of trs){if(x&&x.id&&x.kind==="trip")await save(x,true)}for(const x of incs){if(x&&x.id&&x.kind==="income")await save(x,true)}
    if(j.images&&S.col)for(const [id,u] of Object.entries(j.images)){if(typeof u==="string"&&u.startsWith("data:image/"))try{await S.col.doc("img_"+id).set({kind:"image",data:u})}catch{}}
    if(j.settings&&typeof j.settings==="object")await save({...S.settings,...j.settings,kind:"settings",id:"settings"},true);
    S.msg.import=`ok:Restored ${invs.length} invoices and ${recs.length} receipts.`;
  }catch{S.msg.import="err:That file isn't a Guitar Man Finance books backup."}
  render(true);
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.rb){rbClose();render(true);return}if(e.target&&e.target.id==="vf-text"&&e.key==="Enter"){e.preventDefault();S.vfix=S.vfix||{text:""};runVoiceFix();return}if(e.target&&e.target.id==="gf-q"&&e.key==="Enter"){e.preventDefault();gfindGo();return}const l=e.target.closest&&e.target.closest("label.btn[for]");if(l&&(e.key==="Enter"||e.key===" ")){e.preventDefault();const i=document.getElementById(l.getAttribute("for"));if(i)i.click()}});
let armT;
function arm(key){S.armed=key;clearTimeout(armT);armT=setTimeout(()=>{S.armed=null;render()},4000);render(true)}

document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-act]");if(!b||b.tagName==="SELECT")return;
  const a=b.dataset.act,v=b.dataset.v;
  switch(a){
    case "tab":S.tab=v;S.invMail="";S.imgView=null;if(v!=="invoices")S.invViewId=null;render(true);window.scrollTo({top:0});break;
    case "year":S.year=Number(v);render(true);break;
    case "newInvoice":S.tab="invoices";S.invViewId=null;S.voice=null;S.vfix=null;S.invEdit=blankInvoice();S.gfind=null;S.invRc=null;S.picker=null;render(true);break;
    case "editInv":{const inv=S.invoices.find(i=>i.id===v);if(inv){S.invEdit=JSON.parse(JSON.stringify(inv));S.invEdit.items=S.invEdit.items.map(it=>({desc:it.desc,qty:"1",rate:String(num(it.qty||1)*num(it.rate)),taxable:it.taxable!==false,type:lineType(it),...(it.rid?{rid:it.rid}:{})}))}S.tab="invoices";S.gfind=null;S.invRc=null;S.picker=null;render(true);break}
    case "openInv":S.packetMsg="";S.tab="invoices";S.invEdit=null;S.invViewId=v;S.invMail="";render(true);window.scrollTo({top:0});break;
    case "backInv":S.invViewId=null;S.invMail="";S.rbPrompt=null;render(true);break;
    case "clearImport":S.invImport=null;render(true);break;
    case "addLine":S.invEdit.items.push({desc:"",qty:"1",rate:"",taxable:S.invEdit.currency==="CAD",type:"pay"});render(true);break;
    case "rmLine":S.invEdit.items.splice(Number(v),1);if(!S.invEdit.items.length)S.invEdit.items.push({desc:"",qty:"1",rate:"",taxable:true});render(true);break;
    case "clearOverride":S.invEdit.taxOverride=null;render(true);break;
    case "cancelInv":S.invEdit=null;S.rcTarget=null;S.vfix=null;S.picker=null;S.gfind=null;S.invRc=null;render(true);break;
    case "saveInv":{const x=S.invEdit;const doc={...x,kind:"invoice",number:(x.number||"").trim()||nextNumber(),client:(x.client||"").trim(),clientAddress:(x.clientAddress||"").trim(),clientEmail:(x.clientEmail||"").trim(),forLabel:(x.forLabel||"").trim(),date:x.date||today(),items:x.items.filter(it=>it.desc||num(it.rate)).map(it=>({desc:cleanText(it.desc),qty:1,rate:num(it.rate),taxable:it.taxable!==false,type:lineType(it),...(it.rid?{rid:it.rid}:{})})),taxType:x.currency!=="CAD"?"None":x.taxType,taxRate:x.currency!=="CAD"?0:num(x.taxRate),taxOverride:x.taxOverride===null||x.taxOverride===undefined||x.taxOverride===""?null:num(x.taxOverride)};delete doc.isNew;delete doc.imported;delete doc.voice;delete doc.heard;if(!doc.items.length)doc.items=[{desc:"Services",qty:1,rate:0,taxable:true}];S.invEdit=null;S.picker=null;S.vfix=null;S.invViewId=doc.id;S.rbPrompt=doc.id;await save(doc);
      for(const it of doc.items){if(!it.rid)continue;const r=S.receipts.find(x=>x.id===it.rid);if(r&&r.billedTo!==doc.id)await save({...r,billedTo:doc.id,billedLabel:`#${doc.number} ${doc.client}`.slice(0,40)},true)}
      render(true);window.scrollTo({top:0});autoBackupInv(doc.id);break}
    case "status":{const inv=S.invoices.find(i=>i.id===v);if(inv){await save({...inv,status:b.dataset.s});toast(b.dataset.s==="paid"?"Marked paid.":"Marked "+b.dataset.s+".");autoBackupInv(inv.id)}break}
    case "delInv":if(S.armed!=="inv:"+v){arm("inv:"+v);break}S.armed=null;S.invViewId=null;await removeDoc(v,"invoice");toast("Invoice deleted.");break;
    case "pdfRc":{const inv=S.invoices.find(i=>i.id===v);if(inv){receiptsPrintHTML(inv).then(printHTML)}break;try{toast("Building the receipts PDF…");const {doc:d,originals}=await buildReceiptsPdf(inv,{mode:S.rcMode==="best"?"snapshot":S.rcMode});if(d)await S.downloads.save({filename:`Receipts for ${pdfName(inv)}`,data:d.output("blob")})}catch(e){if(!(e&&e.code==="declined"))toast("Couldn't build the receipts PDF.")}break}
    case "gfindOpen":S.gfind={q:"",results:[],loading:false,busy:false,err:"",range:"any",token:"",seen:new Set()};S.picker=null;render(true);setTimeout(()=>{const q=$("#gf-q");if(q)q.focus()},50);break;
    case "gfindClose":S.gfind=null;render(true);break;
    case "gfindGo":gfindGo();break;
    case "gfindMore":gfindGo(true);break;
    case "gfindRange":if(S.gfind){S.gfind.range=v;if(String(S.gfind.q||"").trim())gfindGo();else render(true)}break;
    case "gfindPick":gfindPick(Number(v));break;
    case "readBack":rbOpen(v);render(true);break;
    case "rbClose":rbClose();render(true);break;
    case "rbLater":S.rbPrompt=null;render(true);break;
    case "rbSay":{const inv=S.invoices.find(i=>i.id===(S.rb&&S.rb.id));if(inv)rbSay(rbSpeech(inv));break}
    case "rbOk":{const inv=S.invoices.find(i=>i.id===(S.rb&&S.rb.id));rbClose();if(inv)await save({...inv,rbSig:invSig(inv)},true);render(true);setTimeout(()=>{const m=$("#mail-to")||$("#mail-body");if(m)m.scrollIntoView({behavior:"smooth",block:"center"})},60);break}
    case "rbFix":{const id=S.rb&&S.rb.id;rbClose();const inv=S.invoices.find(i=>i.id===id);if(inv){S.invEdit=JSON.parse(JSON.stringify(inv));S.invEdit.items=S.invEdit.items.map(it=>({desc:it.desc,qty:"1",rate:String(num(it.qty||1)*num(it.rate)),taxable:it.taxable!==false,type:lineType(it),...(it.rid?{rid:it.rid}:{})}))}S.tab="invoices";S.gfind=null;S.invRc=null;S.picker=null;render(true);window.scrollTo({top:0});break}
    case "pdfInv":{const inv=S.invoices.find(i=>i.id===v);if(inv)downloadInvoicePdf(inv);break}
    case "mail":{const inv=S.invoices.find(i=>i.id===v);if(inv){const to=(inv._to??inv.clientEmail);emailInvoice({...inv,clientEmail:to})}break}
    case "manualRec":if(S.ctl)S.ctl.abort();S.recDraft=blankDraft();render(true);break;
    case "editRec":{const r=S.receipts.find(x=>x.id===v);if(!r)break;S.tab="receipts";if(S.ctl)S.ctl.abort();S.recDraft=blankDraft({id:r.id,editOf:r.id,vendor:r.vendor,date:r.date,currency:r.currency||"CAD",total:String(r.total),taxPaid:String(r.taxPaid),category:r.category,note:r.note||"",stream:r.stream||""});render(true);window.scrollTo({top:0});break}
    case "fileRec":fileDraft();break;
    case "readAgain":readDraft();break;
    case "stopRead":if(S.ctl)S.ctl.abort();break;
    case "discardRec":if(S.ctl)S.ctl.abort();S.recDraft=null;render(true);break;
    case "viewImg":S.imgView={id:v,loading:true,url:null};render(true);{const u=await getImage(v);if(S.imgView&&S.imgView.id===v){S.imgView={id:v,loading:false,url:u};render(true)}}break;
    case "closeImg":S.imgView=null;render(true);break;
    case "retryBk":backupReceipt(v).then(()=>render(true));break;
    case "bulk":backupAll();break;
    case "stopBulk":if(S.bulk)S.bulk.stop=true;break;
    case "sync":syncGmail();break;
    case "stopSync":if(S.sync&&S.sync.ctl)S.sync.ctl.abort();break;
    case "clearSync":S.sync=null;render(true);break;
    case "sugg":{const s=S.sugg,v2=S.invEdit;if(!s)break;const x=[...s.local,...s.gmail][Number(v)];if(!x)break;
      if(s.ctx==="view"){const inp=$("#mail-to");const inv=S.invoices.find(i=>i.id===S.invViewId);if(inp&&inv){const cur=emailsIn(inp.value);(x.kind==="client"?emailsIn(x.email):[x.email]).forEach(e=>{if(!cur.includes(e))cur.push(e)});inp.value=cur.join(", ");inv._to=inp.value;if(inv.clientEmail!==inp.value)save({...inv,clientEmail:inp.value},true)}S.sugg=null;drawSugg();break}
      if(!v2)break;
      if(x.kind==="client"){v2.client=x.client;if(x.email)v2.clientEmail=emailsIn(x.email).join(", ");if(x.address&&!String(v2.clientAddress||"").trim())v2.clientAddress=x.address}
      else addEmail(x.email);
      S.sugg=null;render(true);const nxt=document.getElementById(x.kind==="client"&&!x.email?"ie-email":"ie-for");if(nxt)nxt.focus();break}
    case "bulkInv":backupAllInvoices();break;
    case "stopBulkInv":if(S.bulkInv)S.bulkInv.stop=true;break;
    case "retryInvBk":backupInvoice(v);break;
    case "revYes":{const r=S.receipts.find(x=>x.id===v);if(r)await save({...r,needsReview:false},true);render(true);break}
    case "revNo":S.revNo=v;render(true);break;
    case "revCancel":S.revNo=null;render(true);break;
    case "revPersonal":{const r=S.receipts.find(x=>x.id===v);S.revNo=null;if(r){await save({...r,category:PERSONAL,needsReview:false},true);toast(`${r.vendor} moved to Personal.`)}render(true);break}
    case "revDelete":{S.revNo=null;await removeDoc(v,"receipt");if(S.col){S.col.doc("img_"+v).delete().catch(()=>{})}toast("Removed.");break}
    case "revEditOne":{S.revNo=null;const btn=document.createElement("button");btn.dataset.act="editRec";btn.dataset.v=v;document.body.appendChild(btn);btn.click();btn.remove();break}
    case "revAll":{if(S.armed!=="revAll"){arm("revAll");break}S.armed=null;const q=S.recSearch.trim().toLowerCase();const list=S.receipts.filter(r=>r.needsReview&&yearOf(r.date)===S.year&&(S.recFilter==="All"||S.recFilter==="Needs review"||(r.category===S.recFilter))&&(!q||(r.vendor+" "+r.note+" "+r.category).toLowerCase().includes(q)));for(const r of list)await save({...r,needsReview:false},true);toast(`Confirmed ${list.length} receipts.`);render(true);break}
    case "billPick":S.billPick=v;S.revNo=null;render(true);break;
    case "billCancel":S.billPick=null;render(true);break;
    case "showMaybeBilled":S.recFilter="Maybe billed to clients";render(true);break;
    case "billLink":{const r=S.receipts.find(x=>x.id===v),i=S.invoices.find(x=>x.id===b.dataset.inv);if(!r||!i)break;const line=b.dataset.line===""?null:Number(b.dataset.line);S.billPick=null;
      await save({...r,billedTo:i.id,billedLine:line,billedLabel:`#${i.number} ${i.client}`.slice(0,40),needsReview:false,notBilled:false},true);
      if(line!=null&&i.items[line]&&!i.items[line].rid){const items=i.items.map((it,k)=>k===line?{...it,rid:r.id}:it);await save({...i,items},true)}
      toast(`${r.vendor} linked to invoice #${i.number}. It's now out of your own write-offs.`);render(true);break}
    case "billNo":{const r=S.receipts.find(x=>x.id===v);if(r)await save({...r,notBilled:true},true);render(true);break}
    case "unbill":{const r=S.receipts.find(x=>x.id===v);if(!r)break;const i=S.invoices.find(x=>x.id===r.billedTo);
      if(i&&i.items.some(it=>it.rid===r.id))await save({...i,items:i.items.map(it=>it.rid===r.id?(({rid,...rest})=>rest)(it):it)},true);
      const {billedTo,billedLine,billedLabel,...rest}=r;await save({...rest,notBilled:true},true);toast("Back in your own write-offs.");render(true);break}
    case "useQty":{const it=S.invEdit&&S.invEdit.items[Number(v)];const q=it&&parseQty(it.desc);if(q){it.rate=String(q.amt);it.autoAmt=true;render(true)}break}
    case "tplEdit":S.tplDraft={...tplOf()};S.custOpen=true;S.tplMsg="";render(true);break;
    case "tplCancel":S.tplDraft=null;S.tplMsg="";render(true);break;
    case "tplSave":{const tpl=normTpl(S.tplDraft);S.tplDraft=null;await save({...S.settings,kind:"settings",id:"settings",tpl},true);S.tplMsg="ok:Template saved. Your invoices and PDFs now use it.";render(true);break}
    case "tplReset":if(S.armed!=="tplReset"){arm("tplReset");break}S.armed=null;S.tplDraft=null;await save({...S.settings,kind:"settings",id:"settings",tpl:null},true);S.tplMsg="ok:Back to the standard invoice template.";render(true);break;
    case "tplPdf":{if(!S.downloads||!S.tplDraft){toast("Downloads aren't available in this view.");break}try{const d=await buildInvoicePdf(sampleInv(),normTpl(S.tplDraft));await S.downloads.save({filename:"template-preview.pdf",data:d.output("blob")})}catch(e){if(!(e&&e.code==="declined"))toast(e&&e.message==="load"?"Couldn't load the PDF maker. Check your connection.":"Couldn't build the preview.")}break}
    case "logoMake":makeLogo();break;
    case "logoStop":if(S.logoDraft&&S.logoDraft.ctl)S.logoDraft.ctl.abort();break;
    case "logoRefClear":if(S.logoDraft){S.logoDraft.ref=null;S.logoDraft.refName=""}render(true);break;
    case "logoDiscard":if(S.logoDraft){S.logoDraft.svg=null;S.logoDraft.img=null}render(true);break;
    case "logoUse":{const L=S.logoDraft||{};await save({...S.settings,kind:"settings",id:"settings",logoSvg:L.svg||null,logoImg:L.svg?null:(L.img||null),logoText:L.text??S.settings.logoText??""},true);S.logoDraft=null;toast("New logo is in.");render(true);break}
    case "logoReset":if(S.armed!=="logoReset"){arm("logoReset");break}S.armed=null;await save({...S.settings,kind:"settings",id:"settings",logoSvg:null,logoImg:null},true);toast("Back to the Guitar Man logo.");render(true);break;
    case "vqOpen":S.voice={text:""};S.invEdit=null;S.invViewId=null;render(true);setTimeout(()=>{const b=$("#vq-text");if(b)b.focus()},60);break;
    case "vqClose":if(S.voice&&S.voice.rec){try{S.voice.rec.stop()}catch{}}if(S.voice&&S.voice.ctl)S.voice.ctl.abort();S.voice=null;render(true);break;
    case "vqMic":startListening("new");break;
    case "vqGo":runVoice();break;
    case "vfMic":S.vfix=S.vfix||{text:""};startListening("fix");break;
    case "vfGo":S.vfix=S.vfix||{text:""};runVoiceFix();break;
    case "lineRc":S.rcTarget=Number(v);render(true);setTimeout(()=>{const b=document.querySelector(".rcbox");if(b)b.scrollIntoView({behavior:"smooth",block:"start"})},40);break;
    case "lineRcCancel":S.rcTarget=null;render(true);break;
    case "lineRcRm":{const it=S.invEdit&&S.invEdit.items[Number(v)];if(it){delete it.rid;it._find=""}render(true);break}
    case "lineFind":autoFindReceipt(Number(v));break;
    case "saveInvFiles":{const inv=S.invoices.find(i=>i.id===v);if(inv)startSave(`${inv.status==="quote"?"Quote":"Invoice"} #${inv.number}`,invoiceEntries(inv));break}
    case "saveRcFile":{const r=S.receipts.find(x=>x.id===v);if(r)startSave(r.vendor,[receiptEntry(r)]);break}
    case "sqNext":runSave();break;
    case "sqSkip":{const q=S.saveQ;if(q&&!q.busy&&q.i<q.items.length){q.items[q.i].status="err";q.items[q.i].err="Skipped";q.i++;q.note="";if(q.i<q.items.length)runSave();else sqDraw()}break}
    case "sqClose":S.saveQ=null;sqDraw();break;
    case "dbxPacket":{const inv=S.invoices.find(i=>i.id===v);if(inv)savePacket(inv);break}
    case "dlAll":{const inv=S.invoices.find(i=>i.id===v);if(inv)downloadAll(inv);break}
    case "useFix":{const it=S.invEdit&&S.invEdit.items[Number(v)];if(it&&it.fix){it.desc=it.fix;it._checked=it.fix;it.fix="";const d=$("#ie-d"+v);if(d)d.value=it.desc;onLineDesc(Number(v))}break}
    case "noFix":{const it=S.invEdit&&S.invEdit.items[Number(v)];if(it){it.fix="";it._checked=it.desc;const h=$("#ie-h"+v);if(h)h.innerHTML=lineHint(it)}break}
    case "setTheme":{if(!THEMES.some(x=>x[0]===v))break;S.settings.theme=v;applyTheme();const box=document.getElementById("logoBox");if(box)box.dataset.cur="";render(true);save({...S.settings,kind:"settings",id:"settings",theme:v},true);break}
    case "copyMsg":{const txt=$("#mail-body")?$("#mail-body").value:"";try{await navigator.clipboard.writeText(txt);toast("Message copied.")}catch{const ta=$("#mail-body");if(ta){ta.focus();ta.select()}toast("Select the message and copy it.")}break}
    case "setInteg":{const [k,val]=v.split(":");save({...S.settings,kind:"settings",id:"settings",[k]:val==="on"},true).then(()=>render(true));S.settings[k]=val==="on";render(true);break}
    case "streamAdd":{const nf=S.newStream||{name:"",type:"business"};const name=cleanText(nf.name);if(!name){toast("Give the income stream a name.");break}const streams=[...(S.settings.streams||[]),{id:"st_"+newId(),name:name.slice(0,40),type:nf.type||"business"}];S.newStream=null;S.streamsOpen=true;await save({...S.settings,kind:"settings",id:"settings",streams},true);toast(`${name} added. Find it under the Other income tab.`);render(true);break}
    case "streamDel":if(S.armed!=="stream:"+v){arm("stream:"+v);break}S.armed=null;{const streams=(S.settings.streams||[]).filter(x=>x.id!==v);await save({...S.settings,kind:"settings",id:"settings",streams},true);render(true)}break;
    case "incSave":{const f=S.incForm||{};if(!f.stream||!num(f.amount)){toast("Pick a stream and enter an amount.");break}const doc={kind:"income",id:"inc_"+newId(),stream:f.stream,date:f.date||today(),amount:num(f.amount),withheld:num(f.withheld),note:cleanText(f.note).slice(0,120),createdAt:Date.now()};S.incForm={...f,amount:"",withheld:"",note:""};await save(doc);toast("Income added.");break}
    case "incDel":if(S.armed!=="inc:"+v){arm("inc:"+v);break}S.armed=null;await removeDoc(v,"income");break;
    case "exportBk":exportBackup();break;
    case "cloudGoogle":(async()=>{CLOUD.lastErr="";try{await gAuth(true);CLOUD.provider="google";CLOUD.relink=false;await cloudPersist();await gAfterConnect()}catch(e){CLOUD.provider=null;CLOUD.lastErr=(e&&e.message)||"Google Drive didn't connect.";toast(CLOUD.lastErr)}render(true)})();break;
    case "cloudDropbox":dbxConnect();break;
    case "cloudRelink":if(CLOUD.provider==="google"){CLOUD.relink=false;cloudBackupNow(true)}else dbxConnect();break;
    case "bkShare":shareBackupFile();break;
    case "bkMerge":await cloudRestore();cloudBackupNow(true);break;
    case "bkReplace":CLOUD.conflict=false;await cloudPersist();cloudBackupNow(true);break;
    case "cloudNow":cloudBackupNow(true);break;
    case "cloudRes":if(S.armed!=="cloudRes"){arm("cloudRes");break}S.armed=null;cloudRestore();break;
    case "cloudOff":if(S.armed!=="cloudOff"){arm("cloudOff");break}S.armed=null;clearTimeout(cloudTimer);await cloudForget();toast("Disconnected. The backup file in your account wasn't touched.");render(true);break;
    case "lockOn":lockOn();break;
    case "unlock":unlock();break;
    case "lockOff":lockOff();break;
    case "eraseNext":{const e=S.erase=S.erase||{step:0,word:""};const w=String(($("#erase-word")||{}).value||e.word||"").trim();if(w!=="ERASE"){e.err="Type ERASE in capital letters to continue.";render(true);break}S.erase={step:2,word:"",cloud:false};render(true);break}
    case "eraseCancel":S.erase=null;render(true);break;
    case "drill":S.drill=S.drill===v?null:v;render(true);break;
    case "convertQuote":{const inv=S.invoices.find(i=>i.id===v);if(inv){await save({...inv,status:"draft",number:nextNumber(),date:today()});autoBackupInv(inv.id);S.mailFor=null;toast("Quote turned into invoice #"+nextNumber()+". Check it, then send.")}break}
    case "openPicker":S.picker=new Set();render(true);break;
    case "closePicker":S.picker=null;render(true);break;
    case "addPicked":{if(!S.picker||!S.invEdit)break;for(const id of S.picker){const r=S.receipts.find(x=>x.id===id);if(!r)continue;addRcLine(r)}S.picker=null;render(true);break}
    case "route":{const seen=new Set(),routes=[];[...S.trips].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).forEach(x=>{const k=`${x.from}|${x.to}|${x.oneWay}`;if(!seen.has(k)&&routes.length<8){seen.add(k);routes.push(x)}});const r=routes[Number(v)];if(r){S.tripForm={...S.tripForm,from:r.from,to:r.to,km:String(r.oneWay),round:!!r.round,purpose:S.tripForm.purpose||r.purpose||""};S.tripDirty=true;render(true)}break}
    case "saveTrip":{const f=S.tripForm||blankTrip();const km=num(f.km);if(!f.to||!km){S.tripErr="Add where you drove to and the km.";render(true);break}S.tripErr="";const doc={kind:"trip",id:"trip_"+newId(),date:f.date||today(),from:(f.from||"").trim(),to:f.to.trim(),oneWay:km,round:!!f.round,km:km*(f.round?2:1),purpose:(f.purpose||"").trim(),createdAt:Date.now()};S.tripForm=blankTrip({from:doc.from});S.tripDirty=false;await save(doc);toast(`Trip added: ${plain(doc.km)} km.`);break}
    case "delTrip":if(S.armed!=="trip:"+v){arm("trip:"+v);break}S.armed=null;await removeDoc(v,"trip");break;
    case "reviewFilter":S.tab="receipts";S.recFilter="Needs review";render(true);break;
    case "delRec":if(S.armed!=="rec:"+v){arm("rec:"+v);break}S.armed=null;await removeDoc(v,"receipt");if(S.col){S.col.doc("img_"+v).delete().catch(()=>{})}delete S.imgCache[v];toast("Receipt deleted. Any Dropbox copy stays in Dropbox.");break;
    case "pdf":yearEndPdf();break;
    case "ledger":backupLedger();break;
    case "saveSettings":{const s=S.sf;S.sfDirty=false;await save({...S.settings,...s,kind:"settings",id:"settings",defaultTaxRate:num(s.defaultTaxRate)});toast("Settings saved.");break}
    case "resetSettings":S.sfDirty=false;render(true);break;
  }
});

render(true);
boot();
