export interface SearchUser {
    fid: number;
    username: string;
    displayName?: string | null;
    pfpUrl?: string | null;
  }
  
  let lastController: AbortController | null = null;
  
  export async function searchFarcasterUsers(query: string): Promise<SearchUser[]> {
    if (!query.trim()) return [];
    if (lastController) {
      lastController.abort();
    }
    lastController = new AbortController();
    try {
      const resp = await fetch(`/api/search-users?query=${encodeURIComponent(query)}`, {
        signal: lastController.signal
      });
      if (!resp.ok) {
        console.warn('[Search] Non-OK status', resp.status);
        return [];
      }
      const data = await resp.json();
      return data.results || [];
    } catch (e) {
      if ((e as any).name === 'AbortError') {
        return [];
      }
      console.error('[Search] Error', e);
      return [];
    }
  }
  
  /**
   * Debounce hook-like helper (pure function returning a wrapper) for manual calls.
   */
  export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
    let timer: any;
    return (...args: Parameters<T>) => {
      clearTimeout(timer);
      return new Promise<ReturnType<T>>((resolve) => {
        timer = setTimeout(async () => {
          resolve(await fn(...args));
        }, ms);
      });
    };
  }