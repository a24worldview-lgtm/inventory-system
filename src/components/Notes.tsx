import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, ImagePlus, Loader2, Plus, StickyNote, Trash2, Undo2, X } from 'lucide-react';
import { ops, useStore } from '@/lib/store';
import { newId } from '@/lib/migrate';
import { canUploadPhotos, deleteGuidePhoto, photoUrl, uploadGuidePhoto } from '@/lib/photos';
import type { Facility, GuidePhoto, Note } from '@/lib/types';
import { Lightbox } from './GuideSheet';
import { Sheet } from './ui';

// 書いた人の名前は端末ごとに覚えておき、次から自動で入れる
const AUTHOR_KEY = 'stockmaster:author';
const MAX_PHOTOS = 4;

function readAuthor(): string {
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? '';
  } catch {
    return '';
  }
}
function saveAuthor(name: string) {
  try {
    localStorage.setItem(AUTHOR_KEY, name);
  } catch {
    /* 覚えられなくても、毎回入力すれば使える */
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function Thumbs({ photos, onOpen, size = 'md' }: { photos: GuidePhoto[]; onOpen: (i: number) => void; size?: 'sm' | 'md' }) {
  if (photos.length === 0) return null;
  const box = size === 'sm' ? 'h-12 w-12' : 'h-16 w-16';
  return (
    <div className="flex gap-2">
      {photos.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.id}
          src={photoUrl(p.thumbPath)}
          alt={`写真 ${i + 1}`}
          loading="lazy"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(i);
          }}
          className={`${box} cursor-zoom-in rounded-lg bg-surface-2 object-cover`}
        />
      ))}
    </div>
  );
}

