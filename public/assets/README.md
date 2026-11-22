# public/assets

Files here are published at `/assets/...` under the names they have here.

- They are **not** content-hashed, so `vercel.json` does not cache them forever: the browser revalidates them.
  Anything Vite bundles (scripts, styles, fonts, imports from `src/`) is hashed and lands in `/immutable/` instead.
- Use this folder for files that need a stable address: app icons now, and later the narration and phoneme clips that
  content packs refer to by path (Phase 04).
- Everything added here must be original to this project or carry a licence recorded in `docs/ASSETS.md`. Nothing is
  hot-linked from another site.

`icons/` is generated from `public/favicon.svg` by `npm run icons`.
