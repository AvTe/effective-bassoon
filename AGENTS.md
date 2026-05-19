<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Architecture & Conventions
- **Framework**: Next.js (Static HTML Export) built as a **Chrome Extension** (Manifest V3).
- **Core Components**:
  - `public/manifest.json`: Extension manifest.
  - `public/content.js`: Content script injected into pages.
  - `src/app/page.js`: Default popup UI for the extension.

## Build Commands & Workflow
- Standard Next.js build: `npm run build` (outputs to `out/`).
- **Post-Build Chrome Extension Fix**: 
  - Chrome Extension MV3 does not support `_` prefixes (like `_next/`) or inline scripts.
  - After running `npm run build`, you MUST run `node rename-next.js` to rename directories, rewrite paths, and extract inline scripts to comply with CSP and Chrome's structure.
  - The final deployable extension is the `out` directory.
