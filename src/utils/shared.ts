// Shared utilities and types for the application

export type CompressionPreset = "small" | "medium" | "large";

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊';
  if (fileType.includes('text')) return '📄';
  return '📁';
};

export const safeSetUrl = (b: Blob | null, setter: (url: string | null) => void, prevRef: React.MutableRefObject<string | null>) => {
  if (prevRef.current) {
    URL.revokeObjectURL(prevRef.current);
  }
  if (b) {
    prevRef.current = URL.createObjectURL(b);
    setter(prevRef.current);
  } else {
    prevRef.current = null;
    setter(null);
  }
};
