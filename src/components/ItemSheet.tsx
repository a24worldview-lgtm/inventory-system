import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { ops, useStore } from '@/lib/store';
import { newId } from '@/lib/migrate';
import type { Facility } from '@/lib/types';
import { Sheet, Stepper } from './ui';

/** 購入先を選ぶチップ。その場で新しいお店も追加できる */
export function ShopPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { data, apply } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  if (!data) return null;

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-bold ${
      active ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-ink'
    }`;

  const addShop = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = data.shops.find((s) => s.name === trimmed);
    if (existing) {
      onChange(existing.id);
    } else {
      const id = newId();
      apply(ops.addShop(trimmed, id));
      onChange(id);
    }
    setName('');
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={chip(value === null)} onClick={() => onChange(null)}>
        未設定
      </button>
      {data.shops.map((s) => (
        <button type="button" key={s.id} className={chip(value === s.id)} onClick={() => onChange(s.id)}>
          {s.name}
        </button>
      ))}
      {adding ? (
        <form
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addShop();
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お店の名前"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-xl bg-accent px-4 text-sm font-bold text-accent-ink">
            追加
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm font-bold text-muted"
        >
          <Plus size={14} />
          お店を追加
        </button>
      )}
    </div>
  );
}

export function ItemSheet({
  facility,
  itemId,
  onClose,
}: {
  facility: Facility;
  itemId: string | null;
  onClose: () => void;
}) {
  const { data, apply } = useStore();
  const location = facility.locations.find((l) => l.items.some((i) => i.id === itemId));
  const item = location?.items.find((i) => i.id === itemId);
  const [name, setName] = useState('');
  const [copyTargets, setCopyTargets] = useState<string[]>([]);

  useEffect(() => {
    setName(item?.name ?? '');
    setCopyTargets([]);
    // 別の品目を開いたときだけ入力欄を初期化する（item を依存に入れると入力中に上書きされる）
  }, [itemId]);

  if (!data || !item || !location) return null;

  const update = (patch: Parameters<typeof ops.updateItem>[2]) => apply(ops.updateItem(facility.id, item.id, patch));
  const saveName = () => {
    if (name.trim() && name.trim() !== item.name) update({ name });
    else setName(item.name);
  };
  const others = data.facilities.filter((f) => f.id !== facility.id);
  const idx = location.items.findIndex((i) => i.id === item.id);

  return (
    <Sheet open onClose={onClose} title="品目の編集">
      <div className="space-y-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-muted">品名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-lg font-bold outline-none focus:border-accent"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-sm font-bold text-muted">購入先</span>
          <ShopPicker value={item.shopId} onChange={(shopId) => update({ shopId })} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-muted">いつもの購入数</div>
            <div className="text-xs text-muted">「要購入」にしたとき最初に入る数</div>
          </div>
          <Stepper value={item.defaultQty} onChange={(n) => update({ defaultQty: n })} />
        </div>

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-muted">場所</span>
            <select
              value={location.id}
              onChange={(e) => update({ locationId: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none"
            >
              {facility.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1">
            <button
              aria-label="上へ"
              disabled={idx === 0}
              onClick={() => apply(ops.moveItem(facility.id, item.id, -1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line disabled:opacity-30"
            >
              <ArrowUp size={18} />
            </button>
            <button
              aria-label="下へ"
              disabled={idx === location.items.length - 1}
              onClick={() => apply(ops.moveItem(facility.id, item.id, 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line disabled:opacity-30"
            >
              <ArrowDown size={18} />
            </button>
          </div>
        </div>

        {others.length > 0 && (
          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="mb-1 text-sm font-bold">ほかの施設にもコピー</div>
            <div className="mb-3 text-xs text-muted">同じ名前の場所に追加します（無ければ場所も作ります）</div>
            <div className="mb-3 flex flex-wrap gap-2">
              {others.map((f) => {
                const on = copyTargets.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => setCopyTargets((t) => (on ? t.filter((x) => x !== f.id) : [...t, f.id]))}
                    className={`rounded-full border px-3 py-1.5 text-sm font-bold ${
                      on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface'
                    }`}
                  >
                    {f.name}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setCopyTargets(copyTargets.length === others.length ? [] : others.map((f) => f.id))
                }
                className="px-2 text-sm font-bold text-accent"
              >
                {copyTargets.length === others.length ? '解除' : 'すべて選択'}
              </button>
            </div>
            <button
              disabled={copyTargets.length === 0}
              onClick={() => {
                apply(ops.copyItemTo(facility.id, item.id, copyTargets), {
                  toast: `${copyTargets.length}施設にコピーしました`,
                  undoable: true,
                });
                setCopyTargets([]);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-ink disabled:opacity-40"
            >
              <Copy size={16} />
              コピーする
            </button>
          </div>
        )}

        <button
          onClick={() => {
            apply(ops.deleteItem(facility.id, item.id), { toast: `「${item.name}」を削除しました`, undoable: true });
            onClose();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-need/40 py-3 font-bold text-need"
        >
          <Trash2 size={18} />
          この品目を削除
        </button>
      </div>
    </Sheet>
  );
}
