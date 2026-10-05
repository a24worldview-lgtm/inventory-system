import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData, Facility, Item, Location } from './types';
import { convertLegacy, createSeedData, newId, readLegacyFromStorage } from './migrate';
import { Sync, isSyncConfigured } from './sync';
import type { SyncStatus } from './sync';

const STORAGE_KEY = 'stockmaster:v2';
const MAX_QTY = 999;

// ---------- 読み込み・保存 ----------

type LoadResult = { data: AppData; source: 'saved' | 'legacy' | 'seed' };

function loadInitialData(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { data: JSON.parse(raw) as AppData, source: 'saved' };
  } catch (e) {
    console.error('保存データの読み込みに失敗しました', e);
  }
  // v2 のデータがまだ無い端末では、旧バージョンのデータを自動で引き継ぐ
  const legacy = readLegacyFromStorage();
  if (legacy) return { data: convertLegacy(legacy), source: 'legacy' };
  return { data: createSeedData(), source: 'seed' };
}

function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('保存に失敗しました', e);
  }
}

// ---------- 探索ヘルパー ----------

function findFacility(d: AppData, facilityId: string): Facility | undefined {
  return d.facilities.find((f) => f.id === facilityId);
}

function findItem(f: Facility, itemId: string): { loc: Location; item: Item; index: number } | undefined {
  for (const loc of f.locations) {
    const index = loc.items.findIndex((i) => i.id === itemId);
    if (index >= 0) return { loc, item: loc.items[index], index };
  }
  return undefined;
}

function clampQty(n: number): number {
  return Math.min(MAX_QTY, Math.max(1, Math.floor(n) || 1));
}

function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return;
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
}

