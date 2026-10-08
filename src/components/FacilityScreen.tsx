import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  RotateCcw,
  ShoppingCart,
  Trash2,
  Camera,
  Images,
} from 'lucide-react';
import { countNeeded, ops, splitNames, useStore } from '@/lib/store';
import type { Facility, Location } from '@/lib/types';
import { ItemSheet } from './ItemSheet';
import { GuideSheet } from './GuideSheet';
import { NotesSection } from './Notes';
import { Card, Header, QuickAdd, Stepper, formatRelative } from './ui';
import type { Route } from './routes';

type Filter = 'all' | 'needed';

export function FacilityScreen({ id, go, back }: { id: string; go: (r: Route) => void; back: () => void }) {
  const { data, apply } = useStore();
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [guide, setGuide] = useState<{ locationId: string; edit: boolean } | null>(null);

  const facility = data?.facilities.find((f) => f.id === id);
  if (!data) return null;
  if (!facility) {
    return (
      <>
        <Header title="施設が見つかりません" onBack={back} />
        <p className="p-6 text-center text-muted">削除された可能性があります。</p>
      </>
    );
  }

  const needed = countNeeded(facility);

  return (
    <>
      <Header
        title={facility.name}
        onBack={back}
        right={
          <button
            onClick={() => setEditing((e) => !e)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${
              editing ? 'bg-accent text-accent-ink' : 'border border-line bg-surface'
            }`}
          >
            {editing ? <Check size={16} /> : <Pencil size={16} />}
            {editing ? '完了' : '編集'}
          </button>
        }
        sub={
          editing ? (
            <p className="text-sm text-muted">品目をタップすると名前・購入先・場所を変更できます</p>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex rounded-full bg-line/60 p-1 text-sm font-bold">
                {(['all', 'needed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-4 py-1.5 ${filter === f ? 'bg-surface shadow-sm' : 'text-muted'}`}
                  >
                    {f === 'all' ? 'すべて' : `不足のみ ${needed}`}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-xs text-muted">最終チェック {formatRelative(facility.checkedAt)}</span>
            </div>
          )
        }
      />

      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-40 pt-4">
        {!editing && <NotesSection facility={facility} />}

        {!editing && (
          <p className="text-sm text-muted">
            足りない品をタップすると<span className="font-bold text-need">「要購入」</span>になります
          </p>
        )}

        {facility.locations.length === 0 && !editing && (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
            まだ場所がありません。右上の「編集」から追加してください。
          </p>
        )}

        {facility.locations.map((loc, li) =>
          editing ? (
            <EditLocation
              key={loc.id}
              facility={facility}
              loc={loc}
              isFirst={li === 0}
              isLast={li === facility.locations.length - 1}
              onOpenItem={setOpenItemId}
              onOpenGuide={() => setGuide({ locationId: loc.id, edit: true })}
            />
          ) : (
            <CheckLocation
              key={loc.id}
              facility={facility}
              loc={loc}
              filter={filter}
              collapsed={!!collapsed[loc.id]}
              onToggleCollapse={() => setCollapsed((c) => ({ ...c, [loc.id]: !c[loc.id] }))}
              onOpenGuide={() => setGuide({ locationId: loc.id, edit: false })}
            />
          ),
        )}

        {editing && (
          <Card className="p-4">
            <div className="mb-2 text-sm font-bold">場所を追加</div>
            <QuickAdd
              placeholder="例: ベランダ、キッチン上の棚"
              onSubmit={(t) => {
                const names = splitNames(t);
                apply((d) => names.forEach((n) => ops.addLocation(facility.id, n)(d)), {
                  toast: `場所を${names.length}件追加しました`,
                });
              }}
            />
          </Card>
        )}

        {!editing && filter === 'needed' && needed === 0 && facility.locations.length > 0 && (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
            不足している品はありません 🎉
          </p>
        )}

        {!editing && needed > 0 && (
          <button
            onClick={() =>
              apply(ops.resetFacility(facility.id), {
                toast: `${facility.name} をすべて在庫ありに戻しました`,
                undoable: true,
              })
            }
            className="mx-auto flex items-center gap-2 px-4 py-3 text-sm font-bold text-muted"
          >
            <RotateCcw size={16} />
            すべて在庫ありに戻す
          </button>
        )}
      </div>

      {!editing && needed > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
          <button
            onClick={() => go({ name: 'shopping' })}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-need px-6 py-3.5 font-bold text-need-ink shadow-lg active:scale-95"
          >
            <ShoppingCart size={20} />
            買い物リストを見る
          </button>
        </div>
      )}

      <ItemSheet facility={facility} itemId={openItemId} onClose={() => setOpenItemId(null)} />
      {guide && (
        <GuideSheet
          facility={facility}
          locationId={guide.locationId}
          startEditing={guide.edit}
          onClose={() => setGuide(null)}
        />
      )}
    </>
  );
}

