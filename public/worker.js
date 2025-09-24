self.onmessage = async function (e) {
    const msg = e.data;
    if (msg.type === "compress") {
        try {
            postMessage({ type: "progress", text: "Worker received data" });
            
            const { buffer, name, mime, preset } = msg;
            // reconstruct a blob
            const inputBlob = new Blob([buffer], { type: mime || "application/octet-stream" });
            
            
            if ((mime || "").startsWith("image/")) {
                // compress image using OffscreenCanvas / createImageBitmap
                postMessage({ type: "progress", text: "Compressing image in worker" });
                const bitmap = await createImageBitmap(inputBlob);
                const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(bitmap, 0, 0);
                
                // choose quality from preset
                const quality = preset === "small" ? 0.5 : preset === "medium" ? 0.7 : 0.9;
                // prefer webp
                let outBlob = null;
                try {
                outBlob = await canvas.convertToBlob({ type: "image/webp", quality });
                } catch (err) {
                // fallback to jpeg
                outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality });
                }
                
                // send result as transferable ArrayBuffer
                const ab = await outBlob.arrayBuffer();
                postMessage({ type: "result", blob: ab, mime: outBlob.type }, [ab]);
            } else {
                // For non-image files, we need to preserve functionality
                // Instead of compressing the raw file, we'll create a compressed archive
                postMessage({ type: "progress", text: "Loading compression library" });
                try {
                    importScripts("https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js");
                } catch (e) {
                    throw new Error("Failed to load compression library");
                }
                
                if (!self.pako) throw new Error("Compression library not available");
                
                // Create a ZIP-like structure to preserve file functionality
                const fileName = name || "file";
                const fileExtension = fileName.split('.').pop() || '';
                
                // For documents, we'll create a simple compressed archive
                // This preserves the original file structure while reducing size
                const originalData = new Uint8Array(buffer);
                
                // Choose compression level based on preset
                const compressionLevel = preset === "small" ? 9 : preset === "medium" ? 6 : 3;
                
                // Compress the data
                const compressedData = self.pako.gzip(originalData, { level: compressionLevel });
                
                // For documents, we need a simpler approach that preserves file integrity
                // Instead of complex archiving, we'll use a more reliable method
                
                // Create a simple wrapper that can be easily decompressed
                const wrapper = {
                    type: "compressed_document",
                    originalName: fileName,
                    originalMime: mime,
                    compressionLevel: compressionLevel,
                    originalSize: originalData.length
                };
                
                // Encode wrapper as JSON
                const wrapperJson = JSON.stringify(wrapper);
                const wrapperBytes = new TextEncoder().encode(wrapperJson);
                
                // Create the archive structure: [wrapper_length][wrapper_json][compressed_data]
                const wrapperLength = new Uint32Array([wrapperBytes.length]);
                const archiveData = new Uint8Array(4 + wrapperBytes.length + compressedData.length);
                
                // Write wrapper length (4 bytes)
                archiveData.set(new Uint8Array(wrapperLength.buffer), 0);
                // Write wrapper JSON
                archiveData.set(wrapperBytes, 4);
                // Write compressed data
                archiveData.set(compressedData, 4 + wrapperBytes.length);
                
                // Create the output blob
                const outBlob = new Blob([archiveData], { 
                    type: "application/octet-stream" 
                });
                
                const ab = await outBlob.arrayBuffer();
                postMessage({ 
                    type: "result", 
                    blob: ab, 
                    mime: "application/octet-stream",
                    originalMime: mime,
                    originalName: fileName,
                    isArchive: true
                }, [ab]);
            }
        } catch (err) {
            postMessage({ type: "error", error: String(err) });
        }
    }
};