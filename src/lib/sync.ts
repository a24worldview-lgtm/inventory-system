import { createClient } from '@supabase/supabase-js';
import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import type { AppData, Facility, Shop } from './types';

// Supabase との同期。
// 方針：画面はいつも端末内のデータ（localStorage）で即座に動かし、変更を少し後でまとめて送る。
// 電波が無いときは送れなかった分を覚えておき、つながったら送り直す。

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const T_FACILITIES = 'sm_facilities';
const T_SETTINGS = 'sm_settings';
const SETTINGS_ROW_ID = 'main';
const SETTINGS_KEY = '__settings__'; // 「購入先・買ったチェック」が未送信であることを表す印

const FLUSH_DELAY_MS = 400; // ＋ボタン連打などをまとめて1回で送るための待ち時間
const RETRY_MS = 5000;
const PENDING_STORAGE_KEY = 'stockmaster:pending';

export const isSyncConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'syncing' | 'offline';

type FacilityRow = { id: string; position: number; data: Facility; updated_at: string };
type SettingsRow = { id: string; shops: Shop[]; purchased: string[]; updated_at: string };

type Pending = { dirty: string[]; deleted: string[]; stamps: Record<string, number> };

type Callbacks = {
  getData: () => AppData | null;
  /** リモートの変更を画面に反映する（このとき送信はしない） */
  setData: (d: AppData) => void;
  onStatus: (s: SyncStatus) => void;
};

function readPending(): Pending {
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Pending;
  } catch {
    /* 壊れていたら空から */
  }
  return { dirty: [], deleted: [], stamps: {} };
}

export class Sync {
  private client: SupabaseClient;
  private cb: Callbacks;
  private dirty: Set<string>;
  private deleted: Set<string>;
  /** 端末側で最後に変更した時刻。これより古いリモートの更新は無視する（自分の送信の跳ね返り対策） */
  private stamps: Map<string, number>;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private flushAgain = false;
  private stopped = false;

  constructor(cb: Callbacks) {
    this.cb = cb;
    this.client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    const p = readPending();
    this.dirty = new Set(p.dirty);
    this.deleted = new Set(p.deleted);
    this.stamps = new Map(Object.entries(p.stamps));
  }

  async start() {
    this.cb.onStatus('connecting');
    this.subscribe();
    await this.pull();
    window.addEventListener('online', this.onWake);
    document.addEventListener('visibilitychange', this.onVisible);
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    window.removeEventListener('online', this.onWake);
    document.removeEventListener('visibilitychange', this.onVisible);
    this.client.removeAllChannels();
  }

  // スマホは画面を消すと通信が切れることがあるので、戻ってきたら最新を取り直す
  private onVisible = () => {
    if (document.visibilityState === 'visible') this.onWake();
  };
  private onWake = () => {
    void this.flush().then(() => this.pull());
  };

  /** 変更前と変更後を比べて、送るべき施設に印を付ける */
  queue(prev: AppData, next: AppData) {
    const now = Date.now();
    const prevIndex = new Map(prev.facilities.map((f, i) => [f.id, i]));
    const prevJson = new Map(prev.facilities.map((f) => [f.id, JSON.stringify(f)]));
    next.facilities.forEach((f, i) => {
      if (prevIndex.get(f.id) !== i || prevJson.get(f.id) !== JSON.stringify(f)) {
        this.dirty.add(f.id);
        this.deleted.delete(f.id);
        this.stamps.set(f.id, now);
      }
    });
    const nextIds = new Set(next.facilities.map((f) => f.id));
    prev.facilities.forEach((f) => {
      if (!nextIds.has(f.id)) {
        this.deleted.add(f.id);
        this.dirty.delete(f.id);
        this.stamps.set(f.id, now);
      }
    });
    if (
      JSON.stringify(prev.shops) !== JSON.stringify(next.shops) ||
      JSON.stringify(prev.purchased) !== JSON.stringify(next.purchased)
    ) {
      this.dirty.add(SETTINGS_KEY);
      this.stamps.set(SETTINGS_KEY, now);
    }
    this.savePending();
    this.schedule(FLUSH_DELAY_MS);
  }

