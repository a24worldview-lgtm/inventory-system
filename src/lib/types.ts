// データ構造（v2）
// v1 は「施設名 → 場所名 → 品目名」の名前で状態を紐付けていたため、名前を変えると記録が消えた。
// v2 はすべてに ID を振り、在庫の状態を品目そのものに持たせる。

export type Shop = {
  id: string;
  name: string;
};

export type Item = {
  id: string;
  name: string;
  shopId: string | null; // null = 購入先未設定
  needed: boolean; // true = 要購入
  qty: number; // 要購入のときの必要数
  defaultQty: number; // 「要購入」にしたとき最初に入る数
};

/** 置き方の見本写真。path は写真置き場（Supabase Storage）の中の場所 */
export type GuidePhoto = {
  id: string;
  path: string; // 拡大表示用
  thumbPath: string; // 一覧用の小さい写真（通信量を抑えるため別に保存）
};

export type LocationGuide = {
  photos: GuidePhoto[];
  note: string; // 「洗剤は右奥、ストックは左のカゴ」など
};

export type Location = {
  id: string;
  name: string;
  items: Item[];
  guide?: LocationGuide; // まだ登録していない場所には無い
};

/** 引き継ぎメモ（「次に来たときここを見て」など） */
export type Note = {
  id: string;
  text: string;
  author: string; // 書いた人（清掃屋さんの名前など）
  createdAt: number;
  photos: GuidePhoto[];
  doneAt: number | null; // 対応済みにした日時。null なら未対応
  doneBy: string;
};

export type Facility = {
  id: string;
  name: string;
  locations: Location[];
  checkedAt: number | null; // 最後に在庫チェックした日時（ミリ秒）
  notes?: Note[]; // 引き継ぎメモ（まだ一度も書いていない施設には無い）
};

export type AppData = {
  version: 2;
  facilities: Facility[];
  shops: Shop[];
  purchased: string[]; // 買い物リストで「買った」にチェックした品目ID
  updatedAt: number;
  seeded?: true; // 初期サンプルのまま一度も編集していない。クラウドへ勝手に送らないための目印
};