/** 施設画面の一番上に出す引き継ぎメモの一覧 */
export function NotesSection({ facility }: { facility: Facility }) {
  const { apply } = useStore();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: GuidePhoto[]; index: number } | null>(null);

  const notes = facility.notes ?? [];
  // 未対応は古い順（先に頼まれたものから）、対応済みは新しい順
  const open = notes.filter((n) => !n.doneAt).sort((a, b) => a.createdAt - b.createdAt);
  const done = notes.filter((n) => n.doneAt).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  const toggleDone = (n: Note, value: boolean) =>
    // 誰が対応したかは記録しない。代わりに書いたメモの名前（清掃屋さんなど）が入ってしまうため
    apply(ops.setNoteDone(facility.id, n.id, value, ''), {
      toast: value ? '対応済みにしました' : '未対応に戻しました',
      undoable: true,
    });

  return (
    <section className={`rounded-2xl border ${open.length > 0 ? 'border-memo/40 bg-memo-soft' : 'border-line bg-surface'}`}>
      <div className="flex items-center gap-2 px-4 py-3">
        <StickyNote size={18} className={open.length > 0 ? 'text-memo' : 'text-muted'} />
        <h2 className="flex-1 font-bold">
          引き継ぎメモ
          {open.length > 0 && <span className="ml-2 text-memo">{open.length}件</span>}
        </h2>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-bold shadow-sm"
        >
          <Plus size={16} />
          追加
        </button>
      </div>

      {open.length > 0 && (
        <ul className="space-y-2 px-3 pb-3">
          {open.map((n) => (
            <li key={n.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setEditing(n.id)}
                onKeyDown={(e) => e.key === 'Enter' && setEditing(n.id)}
                className="flex cursor-pointer gap-3 rounded-xl bg-surface p-3 shadow-sm"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{n.text}</p>
                  <Thumbs photos={n.photos} onOpen={(i) => setLightbox({ photos: n.photos, index: i })} />
                  <p className="text-xs text-muted">
                    {n.author || '名前なし'} ・ {formatDate(n.createdAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDone(n, true);
                  }}
                  className="flex h-fit shrink-0 items-center gap-1 rounded-full border border-accent px-3 py-1.5 text-sm font-bold text-accent active:bg-accent-soft"
                >
                  <Check size={16} />
                  済
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="border-t border-line/70">
          <button onClick={() => setShowDone((v) => !v)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-muted">
            <ChevronRight size={16} className={`transition-transform ${showDone ? 'rotate-90' : ''}`} />
            対応済み（{done.length}件）
          </button>
          {showDone && (
            <ul className="space-y-2 px-3 pb-3">
              {done.map((n) => (
                <li key={n.id} className="flex gap-3 rounded-xl bg-surface/60 p-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="whitespace-pre-wrap break-words text-sm text-muted line-through">{n.text}</p>
                    <Thumbs size="sm" photos={n.photos} onOpen={(i) => setLightbox({ photos: n.photos, index: i })} />
                    <p className="text-xs text-muted">
                      {n.author || '名前なし'} ・ {formatDate(n.createdAt)} → 済 {formatDate(n.doneAt!)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      aria-label="未対応に戻す"
                      onClick={() => toggleDone(n, false)}
                      className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-bold text-muted"
                    >
                      <Undo2 size={14} />
                      戻す
                    </button>
                    <button
                      aria-label="メモを削除"
                      onClick={() => apply(ops.deleteNote(facility.id, n.id), { toast: 'メモを削除しました', undoable: true })}
                      className="flex items-center justify-center rounded-full px-2.5 py-1 text-need"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <NoteSheet
          facility={facility}
          note={editing === 'new' ? null : (notes.find((n) => n.id === editing) ?? null)}
          onClose={() => setEditing(null)}
        />
      )}
      {lightbox && <Lightbox photos={lightbox.photos} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </section>
  );
}

/** メモの追加・編集。追加のときは「保存」を押すまでメモは作られない */
function NoteSheet({ facility, note, onClose }: { facility: Facility; note: Note | null; onClose: () => void }) {
  const { apply, showToast } = useStore();
  const isNew = note === null;
  const [text, setText] = useState(note?.text ?? '');
  const [author, setAuthor] = useState(note?.author ?? '');
  const [photos, setPhotos] = useState<GuidePhoto[]>(note?.photos ?? []);
  const [uploading, setUploading] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // 保存せずに閉じたとき、追加途中の写真を写真置き場から消すため
  const addedThisTime = useRef<GuidePhoto[]>([]);
  const saved = useRef(false);

  useEffect(() => {
    if (isNew) setAuthor(readAuthor());
  }, [isNew]);

  // これまでに書いた人の名前を候補に出す（「清掃 山田さん」を毎回打たなくてよいように）
  const authorSuggestions = [...new Set((facility.notes ?? []).map((n) => n.author).filter(Boolean))];

  const close = () => {
    if (!saved.current && addedThisTime.current.length > 0) {
      addedThisTime.current.forEach((p) => void deleteGuidePhoto(p));
    }
    onClose();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = [...files].slice(0, MAX_PHOTOS - photos.length - uploading);
    if (list.length === 0) return showToast(`写真は${MAX_PHOTOS}枚までです`);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const p = await uploadGuidePhoto(file, `${facility.id}/notes`);
        addedThisTime.current.push(p);
        setPhotos((prev) => [...prev, p]);
      } catch (e) {
        showToast(e instanceof Error ? e.message : '写真を保存できませんでした');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const removePhoto = (p: GuidePhoto) => {
    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
    // 今回追加した写真ならすぐ消す。前からある写真は保存したときに消す（保存せず閉じたら元に戻せるように）
    if (addedThisTime.current.some((x) => x.id === p.id)) {
      addedThisTime.current = addedThisTime.current.filter((x) => x.id !== p.id);
      void deleteGuidePhoto(p);
    }
  };

  const save = () => {
    if (!text.trim()) return showToast('メモの内容を入力してください');
    saveAuthor(author.trim());
    if (isNew) {
      apply(
        ops.addNote(facility.id, {
          id: newId(),
          text: text.trim(),
          author: author.trim(),
          createdAt: Date.now(),
          photos,
          doneAt: null,
          doneBy: '',
        }),
        { toast: 'メモを追加しました' },
      );
    } else {
      const removed = note.photos.filter((p) => !photos.some((x) => x.id === p.id));
      apply(ops.updateNote(facility.id, note.id, { text, author, photos }), { toast: 'メモを保存しました' });
      removed.forEach((p) => void deleteGuidePhoto(p));
    }
    saved.current = true;
    onClose();
  };

  return (
    <>
      <Sheet open onClose={close} title={isNew ? '引き継ぎメモを追加' : 'メモを編集'}>
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-muted">内容</span>
            <textarea
              autoFocus={isNew}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="例: 浴室の換気扇から異音がします。次回見てください"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base leading-relaxed outline-none focus:border-accent"
            />
            <span className="mt-1 block text-xs text-muted">清掃屋さんからのメッセージを、そのまま貼り付けてOKです</span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-muted">書いた人</span>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              list="note-authors"
              placeholder="例: 清掃 山田さん"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
            />
            <datalist id="note-authors">
              {authorSuggestions.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>

          {canUploadPhotos && (
            <div>
              <span className="mb-1.5 block text-sm font-bold text-muted">写真（{MAX_PHOTOS}枚まで）</span>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-xl bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(p.thumbPath)} alt={`写真 ${i + 1}`} onClick={() => setLightbox(i)} className="h-full w-full cursor-zoom-in object-cover" />
                    <button aria-label="写真を外す" onClick={() => removePhoto(p)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {Array.from({ length: uploading }).map((_, i) => (
                  <div key={`up-${i}`} className="flex h-20 w-20 items-center justify-center rounded-xl bg-surface-2 text-muted">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                ))}
                {photos.length + uploading < MAX_PHOTOS && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs font-bold text-muted"
                  >
                    <ImagePlus size={20} />
                    追加
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          <button
            onClick={save}
            disabled={uploading > 0}
            className="w-full rounded-xl bg-accent py-3 font-bold text-accent-ink disabled:opacity-50"
          >
            {uploading > 0 ? '写真を保存中…' : isNew ? '追加する' : '保存する'}
          </button>

          {!isNew && (
            <button
              onClick={() => {
                apply(ops.deleteNote(facility.id, note.id), { toast: 'メモを削除しました', undoable: true });
                saved.current = true;
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-need/40 py-3 font-bold text-need"
            >
              <Trash2 size={18} />
              このメモを削除
            </button>
          )}
        </div>
      </Sheet>
      {lightbox !== null && photos.length > 0 && (
        <Lightbox photos={photos} index={Math.min(lightbox, photos.length - 1)} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}
