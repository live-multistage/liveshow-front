export interface KeyValueStore {
  get(k: string): string | null;
  set(k: string, v: string): void;
  remove(k: string): void;
}

export const memoryStore = (): KeyValueStore => {
  const data = new Map<string, string>();
  return {
    get: (k) => data.get(k) ?? null,
    set: (k, v) => {
      data.set(k, v);
    },
    remove: (k) => {
      data.delete(k);
    },
  };
};

export const browserStore = (): KeyValueStore => {
  try {
    const probeKey = '__sho_probe__';
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    return {
      get: (k) => {
        try {
          return localStorage.getItem(k);
        } catch {
          return null;
        }
      },
      set: (k, v) => {
        try {
          localStorage.setItem(k, v);
        } catch {
          // storage full / blocked after construction — analytics must never break the host app
        }
      },
      remove: (k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      },
    };
  } catch {
    return memoryStore();
  }
};
