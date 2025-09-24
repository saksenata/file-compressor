"use client";
import React, { useState, Suspense, lazy } from "react";

// Lazy load components for better performance
const CompressionPage = lazy(() => import("../components/CompressionPage"));
const WatermarkPage = lazy(() => import("../components/WatermarkPage"));

export default function Page() {
  const [dark, setDark] = useState(false);
  const [currentPage, setCurrentPage] = useState<'watermark' | 'compress'>('watermark');

  // Loading component for lazy loading
  const LoadingSpinner = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-300">Loading...</span>
        </div>
      </div>
    </div>
  );

return (
  <div className={`min-h-screen transition-colors duration-300 ${dark ? 'bg-gray-900' : 'bg-gray-50 text-gray-900'}`}>
    {/* Header */}
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {currentPage === 'compress' ? 'File Compressor' : 'File Watermarker'}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage(currentPage === 'compress' ? 'watermark' : 'compress')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentPage === 'compress'
                ? 'bg-blue-500 text-white'
                : dark 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
          >
            {currentPage === 'compress' ? '🔒 Add Watermark' : '📦 Compress Files'}
          </button>
          <button
            onClick={() => setDark(!dark)}
            className={`p-2 rounded-lg transition-colors ${
              dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </div>

    <Suspense fallback={<LoadingSpinner />}>
      {currentPage === 'compress' ? (
        <CompressionPage dark={dark} />
      ) : (
        <WatermarkPage dark={dark} />
      )}
    </Suspense>
  </div>
);
}