/** "シャンプー、リンス\nタオル" のようにまとめて入力された品名を分割する */
export function splitNames(text: string): string[] {
  return text
    .split(/[\n、,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------- 操作（すべて draft を書き換える純粋な関数） ----------

type Mutator = (d: AppData) => void;

export const ops = {
  toggleNeeded: (facilityId: string, itemId: string): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    const hit = f && findItem(f, itemId);
    if (!f || !hit) return;
    hit.item.needed = !hit.item.needed;
    if (hit.item.needed) hit.item.qty = hit.item.defaultQty;
    else d.purchased = d.purchased.filter((id) => id !== itemId);
    f.checkedAt = Date.now();
  },
  setQty: (facilityId: string, itemId: string, qty: number): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    const hit = f && findItem(f, itemId);
    if (hit) hit.item.qty = clampQty(qty);
  },
  addItems: (facilityId: string, locationId: string, names: string[], shopId: string | null): Mutator => (d) => {
    const loc = findFacility(d, facilityId)?.locations.find((l) => l.id === locationId);
    if (!loc) return;
    for (const name of names) {
      loc.items.push({ id: newId(), name, shopId, needed: false, qty: 1, defaultQty: 1 });
    }
  },
  updateItem: (
    facilityId: string,
    itemId: string,
    patch: Partial<Pick<Item, 'name' | 'shopId' | 'defaultQty'>> & { locationId?: string },
  ): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    const hit = f && findItem(f, itemId);
    if (!f || !hit) return;
    if (patch.name !== undefined && patch.name.trim()) hit.item.name = patch.name.trim();
    if (patch.shopId !== undefined) hit.item.shopId = patch.shopId;
    if (patch.defaultQty !== undefined) hit.item.defaultQty = clampQty(patch.defaultQty);
    if (patch.locationId && patch.locationId !== hit.loc.id) {
      const dest = f.locations.find((l) => l.id === patch.locationId);
      if (dest) {
        hit.loc.items.splice(hit.index, 1);
        dest.items.push(hit.item);
      }
    }
  },
  moveItem: (facilityId: string, itemId: string, dir: -1 | 1): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    const hit = f && findItem(f, itemId);
    if (hit) move(hit.loc.items, hit.index, hit.index + dir);
  },
  deleteItem: (facilityId: string, itemId: string): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    const hit = f && findItem(f, itemId);
    if (!hit) return;
    hit.loc.items.splice(hit.index, 1);
    d.purchased = d.purchased.filter((id) => id !== itemId);
  },
  /** 品目を他の施設にコピー。同じ名前の場所が無ければ作り、同じ名前の品目が既にあれば飛ばす */
  copyItemTo: (facilityId: string, itemId: string, targetFacilityIds: string[]): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    const hit = f && findItem(f, itemId);
    if (!hit) return;
    for (const tid of targetFacilityIds) {
      const target = findFacility(d, tid);
      if (!target || target.id === facilityId) continue;
      let loc = target.locations.find((l) => l.name === hit.loc.name);
      if (!loc) {
        loc = { id: newId(), name: hit.loc.name, items: [] };
        target.locations.push(loc);
      }
      if (loc.items.some((i) => i.name === hit.item.name)) continue;
      loc.items.push({ ...hit.item, id: newId(), needed: false, qty: 1 });
    }
  },

  addLocation: (facilityId: string, name: string): Mutator => (d) => {
    findFacility(d, facilityId)?.locations.push({ id: newId(), name, items: [] });
  },
  renameLocation: (facilityId: string, locationId: string, name: string): Mutator => (d) => {
    const loc = findFacility(d, facilityId)?.locations.find((l) => l.id === locationId);
    if (loc && name.trim()) loc.name = name.trim();
  },
  moveLocation: (facilityId: string, locationId: string, dir: -1 | 1): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    if (!f) return;
    const i = f.locations.findIndex((l) => l.id === locationId);
    move(f.locations, i, i + dir);
  },
  deleteLocation: (facilityId: string, locationId: string): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    if (!f) return;
    const loc = f.locations.find((l) => l.id === locationId);
    const removed = new Set(loc?.items.map((i) => i.id));
    f.locations = f.locations.filter((l) => l.id !== locationId);
    d.purchased = d.purchased.filter((id) => !removed.has(id));
  },
  resetFacility: (facilityId: string): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    if (!f) return;
    const ids = new Set<string>();
    f.locations.forEach((l) =>
      l.items.forEach((i) => {
        i.needed = false;
        ids.add(i.id);
      }),
    );
    d.purchased = d.purchased.filter((id) => !ids.has(id));
  },

  addFacility: (name: string): Mutator => (d) => {
    d.facilities.push({ id: newId(), name, locations: [], checkedAt: null });
  },
  renameFacility: (facilityId: string, name: string): Mutator => (d) => {
    const f = findFacility(d, facilityId);
    if (f && name.trim()) f.name = name.trim();
  },
  moveFacility: (facilityId: string, dir: -1 | 1): Mutator => (d) => {
    const i = d.facilities.findIndex((f) => f.id === facilityId);
    move(d.facilities, i, i + dir);
  },
  deleteFacility: (facilityId: string): Mutator => (d) => {
    d.facilities = d.facilities.filter((f) => f.id !== facilityId);
  },

  addShop: (name: string, id: string = newId()): Mutator => (d) => {
    d.shops.push({ id, name });
  },
  renameShop: (shopId: string, name: string): Mutator => (d) => {
    const s = d.shops.find((x) => x.id === shopId);
    if (s && name.trim()) s.name = name.trim();
  },
  moveShop: (shopId: string, dir: -1 | 1): Mutator => (d) => {
    const i = d.shops.findIndex((s) => s.id === shopId);
    move(d.shops, i, i + dir);
  },
  deleteShop: (shopId: string): Mutator => (d) => {
    d.shops = d.shops.filter((s) => s.id !== shopId);
    d.facilities.forEach((f) =>
      f.locations.forEach((l) =>
        l.items.forEach((i) => {
          if (i.shopId === shopId) i.shopId = null;
        }),
      ),
    );
  },

  togglePurchased: (itemId: string): Mutator => (d) => {
    d.purchased = d.purchased.includes(itemId)
      ? d.purchased.filter((id) => id !== itemId)
      : [...d.purchased, itemId];
  },
  /** 「買った」にチェックした品目を在庫ありに戻す */
  applyPurchased: (): Mutator => (d) => {
    const bought = new Set(d.purchased);
    d.facilities.forEach((f) =>
      f.locations.forEach((l) =>
        l.items.forEach((i) => {
          if (bought.has(i.id)) i.needed = false;
        }),
      ),
    );
    d.purchased = [];
  },
};

