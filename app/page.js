"use client";
import { useState, useEffect, useRef, useMemo } from "react";

export default function ShioriSidebarExplorer() {
  const [bookmarks, setBookmarks] = useState([]);
  const [folders, setFolders] = useState(["未分類", "仕事", "プロジェクト", "プライベート"]);
  const [expandedFolders, setExpandedFolders] = useState(["すべて"]);
  const [selectedFolder, setSelectedFolder] = useState("すべて");
  const [targetFolder, setTargetFolder] = useState("未分類");
  const [url, setUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [tags, setTags] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [gridCols, setGridCols] = useState(6);
  const [sortType, setSortType] = useState("date");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // サイドバー開閉ステート
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 画面幅が狭い場合は初期状態で閉じる
    if (window.innerWidth < 768) setIsSidebarOpen(false);

    const savedB = localStorage.getItem("shiori-data");
    const savedF = localStorage.getItem("shiori-folders");
    if (savedB) setBookmarks(JSON.parse(savedB));
    if (savedF) setFolders(JSON.parse(savedF));
  }, []);

  useEffect(() => {
    localStorage.setItem("shiori-data", JSON.stringify(bookmarks));
    localStorage.setItem("shiori-folders", JSON.stringify(folders));
  }, [bookmarks, folders]);

  const exportBackup = () => {
    const data = { bookmarks, folders, version: "1.0", timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shiori_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.bookmarks && data.folders) {
          if (confirm("データを上書きしますか？")) {
            setBookmarks(data.bookmarks);
            setFolders(data.folders);
            alert("復元完了。");
          }
        }
      } catch (err) { alert("読み込み失敗"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filteredAndSortedBookmarks = useMemo(() => {
    let result = bookmarks.filter(bm => {
      const folderMatch = selectedFolder === "すべて" || bm.folder === selectedFolder || bm.folder.startsWith(selectedFolder + "/");
      const searchMatch = searchQuery.startsWith("#") 
        ? bm.tags?.some(t => t.toLowerCase().includes(searchQuery.slice(1).toLowerCase()))
        : bm.title?.toLowerCase().includes(searchQuery.toLowerCase()) || bm.memo?.toLowerCase().includes(searchQuery.toLowerCase());
      return folderMatch && searchMatch;
    });
    return result.sort((a, b) => sortType === "title" ? a.title.localeCompare(b.title) : b.id - a.id);
  }, [bookmarks, selectedFolder, searchQuery, sortType]);

  const handleAddBookmark = async (e) => {
    e.preventDefault();
    if (!url || isFetching) return;
    setIsFetching(true);
    let title = url; let ogImage = null;
    try {
      const res = await fetch(`/api/getTitle?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        title = data.title || url; ogImage = data.ogImage || null;
      }
    } finally {
      const newBm = { id: Date.now(), url, title, ogImage, memo, tags: tags.split(/[,、\s]+/).filter(t => t), folder: targetFolder, date: new Date().toLocaleDateString() };
      setBookmarks(prev => [newBm, ...prev]);
      setUrl(""); setMemo(""); setTags(""); setIsFetching(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans antialiased text-left" onClick={() => { setContextMenu(null); setShowSuggest(false); }}>
      
      {/* スマホ用背景オーバーレイ (サイドバーが開いている時のみ) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* 1. Sidebar: アニメーション付き */}
      <aside className={`fixed md:relative h-full border-r bg-white flex flex-col shrink-0 shadow-xl z-[70] transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden border-none"}`}>
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/30 min-w-[256px]">
          <h1 className="text-xl font-black text-indigo-600 tracking-tighter cursor-pointer" onClick={() => setSelectedFolder("すべて")}>SHIORI</h1>
          <button onClick={(e) => { e.stopPropagation(); const n = prompt("名?"); if(n && !folders.includes(n)) setFolders([...folders, n]); }} className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all font-bold">+</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5 min-w-[256px]">
          <div onClick={() => { setSelectedFolder("すべて"); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`px-4 py-2 rounded-xl cursor-pointer text-xs font-black uppercase tracking-widest ${selectedFolder === "すべて" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>すべてのブックマーク</div>
          <div className="mt-8 px-4 mb-3 text-[10px] font-black text-slate-300 uppercase">フォルダ</div>
          {folders.map(f => {
            const level = f.split("/").length - 1;
            const isHidden = f.split("/").slice(0, -1).some(p => !expandedFolders.includes(f.substring(0, f.indexOf(p) + p.length)));
            if (isHidden) return null;
            return (
              <div key={f} onClick={() => { setSelectedFolder(f); if(window.innerWidth < 768) setIsSidebarOpen(false); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({x: e.pageX, y: e.pageY, item: f, type: 'folder'}); }}
                   className={`px-4 py-2.5 rounded-xl cursor-pointer text-sm flex items-center gap-3 transition-all ${selectedFolder === f ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-500 hover:bg-slate-50"}`}
                   style={{ marginLeft: `${level * 0.8}rem`, borderLeft: level > 0 ? '1px solid #e2e8f0' : 'none' }}>
                <span onClick={e => { e.stopPropagation(); setExpandedFolders(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]); }} className="opacity-40 font-mono text-[10px] cursor-pointer">{folders.some(c => c.startsWith(f + "/")) ? (expandedFolders.includes(f) ? "▼" : "▶") : (level > 0 ? "└" : "📁")}</span>
                <span className="truncate flex-1">{f.split("/").pop()}</span>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t bg-slate-50/50 space-y-2 min-w-[256px]">
          <div className="flex gap-2">
            <button onClick={exportBackup} className="flex-1 py-2 rounded-lg bg-white border text-[9px] font-black uppercase hover:bg-indigo-50 transition-all shadow-sm">Backup</button>
            <button onClick={() => fileInputRef.current.click()} className="flex-1 py-2 rounded-lg bg-white border text-[9px] font-black uppercase hover:bg-indigo-50 transition-all shadow-sm">Restore</button>
          </div>
          <input type="file" ref={fileInputRef} onChange={importBackup} accept=".json" className="hidden" />
        </div>
      </aside>

      {/* 2. Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b px-4 md:px-8">
          <header className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* ハンバーバーボタン */}
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <div className="hidden sm:block text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{selectedFolder.replace(/\//g, " / ")}</div>
            </div>

            <div className="flex-1 flex gap-2 md:gap-6 items-center justify-end">
              <div className="hidden md:flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400">列数</span>
                <input type="range" min="1" max="10" value={gridCols} onChange={e => setGridCols(parseInt(e.target.value))} className="w-24 accent-indigo-600 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
              </div>
              <input type="text" placeholder="検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-100/50 px-4 md:px-5 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs outline-none flex-1 max-w-[120px] md:max-w-[200px] focus:ring-2 ring-indigo-200" />
              <button onClick={() => {setIsEditMode(!isEditMode); setSelectedIds([]);}} className={`text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1.5 md:py-2 rounded-full border transition-all ${isEditMode ? "bg-red-500 text-white border-red-500 shadow-lg" : "text-slate-400"}`}>整理</button>
            </div>
          </header>

          {!isEditMode ? (
            <div className="pb-4 md:pb-6 pt-2 px-4 md:px-0">
              <form onSubmit={handleAddBookmark} className="max-w-5xl mx-auto flex flex-col gap-2 md:gap-3 bg-white/80 p-3 md:p-5 rounded-2xl md:rounded-[2.5rem] shadow-xl border border-white backdrop-blur-md">
                <input type="url" placeholder="URLを貼り付け" value={url} onChange={e => setUrl(e.target.value)} className="w-full p-1.5 border-b border-slate-50 text-xs md:text-sm outline-none focus:border-indigo-400" required disabled={isFetching} />
                <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-4 relative">
                  <input type="text" placeholder="メモ" value={memo} onChange={e => setMemo(e.target.value)} className="flex-1 min-w-[120px] p-1.5 text-[10px] md:text-xs border-b border-slate-50 outline-none" />
                  <input type="text" placeholder="#タグ" value={tags} onChange={e => setTags(e.target.value)} className="w-24 md:w-32 p-1.5 text-[10px] md:text-xs border-b border-slate-50 outline-none" />
                  <div className="relative flex-1 min-w-[120px]">
                    <input type="text" placeholder="保存先..." value={targetFolder} onFocus={() => setShowSuggest(true)} onChange={e => setTargetFolder(e.target.value)} className="w-full p-1.5 text-[10px] md:text-xs border-b border-slate-50 outline-none font-bold" />
                    {showSuggest && (
                      <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-2xl p-1 z-[100] max-h-40 overflow-y-auto border">
                        {folders.map(f => (
                          <div key={f} onClick={() => {setTargetFolder(f); setShowSuggest(false);}} className="p-2 text-[9px] md:text-[10px] font-bold text-slate-600 hover:bg-indigo-50 cursor-pointer rounded">📁 {f}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={isFetching} className="w-full md:w-auto bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-30 transition-all">{isFetching ? "..." : "追加"}</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="py-4 md:py-6 bg-indigo-50/80 flex justify-center gap-4">
              <span className="text-[10px] font-black text-indigo-600 self-center">{selectedIds.length}件選択</span>
              <button onClick={() => {const d = prompt("移動先?"); if(d && folders.includes(d)) {setBookmarks(bs=>bs.map(b=>selectedIds.includes(b.id)?{...b, folder:d}:b)); setSelectedIds([]); setIsEditMode(false);}}} className="bg-white border px-4 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm">移動</button>
              <button onClick={() => {if(confirm("削除?")) {setBookmarks(bs=>bs.filter(b=>!selectedIds.includes(b.id))); setSelectedIds([]); setIsEditMode(false);}}} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg">削除</button>
            </div>
          )}
        </div>

        {/* 3. Bookmark Grid: レスポンシブロジック維持 */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="grid gap-4 md:gap-8" 
               style={{ gridTemplateColumns: `repeat(var(--cols, ${gridCols}), minmax(0, 1fr))` }}>
            <style jsx>{`
              div { --cols: 1; }
              @media (min-width: 768px) { div { --cols: ${gridCols}; } }
            `}</style>
            
            {filteredAndSortedBookmarks.map((bm) => (
              <div key={bm.id} 
                   onClick={() => isEditMode && (selectedIds.includes(bm.id) ? setSelectedIds(selectedIds.filter(i => i !== bm.id)) : setSelectedIds([...selectedIds, bm.id]))} 
                   onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({x: e.pageX, y: e.pageY, item: bm, type: 'bookmark'}); }}
                   className={`group bg-white rounded-2xl md:rounded-[2.2rem] p-3 md:p-5 shadow-sm hover:shadow-xl transition-all relative border-2 flex md:flex-col gap-3 md:gap-0 ${isEditMode && selectedIds.includes(bm.id) ? "border-indigo-600 scale-95" : "border-transparent"}`}>
                
                <div className="w-20 h-14 md:w-full md:h-auto md:aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-50 shrink-0 shadow-inner">
                  {bm.ogImage ? <img src={bm.ogImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-200 font-black uppercase">No Image</div>}
                </div>
                
                <div className="flex-1 flex flex-col justify-center md:mt-4 overflow-hidden text-left">
                  <h3 className="text-[11px] md:text-[12px] font-bold text-slate-800 line-clamp-1 md:line-clamp-2 leading-tight tracking-tight">{bm.title}</h3>
                  {bm.memo && <p className="text-[9px] md:text-[10px] text-slate-400 line-clamp-1 italic mt-1">"{bm.memo}"</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {bm.tags?.map(t => <span key={t} className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">#{t}</span>)}
                  </div>
                </div>

                {!isEditMode && <a href={bm.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0"></a>}
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* ポップアップ類 */}
      {contextMenu && (
        <div className="fixed z-[100] bg-white shadow-2xl border border-slate-100 rounded-xl overflow-hidden py-1 w-40 md:w-48 text-[10px] font-black uppercase tracking-widest animate-in fade-in" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
          {contextMenu.type === 'bookmark' ? (
            <div className="px-5 py-3 hover:bg-red-50 text-red-500 cursor-pointer" onClick={() => { if(confirm("削除?")) setBookmarks(bs=>bs.filter(b=>b.id!==contextMenu.item.id)); setContextMenu(null); }}>削除</div>
          ) : (
            <div className="px-5 py-3 hover:bg-indigo-50 cursor-pointer text-indigo-600" onClick={() => { const n=prompt("子フォルダ名?"); if(n) { const nP=`${contextMenu.item}/${n.trim()}`; setFolders([...folders, nP]); } setContextMenu(null); }}>子フォルダ追加</div>
          )}
        </div>
      )}
    </div>
  );
}
