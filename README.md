# CleanCompress

A modern, minimal, and premium Chrome Extension (Manifest V3) built with Next.js that allows you to easily scrape, bulk-compress, and download images from any webpage, including Google Drive folders and Google Photos albums.

---

## Key Features

* **📦 Bulk Image Compression**: Queue and compress multiple images simultaneously.
* **⚡ High-Performance Client-Side Encoding**:
  * Powered by `compressorjs` for highly optimized JPEG and WebP compression.
  * Powered by `upng-js` for clean lossy/lossless PNG compression.
* **🌐 Webpage & Google Drive Scraper**:
  * Automatically scans the current active browser tab for images.
  * Injects custom content scripts to scrape images from **Google Drive folders** and **Google Photos albums** with one click.
* **🎛️ Precision Compression Controls**:
  * **Quality Slider**: Set custom image quality (0% to 100%).
  * **Max Dimension Constraint**: Set maximum width or height limits to resize images on-the-fly.
  * **File Suffix Configuration**: Add a custom suffix to compressed files (e.g., `_min` or `-compressed`).
* **🔍 Interactive Before/After Comparison**:
  * Open a side-by-side comparative lightbox with an interactive slider to check image quality visually before downloading.
* **🎨 Premium Dark/Light UI/UX**:
  * Sleek glassmorphism look with smooth micro-animations.
  * Dynamic dark mode toggle.
  * Robust, overflow-free responsive design tailored specifically for Windows and macOS extension viewports.

---

## Tech Stack & Architecture

* **Framework**: Next.js (configured for Static HTML Export).
* **Styling**: Vanilla CSS with custom layout systems.
* **Extension API**: Manifest V3 (using background service workers and scripting permissions).
* **Compression Pipeline**:
  * JPEG/WebP: `compressorjs`
  * PNG: `upng-js`
  * Zip Archiving: `jszip`

---

## Installation & Developer Setup

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or higher recommended)
* `npm` or `yarn`

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
To preview the UI in a local browser environment:
```bash
npm run dev
```

### 3. Build & Package the Chrome Extension
Chrome Web Store extensions do not allow folders prefixed with underscores (`_next`) or inline JavaScript scripts due to Content Security Policy (CSP) guidelines. 

This project uses a custom post-build pipeline to bundle and patch the extension automatically:
```bash
npm run build
node rename-next.js
```

This builds the static site, renames `_next` assets, extracts inline scripts to separate JS files, and updates references.

### 4. Load the Extension into Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle the **Developer mode** switch in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the **`out`** directory inside this project folder.
5. The extension is now loaded and ready to use!

---

## Extension Assets & Manifest Config
* **Manifest Entrypoint**: [public/manifest.json](file:///c:/Users/ASUS LAPTOP/Desktop/img-comp-ext/public/manifest.json)
* **Injected Scraper Content Script**: [public/content.js](file:///c:/Users/ASUS LAPTOP/Desktop/img-comp-ext/public/content.js)
* **Background Process Worker**: [public/background.js](file:///c:/Users/ASUS LAPTOP/Desktop/img-comp-ext/public/background.js)
* **Static Assets (Icons & Favicons)**: Located in the `public/` and `src/app/` folders.
