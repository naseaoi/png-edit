export const IMAGE_LIMITS = {
  maxFiles: 100,
  maxDiscoveredFiles: 500,
  maxDirectoryDepth: 20,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 250 * 1024 * 1024,
  maxSourceDimension: 16_384,
  maxSourcePixels: 40_000_000,
  maxOutputDimension: 16_384,
  maxOutputPixels: 40_000_000,
  maxMargin: 500,
} as const
