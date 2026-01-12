import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, Check, X, ShoppingCart, Home, Settings, List, 
  Trash2, Edit2, Plus, Download, RotateCcw, Package 
} from 'lucide-react';

const FACILITIES = ['警固', '博多天神', 'まるしん荘', '住吉102', '住吉105'];
const DEFAULT_SHOP_OPTIONS = ['未設定', 'Amazon', '楽天', 'ダイソー', 'セリア', 'ドラッグストア', 'ホームセンター'];

const DEFAULT_INVENTORY_DATA = [
  { location: "洗面台下", items: [{ name: "シャンプー", shop: "Amazon", quantity: 1 }, { name: "トリートメント", shop: "Amazon", quantity: 1 }] },
  { location: "トイレ収納棚", items: [{ name: "トイレマジックリン", shop: "ドラッグストア", quantity: 1 }] },
  { location: "シンク下", items: [{ name: "紙コップ", shop: "ダイソー", quantity: 1 }] }
];

export default function MultiFacilityInventory() {
  const [currentScreen, setCurrentScreen] = useState('home'); 
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [currentTab, setCurrentTab] = useState('checklist');
  const [inventoryState, setInventoryState] = useState({});
  const [inventoryData, setInventoryData] = useState({});
  const [shopOptions, setShopOptions] = useState(DEFAULT_SHOP_OPTIONS);
  const [openLocations, setOpenLocations] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [shoppingChecklist, setShoppingChecklist] = useState({});
  const [newLocationName, setNewLocationName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemShop, setNewItemShop] = useState('未設定');
  const [newShopName, setNewShopName] = useState('');

  const [editingLocIndex, setEditingLocIndex] = useState(null);
  const [editingItemKey, setEditingItemKey] = useState(null); 

  useEffect(() => {
    const savedData = localStorage.getItem('inventoryData');
    const savedState = localStorage.getItem('inventoryState');
    const savedShops = localStorage.getItem('shopOptions');
    if (savedShops) setShopOptions(JSON.parse(savedShops));
    let currentData = savedData ? JSON.parse(savedData) : {};
    FACILITIES.forEach(f => { if (!currentData[f]) currentData[f] = JSON.parse(JSON.stringify(DEFAULT_INVENTORY_DATA)); });
    setInventoryData(currentData);
    if (savedState) {
      setInventoryState(JSON.parse(savedState));
    } else {
      const initState = {};
      FACILITIES.forEach(f => {
        initState[f] = {};
        currentData[f].forEach(loc => {
          initState[f][loc.location] = {};
          loc.items.forEach(item => { initState[f][loc.location][item.name] = { hasStock: true, quantity: 1 }; });
        });
      });
      setInventoryState(initState);
    }
  }, []);

  useEffect(() => { if (Object.keys(inventoryData).length > 0) localStorage.setItem('inventoryData', JSON.stringify(inventoryData)); }, [inventoryData]);
  useEffect(() => { if (Object.keys(inventoryState).length > 0) localStorage.setItem('inventoryState', JSON.stringify(inventoryState)); }, [inventoryState]);
  useEffect(() => { localStorage.setItem('shopOptions', JSON.stringify(shopOptions)); }, [shopOptions]);

  const showToastMessage = (message) => {
    setToastMessage(message); setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text; document.body.appendChild(textArea);
    textArea.select(); document.execCommand('copy');
    showToastMessage('コピー完了！'); document.body.removeChild(textArea);
  };

  const resetFacilityStatus = () => {
    if (!window.confirm(`${selectedFacility} をすべて在庫ありに戻しますか？`)) return;
    setInventoryState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const resetData = {};
      inventoryData[selectedFacility].forEach(loc => {
        resetData[loc.location] = {};
        loc.items.forEach(item => { resetData[loc.location][item.name] = { hasStock: true, quantity: 1 }; });
      });
      newState[selectedFacility] = resetData;
      return newState;
    });
    window.location.reload();
  };

  const setItemStatus = (location, item, hasStock) => {
    setInventoryState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState[selectedFacility][location]) newState[selectedFacility][location] = {};
      newState[selectedFacility][location][item] = { ...newState[selectedFacility][location][item], hasStock };
      return newState;
    });
  };

  const setItemQuantity = (location, item, quantity) => {
    const qty = Math.max(1, parseInt(quantity) || 1);
    setInventoryState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState[selectedFacility][location][item].quantity = qty;
      return newState;
    });
  };

  const updateLocationName = (idx, newName) => {
    if (newName.trim()) {
      setInventoryData(prev => {
        const newData = JSON.parse(JSON.stringify(prev));
        newData[selectedFacility][idx].location = newName.trim();
        return newData;
      });
    }
    // ここでは閉じない
  };

  const updateItemName = (locIdx, itemIdx, newName) => {
    if (newName.trim()) {
      setInventoryData(prev => {
        const newData = JSON.parse(JSON.stringify(prev));
        newData[selectedFacility][locIdx].items[itemIdx].name = newName.trim();
        return newData;
      });
    }
  };

  const updateItemShop = (locIdx, itemIdx, newShop) => {
    setInventoryData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      newData[selectedFacility][locIdx].items[itemIdx].shop = newShop;
      return newData;
    });
  };

  const addShop = () => {
    if (!newShopName.trim() || shopOptions.includes(newShopName.trim())) return;
    setShopOptions([...shopOptions, newShopName.trim()]);
    setNewShopName('');
  };

  const deleteShop = (idx) => {
    const shopName = shopOptions[idx];
    if (shopName === '未設定') return;
    if (!confirm(`「${shopName}」を削除しますか？`)) return;
    setShopOptions(shopOptions.filter((_, i) => i !== idx));
  };

  const addLocation = () => {
    if (!newLocationName.trim()) return;
    setInventoryData(prev => ({ ...prev, [selectedFacility]: [...prev[selectedFacility], { location: newLocationName.trim(), items: [] }] }));
    setNewLocationName('');
  };

  const addItem = (idx) => {
    if (!newItemName.trim()) return;
    const locName = inventoryData[selectedFacility][idx].location;
    setInventoryData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      newData[selectedFacility][idx].items.push({ name: newItemName.trim(), shop: newItemShop, quantity: 1 });
      return newData;
    });
    setNewItemName('');
  };

  const deleteLocation = (idx) => {
    if (!confirm('この場所を削除しますか?')) return;
    const locName = inventoryData[selectedFacility][idx].location;
    setInventoryData(prev => ({ ...prev, [selectedFacility]: prev[selectedFacility].filter((_, i) => i !== idx) }));
    setInventoryState(prev => {
      const nextState = JSON.parse(JSON.stringify(prev));
      delete nextState[selectedFacility][locName];
      return nextState;
    });
  };

  const deleteItem = (locIdx, itemIdx) => {
    const locName = inventoryData[selectedFacility][locIdx].location;
    const itemName = inventoryData[selectedFacility][locIdx].items[itemIdx].name;
    setInventoryData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      newData[selectedFacility][locIdx].items.splice(itemIdx, 1);
      return newData;
    });
    setInventoryState(prev => {
      const nextState = JSON.parse(JSON.stringify(prev));
      delete nextState[selectedFacility][locName][itemName];
      return nextState;
    });
  };

  const getAllMissingItems = () => {
    const shops = {};
    Object.keys(inventoryData).forEach(facility => {
      inventoryData[facility].forEach(loc => {
        loc.items.forEach(item => {
          const status = inventoryState[facility]?.[loc.location]?.[item.name];
          if (status && !status.hasStock) {
            const shop = item.shop || '未設定';
            if (!shops[shop]) shops[shop] = [];
            shops[shop].push({ ...item, quantity: status.quantity, facility, location: loc.location, key: `${facility}-${loc.location}-${item.name}` });
          }
        });
      });
    });
    return shops;
  };

  if (currentScreen === 'home') {
    return (
      <div className="min-h-screen bg-slate-200 p-6 flex flex-col items-center font-bold text-slate-900">
        <h1 className="text-4xl mt-12 mb-8 italic uppercase tracking-tighter">Stock Master</h1>
        <button onClick={() => setCurrentScreen('all_shopping')} className="w-full max-w-4xl bg-orange-600 text-white p-8 rounded-3xl shadow-xl mb-8 flex items-center justify-center gap-4 border-b-8 border-orange-800 active:translate-y-1 transition-all">
          <ShoppingCart size={40} /><div className="text-2xl font-bold uppercase tracking-widest">全施設まとめ買い物リスト</div>
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {FACILITIES.map(f => (
            <button key={f} onClick={() => { setSelectedFacility(f); setCurrentScreen('facility'); setCurrentTab('checklist'); }} className="bg-white p-10 rounded-2xl shadow-md text-3xl font-bold hover:bg-blue-600 hover:text-white transition-all border-b-8 border-slate-300 active:translate-y-1">{f}</button>
          ))}
        </div>
      </div>
    );
  }

  if (currentScreen === 'all_shopping') {
    const allShops = getAllMissingItems();
    return (
      <div className="min-h-screen bg-slate-100 pb-24 font-bold text-slate-900">
        <div className="max-w-3xl mx-auto p-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center justify-between border-b-4 border-orange-600">
            <button onClick={() => setCurrentScreen('home')} className="flex items-center gap-2 font-bold bg-slate-100 px-4 py-2 rounded-xl"><Home size={24}/>戻る</button>
            <h2 className="text-2xl font-bold italic uppercase tracking-widest text-orange-600">Shopping List</h2>
            <div className="w-12"></div>
          </div>
          <div className="space-y-6">
            {Object.keys(allShops).length === 0 ? <div className="text-center py-20 bg-white rounded-3xl text-slate-400 text-xl">買うものはありません</div> : 
              Object.keys(allShops).sort().map(shop => (
                <div key={shop} className="bg-white rounded-3xl shadow-md overflow-hidden border border-slate-200 mb-6">
                  <div className="bg-slate-900 text-white p-6 text-2xl">{shop}</div>
                  <div className="p-4 space-y-3">
                    {allShops[shop].map(item => (
                      <div key={item.key} onClick={() => setShoppingChecklist(p => ({ ...p, [item.key]: !p[item.key] }))} className={`w-full p-6 rounded-2xl border-4 flex items-center justify-between cursor-pointer ${shoppingChecklist[item.key] ? 'bg-slate-100 border-slate-200 opacity-40' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex-1">
                          <div className={`text-2xl font-bold ${shoppingChecklist[item.key] ? 'line-through text-slate-400' : 'text-slate-900'}`}>{item.name} <span className="text-red-700">({item.quantity}個)</span></div>
                          <div className="flex gap-4 mt-2">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm">{item.facility}</span>
                            <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg text-sm">{item.location}</span>
                          </div>
                        </div>
                        {shoppingChecklist[item.key] ? <Check className="text-green-600" size={40} strokeWidth={4}/> : <div className="w-10 h-10 border-4 border-slate-300 rounded-full"></div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24 font-bold text-slate-900">
      {showToast && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full z-50 shadow-2xl animate-bounce text-lg">{toastMessage}</div>}
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center justify-between border-b-4 border-blue-600">
          <button onClick={() => setCurrentScreen('home')} className="flex items-center gap-2 font-bold bg-slate-100 px-4 py-2 rounded-xl"><Home size={24}/>戻る</button>
          <h2 className="text-3xl font-bold">{selectedFacility}</h2>
          <div className="w-12"></div>
        </div>

        <div className="flex bg-white rounded-xl shadow-sm mb-6 p-1 border border-slate-300">
          <button onClick={() => setCurrentTab('checklist')} className={`flex-1 py-4 rounded-lg transition-all ${currentTab === 'checklist' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>在庫確認</button>
          <button onClick={() => setCurrentTab('settings')} className={`flex-1 py-4 rounded-lg transition-all ${currentTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>⚙️ 管理</button>
        </div>

        {currentTab === 'checklist' && (
          <div className="space-y-4">
            {inventoryData[selectedFacility]?.map((loc, lIdx) => (
              <div key={lIdx} className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
                <button onClick={() => setOpenLocations(p => ({...p, [loc.location]: !p[loc.location]}))} className="w-full p-6 flex justify-between items-center bg-slate-50 border-b text-2xl font-bold">{loc.location}{openLocations[loc.location] ? <ChevronUp size={32}/> : <ChevronDown size={32}/>}</button>
                {openLocations[loc.location] && (
                  <div className="p-5 space-y-6">
                    {loc.items.map((item, iIdx) => {
                      const status = inventoryState[selectedFacility]?.[loc.location]?.[item.name] || { hasStock: true, quantity: 1 };
                      return (
                        <div key={iIdx} className={`p-6 rounded-2xl border-4 ${status.hasStock ? 'border-slate-100 bg-white' : 'border-red-600 bg-red-50'}`}>
                          <div className="mb-4 font-bold"><div className="text-2xl text-slate-800">{item.name}</div><div className="text-lg text-blue-700 mt-1 italic font-bold">🛒 {item.shop}</div></div>
                          <div className="flex gap-4">
                            <button onClick={() => setItemStatus(loc.location, item.name, true)} className={`flex-1 py-5 rounded-xl font-bold text-xl border-b-4 ${status.hasStock ? 'bg-green-600 text-white border-green-800 shadow-md' : 'bg-slate-100 text-slate-300'}`}>在庫あり</button>
                            <button onClick={() => setItemStatus(loc.location, item.name, false)} className={`flex-1 py-5 rounded-xl font-bold text-xl border-b-4 ${!status.hasStock ? 'bg-red-600 text-white border-red-800 shadow-md' : 'bg-slate-100 text-slate-300'}`}>要購入</button>
                          </div>
                          {!status.hasStock && <div className="mt-5 flex items-center justify-center gap-6 bg-white p-4 rounded-xl border-2 border-red-200 shadow-inner"><span className="text-xl font-bold text-slate-700">必要数:</span><input type="number" min="1" value={status.quantity} onChange={(e) => setItemQuantity(loc.location, item.name, e.target.value)} className="w-24 p-2 border-4 border-slate-300 rounded-xl text-center text-2xl font-bold bg-slate-50" /><span className="text-xl font-bold text-slate-700">個</span></div>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => setCurrentScreen('all_shopping')} className="w-full bg-orange-600 text-white py-8 rounded-3xl font-bold text-3xl shadow-xl border-b-8 border-orange-800 mt-10 active:translate-y-1 transition-all"><ShoppingCart size={32} strokeWidth={4} className="inline mr-4"/>買い物リストへ</button>
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="space-y-8 pb-10">
            {/* ↓↓ ここが購入先リストの管理場所です！一番上に持ってきました ↓↓ */}
            <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-blue-200">
              <h3 className="text-2xl mb-6 flex items-center gap-2 text-blue-800 font-black"><ShoppingCart size={24}/>購入先リストの編集</h3>
              <div className="text-sm text-slate-500 mb-2">※ ここで追加したお店が、アイテム編集時の候補に出ます</div>
              <div className="flex flex-wrap gap-3 mb-6 font-black">
                {shopOptions.map((shop, idx) => (
                  <div key={idx} className="bg-slate-100 px-4 py-3 rounded-2xl border-2 border-slate-300 text-lg flex items-center gap-2">{shop}{shop !== '未設定' && <button onClick={() => deleteShop(idx)} className="text-red-600 p-1">×</button>}</div>
                ))}
              </div>
              <div className="flex gap-2 bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 font-black">
                <input className="flex-1 p-4 border-4 border-white rounded-2xl text-lg" placeholder="新しいお店を追加" value={newShopName} onChange={e => setNewShopName(e.target.value)} />
                <button onClick={addShop} className="bg-blue-600 text-white px-8 rounded-xl text-lg shadow-md active:scale-95 transition-all">追加</button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-red-200">
               <h3 className="text-xl mb-4 font-bold text-red-600"><RotateCcw className="inline mr-2"/>チェック状態のリセット</h3>
               <button onClick={resetFacilityStatus} className="w-full bg-red-600 text-white py-5 rounded-2xl text-xl border-b-8 border-red-900 shadow-lg active:translate-y-2 transition-all font-bold">すべて在庫ありに戻す</button>
            </div>

            {inventoryData[selectedFacility]?.map((loc, lIdx) => (
              <div key={lIdx} className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200">
                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-100 font-bold">
                  {editingLocIndex === lIdx ? (
                    <input autoFocus className="flex-1 text-2xl border-b-4 border-blue-600 bg-blue-50 p-2" defaultValue={loc.location} onBlur={e => updateLocationName(lIdx, e.target.value)} onKeyDown={e => e.key === 'Enter' && setEditingLocIndex(null)} />
                  ) : (
                    <div className="flex items-center gap-4 cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-all" onClick={() => setEditingLocIndex(lIdx)}>
                      <h4 className="text-2xl font-bold text-slate-800">{loc.location}</h4>
                      <Edit2 size={24} className="text-blue-500 opacity-40"/>
                    </div>
                  )}
                  <button onClick={() => {if(confirm('場所を削除しますか？')) setInventoryData(prev => ({...prev, [selectedFacility]: prev[selectedFacility].filter((_, i) => i !== lIdx)}))}} className="bg-red-50 text-red-600 p-3 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={24}/></button>
                </div>
                
                <div className="space-y-4 mb-6">
                  {loc.items.map((item, iIdx) => (
                    <div key={iIdx} className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-200">
                      <div className="flex-1">
                        {editingItemKey === `${lIdx}-${iIdx}` ? (
                          <div className="flex flex-col gap-4 p-4 bg-blue-50 rounded-xl border-4 border-blue-400">
                            <label className="text-sm font-bold text-blue-800">品名を編集:</label>
                            <input autoFocus className="p-3 text-xl border-2 border-slate-300 rounded-xl font-bold text-slate-900 shadow-sm" defaultValue={item.name} onBlur={e => updateItemName(lIdx, iIdx, e.target.value)} />
                            
                            <label className="text-sm font-bold text-blue-800 mt-2">購入先を編集（リスト選択 or 手入力）:</label>
                            {/* ↓ ここが修正ポイント：リストと連携する自由入力欄 */}
                            <input 
                              list="master-shop-list" 
                              className="p-3 text-xl border-2 border-slate-300 rounded-xl font-bold text-slate-900 shadow-sm"
                              defaultValue={item.shop}
                              placeholder="入力 または 候補から選択"
                              onBlur={e => updateItemShop(lIdx, iIdx, e.target.value)}
                            />
                            
                            <button onClick={() => setEditingItemKey(null)} className="mt-2 bg-blue-600 text-white py-3 rounded-xl font-bold">完了</button>
                          </div>
                        ) : (
                          <div className="cursor-pointer group p-3 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-blue-200" onClick={() => setEditingItemKey(`${lIdx}-${iIdx}`)}>
                            <div className="flex items-center gap-3">
                               <div className="text-2xl font-bold text-slate-900 group-hover:text-blue-700">{item.name}</div>
                               <Edit2 size={20} className="text-blue-500 opacity-20 group-hover:opacity-100"/>
                            </div>
                            <div className="text-lg text-blue-800 font-bold italic mt-1 border-b-2 border-blue-100 border-dotted inline-block">🛒 {item.shop}</div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => {if(confirm('品目を削除しますか？')){
                          const newData = JSON.parse(JSON.stringify(inventoryData));
                          newData[selectedFacility][lIdx].items.splice(iIdx, 1);
                          setInventoryData(newData);
                      }}} className="bg-white text-red-400 p-4 rounded-xl border border-red-100 shadow-sm active:bg-red-50 ml-4"><X size={28} strokeWidth={4}/></button>
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 font-bold">
                  <h5 className="mb-4 text-xl italic underline text-blue-800 tracking-widest uppercase">Add New Item</h5>
                  <input className="w-full p-4 border-4 border-white rounded-2xl mb-4 text-xl font-bold shadow-sm" placeholder="品名を入力" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                  <div className="flex gap-2 font-bold">
                    <input 
                      list="master-shop-list"
                      className="flex-1 p-4 border-4 border-white rounded-2xl text-xl bg-white shadow-sm" 
                      placeholder="購入先"
                      value={newItemShop} 
                      onChange={e => setNewItemShop(e.target.value)}
                    />
                    <button onClick={() => {
                        if(!newItemName.trim()) return;
                        const newData = JSON.parse(JSON.stringify(inventoryData));
                        newData[selectedFacility][lIdx].items.push({ name: newItemName.trim(), shop: newItemShop, quantity: 1 });
                        setInventoryData(newData);
                        setNewItemName('');
                        showToastMessage('追加しました');
                    }} className="bg-blue-700 text-white px-10 rounded-2xl text-4xl active:scale-95 shadow-xl">＋</button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-slate-900 font-bold">
               <h3 className="text-2xl mb-4 italic tracking-widest uppercase text-slate-900">Add Category</h3>
               <div className="flex gap-2">
                 <input className="flex-1 p-5 border-4 border-slate-100 rounded-2xl text-xl font-bold shadow-inner" placeholder="例: ベランダ" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} />
                 <button onClick={addLocation} className="bg-slate-900 text-white px-10 rounded-2xl text-2xl shadow-xl active:scale-95">追加</button>
               </div>
            </div>

            <div className="pt-10">
              <button onClick={() => handleCopy(JSON.stringify({ inventoryData, inventoryState, shopOptions }, null, 2))} className="w-full bg-green-700 text-white py-8 rounded-3xl text-2xl border-b-8 border-green-900 flex items-center justify-center gap-4 shadow-xl active:translate-y-2 transition-all font-bold tracking-widest uppercase"><Download size={40}/>Backup Data</button>
            </div>
          </div>
        )}
      </div>
      
      {/* ↓ これが正解の位置です。ループの外に置かないとリストが出なかったんです */}
      <datalist id="master-shop-list">
        {shopOptions.map(s => <option key={s} value={s} />)}
      </datalist>

      <div className="fixed bottom-0 w-full bg-white border-t-4 border-slate-300 flex p-3 shadow-2xl z-40 font-bold">
        <button onClick={() => setCurrentTab('checklist')} className={`flex-1 flex flex-col items-center p-3 rounded-2xl ${currentTab === 'checklist' ? 'bg-blue-700 text-white shadow-inner' : 'text-slate-500'}`}><List size={32} strokeWidth={4}/><span className="text-sm mt-1">在庫チェック</span></button>
        <button onClick={() => setCurrentTab('settings')} className={`flex-1 flex flex-col items-center p-3 rounded-2xl ${currentTab === 'settings' ? 'bg-blue-700 text-white shadow-inner' : 'text-slate-500'}`}><Settings size={32} strokeWidth={4}/><span className="text-sm mt-1">管理</span></button>
      </div>
    </div>
  );
}