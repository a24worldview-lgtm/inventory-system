import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        {/* スマホのホーム画面に追加したとき、アプリのように全画面で開く */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="在庫チェック" />
        <meta name="theme-color" content="#f3f1ec" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#151514" media="(prefers-color-scheme: dark)" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
