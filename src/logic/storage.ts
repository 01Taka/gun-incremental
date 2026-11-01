import type { PersistentSaveData } from "../config/types";

const SAVE_STORAGE_KEY = "gun_incremental_savedata_v1";

const DEFAULT_SAVE_DATA: PersistentSaveData = {
  permanentPoints: 0,
  permanentUpgrades: {
    start_sp: 0,
    base_dmg: 0,
    round_time: 0,
    tp_gain: 0,
    invoice_reduction: 0,
  },
  settings: {
    autoFire: false,
  },
  stats: {
    totalRuns: 0,
    totalInvoicesPaid: 0,
    highestRound: 0,
    cleared: false,
  },
};

export class StorageService {
  private static memoryFallback: PersistentSaveData | null = null;

  public static load(): PersistentSaveData {
    if (typeof window === "undefined" || !window.localStorage) {
      return structuredClone(this.memoryFallback ?? DEFAULT_SAVE_DATA);
    }
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        return structuredClone(DEFAULT_SAVE_DATA);
      }
      const parsed = JSON.parse(raw) as Partial<PersistentSaveData>;
      return {
        permanentPoints: Number(parsed.permanentPoints) || 0,
        permanentUpgrades: {
          start_sp: Number(parsed.permanentUpgrades?.start_sp) || 0,
          base_dmg: Number(parsed.permanentUpgrades?.base_dmg) || 0,
          round_time: Number(parsed.permanentUpgrades?.round_time) || 0,
          tp_gain: Number(parsed.permanentUpgrades?.tp_gain) || 0,
          invoice_reduction: Number(parsed.permanentUpgrades?.invoice_reduction) || 0,
        },
        settings: {
          autoFire: Boolean(parsed.settings?.autoFire),
        },
        stats: {
          totalRuns: Number(parsed.stats?.totalRuns) || 0,
          totalInvoicesPaid: Number(parsed.stats?.totalInvoicesPaid) || 0,
          highestRound: Number(parsed.stats?.highestRound) || 0,
          cleared: Boolean(parsed.stats?.cleared),
        },
      };
    } catch (e) {
      console.error("Failed to load save data from localStorage:", e);
      return structuredClone(DEFAULT_SAVE_DATA);
    }
  }

  public static save(data: PersistentSaveData): void {
    if (typeof window === "undefined" || !window.localStorage) {
      this.memoryFallback = structuredClone(data);
      return;
    }
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
      this.memoryFallback = structuredClone(data);
    }
  }

  public static clear(): void {
    this.memoryFallback = null;
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
    }
  }
}
