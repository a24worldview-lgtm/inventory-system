import { ChevronRight, ShoppingCart, StickyNote } from 'lucide-react';
import { collectShopping, countItems, countNeeded, countOpenNotes, useStore } from '@/lib/store';
import { formatRelative } from './ui';
import { SyncBadge } from './SyncBadge';
import type { Route } from './routes';

export function HomeScreen({ go }: { go: (r: Route) => void }) {
  const { data } = useStore();
  if (!data) return null;
  const totalNeeded = collectShopping(data).length;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tracking-wide text-muted">在庫チェック</p>
        <SyncBadge />
      </div>
      <h1 className="mt-1 text-3xl font-bold">Stock Master</h1>

      <button
        onClick={() => go({ name: 'shopping' })}
        className={`mt-6 flex w-full items-center gap-4 rounded-2xl p-5 text-left active:scale-[0.99] ${
          totalNeeded > 0 ? 'bg-need text-need-ink' : 'border border-line bg-surface text-ink'
        }`}
      >
        <ShoppingCart size={28} />
        <div className="flex-1">
          <div className="text-lg font-bold">買い物リスト</div>
          <div className="text-sm opacity-80">
            {totalNeeded > 0 ? `全施設で ${totalNeeded} 品が不足しています` : '不足している品はありません'}
          </div>
        </div>
        {totalNeeded > 0 && <span className="text-3xl font-bold tabular-nums">{totalNeeded}</span>}
        <ChevronRight size={22} className="opacity-70" />
      </button>

      <h2 className="mb-2 mt-8 text-sm font-bold text-muted">施設</h2>
      {data.facilities.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
          施設がありません。「設定」から追加できます。
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.facilities.map((f) => {
            const needed = countNeeded(f);
            const memos = countOpenNotes(f);
            return (
              <li key={f.id}>
                <button
                  onClick={() => go({ name: 'facility', id: f.id })}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left active:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xl font-bold">{f.name}</div>
                    <div className="mt-1 text-xs text-muted">
                      {countItems(f)} 品目 ・ 最終チェック {formatRelative(f.checkedAt)}
                    </div>
                  </div>
                  {memos > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-memo-soft px-2.5 py-1 text-sm font-bold text-memo">
                      <StickyNote size={14} />
                      {memos}
                    </span>
                  )}
                  {needed > 0 ? (
                    <span className="rounded-full bg-need-soft px-3 py-1 text-sm font-bold text-need">
                      不足 {needed}
                    </span>
                  ) : (
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent">OK</span>
                  )}
                  <ChevronRight size={20} className="text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
