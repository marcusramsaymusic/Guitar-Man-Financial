/* Guitar Man Finance: Gmail receipts to Dropbox, automatically.

   This runs in your own Google account (script.google.com), for free, every 15 minutes, even when your phone is off.
   It finds receipt emails with the same search the app uses for "Sync Gmail" and saves into Dropbox:
     - every PDF, JPEG or PNG attached to the email (receipts, invoices, screenshots), and
     - the email itself as a PDF, when it has no attachment (most online receipts are just an email).
   Each file name ends in [gm-<email id>], so the Guitar Man Finance app (in Claude) can match it to the receipt it pulled
   from Gmail and file it into Receipts › year › category, or Reimbursements › year › client.

   Setup (about 10 minutes, once): see "Gmail receipts to Dropbox" in README.md. In short:
     1. Paste this whole file into a new project at script.google.com.
     2. Put your Dropbox app key in SETUP below, run step1_getDropboxLink, open the link it prints, tap Allow.
     3. Paste the code Dropbox shows into SETUP, run step2_connectDropbox.
     4. Run step3_startAutomatic. Done. It also runs once straight away.

   Nothing here is sent anywhere except your own Dropbox. Google runs it under your account; nobody else sees it. */

const SETUP = {
  DROPBOX_APP_KEY: '',     // from dropbox.com/developers/apps › your app › Settings › App key
  DROPBOX_CODE: '',        // step 2: paste the code Dropbox shows you after you tap Allow
};

const CONFIG = {
  // Where the files go. With a "Full Dropbox" app this is the folder the app (in Claude) files from.
  // With an "App folder" app, use something like '/Receipts/Email' (it lands in Dropbox › Apps › your app name › …).
  DROPBOX_FOLDER: '/Guitar Man Finance/Receipts/Inbox',
  START_DATE: '',                  // 'YYYY-MM-DD' to go back further. Empty = January 1 of this year.
  EMAIL_AS_PDF: 'whenNoAttachment', // 'whenNoAttachment', 'always' or 'never'
  LABEL: 'GMF/Saved to Dropbox',   // Gmail label put on each email once it's saved, so it's never saved twice
  EVERY_MINUTES: 15,               // 5, 10, 15 or 30
  MAX_EMAILS_PER_RUN: 40,          // a big backlog just takes a few runs
};

// The same search the app uses for Sync Gmail (keep the two in step if you change one).
const RECEIPT_QUERY = '-in:sent -from:payments.interac.ca -subject:(delivered OR delivery OR shipped OR "on the way" OR "on its way" OR package OR review OR "shared with you" OR "out for" OR expectations OR "coming up" OR "running out" OR "will renew") (category:purchases OR subject:(receipt OR reçu OR "order confirmed" OR "order confirmation" OR ordered OR "your order" OR "payment confirmation" OR "payment received" OR purchase OR "booking confirmation" OR "booking reference" OR itinerary OR "e-ticket" OR subscription OR renewal OR "your invoice" OR "invoice from" OR "payment to" OR "you paid" OR "trip with uber" OR "order with uber" OR "monthly payment" OR "parking"))';

const KEEP_TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp' };
const MIN_IMAGE_BYTES = 15000; // smaller pictures are logos and tracking pixels, not receipts

/* ———————————— setup steps ———————————— */

function step1_getDropboxLink() {
  if (!SETUP.DROPBOX_APP_KEY) throw new Error('Put your Dropbox app key in SETUP.DROPBOX_APP_KEY first, save, then run this again.');
  const verifier = Utilities.base64EncodeWebSafe(Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid()).replace(/=+$/, '').slice(0, 96);
  const challenge = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier, Utilities.Charset.US_ASCII)).replace(/=+$/, '');
  PropertiesService.getScriptProperties().setProperty('DBX_VERIFIER', verifier);
  const url = 'https://www.dropbox.com/oauth2/authorize?client_id=' + encodeURIComponent(SETUP.DROPBOX_APP_KEY) +
    '&response_type=code&token_access_type=offline&code_challenge=' + challenge + '&code_challenge_method=S256';
  Logger.log('Open this link, sign in to Dropbox, tap Allow, and copy the code it shows:\n\n' + url +
    '\n\nThen paste the code into SETUP.DROPBOX_CODE, save, and run step2_connectDropbox.');
}