// ---------- React から使うための Context ----------

type Toast = { id: number; message: string; undo?: AppData };

type StoreValue = {
  data: AppData | null;
  loadSource: LoadResult['source'] | null;
  syncStatus: SyncStatus;
  /** 操作を適用する。undoable を付けると、トーストに「元に戻す」が出る */
  apply: (mutator: Mutator, opts?: { toast?: string; undoable?: boolean }) => void;
  replaceAll: (data: AppData, toast?: string) => void;
  toast: Toast | null;
  showToast: (message: string) => void;
  undo: () => void;
  dismissToast: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const TOAST_MS = 4000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loadSource, setLoadSource] = useState<LoadResult['source'] | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<Sync | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isSyncConfigured ? 'connecting' : 'local');

  // localStorage はブラウザにしか無いので、描画後に読み込む（サーバー描画との食い違いを防ぐ）
  useEffect(() => {
    const result = loadInitialData();
    dataRef.current = result.data;
    setData(result.data);
    setLoadSource(result.source);
    if (result.source !== 'saved') saveData(result.data);

    // 同じ端末で別タブを開いていても内容をそろえる
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as AppData;
        dataRef.current = next;
        setData(next);
      } catch {
        /* 壊れた値は無視 */
      }
    };
    window.addEventListener('storage', onStorage);

    // Supabase の設定があればクラウドと同期する（無ければこの端末だけで動く）
    if (isSyncConfigured) {
      const sync = new Sync({
        getData: () => dataRef.current,
        setData: (next) => {
          dataRef.current = next;
          setData(next);
          saveData(next);
        },
        onStatus: setSyncStatus,
      });
      syncRef.current = sync;
      void sync.start();
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      syncRef.current?.stop();
      syncRef.current = null;
    };
  }, []);

  const commit = useCallback((next: AppData) => {
    const prev = dataRef.current;
    next.updatedAt = Date.now();
    delete next.seeded;
    dataRef.current = next;
    setData(next);
    saveData(next);
    if (prev) syncRef.current?.queue(prev, next);
  }, []);

  const pushToast = useCallback((message: string, undo?: AppData) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, undo });
    timer.current = setTimeout(() => setToast(null), undo ? TOAST_MS + 2000 : TOAST_MS);
  }, []);

  const apply = useCallback<StoreValue['apply']>(
    (mutator, opts) => {
      const prev = dataRef.current;
      if (!prev) return;
      const next = structuredClone(prev);
      mutator(next);
      commit(next);
      if (opts?.toast) pushToast(opts.toast, opts.undoable ? prev : undefined);
    },
    [commit, pushToast],
  );

  const value = useMemo<StoreValue>(
    () => ({
      data,
      loadSource,
      syncStatus,
      apply,
      replaceAll: (next, message) => {
        const prev = dataRef.current ?? undefined;
        commit(structuredClone(next));
        if (message) pushToast(message, prev);
      },
      toast,
      showToast: (m) => pushToast(m),
      undo: () => {
        if (!toast?.undo) return;
        commit(toast.undo);
        pushToast('元に戻しました');
      },
      dismissToast: () => setToast(null),
    }),
    [data, loadSource, syncStatus, apply, commit, pushToast, toast],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore は StoreProvider の内側で使ってください');
  return ctx;
}

// ---------- 集計 ----------

export function countNeeded(f: Facility): number {
  return f.locations.reduce((n, l) => n + l.items.filter((i) => i.needed).length, 0);
}

export function countItems(f: Facility): number {
  return f.locations.reduce((n, l) => n + l.items.length, 0);
}

export type ShoppingEntry = {
  item: Item;
  facility: Facility;
  location: Location;
};

export function collectShopping(d: AppData): ShoppingEntry[] {
  const out: ShoppingEntry[] = [];
  d.facilities.forEach((facility) =>
    facility.locations.forEach((location) =>
      location.items.forEach((item) => {
        if (item.needed) out.push({ item, facility, location });
      }),
    ),
  );
  return out;
}
