/** Retrying a rejected import needs a fresh document and browser module cache. */
export class RouteModuleError extends Error {}

export async function loadRoute<T>(load: Promise<T>): Promise<T> {
  try {
    return await load;
  } catch (cause: unknown) {
    throw new RouteModuleError('Could not load page code', { cause });
  }
}
