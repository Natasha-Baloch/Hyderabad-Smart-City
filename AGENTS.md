<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- UI reads data only through `src/lib/data.ts`; sample records live in `src/data/mock.ts` — so mock data can be swapped for database queries without touching pages.
- Leaflet is loaded via `CityMap` (ClientOnly + lazy import) — Leaflet touches `window` at import time and breaks SSR.