function step2_connectDropbox() {
  const props = PropertiesService.getScriptProperties();
  const verifier = props.getProperty('DBX_VERIFIER');
  if (!SETUP.DROPBOX_CODE) throw new Error('Paste the code Dropbox showed you into SETUP.DROPBOX_CODE, save, then run this again.');
  if (!verifier) throw new Error('Run step1_getDropboxLink first.');
  const r = UrlFetchApp.fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'post', muteHttpExceptions: true,
    payload: { code: SETUP.DROPBOX_CODE.trim(), grant_type: 'authorization_code', client_id: SETUP.DROPBOX_APP_KEY, code_verifier: verifier },
  });
  if (r.getResponseCode() !== 200) throw new Error('Dropbox didn\'t accept that code (codes only work once, for a few minutes). Run step1_getDropboxLink again for a new one.\n' + r.getContentText());
  const j = JSON.parse(r.getContentText());
  props.setProperties({ DBX_REFRESH: j.refresh_token, DBX_KEY: SETUP.DROPBOX_APP_KEY });
  props.deleteProperty('DBX_VERIFIER');
  const who = dbx_('https://api.dropboxapi.com/2/users/get_current_account', null);
  Logger.log('Connected to Dropbox as ' + (who.name && who.name.display_name) + '. You can clear SETUP.DROPBOX_CODE now. Next: run step3_startAutomatic.');
}

function step3_startAutomatic() {
  stopAutomatic();
  ScriptApp.newTrigger('saveReceiptsToDropbox').timeBased().everyMinutes(CONFIG.EVERY_MINUTES).create();
  Logger.log('On. It checks Gmail every ' + CONFIG.EVERY_MINUTES + ' minutes. Running once now…');
  saveReceiptsToDropbox();
}

function stopAutomatic() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'saveReceiptsToDropbox').forEach(t => ScriptApp.deleteTrigger(t));
}

/* ———————————— the job ———————————— */

function saveReceiptsToDropbox() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return; // the last run is still going
  const started = Date.now();
  let saved = 0, emails = 0, failed = 0;
  try {
    const label = GmailApp.getUserLabelByName(CONFIG.LABEL) || GmailApp.createLabel(CONFIG.LABEL);
    const labelQ = CONFIG.LABEL.toLowerCase().replace(/[\s\/&]+/g, '-');
    const since = (CONFIG.START_DATE || (new Date().getFullYear() + '-01-01')).replace(/-/g, '/');
    const mine = [Session.getEffectiveUser().getEmail()].concat(GmailApp.getAliases()).map(s => s.toLowerCase());
    const threads = GmailApp.search('after:' + since + ' ' + RECEIPT_QUERY + ' -label:' + labelQ, 0, 50);
    const tz = Session.getScriptTimeZone();

    for (const t of threads) {
      if (emails >= CONFIG.MAX_EMAILS_PER_RUN || Date.now() - started > 4.5 * 60 * 1000) break;
      let ok = true;
      for (const m of t.getMessages()) {
        const from = m.getFrom();
        if (mine.some(a => from.toLowerCase().indexOf(a) >= 0)) continue; // your own replies
        emails++;
        try { saved += saveMessage_(m, tz); } catch (e) { ok = false; failed++; Logger.log('Couldn\'t save "' + m.getSubject() + '": ' + e.message); }
      }
      if (ok) t.addLabel(label); // a failed one stays unlabelled, so the next run tries it again
    }
    Logger.log('Saved ' + saved + ' file(s) from ' + emails + ' email(s)' + (failed ? ', ' + failed + ' to retry next run' : '') + '.');
  } finally {
    lock.releaseLock();
  }
}

function saveMessage_(m, tz) {
  const id = m.getId();
  const date = Utilities.formatDate(m.getDate(), tz, 'yyyy-MM-dd');
  const who = senderName_(m.getFrom());
  const tag = ' [gm-' + id + ']';
  let n = 0;

  const files = m.getAttachments({ includeInlineImages: false, includeAttachments: true }).filter(a => {
    const ext = extOf_(a);
    return ext && (ext === 'pdf' || a.getSize() >= MIN_IMAGE_BYTES);
  });
  files.forEach(a => {
    const base = safe_(a.getName().replace(/\.[^.]+$/, '')) || 'receipt';
    if (upload_(date + ' ' + who + ' ' + base + tag + '.' + extOf_(a), a.copyBlob())) n++;
  });

  if (CONFIG.EMAIL_AS_PDF === 'always' || (CONFIG.EMAIL_AS_PDF === 'whenNoAttachment' && !files.length)) {
    if (upload_(date + ' ' + who + ' receipt' + tag + '.pdf', emailPdf_(m, tz))) n++;
  }
  return n;
}

