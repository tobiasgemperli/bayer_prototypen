ResiYou prototype — static build for server testing
=====================================================

This folder is the full production build of the prototype (`npm run
build` output). Upload everything in here — as-is, keeping the folder
structure — to your web server's document root.

What's included
---------------
- index.html, assets/        the app itself
- .htaccess                  SPA fallback + basic caching for Apache hosting
- _redirects                 SPA fallback for Netlify (ignored elsewhere)
- vercel.json                SPA fallback for Vercel (ignored elsewhere)

Why the fallback files matter
------------------------------
This app uses client-side routing (React Router, browser history mode).
Without a fallback rule, only the homepage ("/") loads — any deep link
(e.g. /plot/1, /v/v14-sample-summary-header/plot/1) or a page refresh
returns a 404, because the server looks for a matching file that doesn't
exist. Pick whichever fallback file matches your host:
  - Apache / cPanel / most shared hosting  -> .htaccess (already included)
  - Netlify                                 -> _redirects
  - Vercel                                  -> vercel.json
  - Nginx / other                           -> add a fallback rule
    yourself, e.g.: try_files $uri /index.html;

Notes about this build
-----------------------
- It's a frontend-only design sandbox — no backend, nothing to configure
  server-side beyond serving static files + the SPA fallback.
- Data resets on page reload except lab samples, which persist in the
  browser's localStorage (so they're per-browser, not shared across
  visitors testing the same URL).
- Assets are referenced with relative paths ("./assets/..."), so this
  build works whether it's uploaded to the domain root (example.com) or
  a subfolder (example.com/resiyou/) — no config changes needed either
  way.
- The app's router also detects its own subfolder at runtime (from the
  URL of its own script tag) and matches routes against that, instead
  of assuming it's mounted at the domain root. Without this, assets
  would load fine in a subfolder but every route (including "/") would
  render React Router's "Unexpected Application Error! 404 Not Found"
  screen instead of the app — this is what happened the first time this
  was uploaded to bayer.milkinteractive.ch/resiyou/. Both this and the
  relative asset paths above are needed together for subfolder hosting
  to work; neither alone is sufficient.

To refresh this folder later
------------------------------
From the project root, run:
  npx vite build --base=./
then copy dist/index.html and dist/assets/ into this `_ServerReady/`
folder (overwriting the existing ones), keeping .htaccess / _redirects /
vercel.json / this README as they are.

Plain `npm run build` will NOT work for this purpose — it emits
absolute asset paths ("/assets/...") meant for root-domain hosting, and
the page will render blank if uploaded to a subfolder. Always use the
`--base=./` build for anything going into _ServerReady.
