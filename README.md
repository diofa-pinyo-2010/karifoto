## ⚠️ Temporary: szamlazz-client is a fork, not the npm release

`@halftome/szamlazz-client` is installed from a **fork branch**, not from npm:

```bash
pnpm add -D github:nemethricsi/szamlazz-client#advance-invoices
```

**Why:** the published package has no support for advance invoices
(előlegszámla) or final invoices (végszámla), which the deposit → balance
billing flow needs. The fork adds `advanceInvoice`, `finalInvoice` and
`advanceInvoiceNumber` to `InvoiceOptions`, and fixes the `<fejlec>` elements
being emitted out of the xsd's `xs:sequence` order. The package name is
unchanged, so no import anywhere in `src/` refers to the fork.

### ⚠️ `dist/` is committed on that branch — rebuild it after every change

The fork commits its build output, and **has no `prepare` script**. If you change
the fork's TypeScript, you must rebuild and recommit `dist/` or this project
silently keeps running the old code — `pnpm install` will not build it for you:

```bash
# in the fork
pnpm build
git add -f dist        # .gitignore has **/dist, so -f is required
git commit -m "chore: rebuild dist"
git push

# in this project, to pick up the new commit
pnpm add -D github:nemethricsi/szamlazz-client#advance-invoices
```

It was originally set up the other way round, with `prepare: tsc` building at
install time. That fails in CI: to run `prepare`, pnpm installs the fork's
devDependencies by shelling out to `npm install`, npm reads the fork's stale
`package-lock.json`, and its arborist crashes with
`Cannot read properties of null (reading 'edgesOut')` →
`ERR_PNPM_PREPARE_PACKAGE`. It passes locally and fails on CI, because the npm
versions differ. Committing `dist/` avoids the build step entirely, so don't
reintroduce `prepare`.

Things to know:

- **The lockfile pins a commit SHA**, not the branch. Pushing to
  `advance-invoices` does _not_ update this project — re-run the command above
  to pick up new commits.
- **Do not delete the branch** while this dependency points at it. Deleting it
  breaks every install, including Vercel builds.
- The commit that adds `dist/` is deliberately kept **out of the upstream PR**,
  which is cherry-picked from the feature commits only.

### When the upstream PR is merged

1. `pnpm add -D @halftome/szamlazz-client@<new-version>`
2. Check `InvoiceOptions` still exposes the three fields with the same names —
   the maintainer may have renamed them or taken a discriminated union instead.
3. Run the invoice flow against a szamlazz test account before deploying.
4. Delete this section, then delete the fork branch.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
