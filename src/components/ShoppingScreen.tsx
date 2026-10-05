import { useState } from 'react';
import { Check, ClipboardCopy, PackageCheck } from 'lucide-react';
import { collectShopping, ops, useStore } from '@/lib/store';
import type { ShoppingEntry } from '@/lib/store';
import { Card, Header } from './ui';

const UNSET_KEY = '__unset__';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // http 接続など clipboard API が使えない環境向けの代替
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

export function ShoppingScreen() {
  const { data, apply, showToast } = useStore();
  const [facilityFilter, setFacilityFilter] = useState<string | null>(null);
  if (!data) return null;

  const all = collectShopping(data);
  const entries = facilityFilter ? all.filter((e) => e.facility.id === facilityFilter) : all;
  const purchased = new Set(data.purchased);
  const purchasedCount = all.filter((e) => purchased.has(e.item.id)).length;

  // 購入先ごとにまとめる。順番は設定画面の購入先の並び順、未設定は最後
  const groups = new Map<string, ShoppingEntry[]>();
  entries.forEach((e) => {
    const key = e.item.shopId && data.shops.some((s) => s.id === e.item.shopId) ? e.item.shopId : UNSET_KEY;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  });
  const orderedKeys = [...data.shops.map((s) => s.id), UNSET_KEY].filter((k) => groups.has(k));
  const shopLabel = (key: string) => data.shops.find((s) => s.id === key)?.name ?? '購入先未設定';
  const facilitiesWithNeeds = data.facilities.filter((f) => all.some((e) => e.facility.id === f.id));

  const handleCopy = async () => {
    const text = orderedKeys
      .map(
        (k) =>
          `【${shopLabel(k)}】\n` +
          groups
            .get(k)!
            .map((e) => `・${e.item.name} ×${e.item.qty}（${e.facility.name}／${e.location.name}）`)
            .join('\n'),
      )
      .join('\n\n');
    showToast((await copyText(text)) ? 'コピーしました。LINEなどに貼り付けできます' : 'コピーできませんでした');
  };

  return (
    <>
      <Header
        title="買い物リスト"
        right={
          entries.length > 0 && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold"
            >
              <ClipboardCopy size={16} />
              コピー
            </button>
          )
        }
        sub={
          facilitiesWithNeeds.length > 1 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
              {[{ id: null, name: 'すべて' }, ...facilitiesWithNeeds].map((f) => (
                <button
                  key={f.id ?? 'all'}
                  onClick={() => setFacilityFilter(f.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold ${
                    facilityFilter === f.id ? 'border-ink bg-ink text-bg' : 'border-line bg-surface'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )
        }
      />

      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-44 pt-4">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            <PackageCheck size={40} className="mx-auto mb-3 opacity-60" />
            買うものはありません
          </div>
        ) : (
          <p className="text-sm text-muted">買ったものをタップしてチェックしましょう</p>
        )}

        {orderedKeys.map((k) => {
          const list = groups.get(k)!;
          const done = list.filter((e) => purchased.has(e.item.id)).length;
          return (
            <Card key={k} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-lg font-bold">{shopLabel(k)}</h2>
                <span className="text-sm font-bold tabular-nums text-muted">
                  {done}/{list.length}
                </span>
              </div>
              <ul>
                {list.map(({ item, facility, location }) => {
                  const isDone = purchased.has(item.id);
                  return (
                    <li key={item.id} className="border-b border-line last:border-b-0">
                      <button
                        onClick={() => apply(ops.togglePurchased(item.id))}
                        aria-pressed={isDone}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                            isDone ? 'border-accent bg-accent text-accent-ink' : 'border-line text-transparent'
                          }`}
                        >
                          <Check size={16} strokeWidth={3} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className={`font-bold ${isDone ? 'text-done line-through' : ''}`}>
                            {item.name}
                            <span className={`ml-2 tabular-nums ${isDone ? '' : 'text-need'}`}>×{item.qty}</span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted">
                            {facility.name} ・ {location.name}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      {purchasedCount > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
          <button
            onClick={() =>
              apply(ops.applyPurchased(), {
                toast: `${purchasedCount}品を在庫ありに戻しました`,
                undoable: true,
              })
            }
            className="flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 font-bold text-accent-ink shadow-lg active:scale-[0.98]"
          >
            <PackageCheck size={20} />
            買った {purchasedCount} 品を在庫ありに戻す
          </button>
        </div>
      )}
    </>
  );
}
