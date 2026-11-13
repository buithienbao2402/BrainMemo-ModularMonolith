export const MAX_PAGE_SIZE = 50;

export function clampPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize < 1) {
    return 10;
  }
  return Math.min(Math.floor(pageSize), MAX_PAGE_SIZE);
}
