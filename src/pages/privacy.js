/** Privacy page — plain explanation, no absolute claims. */
import { html, render } from '../utils/html.js';
import { logo, icon } from '../components/icons.js';
import { isAppMode } from '../state/authState.js';

export default function privacyPage(el) {
  const standalone = !isAppMode();
  render(el, html`<div class="${standalone ? 'standalone' : 'page page--narrow'}">
    ${standalone ? html`<header class="landing__nav"><a class="brand" href="#/">${logo(28)}<span class="brand__name">DevMemory</span></a><nav class="landing__links"><a href="#/login">Sign in</a></nav></header>` : ''}
    <article class="prose-page" ${standalone ? html`id="main" tabindex="-1"` : ''}>
      <h1 class="page-title" tabindex="-1">How DevMemory handles your data</h1>
      <p class="lead">DevMemory stores what you save in your own Firebase account space so it can sync between devices. That means your data lives on Google Cloud servers, not only on your computer. Here’s exactly what happens.</p>

      <h2>${icon('lock', { size: 18 })}Signing in</h2>
      <p>Sign-in is handled by Firebase Authentication, with Google or email and password. DevMemory never sees or stores your password. Google sign-in shares your name, email and profile photo with the app.</p>

      <h2>${icon('database', { size: 18 })}Where your data is stored</h2>
      <p>Memories, snippets, commands, projects, bookmarks, collections, reviews and activity are stored in Cloud Firestore under a path tied to your user ID. Security rules allow only your signed-in account to read or write that path. Image attachments are stored in Firebase Storage under the same rule.</p>
      <p>Anyone who operates the Firebase project (the person or team who deployed this copy of DevMemory) can technically access the stored data through the Firebase console. Don’t save production secrets, passwords or private keys in memories.</p>
      <p>Images are served through Firebase download links that contain a long, unguessable token. Anyone you give such a link to can open that image.</p>

      <h2>${icon('cloudOff', { size: 18 })}Offline cache</h2>
      <p>To work offline, Firestore keeps a copy of your data in this browser’s IndexedDB storage. Anyone with access to this device and browser profile could read it. Signing out does not wipe it immediately on every browser; deleting your account does. On a shared computer, use a private window or clear site data afterwards.</p>
      <p>Small preferences — theme, dashboard layout, recent searches — are stored in localStorage on this device only.</p>

      <h2>${icon('repeat', { size: 18 })}Synchronisation</h2>
      <p>Changes made offline are queued on the device and sent to Firestore when you reconnect. The status indicator in the top bar shows whether everything has synced.</p>

      <h2>${icon('chart', { size: 18 })}Analytics</h2>
      <p>Analytics is off unless the deployment has it configured and you opt in under Settings → Privacy. If enabled, only coarse events (for example “memory created”) are sent — never titles, content, code or search text. Quick Capture parsing and insights run entirely in your browser; no text is sent to an AI service.</p>

      <h2>${icon('user', { size: 18 })}You own your data</h2>
      <p>Export everything as JSON or Markdown at any time from Settings → Data &amp; backup, import it elsewhere, or move it into another tool. Nothing is locked in.</p>

      <h2>${icon('trash', { size: 18 })}Deleting your account</h2>
      <p>Settings → Danger zone lets you delete all your data, or delete your account. Account deletion removes your Firestore documents, your uploaded images and your sign-in account, then clears the offline cache in this browser. Firebase may keep backups for a limited time according to Google Cloud’s own retention policies.</p>
      ${standalone ? html`<p><a class="btn btn--ghost" href="#/">${icon('arrowLeft', { size: 15 })}Back</a></p>` : ''}
    </article>
  </div>`);
}
