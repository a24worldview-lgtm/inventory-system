import Head from 'next/head';
import { Home, Settings, ShoppingCart, Undo2 } from 'lucide-react';
import { StoreProvider, collectShopping, useStore } from '@/lib/store';
import { useHashRoute } from '@/components/routes';
import type { Route } from '@/components/routes';
import { HomeScreen } from '@/components/HomeScreen';
import { FacilityScreen } from '@/components/FacilityScreen';
import { ShoppingScreen } from '@/components/ShoppingScreen';
import { SettingsScreen } from '@/components/SettingsScreen';

export default function Page() {
  return (
    <StoreProvider>
      <Head>
        <title>Stock Master</title>
      </Head>
      <App />
    </StoreProvider>
  );
}

function App() {
  const { data } = useStore();
  const { route, go, back } = useHashRoute();

  if (!data) {
    return <div className="flex min-h-dvh items-center justify-center text-muted">読み込み中…</div>;
  }

  return (
    <div className="min-h-dvh">
      {route.name === 'home' && <HomeScreen go={go} />}
      {route.name === 'facility' && <FacilityScreen id={route.id} go={go} back={back} />}
      {route.name === 'shopping' && <ShoppingScreen />}
      {route.name === 'settings' && <SettingsScreen />}
      <BottomNav route={route} go={go} />
      <ToastView />
    </div>
  );
}

function BottomNav({ route, go }: { route: Route; go: (r: Route) => void }) {
  const { data } = useStore();
  const needed = data ? collectShopping(data).length : 0;
  const tabs = [
    { key: 'home', label: '施設', icon: Home, active: route.name === 'home' || route.name === 'facility' },
    { key: 'shopping', label: '買い物リスト', icon: ShoppingCart, active: route.name === 'shopping', badge: needed },
    { key: 'settings', label: '設定', icon: Settings, active: route.name === 'settings' },
  ] as const;

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => go({ name: t.key } as Route)}
              aria-current={t.active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-bold ${
                t.active ? 'text-accent' : 'text-muted'
              }`}
            >
              <span className="relative">
                <Icon size={24} strokeWidth={t.active ? 2.5 : 2} />
                {'badge' in t && t.badge > 0 && (
                  <span className="absolute -right-3 -top-1.5 min-w-5 rounded-full bg-need px-1.5 text-center text-[11px] leading-5 text-need-ink tabular-nums">
                    {t.badge}
                  </span>
                )}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ToastView() {
  const { toast, undo, dismissToast } = useStore();
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      className="animate-toast-in fixed bottom-24 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink py-3 pl-4 pr-2 text-sm font-bold text-bg shadow-xl"
    >
      <span className="flex-1" onClick={dismissToast}>
        {toast.message}
      </span>
      {toast.undo && (
        <button onClick={undo} className="flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-accent-soft active:bg-white/10">
          <Undo2 size={16} />
          元に戻す
        </button>
      )}
    </div>
  );
}
