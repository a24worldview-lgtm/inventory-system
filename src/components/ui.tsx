import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, Minus, Plus, X } from 'lucide-react';

export function Header({
  title,
  onBack,
  right,
  sub,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="戻る"
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-ink active:bg-line"
          >
            <ChevronLeft size={26} />
          </button>
        ) : (
          <div className="w-1" />
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h1>
        {right}
      </div>
      {sub && <div className="mx-auto max-w-2xl px-4 pb-3">{sub}</div>}
    </header>
  );
}

export function Stepper({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (n: number) => void;
  size?: 'sm' | 'md';
}) {
  const btn =
    size === 'sm'
      ? 'h-9 w-9'
      : 'h-11 w-11';
  return (
    <div
      className="flex items-center rounded-full border border-line bg-surface"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        aria-label="減らす"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className={`${btn} flex items-center justify-center rounded-full text-ink active:bg-line disabled:text-line`}
      >
        <Minus size={18} strokeWidth={2.5} />
      </button>
      <span className="min-w-8 text-center text-base font-bold tabular-nums">{value}</span>
      <button
        aria-label="増やす"
        onClick={() => onChange(value + 1)}
        className={`${btn} flex items-center justify-center rounded-full text-ink active:bg-line`}
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/** 画面下からせり上がるパネル。スマホで片手操作しやすい */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="animate-sheet-up pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface px-5 pb-2 pt-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}

/** Enter で確定する1行入力。確定後は空に戻り、続けて入力できる */
export function QuickAdd({
  placeholder,
  onSubmit,
  buttonLabel = '追加',
  autoFocus,
}: {
  placeholder: string;
  onSubmit: (text: string) => void;
  buttonLabel?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
  };
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="done"
        className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-accent-ink disabled:opacity-40"
      >
        {buttonLabel}
      </button>
    </form>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</section>;
}

export function formatRelative(ts: number | null): string {
  if (!ts) return '未チェック';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  const date = new Date(ts);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
