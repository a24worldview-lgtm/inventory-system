import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Loader2, Pencil, X } from 'lucide-react';
import { ops, useStore } from '@/lib/store';
import { canUploadPhotos, deleteGuidePhoto, photoUrl, uploadGuidePhoto } from '@/lib/photos';
import type { Facility, GuidePhoto } from '@/lib/types';
import { Sheet } from './ui';

/** 写真を全画面で表示する。左右の矢印かスワイプで切り替え、タップで閉じる */
function Lightbox({ photos, index, onClose }: { photos: GuidePhoto[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const startX = useRef<number | null>(null);
  const go = (d: number) => setI((v) => (v + d + photos.length) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black"
      onClick={onClose}
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 50) {
          e.preventDefault();
          go(dx < 0 ? 1 : -1);
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(photos[i].path)} alt="置き方の見本" className="max-h-full max-w-full object-contain" />
      <button aria-label="閉じる" className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white">
        <X size={24} />
      </button>
      {photos.length > 1 && (
        <>
          <button
            aria-label="前の写真"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 rounded-full bg-white/15 p-2 text-white"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            aria-label="次の写真"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-2 rounded-full bg-white/15 p-2 text-white"
          >
            <ChevronRight size={28} />
          </button>
          <div className="absolute bottom-6 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white tabular-nums">
            {i + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}

export function GuideSheet({
  facility,
  locationId,
  startEditing,
  onClose,
}: {
  facility: Facility;
  locationId: string | null;
  startEditing: boolean;
  onClose: () => void;
}) {
  const { apply, showToast } = useStore();
  const loc = facility.locations.find((l) => l.id === locationId);
  const [editing, setEditing] = useState(startEditing);
  const [uploading, setUploading] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditing(startEditing);
    setNote(loc?.guide?.note ?? '');
    setLightbox(null);
    // 別の場所を開いたときだけ初期化する（入力中のメモを上書きしないため）
  }, [locationId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loc) return null;
  const photos = loc.guide?.photos ?? [];
  const savedNote = loc.guide?.note ?? '';

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files];
    setUploading((n) => n + list.length);
    let ok = 0;
    for (const file of list) {
      try {
        const photo = await uploadGuidePhoto(file, `${facility.id}/${loc.id}`);
        apply(ops.addGuidePhotos(facility.id, loc.id, [photo]));
        ok++;
      } catch (e) {
        console.error(e);
        showToast(e instanceof Error ? e.message : '写真を保存できませんでした');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (ok > 0) showToast(`写真を${ok}枚追加しました`);
  };

  const removePhoto = (photo: GuidePhoto) => {
    if (!window.confirm('この写真を削除しますか？（元に戻せません）')) return;
    apply(ops.removeGuidePhoto(facility.id, loc.id, photo.id), { toast: '写真を削除しました' });
    void deleteGuidePhoto(photo);
  };

  const saveNote = () => {
    if (note.trim() !== savedNote) apply(ops.setGuideNote(facility.id, loc.id, note), { toast: 'メモを保存しました' });
  };

  return (
    <>
      <Sheet open onClose={onClose} title={`${loc.name}の置き方`}>
        {editing ? (
          <div className="space-y-6">
            <div>
              <div className="mb-1 text-sm font-bold text-muted">見本の写真</div>
              <p className="mb-3 text-xs text-muted">「この状態が正解」という置き方を撮っておきましょう。何枚でも登録できます</p>
              {!canUploadPhotos ? (
                <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">写真はクラウドにつながっているときだけ登録できます</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, i) => (
                      <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl(p.thumbPath)}
                          alt={`見本 ${i + 1}`}
                          loading="lazy"
                          onClick={() => setLightbox(i)}
                          className="h-full w-full cursor-zoom-in object-cover"
                        />
                        <button
                          aria-label="写真を削除"
                          onClick={() => removePhoto(p)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {Array.from({ length: uploading }).map((_, i) => (
                      <div key={`up-${i}`} className="flex aspect-square items-center justify-center rounded-xl bg-surface-2 text-muted">
                        <Loader2 size={24} className="animate-spin" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => cameraRef.current?.click()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink"
                    >
                      <Camera size={18} />
                      撮影する
                    </button>
                    <button
                      onClick={() => libraryRef.current?.click()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3 text-sm font-bold"
                    >
                      <ImagePlus size={18} />
                      写真を選ぶ
                    </button>
                  </div>
                  {/* capture を付けるとスマホでカメラが直接開く。付けない方は写真アプリから選べる */}
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      void handleFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={libraryRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void handleFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </>
              )}
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-muted">置き方のメモ</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}
                rows={3}
                placeholder="例: 洗剤は右奥、ストックは左のカゴ。ラベルは手前向きに"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
              />
            </label>

            <button
              onClick={() => {
                saveNote();
                setEditing(false);
              }}
              className="w-full rounded-xl bg-accent py-3 font-bold text-accent-ink"
            >
              完了
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {photos.length === 0 && !savedNote ? (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                まだ見本が登録されていません
              </p>
            ) : (
              <>
                {photos.length > 0 && (
                  <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
                    {photos.map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={photoUrl(p.thumbPath)}
                        alt={`見本 ${i + 1}`}
                        onClick={() => setLightbox(i)}
                        className={`aspect-[4/3] shrink-0 cursor-zoom-in snap-center rounded-2xl bg-surface-2 object-cover ${
                          photos.length === 1 ? 'w-full' : 'w-[85%]'
                        }`}
                      />
                    ))}
                  </div>
                )}
                {photos.length > 0 && <p className="text-xs text-muted">写真をタップすると大きく表示します</p>}
                {savedNote && <p className="whitespace-pre-wrap rounded-2xl bg-surface-2 p-4 text-base leading-relaxed">{savedNote}</p>}
              </>
            )}
            <button
              onClick={() => setEditing(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-bold"
            >
              <Pencil size={16} />
              見本を編集
            </button>
          </div>
        )}
      </Sheet>
      {lightbox !== null && photos.length > 0 && (
        <Lightbox photos={photos} index={Math.min(lightbox, photos.length - 1)} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}
