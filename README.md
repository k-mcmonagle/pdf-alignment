# AlignPDF

**Local-first PDF alignment workspace for side-by-side review, markup, and measurement.**

AlignPDF is a browser-only mini-app for arranging PDF pages on an infinite canvas, annotating them, measuring against calibrated drawings, and saving complete sessions for later use or sharing.

## What It Does

- Load one or many PDFs entirely in the browser
- Arrange pages on an infinite canvas
- Add annotations, notes, highlights, and measurements
- Autosave locally with IndexedDB
- Export and import **self-contained session files** that include:
  - workspace layout
  - annotations
  - viewport/settings
  - embedded PDF source data so sessions reopen without re-uploading files
- Work offline after first load as a PWA

## Privacy And Trust

AlignPDF is designed to be hostable as a static app with no backend.

- No accounts
- No analytics
- No uploads
- No API calls
- No server-side PDF handling
- No third-party runtime dependency for the PDF worker

Once deployed, the app can be served directly from Vercel’s static hosting. PDF parsing and rendering happen on the client device with `pdf.js`.

## Quick Start

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Vercel Hosting

This app is suitable for Vercel’s free tier because it is a static SPA.

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Select the `Vite` framework preset.
4. Deploy with the default static output.

Notes:

- No serverless functions are required.
- No environment variables are required.
- No rate limiting is needed because there is no backend request surface.
- Security headers are configured in [`vercel.json`](/mnt/c/Users/kmcmo/Documents/Projects/pdf-alignment/vercel.json).

## Offline Behaviour

- The app shell is cached by the service worker.
- The PDF worker is bundled locally, so opening PDFs does not depend on a CDN.
- Autosaved workspaces and cached PDF binaries are stored in IndexedDB.
- Exported `.alignpdf.json` files are self-contained and can reopen a session on another machine.

## Session Files

Saved workspace files are intentionally complete rather than lightweight manifests.

Benefits:

- Reliable reopening later
- Shareable sessions
- No need to relink PDFs manually

Tradeoff:

- Large source PDFs can produce large exported JSON files because the PDF data is embedded.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `H` | Pan |
| `P` | Freehand pen |
| `R` | Rectangle |
| `E` | Ellipse |
| `A` | Arrow |
| `L` | Line |
| `T` | Sticky note |
| `M` | Measure |
| `Delete` | Delete selected |
| `Escape` | Deselect / return to select |

## Architecture

```text
src/
├── components/
├── features/
│   ├── canvas/
│   └── annotations/
├── hooks/
├── lib/
│   ├── pdf.ts
│   ├── storage.ts
│   └── canvasExport.ts
├── store/
├── styles/
└── types/
```

Key choices:

- `React + TypeScript + Vite` for fast iteration and simple static hosting
- `Zustand` for centralized client-side state
- `pdfjs-dist` for in-browser PDF rendering
- `react-konva` for the workspace canvas
- `idb-keyval` for local persistence
- `vite-plugin-pwa` for offline support

## Maintenance Notes

- Keep the app backend-free if you want free hosting and minimal security overhead.
- Prefer hashed static assets and client-only features.
- If you add any network features later, revisit CSP, privacy claims, and whether rate limiting is then needed.
- Export/import compatibility should stay backward-compatible with older workspace files when possible.

## License

MIT
