import { useEffect, useState } from 'react';

// 表示（ダーク／ライト）の好みは端末ごとの設定なので、在庫データとは別に保存する
export const THEME_KEY = 'stockmaster:theme';

export type ThemePref = 'auto' | 'dark' | 'light';

/** 画面が描かれる前に実行し、一瞬だけ別の色で表示される（ちらつき）のを防ぐ */
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export function useTheme(): [ThemePref, (t: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>('auto');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') setPref(saved);
    } catch {
      /* 保存領域が使えない環境では「自動」のまま */
    }
  }, []);

  const update = (t: ThemePref) => {
    setPref(t);
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    try {
      if (t === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, t);
    } catch {
      /* 保存できなくても今回の表示には反映される */
    }
  };

  return [pref, update];
}
