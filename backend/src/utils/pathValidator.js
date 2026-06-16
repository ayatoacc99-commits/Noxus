import path from 'path';
import fs from 'fs/promises';

const ALLOWED_ROOTS = new Set();

export function registerAllowedRoot(rootPath) {
  if (rootPath) {
    ALLOWED_ROOTS.add(path.resolve(rootPath));
  }
}

export function resolveSafePath(inputPath, allowedRoots = ALLOWED_ROOTS) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path');
  }

  const normalized = path.resolve(inputPath);

  if (normalized.includes('\0')) {
    throw new Error('Invalid path characters');
  }

  for (const root of allowedRoots) {
    const relative = path.relative(root, normalized);
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
      return normalized;
    }
  }

  throw new Error('Path traversal detected');
}

export async function ensureWithinRoot(filePath, allowedRoots = ALLOWED_ROOTS) {
  const safe = resolveSafePath(filePath, allowedRoots);
  await fs.access(safe);
  return safe;
}

export function isSubPath(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