function CheckLocation({
  facility,
  loc,
  filter,
  collapsed,
  onToggleCollapse,
  onOpenGuide,
}: {
  facility: Facility;
  loc: Location;
  filter: Filter;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenGuide: () => void;
}) {
  const { data, apply } = useStore();
  const items = filter === 'needed' ? loc.items.filter((i) => i.needed) : loc.items;
  if (filter === 'needed' && items.length === 0) return null;
  const neededHere = loc.items.filter((i) => i.needed).length;
  const shopName = (shopId: string | null) => data?.shops.find((s) => s.id === shopId)?.name ?? '購入先未設定';
  const hasGuide = !!loc.guide && (loc.guide.photos.length > 0 || !!loc.guide.note);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center">
        <button onClick={onToggleCollapse} className="flex min-w-0 flex-1 items-center gap-2 py-3 pl-4 pr-2 text-left">
          {collapsed ? <ChevronRight size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
          <h2 className="min-w-0 flex-1 truncate font-bold">{loc.name}</h2>
          {neededHere > 0 && (
            <span className="shrink-0 rounded-full bg-need-soft px-2.5 py-0.5 text-xs font-bold text-need">不足 {neededHere}</span>
          )}
          <span className="shrink-0 text-xs text-muted">{loc.items.length}品</span>
        </button>
        {/* 見本が登録されている場所だけに出す（無い場所まで出すと画面がうるさくなるため） */}
        {hasGuide && (
          <button
            onClick={onOpenGuide}
            className="mr-3 flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent"
          >
            <Images size={14} />
            置き方
          </button>
        )}
      </div>

      {!collapsed && (
        <ul className="border-t border-line">
          {items.length === 0 && <li className="px-4 py-4 text-sm text-muted">品目がありません（「編集」から追加）</li>}
          {items.map((item) => (
            <li key={item.id} className="border-b border-line last:border-b-0">
              <div
                role="button"
                tabIndex={0}
                aria-pressed={item.needed}
                onClick={() => apply(ops.toggleNeeded(facility.id, item.id))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    apply(ops.toggleNeeded(facility.id, item.id));
                  }
                }}
                className={`flex min-h-16 cursor-pointer select-none items-center gap-3 px-4 py-2.5 transition-colors ${
                  item.needed ? 'bg-need-soft' : 'active:bg-surface-2'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    item.needed ? 'border-need bg-need text-need-ink' : 'border-line text-transparent'
                  }`}
                >
                  <ShoppingCart size={14} strokeWidth={3} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-base font-bold ${item.needed ? 'text-need' : ''}`}>{item.name}</div>
                  <div className="truncate text-xs text-muted">{shopName(item.shopId)}</div>
                </div>
                {item.needed ? (
                  <Stepper size="sm" value={item.qty} onChange={(n) => apply(ops.setQty(facility.id, item.id, n))} />
                ) : (
                  <span className="text-xs font-bold text-muted">在庫あり</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EditLocation({
  facility,
  loc,
  isFirst,
  isLast,
  onOpenItem,
  onOpenGuide,
}: {
  facility: Facility;
  loc: Location;
  isFirst: boolean;
  isLast: boolean;
  onOpenItem: (id: string) => void;
  onOpenGuide: () => void;
}) {
  const { data, apply } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const shopName = (id: string | null) => data?.shops.find((s) => s.id === id)?.name ?? '購入先未設定';
  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-lg text-muted active:bg-line disabled:opacity-30';

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        {renaming ? (
          <input
            autoFocus
            defaultValue={loc.name}
            onBlur={(e) => {
              apply(ops.renameLocation(facility.id, loc.id, e.target.value));
              setRenaming(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="min-w-0 flex-1 rounded-lg border border-accent bg-surface px-2 py-1.5 text-base font-bold outline-none"
          />
        ) : (
          <button onClick={() => setRenaming(true)} className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left">
            <h2 className="truncate font-bold">{loc.name}</h2>
            <Pencil size={14} className="shrink-0 text-muted" />
          </button>
        )}
        <button aria-label="上へ" disabled={isFirst} className={iconBtn} onClick={() => apply(ops.moveLocation(facility.id, loc.id, -1))}>
          <ArrowUp size={18} />
        </button>
        <button aria-label="下へ" disabled={isLast} className={iconBtn} onClick={() => apply(ops.moveLocation(facility.id, loc.id, 1))}>
          <ArrowDown size={18} />
        </button>
        <button
          aria-label="場所を削除"
          className={`${iconBtn} text-need`}
          onClick={() =>
            apply(ops.deleteLocation(facility.id, loc.id), {
              toast:
                loc.items.length > 0
                  ? `「${loc.name}」と中の${loc.items.length}品を削除しました`
                  : `「${loc.name}」を削除しました`,
              undoable: true,
            })
          }
        >
          <Trash2 size={18} />
        </button>
      </div>

      <button
        onClick={onOpenGuide}
        className="flex w-full items-center gap-2 border-b border-line bg-accent-soft/50 px-4 py-2.5 text-left text-sm font-bold text-accent"
      >
        <Camera size={16} />
        <span className="flex-1">置き方の見本</span>
        <span className="text-xs font-normal text-muted">
          {loc.guide && (loc.guide.photos.length > 0 || loc.guide.note)
            ? `写真${loc.guide.photos.length}枚${loc.guide.note ? '・メモあり' : ''}`
            : '未登録'}
        </span>
        <ChevronRight size={16} className="text-muted" />
      </button>

      <ul>
        {loc.items.map((item) => (
          <li key={item.id} className="border-b border-line">
            <button
              onClick={() => onOpenItem(item.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{item.name}</div>
                <div className="truncate text-xs text-muted">{shopName(item.shopId)}</div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-2 bg-surface-2 p-3">
        <QuickAdd
          placeholder="品目を追加（「、」区切りでまとめて追加）"
          onSubmit={(t) => {
            const names = splitNames(t);
            apply(ops.addItems(facility.id, loc.id, names, shopId), {
              toast: names.length === 1 ? `「${names[0]}」を追加しました` : `${names.length}品を追加しました`,
            });
          }}
        />
        <label className="flex items-center gap-2 text-xs text-muted">
          購入先
          <select
            value={shopId ?? ''}
            onChange={(e) => setShopId(e.target.value || null)}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
          >
            <option value="">未設定</option>
            {data?.shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span>で追加</span>
        </label>
      </div>
    </Card>
  );
}
