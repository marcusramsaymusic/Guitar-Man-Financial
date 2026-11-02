# Guitar Man Finance: your own copy, off Claude

This folder is the whole app. It runs in any phone or computer browser, installs to the home screen, and works with no internet connection. Nothing in it is tied to Claude or to anyone's account.

## What's in the folder

| File | What it is |
|---|---|
| `index.html`, `app.js` | The app |
| `config.js` | Two optional keys for Google Drive and Dropbox backup (empty = backup buttons switched off) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Make it installable and let it open with no connection |
| `privacy.html` | A plain-English privacy page (the App Store and Google Play ask for one) |

## 1. Put it online (free, about 5 minutes)

A home-screen app has to be opened from a web address once. The easiest free option:

1. Go to **app.netlify.com/drop** and make a free account.
2. Drag this whole folder onto the page.
3. You get an address like `https://something.netlify.app`. Rename it under **Site configuration › Change site name** (for example `guitar-man-finance.netlify.app`).

GitHub Pages and Cloudflare Pages also work. Any host is fine as long as the address starts with **https**.

The host only serves the app's files. It never sees anyone's invoices or receipts, because those are stored on each person's own device.

## 2. Send it to friends

Send them the address. To install it:

- **iPhone or iPad:** open the address in **Safari**, tap **Share**, then **Add to Home Screen**.
- **Android:** open it in **Chrome**, tap **⋮**, then **Install app** (or **Add to Home screen**).
- **Computer:** in Chrome or Edge, click the install icon in the address bar.

After that it opens like a normal app, offline too.

## 3. Optional: Google Drive and Dropbox backup

Without this, everything stays on the device and people can download a backup file from **Settings › Privacy**. To turn on the **Connect Google Drive** and **Connect Dropbox** buttons, get one free key for each service, paste it into `config.js`, and upload the folder again.

### Google Drive key

1. Go to **console.cloud.google.com**, create a project (for example "Guitar Man Finance").
2. **APIs & Services › Library**: turn on **Google Drive API**.
3. **APIs & Services › OAuth consent screen**: choose **External**. Fill in the app name and your email. Under **Scopes**, add `.../auth/drive.file`. This is the only permission the app asks for. It lets the app see **only the one backup file it creates itself**, and nothing else in anyone's Drive.
4. While the app is in **Testing**, add each friend's Gmail address under **Test users** (up to 100). To let anyone use it, click **Publish app**. `drive.file` is one of Google's non-sensitive permissions, so it doesn't go through Google's full security review.
5. **APIs & Services › Credentials › Create credentials › OAuth client ID** › **Web application**. Under **Authorized JavaScript origins**, add your site address (for example `https://guitar-man-finance.netlify.app`). Copy the **Client ID** into `googleClientId` in `config.js`.

### Dropbox key

1. Go to **dropbox.com/developers/apps** › **Create app**.
2. Choose **Scoped access**, then **App folder**. The app can only touch its own folder (Dropbox › Apps › your app name), nothing else.
3. Name it (for example "Guitar Man Finance Backup").
4. On the **Permissions** tab, tick `files.content.write` and `files.content.read`, then **Submit**.
5. On the **Settings** tab, under **OAuth 2 › Redirect URIs**, add your exact site address with the slash at the end (for example `https://guitar-man-finance.netlify.app/`).
6. Copy the **App key** into `dropboxAppKey` in `config.js`. There's no secret to copy, and none is needed.
7. New Dropbox apps allow up to 500 people. If you ever need more, apply for production on the same page.

Then upload the folder to your host again.

### How the backup works

- Each person signs in to **their own** Google or Dropbox account. Backups go to that account and nowhere else, and you never see them.
- The **Dropbox backup** card at the top of the home page shows whether the books are backed up, with one button to link, back up or re-link.
- One file, `guitar-man-finance-backup.json` (in Dropbox › Apps › your app name), is updated a few seconds after each change and again when the app is closed. Changes left unsaved at the end of a session are backed up the next time the app opens.
- If Dropbox ever signs the app out, the card turns red and says **Re-link Dropbox**. One tap fixes it, and nothing on the phone is lost.
- If the phone already has books and the Dropbox backup came from another phone, the app asks first (**Bring it in** or **Replace it**). It never overwrites a backup on its own.
- **Without a Dropbox key** in `config.js`, the card shows **Save backup to Dropbox**. Tapping it opens the share menu, where the person picks Dropbox. The card counts the changes made since the last save. On a new phone, **Load a backup file** brings everything back.
- **Lock with a passphrase** (Settings › Privacy) scrambles the backup *on the device* before it's uploaded (AES-256), so Google or Dropbox only ever stores unreadable data. The passphrase is never saved or sent anywhere. If it's forgotten, nobody can open the backup.
- **New phone:** install the app, connect the same Drive or Dropbox, and tap **Restore**.
- Google only keeps the app signed in for about an hour at a time. After that, backups pause until the person taps **Back up now** and signs in again. Dropbox stays signed in.

## Will it remember people?

Yes, as long as they open it from the home screen icon. Everything is stored on the phone, so there's nothing to log in to, and Dropbox stays linked. Phones can clear storage for websites that are only opened in the browser and not used for a while, which is another reason to add it to the home screen. Even if that happens, linking Dropbox again brings everything back.

## 4. Erase everything

It's under **Settings › Privacy › Advanced: erase everything**, closed by default, and has two separate steps:

1. Type **ERASE** to unlock it.
2. **Press and hold** the red button for 3 seconds. Letting go early cancels it.

There's an optional tickbox to delete the Drive or Dropbox backup as well. If it's left unticked, the backup stays in the person's account and the app is simply disconnected from it.

## Privacy, in plain terms

- No accounts, no server, no analytics, no ads, no tracking.
- Invoices, receipts, photos, mileage and settings live in the app's storage on the device.
- The app has a built-in security rule (a Content Security Policy) that only allows connections to Google sign-in, the Google Drive API and the Dropbox API. Even then, it only connects after the person turns backup on. Every other connection is blocked by the browser.
- The app loads no outside fonts or scripts, apart from Google's sign-in script, and that only loads for people who use Drive.

## Updating the app

Replace the files on your host. Everyone gets the new version the next time they open the app while online. Their data isn't touched.

## Getting it into the App Store and Google Play

This folder is already set up as an installable web app (a "PWA"), which is what the store packaging tools need. You do the final steps, because the store accounts have to be in your name:

1. Put it online (step 1 above).
2. Go to **pwabuilder.com**, enter your site address, and download the **Android** and/or **iOS** package.
3. **Google Play:** create a Google Play Console developer account (one-time US$25), then upload the Android package. This is the easier of the two and works from any computer.
4. **Apple App Store:** you need the Apple Developer Program (US$99 a year) and a Mac with Xcode. Open the iOS package in Xcode, then submit it through App Store Connect.
5. Both stores ask for a privacy policy web address. Use `your-site-address/privacy.html`, after putting your contact email into that file.

Things to know before you pay:

- Apple sometimes rejects apps that are "just a website in a wrapper." This one works offline, stores data on the device, takes receipt photos and prints PDFs, which helps. Still, approval isn't guaranteed.
- Google and Dropbox sign-in can be blocked inside store-wrapped apps, especially on iPhone. If that happens, the store version can ship with backup files only (leave `config.js` empty for that build), while the web version keeps Drive and Dropbox.
- Many people never need the stores. The home-screen install in step 2 gives the same app for free.
