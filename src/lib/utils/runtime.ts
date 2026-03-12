/**
 * Runtime detection utilities
 * Helps determine if we're running in Node.js or Edge Runtime
 */

export const isNodeRuntime = (): boolean => {
  return typeof process !== 'undefined' && 
         typeof process.cwd === 'function' &&
         typeof require !== 'undefined';
};

export const isEdgeRuntime = (): boolean => {
  return !isNodeRuntime();
};

/**
 * Safe dynamic import for Node.js modules
 * Returns null if not in Node.js runtime
 */
export const importNodeModule = async <T>(moduleName: string): Promise<T | null> => {
  if (!isNodeRuntime()) {
    return null;
  }
  
  try {
    // Use dynamic import with eval to prevent static analysis
    const mod = await eval(`import('${moduleName}')`);
    return mod as T;
  } catch (e) {
    console.warn(`Failed to import ${moduleName}:`, e);
    return null;
  }
};

/**
 * Assert that we're in Node.js runtime
 * Throws error if in Edge Runtime
 */
export const assertNodeRuntime = (operation: string): void => {
  if (!isNodeRuntime()) {
    throw new Error(`${operation} requires Node.js runtime. This operation is not available in Edge Runtime.`);
  }
};