  private savePending() {
    try {
      localStorage.setItem(
        PENDING_STORAGE_KEY,
        JSON.stringify({ dirty: [...this.dirty], deleted: [...this.deleted], stamps: Object.fromEntries(this.stamps) }),
      );
    } catch {
      /* 保存できなくても、開いている間は送信を続ける */
    }
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), ms);
  }

  private hasPending() {
    return this.dirty.size > 0 || this.deleted.size > 0;
  }

  /** 未送信の変更をまとめて送る */
  async flush() {
    if (this.stopped || !this.hasPending()) return;
    if (this.flushing) {
      this.flushAgain = true;
      return;
    }
    const data = this.cb.getData();
    if (!data) return;
    this.flushing = true;
    this.cb.onStatus('syncing');

    // 送信中に新しい変更が入っても取りこぼさないよう、送る時点の時刻を控えておく
    const sentStamps = new Map(this.stamps);
    const dirtyIds = [...this.dirty].filter((id) => id !== SETTINGS_KEY);
    const deletedIds = [...this.deleted];
    const sendSettings = this.dirty.has(SETTINGS_KEY);
    const iso = (id: string) => new Date(sentStamps.get(id) ?? Date.now()).toISOString();

    try {
      const rows: FacilityRow[] = [];
      dirtyIds.forEach((id) => {
        const position = data.facilities.findIndex((f) => f.id === id);
        if (position >= 0) rows.push({ id, position, data: data.facilities[position], updated_at: iso(id) });
      });
      if (rows.length) {
        const { error } = await this.client.from(T_FACILITIES).upsert(rows);
        if (error) throw error;
      }
      if (deletedIds.length) {
        const { error } = await this.client.from(T_FACILITIES).delete().in('id', deletedIds);
        if (error) throw error;
      }
      if (sendSettings) {
        const row: SettingsRow = {
          id: SETTINGS_ROW_ID,
          shops: data.shops,
          purchased: data.purchased,
          updated_at: iso(SETTINGS_KEY),
        };
        const { error } = await this.client.from(T_SETTINGS).upsert(row);
        if (error) throw error;
      }

      // 送信中にさらに変更されたものは印を残し、次の送信に回す
      const settled = (id: string) => this.stamps.get(id) === sentStamps.get(id);
      dirtyIds.forEach((id) => settled(id) && this.dirty.delete(id));
      deletedIds.forEach((id) => settled(id) && this.deleted.delete(id));
      if (sendSettings && settled(SETTINGS_KEY)) this.dirty.delete(SETTINGS_KEY);
      this.savePending();
      this.cb.onStatus(this.hasPending() ? 'syncing' : 'synced');
    } catch (e) {
      console.error('同期の送信に失敗しました（電波が戻ったら送り直します）', e);
      this.cb.onStatus('offline');
      this.schedule(RETRY_MS);
    } finally {
      this.flushing = false;
    }

    if (this.flushAgain || this.hasPending()) {
      this.flushAgain = false;
      if (this.cb.getData() && this.hasPending()) this.schedule(FLUSH_DELAY_MS);
    }
  }

  /** リモートの最新を取得して端末のデータを置き換える（未送信の変更は端末側を優先） */
  async pull() {
    try {
      const [fRes, sRes] = await Promise.all([
        this.client.from(T_FACILITIES).select('*').order('position'),
        this.client.from(T_SETTINGS).select('*').eq('id', SETTINGS_ROW_ID).maybeSingle(),
      ]);
      // 開発時の二重起動などで既に止められていたら何もしない
      if (this.stopped) return;
      if (fRes.error) throw fRes.error;
      if (sRes.error) throw sRes.error;
      const rows = (fRes.data ?? []) as FacilityRow[];
      const settings = sRes.data as SettingsRow | null;
      const local = this.cb.getData();
      if (!local) return;

      // クラウドが空っぽ＝初めてつないだとき。この端末のデータをまるごと送る（旧データの引き継ぎもここで完了する）
      if (rows.length === 0 && !settings) {
        // 初期サンプルのままなら送らない（復元や編集をした時点で送られる）
        if (local.seeded) {
          this.cb.onStatus('synced');
          return;
        }
        local.facilities.forEach((f) => this.dirty.add(f.id));
        this.dirty.add(SETTINGS_KEY);
        this.savePending();
        await this.flush();
        return;
      }

      const localById = new Map(local.facilities.map((f) => [f.id, f]));
      const merged: Facility[] = rows
        .filter((r) => !this.deleted.has(r.id))
        .map((r) => (this.dirty.has(r.id) ? (localById.get(r.id) ?? r.data) : r.data));
      // まだ送れていない新しい施設は、端末側の位置に残す
      local.facilities.forEach((f, i) => {
        if (this.dirty.has(f.id) && !rows.some((r) => r.id === f.id)) merged.splice(Math.min(i, merged.length), 0, f);
      });

      const keepLocalSettings = this.dirty.has(SETTINGS_KEY) || !settings;
      this.cb.setData({
        ...local,
        facilities: merged,
        shops: keepLocalSettings ? local.shops : settings.shops,
        purchased: keepLocalSettings ? local.purchased : settings.purchased,
      });
      this.cb.onStatus(this.hasPending() ? 'syncing' : 'synced');
      if (this.hasPending()) this.schedule(FLUSH_DELAY_MS);
    } catch (e) {
      console.error('同期の受信に失敗しました', e);
      this.cb.onStatus('offline');
    }
  }

  private isStale(id: string, updatedAt: string | undefined) {
    if (this.dirty.has(id) || this.deleted.has(id)) return true;
    const remote = updatedAt ? Date.parse(updatedAt) : 0;
    return remote <= (this.stamps.get(id) ?? 0);
  }

  /** ほかの人（ほかの端末）の変更をリアルタイムで受け取る */
  private subscribe() {
    this.client
      .channel('stockmaster')
      .on('postgres_changes', { event: '*', schema: 'public', table: T_FACILITIES }, (p) =>
        this.onFacilityChange(p as RealtimePostgresChangesPayload<FacilityRow>),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: T_SETTINGS }, (p) =>
        this.onSettingsChange(p as RealtimePostgresChangesPayload<SettingsRow>),
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') this.cb.onStatus('offline');
      });
  }

  private onFacilityChange(p: RealtimePostgresChangesPayload<FacilityRow>) {
    const local = this.cb.getData();
    if (!local) return;
    if (p.eventType === 'DELETE') {
      const id = (p.old as Partial<FacilityRow>).id;
      if (!id || this.dirty.has(id)) return;
      this.cb.setData({ ...local, facilities: local.facilities.filter((f) => f.id !== id) });
      return;
    }
    const row = p.new;
    if (this.isStale(row.id, row.updated_at)) return;
    this.stamps.set(row.id, Date.parse(row.updated_at));
    const facilities = local.facilities.filter((f) => f.id !== row.id);
    facilities.splice(Math.min(row.position, facilities.length), 0, row.data);
    this.cb.setData({ ...local, facilities });
  }

  private onSettingsChange(p: RealtimePostgresChangesPayload<SettingsRow>) {
    const local = this.cb.getData();
    if (!local || p.eventType === 'DELETE') return;
    const row = p.new;
    if (this.isStale(SETTINGS_KEY, row.updated_at)) return;
    this.stamps.set(SETTINGS_KEY, Date.parse(row.updated_at));
    this.cb.setData({ ...local, shops: row.shops, purchased: row.purchased });
  }
}
