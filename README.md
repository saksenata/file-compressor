## File Compressor & Watermarker

A fast, private, in-browser tool to either compress files or add watermarks. Nothing is uploaded to a server — all processing happens locally in your browser.

### What it does
- Compress common files to reduce size (images and common documents)
- Add text watermarks to images and PDFs with live preview
- Toggle between Compression and Watermark tools in the header
- Light/Dark mode

### Key features
- Client-side only: files never leave your device
- Drag & drop uploads with file details and previews
- Three compression presets: small, medium, large
- Watermark controls: text, size, opacity, color, position (diagonal grid, center, bottom-right)
- Web Worker powered processing for a smooth UI

### Supported file types
- Compression: images (PNG/JPEG/WebP, etc.), PDF, and many common office/text formats
- Watermarking: images and PDFs

### How to use (in the browser)
1. Open the site and choose a tool using the header button:
   - "📦 Compress Files" for size reduction
   - "🔒 Add Watermark" for stamping images/PDFs
2. Drag & drop a file into the upload area or click Choose File
3. For Compression: pick a preset and start compression, then download
4. For Watermarking: adjust text/size/opacity/color/position, preview, then download

### Privacy
All operations run locally in your browser:
- Compression runs inside a Web Worker (`public/worker.js`)
- Image watermarking uses `<canvas>`
- PDF watermarking uses `pdf-lib`
No files are sent to any server.

### How it works (high level)
- UI: `src/app/page.tsx` toggles between `CompressionPage` and `WatermarkPage` and handles theme
- Compression (`src/components/CompressionPage.tsx`):
  - Sends file bytes to a Web Worker for compression
  - Images: produces a directly downloadable compressed image
  - Non-images: produces a compressed archive; app transparently decompresses before download for a seamless result
  - Uses safe object-URL management to prevent memory leaks
- Watermarking (`src/components/WatermarkPage.tsx`):
  - Images: draws text onto a `<canvas>` with live scaled preview
  - PDFs: draws text onto every page using `pdf-lib` with adjustable opacity/position

### Local development
Prerequisites: Node.js 18+

Install dependencies and run the dev server:
```bash
npm install
npm run dev
```
Then open http://localhost:3000

Build for production and preview:
```bash
npm run build
npm start
```

### Tech stack
- Next.js App Router (TypeScript)
- Tailwind CSS for styling
- Web Worker for compression (`public/worker.js`)
- `pdf-lib` for PDF watermarking

### Limitations
- Very large files may be limited by available browser memory
- Watermarking currently supports text (no image logos yet)
- PDF previews can vary across browsers; download to verify exact output

### Project structure (relevant parts)
```
src/
  app/
    page.tsx          # tool toggle + theme
  components/
    CompressionPage.tsx
    WatermarkPage.tsx
public/
  worker.js           # compression worker
```

Contributions and suggestions are welcome.
