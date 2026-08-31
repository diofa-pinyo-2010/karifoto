# Coming-soon teardown checklist

Context: while the real homepage (`src/app/page.tsx`) was still in progress, `/`
was rewritten to `src/app/coming-soon/page.tsx` for all visitors via a proxy,
gated by `COMING_SOON_ENABLED`. A secret `?preview=<token>` query param set a
bypass cookie so the real homepage stayed reachable during development. Once
the homepage is ready to launch, undo this. Delete this file once done.

## 1. Turn it off in production first

- [ ] In the hosting provider's env vars (e.g. Vercel dashboard), set
      `COMING_SOON_ENABLED=false` (or delete the var) and redeploy.
      **This step can't be done from the repo — do it manually before or
      immediately after merging the code removal below.**

## 2. Remove the mechanism from the codebase

- [ ] Delete `src/proxy.ts`
- [ ] Delete `src/app/robots.ts` (or simplify it to always
      `{ rules: { userAgent: '*', allow: '/' } }` if you want to keep serving
      an explicit robots.txt going forward — without the file, Next.js just
      serves no robots.txt, which is also fine since it defaults to
      allow-all)
- [ ] In `src/app/coming-soon/page.tsx`, remove the
      `robots: { index: false, follow: false }` line from `metadata` — or
      delete the whole `src/app/coming-soon/` folder if you don't plan to
      reuse it for a future maintenance page
- [ ] In `src/env.ts`, remove the `COMING_SOON_ENABLED` and
      `COMING_SOON_PREVIEW_TOKEN` entries from the `server` schema
- [ ] In `.env.example`, remove the `COMING_SOON_ENABLED` /
      `COMING_SOON_PREVIEW_TOKEN` block and its comment
- [ ] In your local `.env`, remove the same two vars

## 3. Verify

- [ ] `pnpm typecheck` and `pnpm lint` pass
- [ ] `pnpm dev` → `/` serves the real homepage directly, no rewrite
- [ ] `curl -s http://localhost:3000/robots.txt` shows `Allow: /` (or 404 if
      you deleted `robots.ts` entirely)
- [ ] Deploy, then check `https://<domain>/robots.txt` in production the same
      way, and spot-check `/` loads the real homepage for a logged-out /
      incognito request (no bypass cookie)

## Not required, just cleanup

- [ ] The old bypass cookie (`coming-soon-bypass`) left in your browser is
      inert once `proxy.ts` is gone — no need to clear it
- [ ] No need to rotate `COMING_SOON_PREVIEW_TOKEN`; it was never a
      real secret (only gated *seeing* the homepage early, not any data)
