# ChartDeck

**Professional PDF alignment chart workspace for side-by-side document review.**

ChartDeck is a local-first, privacy-focused web application for reviewing many single-page PDF alignment charts side by side on an infinite canvas. Designed for subsea cable engineers, pipeline designers, and anyone who needs to compare many PDF documents simultaneously.

![ChartDeck](https://img.shields.io/badge/status-production--ready-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Privacy](https://img.shields.io/badge/privacy-local--only-emerald)

---

## Features

- **Infinite canvas workspace** — Pan, zoom, and arrange dozens of PDFs side by side
- **Drag-and-drop PDF import** — Load multiple files instantly with file picker or drag and drop
- **Annotation tools** — Rectangles, ellipses, arrows, lines, freehand pen, sticky notes, highlights
- **Workspace save/load** — Export and import workspace JSON files with full layout and annotations
- **Autosave** — Automatic session persistence via IndexedDB
- **100% local** — All file processing happens in-browser. No uploads, no servers, no telemetry
- **PWA / Offline** — Installable as a Progressive Web App, works offline after first load
- **Dark mode** — Professional dark UI optimized for extended document review sessions
- **Keyboard shortcuts** — Full shortcut support for efficient workflows
- **Canvas export** — Export current view as PNG image
- **Annotation export** — Export annotations as CSV for external review

## Privacy & Security

ChartDeck is designed with privacy as a core principle:

- **All processing is local** — PDFs are rendered in your browser using pdf.js. Files never leave your device.
- **No file uploads** — There is no backend, no API calls, no cloud storage.
- **No telemetry** — No analytics, no tracking, no third-party data collection.
- **No login required** — No accounts, no authentication.
- **Workspace data is yours** — Save/load JSON files that you control entirely.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deploy to Vercel

1. Push to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Framework preset: **Vite**
4. Deploy — no configuration needed

Or deploy from CLI:

```bash
npm install -g vercel
vercel
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `H` | Pan/hand tool |
| `P` | Freehand pen |
| `R` | Rectangle |
| `E` | Ellipse |
| `A` | Arrow |
| `L` | Line |
| `T` | Sticky note |
| `Delete` | Delete selected |
| `Escape` | Deselect all |
| `Scroll` | Zoom to cursor |
| `Middle mouse` | Pan canvas |
| `Shift+Click` | Multi-select |

## Architecture

```
src/
├── components/
│   ├── layout/       # TopBar, Toolbar, Sidebars, ZoomControls
│   └── ui/           # LoadingOverlay, EmptyState, DropZoneOverlay
├── features/
│   ├── canvas/       # Main Konva canvas workspace
│   └── annotations/  # Drawing layer and annotation rendering
├── hooks/            # usePdfLoader, useKeyboardShortcuts, useAutosave
├── lib/              # pdf.ts (rendering), storage.ts (IndexedDB), utils.ts
├── store/            # Zustand state management
├── types/            # TypeScript interfaces and types
└── styles/           # Tailwind CSS globals
```

### Key Technical Choices

| Choice | Rationale |
|--------|-----------|
| **Vite + React + TypeScript** | Fast builds, excellent DX, type safety, Vercel-native |
| **react-konva** | Hardware-accelerated 2D canvas with React integration, proven for document workspaces |
| **Zustand** | Minimal, performant state management without boilerplate |
| **pdfjs-dist** | Industry-standard PDF rendering in the browser |
| **IndexedDB (idb-keyval)** | Autosave workspace data locally without size limits |
| **Tailwind CSS** | Utility-first styling, consistent design system, small CSS output |
| **vite-plugin-pwa** | Service worker generation for offline support |

### Architecture Decisions

- **State centralization**: Single Zustand store with flat slices for documents, nodes, annotations, viewport, and UI state. Simple and debuggable.
- **PDF rendering strategy**: PDFs are rendered to canvas at a configurable scale, then converted to Image elements for Konva rendering. This separates PDF processing from canvas display and allows caching.
- **Workspace format**: JSON manifest stores metadata, layout positions, and annotations. PDF binary data is not embedded — on reload, users relink files by re-importing. This keeps workspace files small and portable.
- **Annotation model**: Annotations are stored as typed objects in the store, rendered declaratively via react-konva. Drawing is handled via a transparent overlay layer.

### Tradeoffs

- **No PDF binary embedding**: Workspace files reference documents by fingerprint/filename but don't embed PDF data. This keeps saves lightweight but requires re-importing PDFs when loading a workspace on a new machine.
- **Raster rendering**: PDFs are rasterized at a fixed scale rather than re-rendering at each zoom level. This prioritizes performance with many documents over maximum sharpness at extreme zoom.
- **Single-layer canvas**: All elements share one Konva layer for simplicity. For very large workspaces (100+ pages with many annotations), a multi-layer approach could improve performance.

## Future Improvements

- Multi-page PDF thumbnail strip in sidebar
- Re-render PDFs at higher quality when zoomed in (LOD)
- Box selection tool
- Undo/redo history
- PDF text search
- Annotation grouping and filtering
- Workspace templates
- Multi-tab workspaces
- PDF page rotation
- Print support
- Collaborative review (via shared workspace files)

## Alternative Name Ideas

The product is named **ChartDeck**. Other considered names:

1. **AlignBoard** — Alignment review board
2. **SpreadView** — Spread documents for review
3. **RouteCanvas** — Subsea route alignment canvas
4. **DeckBoard** — Document deck/board
5. **ChartSpread** — Spread alignment charts
6. **AlignView** — View alignments side by side
7. **LayoutDeck** — Document layout workspace
8. **ReviewCanvas** — Canvas for document review
9. **SheetDeck** — Sheet/document deck
10. **PlanView** — Plan/drawing viewer

## Tech Stack

- [React 18](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Konva](https://konvajs.org) / [react-konva](https://github.com/konvajs/react-konva)
- [pdf.js](https://mozilla.github.io/pdf.js/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Lucide Icons](https://lucide.dev)
- [idb-keyval](https://github.com/nicedoc/idb-keyval)

## License

MIT
