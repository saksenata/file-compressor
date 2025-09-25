"use client";
import React, { useState, useEffect } from "react";

interface WatermarkPageProps {
  dark: boolean;
}

export default function WatermarkPage({ dark }: WatermarkPageProps) {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [watermarkSize, setWatermarkSize] = useState(24);
  const [watermarkColor, setWatermarkColor] = useState('#000000');
  const [watermarkPosition, setWatermarkPosition] = useState<'center' | 'diagonal' | 'bottom-right'>('diagonal');
  const [watermarkedBlob, setWatermarkedBlob] = useState<Blob | null>(null);
  const [watermarkedUrl, setWatermarkedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

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
    setWatermarkedBlob(null);
    setWatermarkedUrl(null);
    setPreviewUrl(null);
    setStatus(null);
  };

  const safeSetOriginalUrl = (b: Blob | null) => {
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl);
    }
    if (b) {
      const url = URL.createObjectURL(b);
      setOriginalUrl(url);
    } else {
      setOriginalUrl(null);
    }
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

  const handleWatermark = async () => {
    if (!originalFile) return;
    
    setProcessing(true);
    setStatus('Adding watermark...');
    
    try {
      if (originalFile.type.startsWith('image/')) {
        // Watermark image
        await watermarkImage();
      } else if (originalFile.type === 'application/pdf') {
        // Watermark PDF
        await watermarkPDF();
      } else {
        setStatus('Watermarking not supported for this file type');
        setProcessing(false);
      }
    } catch (error) {
      console.error('Watermarking failed:', error);
      setStatus('Watermarking failed: ' + error);
      setProcessing(false);
    }
  };

  const generatePreview = async (sourceUrl: string) => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create a smaller preview (max 400px width/height)
        const maxSize = 400;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw original image scaled
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Add watermark
        if (ctx) {
          const scaleFactor = width / img.width;
          const scaledFontSize = watermarkSize * scaleFactor;
          
          ctx.font = `${scaledFontSize}px Arial`;
          ctx.fillStyle = watermarkColor;
          ctx.globalAlpha = watermarkOpacity;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (watermarkPosition === 'diagonal') {
            // Draw diagonal watermarks
            const stepX = width / 3;
            const stepY = height / 3;
            
            for (let x = 0; x < width + stepX; x += stepX) {
              for (let y = 0; y < height + stepY; y += stepY) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 6); // 30 degree rotation
                ctx.fillText(watermarkText, 0, 0);
                ctx.restore();
              }
            }
          } else if (watermarkPosition === 'center') {
            ctx.fillText(watermarkText, width / 2, height / 2);
          } else if (watermarkPosition === 'bottom-right') {
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(watermarkText, width - 20, height - 20);
          }
        }
        
        const previewUrl = canvas.toDataURL('image/png');
        resolve(previewUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image for preview'));
      img.src = sourceUrl;
    });
  };

  const watermarkImage = async () => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx?.drawImage(img, 0, 0);
        
        // Add watermark
        if (ctx) {
          ctx.font = `${watermarkSize}px Arial`;
          ctx.fillStyle = watermarkColor;
          ctx.globalAlpha = watermarkOpacity;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (watermarkPosition === 'diagonal') {
            // Draw diagonal watermarks
            const stepX = canvas.width / 3;
            const stepY = canvas.height / 3;
            
            for (let x = 0; x < canvas.width + stepX; x += stepX) {
              for (let y = 0; y < canvas.height + stepY; y += stepY) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 6); // 30 degree rotation
                ctx.fillText(watermarkText, 0, 0);
                ctx.restore();
              }
            }
          } else if (watermarkPosition === 'center') {
            ctx.fillText(watermarkText, canvas.width / 2, canvas.height / 2);
          } else if (watermarkPosition === 'bottom-right') {
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(watermarkText, canvas.width - 20, canvas.height - 20);
          }
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            setWatermarkedBlob(blob);
            const url = URL.createObjectURL(blob);
            setWatermarkedUrl(url);
            setStatus('Watermark added successfully');
            setProcessing(false);
            resolve(blob);
          } else {
            reject(new Error('Failed to create watermarked image'));
          }
        }, originalFile?.type || 'image/png');
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = originalUrl!;
    });
  };

  const watermarkPDF = async () => {
    try {
      if (!originalFile) return;
      setStatus('Adding watermark to PDF...');

      const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');

      const srcBytes = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(srcBytes, { updateMetadata: false });
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Convert hex color to rgb 0-1
      const hexToRgb01 = (hex: string) => {
        const h = hex.replace('#', '');
        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return rgb(r / 255, g / 255, b / 255);
      };

      const color = hexToRgb01(watermarkColor);
      const opacity = Math.min(1, Math.max(0.05, watermarkOpacity));

      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();

        // Scale font size roughly with page size to keep it visible
        const baseSize = Math.max(12, Math.min(72, watermarkSize));
        const scale = Math.min(width, height) / 600; // heuristic scaling
        const fontSize = Math.max(10, Math.min(120, baseSize * scale));

        const drawCentered = (x: number, y: number, rotateDiag: boolean) => {
          page.drawText(watermarkText, {
            x,
            y,
            size: fontSize,
            font,
            color,
            opacity,
            rotate: rotateDiag ? degrees(-30) : undefined,
          });
        };

        if (watermarkPosition === 'diagonal') {
          const stepX = width / 3;
          const stepY = height / 3;
          for (let x = 0; x <= width + stepX; x += stepX) {
            for (let y = 0; y <= height + stepY; y += stepY) {
              drawCentered(x - font.widthOfTextAtSize(watermarkText, fontSize) / 2, y, true);
            }
          }
        } else if (watermarkPosition === 'center') {
          const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
          const textHeight = fontSize;
          drawCentered((width - textWidth) / 2, (height - textHeight) / 2, false);
        } else {
          // bottom-right
          const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
          const margin = 20 * scale;
          drawCentered(width - textWidth - margin, margin, false);
        }
      }

      const outBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      });

      const ab = outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength) as ArrayBuffer;
      const outBlob = new Blob([ab], { type: 'application/pdf' });
      setWatermarkedBlob(outBlob);
      const url = URL.createObjectURL(outBlob);
      setWatermarkedUrl(url);
      setProcessing(false);
      setStatus('Watermark added successfully');
    } catch (err) {
      console.error('PDF watermarking failed:', err);
      setProcessing(false);
      setStatus('PDF watermarking failed');
    }
  };

  const downloadWatermarked = () => {
    if (watermarkedBlob && watermarkedUrl) {
      const url = watermarkedUrl;
      const a = document.createElement('a');
      a.href = url;
      a.download = `watermarked_${originalFile?.name || 'file'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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

  // Update preview when settings change
  useEffect(() => {
    if (originalFile && originalFile.type.startsWith('image/') && originalUrl) {
      const updatePreview = async () => {
        try {
          const newPreviewUrl = await generatePreview(originalUrl);
          setPreviewUrl(newPreviewUrl);
        } catch (error) {
          console.error('Failed to generate preview:', error);
        }
      };
      
      // Debounce preview updates
      const timeoutId = setTimeout(updatePreview, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [watermarkText, watermarkOpacity, watermarkSize, watermarkColor, watermarkPosition, originalUrl, originalFile]);

  // Update PDF preview when settings change
  useEffect(() => {
    let revokedUrl: string | null = null;
    const generatePdf = async () => {
      if (!originalFile || originalFile.type !== 'application/pdf') return;
      try {
        const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');
        const srcBytes = await originalFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(srcBytes, { updateMetadata: false });
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const hexToRgb01 = (hex: string) => {
          const h = hex.replace('#', '');
          const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
          const r = (bigint >> 16) & 255;
          const g = (bigint >> 8) & 255;
          const b = bigint & 255;
          return rgb(r / 255, g / 255, b / 255);
        };

        const color = hexToRgb01(watermarkColor);
        const opacity = Math.min(1, Math.max(0.05, watermarkOpacity));

        const pages = pdfDoc.getPages();
        for (const page of pages) {
          const { width, height } = page.getSize();
          const baseSize = Math.max(12, Math.min(72, watermarkSize));
          const scale = Math.min(width, height) / 600;
          const fontSize = Math.max(10, Math.min(120, baseSize * scale));

          const drawAt = (x: number, y: number, rotateDiag: boolean) => {
            page.drawText(watermarkText, {
              x, y,
              size: fontSize,
              font,
              color,
              opacity,
              rotate: rotateDiag ? degrees(-30) : undefined,
            });
          };

          if (watermarkPosition === 'diagonal') {
            const stepX = width / 3;
            const stepY = height / 3;
            const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
            for (let x = 0; x <= width + stepX; x += stepX) {
              for (let y = 0; y <= height + stepY; y += stepY) {
                drawAt(x - textWidth / 2, y, true);
              }
            }
          } else if (watermarkPosition === 'center') {
            const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
            const textHeight = fontSize;
            drawAt((width - textWidth) / 2, (height - textHeight) / 2, false);
          } else {
            const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
            const margin = 20 * scale;
            drawAt(width - textWidth - margin, margin, false);
          }
        }

        const outBytes = await pdfDoc.save({ useObjectStreams: false, addDefaultPage: false });
        const ab = outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength) as ArrayBuffer;
        const blob = new Blob([ab], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        revokedUrl = url;
        setPreviewPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        console.error('Failed to generate PDF preview:', e);
      }
    };

    // Debounce to avoid heavy recomputation
    const timeout = setTimeout(generatePdf, 400);
    return () => {
      clearTimeout(timeout);
      // cleanup happens when next url is set; also revoke on unmount
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [originalFile, watermarkText, watermarkOpacity, watermarkSize, watermarkColor, watermarkPosition]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Upload Area */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Upload File to Watermark</h2>
            <p className="text-gray-600 dark:text-gray-300">Supports images and PDFs</p>
          </div>
          
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="watermark-file-upload"
            accept="image/*,.pdf"
          />
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
              isDragOver
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {isDragOver ? (
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">Drop your file here</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Drag & drop your file here
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-4">or</p>
                <label
                  htmlFor="watermark-file-upload"
                  className="inline-flex items-center px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg cursor-pointer transition-colors"
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

      {/* Watermark Options */}
      {originalFile && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h3 className="text-lg font-semibold mb-6 text-center text-gray-900 dark:text-gray-100">Watermark Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Text */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Watermark Text</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter watermark text"
              />
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Size: {watermarkSize}px</label>
              <input
                type="range"
                min="12"
                max="72"
                value={watermarkSize}
                onChange={(e) => setWatermarkSize(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Opacity */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Opacity: {Math.round(watermarkOpacity * 100)}%</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Color</label>
              <input
                type="color"
                value={watermarkColor}
                onChange={(e) => setWatermarkColor(e.target.value)}
                className="w-full h-12 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
            </div>

            {/* Position */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Position</label>
              <div className="flex gap-4">
                {[
                  { value: 'diagonal', label: 'Diagonal Pattern', icon: '📐' },
                  { value: 'center', label: 'Center', icon: '🎯' },
                  { value: 'bottom-right', label: 'Bottom Right', icon: '📍' }
                ].map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => setWatermarkPosition(pos.value as 'center' | 'diagonal' | 'bottom-right')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      watermarkPosition === pos.value
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl mb-1">{pos.icon}</div>
                    <div className="text-sm font-medium">{pos.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleWatermark}
              disabled={!originalFile || processing}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {processing ? 'Adding Watermark...' : 'Add Watermark'}
            </button>
          </div>
        </div>
      )}

      {/* Live Preview */}
      {originalFile && originalFile.type.startsWith('image/') && previewUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h3 className="text-lg font-semibold mb-6 text-center text-gray-900 dark:text-gray-100">Live Preview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original */}
            <div className="text-center">
              <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Original</h4>
              {originalUrl && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <img 
                    src={originalUrl} 
                    alt="Original" 
                    className="max-w-full max-h-64 object-contain mx-auto" 
                  />
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="text-center">
              <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Watermark Preview</h4>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700">
                <img 
                  src={previewUrl} 
                  alt="Watermark Preview" 
                  className="max-w-full max-h-64 object-contain mx-auto" 
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                This is a scaled preview. The final image will be at full resolution.
              </p>
            </div>
          </div>
        </div>
      )}

      {originalFile && originalFile.type === 'application/pdf' && previewPdfUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h3 className="text-lg font-semibold mb-6 text-center text-gray-900 dark:text-gray-100">Live PDF Preview</h3>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <object data={previewPdfUrl} type="application/pdf" className="w-full" style={{ height: 500 }}>
              <iframe src={previewPdfUrl} className="w-full" style={{ height: 500 }} />
            </object>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Preview may vary across browsers. Download to view in your PDF reader.
          </p>
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
      {watermarkedBlob && watermarkedUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <h3 className="text-lg font-semibold mb-6 text-center text-gray-900 dark:text-gray-100">Watermarked Result</h3>
          
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              <strong>Watermarked File:</strong> {formatFileSize(watermarkedBlob.size)}
            </p>
            
            {originalFile?.type.startsWith('image/') && (
              <div className="mb-6">
                <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Watermarked Preview</h4>
                <img 
                  src={watermarkedUrl} 
                  alt="Watermarked" 
                  className="max-w-full max-h-64 object-contain mx-auto border border-gray-200 dark:border-gray-600 rounded-lg" 
                />
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={downloadWatermarked}
              className="inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
            >
              <span className="mr-2">⬇️</span>
              Download Watermarked File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