function emailPdf_(m, tz) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = String(m.getBody() || '').replace(/<script[\s\S]*?<\/script>/gi, '');
  const html = '<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:12px">' +
    '<table style="margin-bottom:14px;border-bottom:1px solid #ccc;padding-bottom:8px;font-size:12px">' +
    '<tr><td style="color:#666;padding-right:10px">From</td><td>' + esc(m.getFrom()) + '</td></tr>' +
    '<tr><td style="color:#666;padding-right:10px">Date</td><td>' + esc(Utilities.formatDate(m.getDate(), tz, 'EEE, MMM d, yyyy h:mm a')) + '</td></tr>' +
    '<tr><td style="color:#666;padding-right:10px">Subject</td><td><b>' + esc(m.getSubject()) + '</b></td></tr></table>' +
    body + '</body></html>';
  return Utilities.newBlob(html, 'text/html', 'receipt.html').getAs('application/pdf');
}

/* ———————————— Dropbox ———————————— */

function upload_(name, blob) {
  const path = CONFIG.DROPBOX_FOLDER.replace(/\/+$/, '') + '/' + name;
  try {
    dbx_('https://content.dropboxapi.com/2/files/upload', { path: path, mode: 'add', autorename: false, mute: true }, blob.getBytes());
    return true;
  } catch (e) {
    if (/path\/conflict/.test(e.message)) return false; // already there from an earlier run
    throw e;
  }
}

function dbx_(url, arg, bytes) {
  const opt = { method: 'post', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + token_() } };
  if (bytes) {
    opt.headers['Dropbox-API-Arg'] = JSON.stringify(arg).replace(/[\u007f-￿]/g, c => '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4));
    opt.contentType = 'application/octet-stream';
    opt.payload = bytes;
  } else if (arg) {
    opt.contentType = 'application/json';
    opt.payload = JSON.stringify(arg);
  }
  for (let tryNo = 0; tryNo < 4; tryNo++) {
    const r = UrlFetchApp.fetch(url, opt);
    const code = r.getResponseCode();
    if (code === 200) return JSON.parse(r.getContentText() || '{}');
    if (code === 401) { CacheService.getScriptCache().remove('dbx_access'); opt.headers.Authorization = 'Bearer ' + token_(); continue; }
    if (code === 429 || code >= 500) { Utilities.sleep(2000 * (tryNo + 1)); continue; }
    throw new Error('Dropbox ' + code + ': ' + r.getContentText().slice(0, 300));
  }
  throw new Error('Dropbox didn\'t answer. It will try again next run.');
}

function token_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('dbx_access');
  if (hit) return hit;
  const props = PropertiesService.getScriptProperties();
  const refresh = props.getProperty('DBX_REFRESH');
  if (!refresh) throw new Error('Dropbox isn\'t connected yet. Run step1_getDropboxLink, then step2_connectDropbox.');
  const r = UrlFetchApp.fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'post', muteHttpExceptions: true,
    payload: { grant_type: 'refresh_token', refresh_token: refresh, client_id: props.getProperty('DBX_KEY') },
  });
  if (r.getResponseCode() !== 200) throw new Error('Dropbox signed this script out. Run step1_getDropboxLink and step2_connectDropbox again.');
  const j = JSON.parse(r.getContentText());
  cache.put('dbx_access', j.access_token, Math.max(60, Math.min(21600, (j.expires_in || 14400) - 300)));
  return j.access_token;
}

/* ———————————— names ———————————— */

function extOf_(a) {
  const t = String(a.getContentType() || '').toLowerCase();
  if (KEEP_TYPES[t]) return KEEP_TYPES[t];
  const m = /\.(pdf|jpe?g|png|heic|webp)$/i.exec(a.getName() || '');
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : '';
}

function senderName_(from) {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>/.exec(from || '');
  const name = m && m[1].trim();
  if (name) return safe_(name);
  const addr = (m ? m[2] : from || '').split('@')[1] || 'email';
  return safe_(addr.replace(/^(mail|email|e|info|noreply|no-reply|receipts?)\./i, '').split('.')[0]);
}

function safe_(s) {
  return String(s || '').replace(/[\\\/:*?"<>|#%\[\]]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 40);
}
