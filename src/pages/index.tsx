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
    const qty = parseInt(quantity) || 1;
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

  const deleteItem = (locIdx, itemIdx) => {
    if (!confirm('品目を削除しますか？')) return;
    const newData = JSON.parse(JSON.stringify(inventoryData));
    newData[selectedFacility][locIdx].items.splice(itemIdx, 1);
    setInventoryData(newData);
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

  // 1から20までの選択肢を生成
  const quantityOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  if (currentScreen === 'home') {
    return (
      <div className="min-h-screen bg-slate-200 p-4 md:p-6 flex flex-col items-center font-bold text-slate-900">
        <h1 className="text-3xl md:text-4xl mt-8 mb-8 italic uppercase tracking-tighter">Stock Master</h1>
        <button onClick={() => setCurrentScreen('all_shopping')} className="w-full max-w-4xl bg-orange-600 text-white p-6 md:p-8 rounded-3xl shadow-xl mb-8 flex items-center justify-center gap-4 border-b-8 border-orange-800 active:translate-y-1 transition-all">
          <ShoppingCart size={32} /><div className="text-xl md:text-2xl font-bold uppercase tracking-widest text-center">全施設まとめ買い物リスト</div>
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl">
          {FACILITIES.map(f => (
            <button key={f} onClick={() => { setSelectedFacility(f); setCurrentScreen('facility'); setCurrentTab('checklist'); }} className="bg-white p-8 md:p-10 rounded-2xl shadow-md text-2xl md:text-3xl font-bold hover:bg-blue-600 hover:text-white transition-all border-b-8 border-slate-300 active:translate-y-1">{f}</button>
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
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex items-center justify-between border-b-4 border-orange-600">
            <button onClick={() => setCurrentScreen('home')} className="flex items-center gap-2 font-bold bg-slate-100 px-3 py-2 rounded-xl text-sm md:text-base"><Home size={20}/>戻る</button>
            <h2 className="text-lg md:text-2xl font-bold italic uppercase tracking-widest text-orange-600">Shopping List</h2>
            <div className="w-10"></div>
          </div>
          <div className="space-y-6">
            {Object.keys(allShops).length === 0 ? <div className="text-center py-20 bg-white rounded-3xl text-slate-400 text-xl">買うものはありません</div> : 
              Object.keys(allShops).sort().map(shop => (
                <div key={shop} className="bg-white rounded-3xl shadow-md overflow-hidden border border-slate-200 mb-6">
                  <div className="bg-slate-900 text-white p-4 md:p-6 text-xl md:text-2xl">{shop}</div>
                  <div className="p-3 md:p-4 space-y-3">
                    {allShops[shop].map(item => (
                      <div key={item.key} onClick={() => setShoppingChecklist(p => ({ ...p, [item.key]: !p[item.key] }))} className={`w-full p-4 md:p-6 rounded-2xl border-4 flex items-center justify-between cursor-pointer ${shoppingChecklist[item.key] ? 'bg-slate-100 border-slate-200 opacity-40' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex-1">
                          <div className={`text-xl md:text-2xl font-bold ${shoppingChecklist[item.key] ? 'line-through text-slate-400' : 'text-slate-900'}`}>{item.name} <span className="text-red-700">({item.quantity}個)</span></div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs md:text-sm">{item.facility}</span>
                            <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg text-xs md:text-sm">{item.location}</span>
                          </div>
                        </div>
                        {shoppingChecklist[item.key] ? <Check className="text-green-600" size={32} strokeWidth={4}/> : <div className="w-8 h-8 border-4 border-slate-300 rounded-full"></div>}
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
    <div className="min-h-screen bg-slate-100 pb-32 font-bold text-slate-900">
      {showToast && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full z-50 shadow-2xl animate-bounce text-sm md:text-lg">{toastMessage}</div>}
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex items-center justify-between border-b-4 border-blue-600">
          <button onClick={() => setCurrentScreen('home')} className="flex items-center gap-2 font-bold bg-slate-100 px-3 py-2 rounded-xl text-sm"><Home size={20}/>戻る</button>
          <h2 className="text-xl md:text-3xl font-bold">{selectedFacility}</h2>
          <div className="w-10"></div>
        </div>

        {currentTab === 'checklist' && (
          <div className="space-y-4">
            {inventoryData[selectedFacility]?.map((loc, lIdx) => (
              <div key={lIdx} className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
                <button onClick={() => setOpenLocations(p => ({...p, [loc.location]: !p[loc.location]}))} className="w-full p-4 md:p-6 flex justify-between items-center bg-slate-50 border-b text-xl md:text-2xl font-bold">{loc.location}{openLocations[loc.location] ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}</button>
                {openLocations[loc.location] && (
                  <div className="p-4 md:p-5 space-y-6">
                    {loc.items.map((item, iIdx) => {
                      const status = inventoryState[selectedFacility]?.[loc.location]?.[item.name] || { hasStock: true, quantity: 1 };
                      return (
                        <div key={iIdx} className={`p-4 md:p-6 rounded-2xl border-4 ${status.hasStock ? 'border-slate-100 bg-white' : 'border-red-600 bg-red-50'}`}>
                          <div className="mb-4 font-bold"><div className="text-xl md:text-2xl text-slate-800">{item.name}</div><div className="text-base text-blue-700 mt-1 italic font-bold">🛒 {item.shop}</div></div>
                          <div className="flex gap-3">
                            <button onClick={() => setItemStatus(loc.location, item.name, true)} className={`flex-1 py-4 md:py-5 rounded-xl font-bold text-lg md:text-xl border-b-4 ${status.hasStock ? 'bg-green-600 text-white border-green-800 shadow-md' : 'bg-slate-100 text-slate-300'}`}>在庫あり</button>
                            <button onClick={() => setItemStatus(loc.location, item.name, false)} className={`flex-1 py-4 md:py-5 rounded-xl font-bold text-lg md:text-xl border-b-4 ${!status.hasStock ? 'bg-red-600 text-white border-red-800 shadow-md' : 'bg-slate-100 text-slate-300'}`}>要購入</button>
                          </div>
                          {!status.hasStock && (
                            <div className="mt-5 flex items-center justify-center gap-4 bg-white p-4 rounded-xl border-2 border-red-200 shadow-inner">
                              <span className="text-lg font-bold text-slate-700">必要数:</span>
                              {/* ↓ ここをプルダウンに変更しました ↓ */}
                              <select 
                                value={status.quantity} 
                                onChange={(e) => setItemQuantity(loc.location, item.name, e.target.value)} 
                                className="w-24 p-2 border-4 border-slate-300 rounded-xl text-center text-xl font-bold bg-slate-50 appearance-none"
                              >
                                {quantityOptions.map(num => (
                                  <option key={num} value={num}>{num}</option>
                                ))}
                              </select>
                              <span className="text-lg font-bold text-slate-700">個</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => setCurrentScreen('all_shopping')} className="w-full bg-orange-600 text-white py-6 md:py-8 rounded-3xl font-bold text-2xl md:text-3xl shadow-xl border-b-8 border-orange-800 mt-6 active:translate-y-1 transition-all"><ShoppingCart size={28} strokeWidth={4} className="inline mr-3 md:mr-4"/>買い物リストへ</button>
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="space-y-6 pb-10 px-1">
            <div className="bg-white p-5 md:p-8 rounded-3xl shadow-lg border-2 border-blue-200">
              <h3 className="text-xl md:text-2xl mb-4 flex items-center gap-2 text-blue-800 font-black"><ShoppingCart size={24}/>購入先リストの編集</h3>
              <div className="text-xs text-slate-500 mb-4">※ ここで追加したお店が、アイテム編集時の候補に出ます</div>
              <div className="flex flex-wrap gap-2 mb-6">
                {shopOptions.map((shop, idx) => (
                  <div key={idx} className="bg-slate-100 px-3 py-2 rounded-xl border-2 border-slate-200 text-sm md:text-base flex items-center gap-1 font-bold">{shop}{shop !== '未設定' && <button onClick={() => deleteShop(idx)} className="text-red-600 p-1 ml-1 text-lg">×</button>}</div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 bg-blue-50 p-3 md:p-4 rounded-2xl border-2 border-blue-100">
                <input className="flex-1 p-3 md:p-4 border-4 border-white rounded-xl text-base md:text-lg font-bold" placeholder="新しいお店を追加" value={newShopName} onChange={e => setNewShopName(e.target.value)} />
                <button onClick={addShop} className="bg-blue-600 text-white py-3 md:py-0 md:px-8 rounded-xl text-base font-bold shadow-md active:scale-95">追加</button>
              </div>
            </div>

            <div className="bg-white p-5 md:p-8 rounded-3xl shadow-lg border-2 border-red-200">
               <h3 className="text-lg md:text-xl mb-4 font-bold text-red-600"><RotateCcw className="inline mr-2" size={20}/>チェック状態のリセット</h3>
               <button onClick={resetFacilityStatus} className="w-full bg-red-600 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl border-b-8 border-red-900 shadow-lg active:translate-y-2 transition-all font-bold">すべて在庫ありに戻す</button>
            </div>

            {inventoryData[selectedFacility]?.map((loc, lIdx) => (
              <div key={lIdx} className="bg-white p-5 md:p-8 rounded-3xl shadow-lg border border-slate-200">
                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-100">
                  {editingLocIndex === lIdx ? (
                    <input autoFocus className="flex-1 text-xl md:text-2xl border-b-4 border-blue-600 bg-blue-50 p-2 font-bold" defaultValue={loc.location} onBlur={e => {updateLocationName(lIdx, e.target.value); setEditingLocIndex(null);}} onKeyDown={e => e.key === 'Enter' && setEditingLocIndex(null)} />
                  ) : (
                    <div className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-all" onClick={() => setEditingLocIndex(lIdx)}>
                      <h4 className="text-xl md:text-2xl font-bold text-slate-800">{loc.location}</h4>
                      <Edit2 size={20} className="text-blue-500 opacity-40"/>
                    </div>
                  )}
                  <button onClick={() => {if(confirm('場所を削除しますか？')) setInventoryData(prev => ({...prev, [selectedFacility]: prev[selectedFacility].filter((_, i) => i !== lIdx)}))}} className="bg-red-50 text-red-600 p-2 rounded-xl ml-2"><Trash2 size={20}/></button>
                </div>
                
                <div className="space-y-4 mb-6">
                  {loc.items.map((item, iIdx) => (
                    <div key={iIdx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-200 gap-3">
                      <div className="flex-1 w-full">
                        {editingItemKey === `${lIdx}-${iIdx}` ? (
                          <div className="flex flex-col gap-3 p-3 bg-blue-50 rounded-xl border-2 border-blue-400">
                            <input autoFocus className="p-2 text-lg border-2 border-slate-300 rounded-lg font-bold" defaultValue={item.name} onBlur={e => updateItemName(lIdx, iIdx, e.target.value)} />
                            <input list="master-shop-list" className="p-2 text-lg border-2 border-slate-300 rounded-lg font-bold" defaultValue={item.shop} onBlur={e => updateItemShop(lIdx, iIdx, e.target.value)} />
                            <button onClick={() => setEditingItemKey(null)} className="bg-blue-600 text-white py-2 rounded-lg font-bold">完了</button>
                          </div>
                        ) : (
                          <div className="cursor-pointer group p-2 rounded-xl transition-all" onClick={() => setEditingItemKey(`${lIdx}-${iIdx}`)}>
                            <div className="flex items-center gap-2">
                               <div className="text-lg md:text-xl font-bold text-slate-900">{item.name}</div>
                               <Edit2 size={16} className="text-blue-500 opacity-30"/>
                            </div>
                            <div className="text-sm md:text-base text-blue-800 font-bold italic mt-1 inline-block">🛒 {item.shop}</div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => deleteItem(lIdx, iIdx)} className="self-end sm:self-center bg-white text-red-400 p-3 rounded-xl border border-red-100 shadow-sm"><X size={24} strokeWidth={4}/></button>
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 p-5 md:p-6 rounded-3xl border-2 border-blue-100">
                  <h5 className="mb-3 text-sm md:text-base italic underline text-blue-800 tracking-widest uppercase font-bold">Add New Item</h5>
                  <input className="w-full p-3 border-2 border-white rounded-xl mb-3 text-lg font-bold" placeholder="品名" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                  <div className="flex gap-2">
                    <input list="master-shop-list" className="flex-1 p-3 border-2 border-white rounded-xl text-lg bg-white font-bold" placeholder="購入先" value={newItemShop} onChange={e => setNewItemShop(e.target.value)} />
                    <button onClick={() => {
                        if(!newItemName.trim()) return;
                        const newData = JSON.parse(JSON.stringify(inventoryData));
                        newData[selectedFacility][lIdx].items.push({ name: newItemName.trim(), shop: newItemShop, quantity: 1 });
                        setInventoryData(newData);
                        setNewItemName('');
                        showToastMessage('追加しました');
                    }} className="bg-blue-700 text-white px-6 rounded-xl text-2xl active:scale-95">＋</button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border-4 border-slate-900">
               <h3 className="text-lg md:text-2xl mb-4 italic tracking-widest uppercase text-slate-900 font-bold">Add Category</h3>
               <div className="flex flex-col sm:flex-row gap-2">
                 <input className="flex-1 p-4 border-2 border-slate-100 rounded-xl text-lg font-bold bg-slate-50" placeholder="例: ベランダ" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} />
                 <button onClick={addLocation} className="bg-slate-900 text-white py-3 sm:px-8 rounded-xl text-lg font-bold active:scale-95">追加</button>
               </div>
            </div>

            <div className="pt-6">
              <button onClick={() => handleCopy(JSON.stringify({ inventoryData, inventoryState, shopOptions }, null, 2))} className="w-full bg-green-700 text-white py-6 rounded-3xl text-xl border-b-8 border-green-900 flex items-center justify-center gap-3 shadow-xl active:translate-y-2 transition-all font-bold tracking-widest uppercase"><Download size={32}/>Backup Data</button>
            </div>
          </div>
        )}
      </div>
      
      <datalist id="master-shop-list">
        {shopOptions.map(s => <option key={s} value={s} />)}
      </datalist>

      <div className="fixed bottom-0 w-full bg-white border-t-4 border-slate-300 flex p-2 shadow-2xl z-40 font-bold max-w-none">
        <button onClick={() => {setCurrentTab('checklist'); window.scrollTo(0,0);}} className={`flex-1 flex flex-col items-center p-2 rounded-xl ${currentTab === 'checklist' ? 'bg-blue-700 text-white shadow-inner' : 'text-slate-500'}`}><List size={28} strokeWidth={4}/><span className="text-xs mt-1">在庫チェック</span></button>
        <button onClick={() => {setCurrentTab('settings'); window.scrollTo(0,0);}} className={`flex-1 flex flex-col items-center p-2 rounded-xl ${currentTab === 'settings' ? 'bg-blue-700 text-white shadow-inner' : 'text-slate-500'}`}><Settings size={28} strokeWidth={4}/><span className="text-xs mt-1">管理</span></button>
      </div>
    </div>
  );
}
