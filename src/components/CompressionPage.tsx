"use client";
import React, { useState, useEffect, useRef } from "react";

type CompressionPreset = "small" | "medium" | "large";

interface CompressionPageProps {
  dark: boolean;
}

export default function CompressionPage({ dark }: CompressionPageProps) {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [workspaceBlob, setWorkspaceBlob] = useState<Blob | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<CompressionPreset>("medium");
  const [isDragOver, setIsDragOver] = useState(false);
  const [decompressedBlob, setDecompressedBlob] = useState<Blob | null>(null);
  const [originalMime, setOriginalMime] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // create worker once
  useEffect(() => {
    if (typeof window !== "undefined") {
      workerRef.current = new Worker("/worker.js");
      workerRef.current.onmessage = async (ev) => {
        const msg = ev.data;
        if (msg.type === "result") {
          const { blob: rawData, mime, originalMime, originalName, isArchive } = msg as {
            blob: unknown; mime?: string; originalMime?: string; originalName?: string; isArchive?: boolean;
          };

          let arrayBuffer: ArrayBuffer;
          if (rawData instanceof ArrayBuffer) {
            // Ensure a standalone ArrayBuffer (not a SAB) by copying
            arrayBuffer = new Uint8Array(rawData).slice().buffer as ArrayBuffer;
          } else if (typeof SharedArrayBuffer !== 'undefined' && rawData instanceof SharedArrayBuffer) {
            // Copy into a new ArrayBuffer
            arrayBuffer = new Uint8Array(rawData).slice().buffer as ArrayBuffer;
          } else if (rawData instanceof Uint8Array) {
            // Copy to a new ArrayBuffer rather than slicing the underlying buffer
            arrayBuffer = new Uint8Array(rawData).slice().buffer as ArrayBuffer;
          } else if (rawData instanceof Blob) {
            arrayBuffer = await rawData.arrayBuffer();
          } else {
            throw new Error('Unsupported blob data type from worker');
          }

          const b = new Blob([arrayBuffer], { type: mime || "application/octet-stream" });
          setWorkspaceBlob(b);
          
          // Store original file info for proper download
          setOriginalMime(originalMime ?? null);
          setOriginalFileName(originalName ?? null);
          
          if (isArchive) {
            // For archived files, we need to decompress them for download
            try {
              console.log("Decompressing archive...", { originalMime, originalName });
              const decompressedData = await decompressArchive(b);
              console.log("Decompression successful:", { 
                originalSize: b.size, 
                decompressedSize: decompressedData.size,
                originalMime: decompressedData.type 
              });
              setDecompressedBlob(decompressedData);
              safeSetCompressedUrl(decompressedData);
            } catch (error) {
              console.error("Failed to decompress archive:", error);
              setDecompressedBlob(null);
              safeSetCompressedUrl(null);
            }
          } else {
            // For images, use the compressed version directly
            setDecompressedBlob(null);
            safeSetCompressedUrl(b);
          }
          
          setProcessing(false);
          setStatus("Done");
        } else if (msg.type === "progress") {
          setStatus(msg.text || "Processing...");
        } else if (msg.type === "error") {
          setProcessing(false);
          setStatus("Error: " + (msg.error || ""));
        }
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // manage object URLs safely
  const prevOriginal = useRef<string | null>(null);
  const prevCompressed = useRef<string | null>(null);

  const safeSetOriginalUrl = (b: Blob | null) => {
    if (prevOriginal.current) {
      URL.revokeObjectURL(prevOriginal.current);
    }
    if (b) {
      prevOriginal.current = URL.createObjectURL(b);
      setOriginalUrl(prevOriginal.current);
    } else {
      prevOriginal.current = null;
      setOriginalUrl(null);
    }
  };

  const safeSetCompressedUrl = (b: Blob | null) => {
    if (prevCompressed.current) {
      URL.revokeObjectURL(prevCompressed.current);
    }
    if (b) {
      prevCompressed.current = URL.createObjectURL(b);
      setCompressedUrl(prevCompressed.current);
    } else {
      prevCompressed.current = null;
      setCompressedUrl(null);
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevOriginal.current) {
        URL.revokeObjectURL(prevOriginal.current);
      }
      if (prevCompressed.current) {
        URL.revokeObjectURL(prevCompressed.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setOriginalFile(file);
    setOriginalSize(file.size);
    safeSetOriginalUrl(file);
    setWorkspaceBlob(null);
    safeSetCompressedUrl(null);
    setStatus(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleCompress = (preset: CompressionPreset) => {
    if (!originalFile || !workerRef.current) return;
    
    setProcessing(true);
    setStatus("Starting compression...");
    setSelectedPreset(preset);
    
    // convert file to array buffer and send to worker
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      workerRef.current?.postMessage({
        type: "compress",
        buffer,
        name: originalFile.name,
        mime: originalFile.type,
        preset: preset
      });
    };
    reader.readAsArrayBuffer(originalFile);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊';
    if (fileType.includes('text')) return '📄';
    return '📁';
  };

  // Function to decompress archived files
  const decompressArchive = async (archiveBlob: Blob): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Load pako library if not already loaded
        const win = window as unknown as { pako?: { ungzip: (data: Uint8Array) => Uint8Array } };
        if (!win.pako) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
          script.onload = async () => {
            try {
              await decompressFile(archiveBlob, resolve, reject);
            } catch (error) {
              reject(error);
            }
          };
          script.onerror = () => reject(new Error('Failed to load decompression library'));
          document.head.appendChild(script);
        } else {
          await decompressFile(archiveBlob, resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  const decompressFile = async (
    archiveBlob: Blob,
    resolve: (value: Blob | PromiseLike<Blob>) => void,
    reject: (reason?: unknown) => void
  ) => {
    try {
      const arrayBuffer = await archiveBlob.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Read wrapper length (first 4 bytes)
      const wrapperLength = new Uint32Array(data.slice(0, 4).buffer)[0];
      
      // Read wrapper JSON
      const wrapperBytes = data.slice(4, 4 + wrapperLength);
      const wrapperText = new TextDecoder().decode(wrapperBytes);
      const wrapper = JSON.parse(wrapperText);
      
      // Read compressed data
      const compressedData = data.slice(4 + wrapperLength);
      
      // Decompress the file data
      const win = window as unknown as { pako?: { ungzip: (data: Uint8Array) => Uint8Array } };
      if (!win.pako) {
        throw new Error('Decompression library not loaded');
      }
      const decompressedData = win.pako.ungzip(compressedData);
      
      // Create blob with original MIME type (force a real ArrayBuffer, not SAB)
      const copy = new Uint8Array(decompressedData).slice();
      const originalBlob = new Blob([copy.buffer as ArrayBuffer], { 
        type: wrapper.originalMime || 'application/octet-stream' 
      });
      
      resolve(originalBlob);
    } catch (error) {
      reject(error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Upload Area */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📁</span>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Upload Your File</h2>
            <p className="text-gray-600 dark:text-gray-300">Supports PDF, Word, Excel, images, and more</p>
          </div>
          
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            accept="*/*"
          />
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
              isDragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {isDragOver ? (
              <div className="text-center">
                <div className="text-4xl mb-4">📂</div>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">Drop your file here</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-4">📤</div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Drag & drop your file here
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-4">or</p>
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  <span className="mr-2">📁</span>
                  Choose File
                </label>
              </div>
            )}
          </div>
        </div>

        {/* File Info */}
        {originalFile && (
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getFileIcon(originalFile.type)}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{originalFile.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {formatFileSize(originalSize || 0)}
                  </p>
                </div>
              </div>
              {originalFile.type.startsWith('image/') && originalUrl && (
                <img src={originalUrl} alt="Preview" className="w-16 h-16 object-cover rounded" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compression Options */}
      {originalFile && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h3 className="text-lg font-semibold mb-6 text-center text-gray-900 dark:text-gray-100">Choose Compression Level</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Small */}
            <button
              onClick={() => handleCompress("small")}
              disabled={processing}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedPreset === "small" && !processing
                  ? 'border-green-500 bg-green-50 dark:bg-green-900'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📦</div>
                <h4 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Small Size</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Maximum compression</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Documents: ~10-30% of original</p>
              </div>
            </button>

            {/* Medium */}
            <button
              onClick={() => handleCompress("medium")}
              disabled={processing}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedPreset === "medium" && !processing
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">⚖️</div>
                <h4 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Medium Size</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Balanced compression</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Documents: ~30-50% of original</p>
              </div>
            </button>

            {/* Large */}
            <button
              onClick={() => handleCompress("large")}
              disabled={processing}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedPreset === "large" && !processing
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">💎</div>
                <h4 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Large Size</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Minimal compression</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Documents: ~50-70% of original</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            {processing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            ) : (
              <span className="text-blue-600 mr-3">✓</span>
            )}
            <p className="text-blue-800 dark:text-blue-200">{status}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {workspaceBlob && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <h3 className="text-lg font-semibold mb-6 text-center text-gray-900 dark:text-gray-100">Compression Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Original */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center text-gray-900 dark:text-gray-100">
                <span className="mr-2">📄</span>
                Original File
              </h4>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {formatFileSize(originalSize || 0)}
              </p>
            </div>

            {/* Compressed */}
            <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center text-gray-900 dark:text-gray-100">
                <span className="mr-2">📦</span>
                Compressed File
              </h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatFileSize(workspaceBlob.size)}
              </p>
              {decompressedBlob && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  (Downloaded file: {formatFileSize(decompressedBlob.size)})
                </p>
              )}
            </div>
          </div>

          {/* Compression Stats */}
          {originalSize && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-800 rounded-full">
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  {(((originalSize - workspaceBlob.size) / originalSize) * 100).toFixed(1)}% smaller
                </span>
                <span className="ml-2 text-green-600 dark:text-green-400">
                  (Saved {formatFileSize(originalSize - workspaceBlob.size)})
                </span>
              </div>
            </div>
          )}

          {/* Image Preview */}
          {compressedUrl && workspaceBlob.type.startsWith('image/') && (
            <div className="mb-6 text-center">
              <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Compressed Preview</h4>
              <img 
                src={compressedUrl} 
                alt="Compressed" 
                className="max-w-full max-h-64 object-contain mx-auto border border-gray-200 dark:border-gray-600 rounded-lg" 
              />
            </div>
          )}

          {/* Download Button */}
          <div className="text-center">
            <button
              onClick={async () => {
                try {
                  let downloadBlob: Blob;
                  let downloadName: string;
                  
                  if (decompressedBlob) {
                    // For documents, download the decompressed version
                    downloadBlob = decompressedBlob;
                    downloadName = originalFileName || originalFile?.name || 'file';
                  } else {
                    // For images, download the compressed version
                    downloadBlob = workspaceBlob!;
                    downloadName = `compressed_${originalFile?.name || 'file'}`;
                  }
                  
                  // Create download link
                  const url = URL.createObjectURL(downloadBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = downloadName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Download failed:', error);
                  alert('Download failed. Please try again.');
                }
              }}
              className="inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
            >
              <span className="mr-2">⬇️</span>
              Download {decompressedBlob ? 'Decompressed' : 'Compressed'} File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
