import { useCallback, useEffect, useState } from 'react';

// URL の # 以降で画面を切り替える。スマホの「戻る」で前の画面に戻れるようにするため。
export type Route =
  | { name: 'home' }
  | { name: 'facility'; id: string }
  | { name: 'shopping' }
  | { name: 'settings' };

let navigatedInApp = false;

function parse(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/');
  if (a === 'f' && b) return { name: 'facility', id: decodeURIComponent(b) };
  if (a === 'shopping') return { name: 'shopping' };
  if (a === 'settings') return { name: 'settings' };
  return { name: 'home' };
}

function toHash(r: Route): string {
  switch (r.name) {
    case 'facility':
      return `#/f/${encodeURIComponent(r.id)}`;
    case 'shopping':
      return '#/shopping';
    case 'settings':
      return '#/settings';
    default:
      return '#/';
  }
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>({ name: 'home' });

  useEffect(() => {
    const sync = () => setRoute(parse(window.location.hash));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const go = useCallback((r: Route) => {
    const hash = toHash(r);
    if (window.location.hash !== hash) {
      navigatedInApp = true;
      window.location.hash = hash;
    }
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback(() => {
    // URLを直接開いた（ブックマーク等）場合は戻る先が無いので、履歴を置き換えてホームへ
    if (navigatedInApp) window.history.back();
    else window.location.replace('#/');
  }, []);

  return { route, go, back };
}
