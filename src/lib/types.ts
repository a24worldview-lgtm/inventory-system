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

export type Location = {
  id: string;
  name: string;
  items: Item[];
};

export type Facility = {
  id: string;
  name: string;
  locations: Location[];
  checkedAt: number | null; // 最後に在庫チェックした日時（ミリ秒）
};

export type AppData = {
  version: 2;
  facilities: Facility[];
  shops: Shop[];
  purchased: string[]; // 買い物リストで「買った」にチェックした品目ID
  updatedAt: number;
};
