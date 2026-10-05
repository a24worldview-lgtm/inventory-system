import { Cloud, CloudOff, HardDrive, RefreshCw } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { SyncStatus } from '@/lib/sync';

const LABELS: Record<SyncStatus, { text: string; icon: typeof Cloud; tone: string }> = {
  local: { text: 'この端末だけに保存', icon: HardDrive, tone: 'text-muted' },
  connecting: { text: '接続中…', icon: RefreshCw, tone: 'text-muted' },
  syncing: { text: '保存中…', icon: RefreshCw, tone: 'text-muted' },
  synced: { text: 'クラウドと同期済み', icon: Cloud, tone: 'text-accent' },
  offline: { text: 'オフライン（つながったら送ります）', icon: CloudOff, tone: 'text-need' },
};

/** 同期の状態を小さく表示する。変更がちゃんとクラウドに届いたかを確認できるように */
export function SyncBadge() {
  const { syncStatus } = useStore();
  const { text, icon: Icon, tone } = LABELS[syncStatus];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${tone}`}>
      <Icon size={13} className={syncStatus === 'syncing' || syncStatus === 'connecting' ? 'animate-spin' : ''} />
      {text}
    </span>
  );
}
