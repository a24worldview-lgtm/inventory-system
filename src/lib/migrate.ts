import type { AppData, Facility, Item, Shop } from './types';

// 旧バージョン（v1）が localStorage に保存していたキー。移行後も消さずに残す（万一の保険）。
export const LEGACY_KEYS = {
  data: 'inventoryData',
  state: 'inventoryState',
  shops: 'shopOptions',
} as const;

const UNSET_SHOP = '未設定';

export function newId(): string {
  // http（スマホから LAN の IP で開く場合など）では crypto.randomUUID が使えないため代替を用意
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type LegacyItem = { name?: unknown; shop?: unknown };
type LegacyLocation = { location?: unknown; items?: unknown };
type LegacyStatus = { hasStock?: unknown; quantity?: unknown };

export type LegacyBundle = {
  inventoryData: Record<string, LegacyLocation[]>;
  inventoryState?: Record<string, Record<string, Record<string, LegacyStatus>>>;
  shopOptions?: string[];
};

function toPositiveInt(v: unknown, fallback = 1): number {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

/** v1 のデータ（バックアップJSON、または localStorage の中身）を v2 に変換する */
export function convertLegacy(bundle: LegacyBundle): AppData {
  const shopsByName = new Map<string, Shop>();
  const ensureShop = (name: unknown): string | null => {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed || trimmed === UNSET_SHOP) return null;
    let shop = shopsByName.get(trimmed);
    if (!shop) {
      shop = { id: newId(), name: trimmed };
      shopsByName.set(trimmed, shop);
    }
    return shop.id;
  };

  // 購入先リストの順番を先に確定させる（品目にしか出てこないお店は後ろに追加される）
  (bundle.shopOptions ?? []).forEach(ensureShop);

  const facilities: Facility[] = Object.entries(bundle.inventoryData ?? {}).map(
    ([facilityName, locations]) => ({
      id: newId(),
      name: facilityName,
      checkedAt: null,
      locations: (Array.isArray(locations) ? locations : []).map((loc) => {
        const locName = String(loc.location ?? '').trim() || '名称未設定';
        const rawItems = Array.isArray(loc.items) ? (loc.items as LegacyItem[]) : [];
        return {
          id: newId(),
          name: locName,
          items: rawItems
            .filter((it) => typeof it?.name === 'string' && it.name.trim())
            .map((it): Item => {
              const name = String(it.name).trim();
              const status = bundle.inventoryState?.[facilityName]?.[locName]?.[name];
              const needed = status ? status.hasStock === false : false;
              return {
                id: newId(),
                name,
                shopId: ensureShop(it.shop),
                needed,
                qty: needed ? toPositiveInt(status?.quantity) : 1,
                defaultQty: 1,
              };
            }),
        };
      }),
    }),
  );

  return {
    version: 2,
    facilities,
    shops: [...shopsByName.values()],
    purchased: [],
    updatedAt: Date.now(),
  };
}

/** この端末に旧バージョンのデータが残っていれば読み出す */
export function readLegacyFromStorage(): LegacyBundle | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEYS.data);
    if (!raw) return null;
    const state = localStorage.getItem(LEGACY_KEYS.state);
    const shops = localStorage.getItem(LEGACY_KEYS.shops);
    return {
      inventoryData: JSON.parse(raw),
      inventoryState: state ? JSON.parse(state) : undefined,
      shopOptions: shops ? JSON.parse(shops) : undefined,
    };
  } catch (e) {
    console.error('旧データの読み込みに失敗しました', e);
    return null;
  }
}

function isAppData(v: unknown): v is AppData {
  const d = v as AppData;
  return !!d && d.version === 2 && Array.isArray(d.facilities) && Array.isArray(d.shops);
}

/**
 * 貼り付け・ファイルから読み込んだバックアップを解釈する。
 * v2 のバックアップと、旧バージョンの「Backup Data」ボタンでコピーしたJSONの両方に対応。
 */
export function parseBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSONとして読み込めませんでした。コピーした内容をそのまま貼り付けてください。');
  }
  if (isAppData(parsed)) {
    return { ...parsed, purchased: parsed.purchased ?? [] };
  }
  const legacy = parsed as LegacyBundle;
  if (legacy && typeof legacy.inventoryData === 'object' && legacy.inventoryData) {
    return convertLegacy(legacy);
  }
  throw new Error('このアプリのバックアップ形式ではありません。');
}

// どのデータも無いとき（初めて使う端末）の初期値。v1 の初期データと同じ内容。
const SEED_FACILITIES = ['警固', '博多天神', 'まるしん荘', '住吉102', '住吉105'];
const SEED_SHOPS = ['Amazon', '楽天', 'ダイソー', 'セリア', 'ドラッグストア', 'ホームセンター'];
const SEED_LOCATIONS = [
  { location: '洗面台下', items: [{ name: 'シャンプー', shop: 'Amazon' }, { name: 'トリートメント', shop: 'Amazon' }] },
  { location: 'トイレ収納棚', items: [{ name: 'トイレマジックリン', shop: 'ドラッグストア' }] },
  { location: 'シンク下', items: [{ name: '紙コップ', shop: 'ダイソー' }] },
];

export function createSeedData(): AppData {
  return convertLegacy({
    inventoryData: Object.fromEntries(SEED_FACILITIES.map((f) => [f, SEED_LOCATIONS])),
    shopOptions: SEED_SHOPS,
  });
}
