export function parseJsonSafe(value, fallback = {}) {
  if (value === null || value === undefined || value === '') {
    return typeof fallback === 'object' && fallback !== null ? structuredClone(fallback) : fallback;
  }
  if (typeof value === 'object') {
    return structuredClone(value);
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Invalid JSON data');
  }
}

export function stringifyJsonSafe(obj) {
  return JSON.stringify(obj);
}

export function mergeJsonPreserveUnknown(original, patch) {
  const base = parseJsonSafe(original, {});
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    throw new Error('JSON root must be an object');
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

export function validateJsonFields(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    try {
      if (typeof value === 'string') JSON.parse(value);
      else JSON.stringify(value);
    } catch {
      throw new Error(`Invalid JSON for field: ${name}`);
    }
  }
}
