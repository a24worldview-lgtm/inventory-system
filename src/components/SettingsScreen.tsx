import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ClipboardCopy, Download, History, Monitor, Moon, Pencil, Sun, Trash2, Upload } from 'lucide-react';
import { countItems, ops, splitNames, useStore } from '@/lib/store';
import { convertLegacy, parseBackup, readLegacyFromStorage } from '@/lib/migrate';
import { useTheme } from '@/lib/theme';
import type { ThemePref } from '@/lib/theme';
import { copyText } from './ShoppingScreen';
import { Card, Header, QuickAdd } from './ui';

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-1 text-sm font-bold text-muted">{title}</h2>
      {note && <p className="mt-0.5 px-1 text-xs text-muted">{note}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** 名前の変更・並び替え・削除ができる1行 */
function EditableRow({
  name,
  meta,
  onRename,
  onUp,
  onDown,
  onDelete,
}: {
  name: string;
  meta?: string;
  onRename: (n: string) => void;
  onUp?: () => void;
  onDown?: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-lg text-muted active:bg-line disabled:opacity-30';
  return (
    <li className="flex items-center gap-1 border-b border-line px-3 py-1.5 last:border-b-0">
      {editing ? (
        <input
          autoFocus
          defaultValue={name}
          onBlur={(e) => {
            onRename(e.target.value);
            setEditing(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="min-w-0 flex-1 rounded-lg border border-accent bg-surface px-2 py-1.5 text-base font-bold outline-none"
        />
      ) : (
        <button onClick={() => setEditing(true)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
          <span className="truncate font-bold">{name}</span>
          {meta && <span className="shrink-0 text-xs text-muted">{meta}</span>}
          <Pencil size={13} className="shrink-0 text-muted" />
        </button>
      )}
      {onUp && (
        <button aria-label="上へ" className={iconBtn} onClick={onUp}>
          <ArrowUp size={17} />
        </button>
      )}
      {onDown && (
        <button aria-label="下へ" className={iconBtn} onClick={onDown}>
          <ArrowDown size={17} />
        </button>
      )}
      <button aria-label="削除" className={`${iconBtn} text-need`} onClick={onDelete}>
        <Trash2 size={17} />
      </button>
    </li>
  );
}

const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'auto', label: '自動', icon: Monitor },
  { value: 'dark', label: 'ダーク', icon: Moon },
  { value: 'light', label: 'ライト', icon: Sun },
];

function ThemeSwitch() {
  const [pref, setPref] = useTheme();
  return (
    <div className="flex rounded-2xl border border-line bg-surface p-1">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setPref(value)}
          aria-pressed={pref === value}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold ${
            pref === value ? 'bg-accent text-accent-ink' : 'text-muted'
          }`}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}

export function SettingsScreen() {
  const { data, apply, replaceAll, showToast } = useStore();
  const [restoreText, setRestoreText] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  if (!data) return null;

  const hasLegacy = typeof window !== 'undefined' && !!readLegacyFromStorage();
  const backupJson = () => JSON.stringify(data, null, 2);

  const restore = (text: string) => {
    try {
      const next = parseBackup(text);
      const itemCount = next.facilities.reduce((n, f) => n + countItems(f), 0);
      if (!window.confirm(`今のデータを、${next.facilities.length}施設・${itemCount}品目のデータで置き換えます。よろしいですか？`)) return;
      replaceAll(next, 'データを復元しました');
      setRestoreText('');
      setRestoreError('');
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : '読み込みに失敗しました');
    }
  };

  const download = () => {
    const blob = new Blob([backupJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    a.href = url;
    a.download = `stockmaster-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btn = 'flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3 text-sm font-bold active:bg-surface-2';

  return (
    <>
      <Header title="設定" />
      <div className="mx-auto max-w-2xl space-y-8 px-4 pb-28 pt-4">
        <Section title="表示" note="「自動」はスマホのダークモード設定に合わせます">
          <ThemeSwitch />
        </Section>

        <Section title="施設" note="名前をタップすると変更できます">
          <Card>
            <ul>
              {data.facilities.map((f, i) => (
                <EditableRow
                  key={f.id}
                  name={f.name}
                  meta={`${countItems(f)}品目`}
                  onRename={(n) => apply(ops.renameFacility(f.id, n))}
                  onUp={i > 0 ? () => apply(ops.moveFacility(f.id, -1)) : undefined}
                  onDown={i < data.facilities.length - 1 ? () => apply(ops.moveFacility(f.id, 1)) : undefined}
                  onDelete={() => {
                    if (!window.confirm(`「${f.name}」と中の${countItems(f)}品目を削除しますか？`)) return;
                    apply(ops.deleteFacility(f.id), { toast: `「${f.name}」を削除しました`, undoable: true });
                  }}
                />
              ))}
            </ul>
            <div className="border-t border-line p-3">
              <QuickAdd
                placeholder="新しい施設の名前"
                onSubmit={(t) => {
                  const names = splitNames(t);
                  apply((d) => names.forEach((n) => ops.addFacility(n)(d)), { toast: `施設を${names.length}件追加しました` });
                }}
              />
            </div>
          </Card>
        </Section>

        <Section title="購入先" note="買い物リストはこの順番で並びます。削除すると、その品目は「未設定」になります">
          <Card>
            <ul>
              {data.shops.map((s, i) => (
                <EditableRow
                  key={s.id}
                  name={s.name}
                  onRename={(n) => apply(ops.renameShop(s.id, n))}
                  onUp={i > 0 ? () => apply(ops.moveShop(s.id, -1)) : undefined}
                  onDown={i < data.shops.length - 1 ? () => apply(ops.moveShop(s.id, 1)) : undefined}
                  onDelete={() => apply(ops.deleteShop(s.id), { toast: `「${s.name}」を削除しました`, undoable: true })}
                />
              ))}
            </ul>
            <div className="border-t border-line p-3">
              <QuickAdd
                placeholder="新しいお店（例: コストコ）"
                onSubmit={(t) => {
                  const names = splitNames(t).filter((n) => !data.shops.some((s) => s.name === n));
                  if (names.length === 0) return showToast('すでに登録されています');
                  apply((d) => names.forEach((n) => ops.addShop(n)(d)), { toast: `お店を${names.length}件追加しました` });
                }}
              />
            </div>
          </Card>
        </Section>

        <Section title="バックアップ" note="データはこの端末のブラウザに保存されています。機種変更の前などに保存しておくと安心です">
          <div className="flex gap-2">
            <button className={btn} onClick={download}>
              <Download size={18} />
              ファイルに保存
            </button>
            <button
              className={btn}
              onClick={async () => showToast((await copyText(backupJson())) ? 'コピーしました' : 'コピーできませんでした')}
            >
              <ClipboardCopy size={18} />
              コピー
            </button>
          </div>
        </Section>

        <Section title="復元" note="バックアップ（旧バージョンの「Backup Data」でコピーしたものも可）を貼り付けるか、ファイルを選んでください">
          <Card className="space-y-3 p-3">
            <textarea
              value={restoreText}
              onChange={(e) => {
                setRestoreText(e.target.value);
                setRestoreError('');
              }}
              placeholder="ここに貼り付け"
              rows={4}
              className="w-full rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs outline-none focus:border-accent"
            />
            {restoreError && <p className="text-sm font-bold text-need">{restoreError}</p>}
            <div className="flex gap-2">
              <button className={btn} onClick={() => fileRef.current?.click()}>
                <Upload size={18} />
                ファイルを選ぶ
              </button>
              <button
                disabled={!restoreText.trim()}
                onClick={() => restore(restoreText)}
                className="flex flex-1 items-center justify-center rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-40"
              >
                貼り付けた内容で復元
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json,.txt"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) restore(await file.text());
              }}
            />
          </Card>
        </Section>

        {hasLegacy && (
          <Section title="旧バージョンのデータ" note="この端末には旧バージョンのデータが残っています（消さずに保管しています）">
            <button
              className={btn + ' w-full'}
              onClick={() => {
                const legacy = readLegacyFromStorage();
                if (!legacy) return;
                if (!window.confirm('今のデータを、旧バージョンのデータで置き換えます。よろしいですか？')) return;
                replaceAll(convertLegacy(legacy), '旧バージョンのデータを読み込みました');
              }}
            >
              <History size={18} />
              旧バージョンのデータを読み込み直す
            </button>
          </Section>
        )}
      </div>
    </>
  );
}
