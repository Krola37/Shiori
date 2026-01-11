"use client";
import { useState, useEffect, useRef, useMemo } from "react";

export default function ShioriNetlifyExplorer() {
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
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [gridCols, setGridCols] = useState(6);
  const [sortType, setSortType] = useState("date");

  useEffect(() => {
    const savedB = localStorage.getItem("shiori-data");
    const savedF = localStorage.getItem("shiori-folders");
    if (savedB) setBookmarks(JSON.parse(savedB));
    if (savedF) setFolders(JSON.parse(savedF));
  }, []);

  useEffect(() => {
    localStorage.setItem("shiori-data", JSON.stringify(bookmarks));
    localStorage.setItem("shiori-folders", JSON.stringify(folders));
  }, [bookmarks, folders]);

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

  const addChildFolder = (parentPath) => {
    const name = prompt(`「${parentPath}」内に作成する新しいフォルダ名を入力してください。`);
    if (name && name.trim()) {
      const newPath = `${parentPath}/${name.trim()}`;
      if (folders.includes(newPath)) return alert("その名前のフォルダは既に存在します。");
      const family = folders.filter(f => f === parentPath || f.startsWith(parentPath + "/"));
      const idx = folders.indexOf(family[family.length - 1]);
      const newList = [...folders];
      newList.splice(idx + 1, 0, newPath);
      setFolders(newList);
      if (!expandedFolders.includes(parentPath)) setExpandedFolders(p => [...p, parentPath]);
    }
    setContextMenu(null);
  };

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
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans antialiased" onClick={() => { setContextMenu(null); setShowSuggest(false); }}>
      <aside className="w-64 border-r bg-white flex flex-col shrink-0 shadow-xl z-50 text-left">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/30">
          <h1 className="text-xl font-black text-indigo-600 tracking-tighter" onClick={() => setSelectedFolder("すべて")}>SHIORI</h1>
          <button onClick={(e) => { e.stopPropagation(); const n = prompt("新しいフォルダ名を入力してください。"); if(n && !folders.includes(n)) setFolders([...folders, n]); }} className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5">
          <div onClick={() => setSelectedFolder("すべて")} className={`px-4 py-2 rounded-xl cursor-pointer text-xs font-black uppercase tracking-widest ${selectedFolder === "すべて" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>すべてのブックマーク</div>
          <div className="mt-8 px-4 mb-3 text-[10px] font-black text-slate-300 uppercase">フォルダ一覧</div>
          {folders.map(f => {
            const level = f.split("/").length - 1;
            const isHidden = f.split("/").slice(0, -1).some(p => !expandedFolders.includes(f.substring(0, f.indexOf(p) + p.length)));
            if (isHidden) return null;
            return (
              <div key={f} onClick={() => setSelectedFolder(f)} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({x: e.pageX, y: e.pageY, item: f, type: 'folder'}); }}
                   className={`px-4 py-2.5 rounded-xl cursor-pointer text-sm flex items-center gap-3 transition-all ${selectedFolder === f ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-500 hover:bg-slate-50"}`}
                   style={{ marginLeft: `${level * 1.2}rem`, borderLeft: level > 0 ? '1px solid #e2e8f0' : 'none' }}>
                <span onClick={e => { e.stopPropagation(); setExpandedFolders(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]); }} className="opacity-40 font-mono text-[10px] cursor-pointer">{folders.some(c => c.startsWith(f + "/")) ? (expandedFolders.includes(f) ? "▼" : "▶") : (level > 0 ? "└" : "📁")}</span>
                <span className="truncate flex-1 tracking-tight">{f.split("/").pop()}</span>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b">
          <header className="h-16 px-8 flex items-center justify-between">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedFolder.replace(/\//g, " ／ ")} ／ {filteredAndSortedBookmarks.length}件</div>
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 tracking-tighter">表示サイズ</span>
                <input type="range" min="1" max="10" value={gridCols} onChange={e => setGridCols(parseInt(e.target.value))} className="w-32 accent-indigo-600 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="flex bg-slate-100 p-1 rounded-full border text-[9px] font-black uppercase">
                <button onClick={() => setSortType("date")} className={`px-3 py-1 rounded-full transition-all ${sortType === "date" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>日付順</button>
                <button onClick={() => setSortType("title")} className={`px-3 py-1 rounded-full transition-all ${sortType === "title" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>名前順</button>
              </div>
              <input type="text" placeholder="#タグ検索 または キーワードで検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-100/50 px-5 py-2 rounded-full text-xs outline-none w-48 focus:ring-2 ring-indigo-200 transition-all" />
              <button onClick={() => {setIsEditMode(!isEditMode); setSelectedIds([]);}} className={`text-[10px] font-black px-4 py-2 rounded-full border transition-all ${isEditMode ? "bg-red-500 text-white border-red-500 shadow-lg" : "text-slate-400 hover:border-indigo-400"}`}>
                {isEditMode ? "キャンセル" : "一括整理"}
              </button>
            </div>
          </header>

          {!isEditMode ? (
            <div className="px-8 pb-6 pt-2">
              <form onSubmit={handleAddBookmark} className="max-w-5xl mx-auto flex flex-col gap-3 bg-white/80 p-5 rounded-[2.5rem] shadow-xl border border-white backdrop-blur-md">
                <input type="url" placeholder="保存したいURLをここに貼り付け" value={url} onChange={e => setUrl(e.target.value)} className="w-full p-2 border-b-2 border-slate-50 text-sm outline-none focus:border-indigo-400" required disabled={isFetching} />
                <div className="flex gap-4 relative text-left">
                  <input type="text" placeholder="メモ（任意）" value={memo} onChange={e => setMemo(e.target.value)} className="flex-1 p-2 text-xs border-b border-slate-50 outline-none" disabled={isFetching} />
                  <input type="text" placeholder="#タグ" value={tags} onChange={e => setTags(e.target.value)} className="w-48 p-2 text-xs border-b border-slate-50 outline-none" disabled={isFetching} />
                  <div className="relative w-48">
                    <input type="text" placeholder="保存先を選択..." value={targetFolder} onFocus={() => setShowSuggest(true)} onChange={e => setTargetFolder(e.target.value)} className="w-full p-2 text-xs border-b border-slate-50 outline-none font-bold cursor-pointer" />
                    {showSuggest && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl p-1 z-[100] max-h-60 overflow-y-auto border text-left">
                        {folders.filter(f => f.toLowerCase().includes(targetFolder.toLowerCase())).map(f => (
                          <div key={f} onClick={() => {setTargetFolder(f); setShowSuggest(false);}} className="p-2.5 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 cursor-pointer rounded-lg">📁 {f}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={isFetching} className="bg-indigo-600 text-white px-8 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg disabled:opacity-30 transition-all">{isFetching ? "取得中..." : "追加する"}</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="px-8 py-6 bg-indigo-50/80 backdrop-blur-md flex justify-center gap-6 animate-in slide-in-from-top">
              <span className="text-xs font-black text-indigo-600 self-center uppercase">{selectedIds.length}件を選択中</span>
              <button onClick={() => {const d = prompt("移動先のフォルダ名を入力してください。"); if(d && folders.includes(d)) {setBookmarks(bs=>bs.map(b=>selectedIds.includes(b.id)?{...b, folder:d}:b)); setSelectedIds([]); setIsEditMode(false);}}} className="bg-white border px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm">移動</button>
              <button onClick={() => {if(confirm("削除しますか？")) {setBookmarks(bs=>bs.filter(b=>!selectedIds.includes(b.id))); setSelectedIds([]); setIsEditMode(false);}}} className="bg-red-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">削除</button>
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
            {filteredAndSortedBookmarks.map((bm) => (
              <div key={bm.id} onClick={() => isEditMode && (selectedIds.includes(bm.id) ? setSelectedIds(selectedIds.filter(i => i !== bm.id)) : setSelectedIds([...selectedIds, bm.id]))} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({x: e.pageX, y: e.pageY, item: bm, type: 'bookmark'}); }}
                   className={`group bg-white rounded-[2.2rem] p-5 shadow-sm hover:shadow-2xl transition-all relative border-2 ${isEditMode && selectedIds.includes(bm.id) ? "border-indigo-600 scale-95" : "border-transparent"}`}>
                <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-slate-50 shadow-inner">
                  {bm.ogImage ? <img src={bm.ogImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-200 font-black tracking-widest uppercase">No Image</div>}
                </div>
                <h3 className="text-[12px] font-bold text-slate-800 line-clamp-2 h-9 mb-1 tracking-tight text-left leading-tight">{bm.title}</h3>
                {bm.memo && <p className="text-[10px] text-slate-400 line-clamp-1 mb-2 italic text-left">"{bm.memo}"</p>}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {bm.tags?.map(t => <span key={t} className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-0.5 rounded-full tracking-tighter">#{t}</span>)}
                </div>
                <div className="mt-auto pt-2 border-t border-slate-50 flex justify-between items-center text-left">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{bm.folder.split("/").pop()}</span>
                </div>
                {!isEditMode && <a href={bm.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0"></a>}
              </div>
            ))}
          </div>
        </main>
      </div>

      {contextMenu && (
        <div className="fixed z-[100] bg-white shadow-2xl border border-slate-100 rounded-2xl overflow-hidden py-1 w-48 text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in-95" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
          {contextMenu.type === 'bookmark' ? (
            <>
              <div className="px-5 py-3 hover:bg-indigo-50 cursor-pointer" onClick={() => { navigator.clipboard.writeText(contextMenu.item.url); setContextMenu(null); }}>リンクをコピー</div>
              <div className="px-5 py-3 hover:bg-indigo-50 cursor-pointer" onClick={() => { setEditingBookmark(contextMenu.item); setContextMenu(null); }}>情報を編集</div>
              <div className="px-5 py-3 hover:bg-red-50 text-red-500 cursor-pointer border-t" onClick={() => { if(confirm("削除しますか？")) setBookmarks(bs=>bs.filter(b=>b.id!==contextMenu.item.id)); setContextMenu(null); }}>削除</div>
            </>
          ) : (
            <>
              <div className="px-5 py-3 hover:bg-indigo-50 cursor-pointer" onClick={() => {const n=prompt("名前変更?", contextMenu.item.split("/").pop()); if(n) { const p=contextMenu.item.substring(0, contextMenu.item.lastIndexOf("/")); const nP=p?`${p}/${n.trim()}`:n.trim(); setFolders(fs=>fs.map(f=>f===contextMenu.item?nP:f)); setBookmarks(bs=>bs.map(b=>b.folder===contextMenu.item?{...b, folder:nP}:b)); } setContextMenu(null);}}>名前変更</div>
              <div className="px-5 py-3 hover:bg-indigo-50 cursor-pointer text-indigo-600" onClick={() => addChildFolder(contextMenu.item)}>子フォルダ作成</div>
              {contextMenu.item !== "未分類" && (
                <div className="px-5 py-3 hover:bg-red-50 text-red-500 cursor-pointer border-t" onClick={() => { if(confirm("フォルダを削除しますか？")) setFolders(fs=>fs.filter(f=>f!==contextMenu.item && !f.startsWith(contextMenu.item+"/"))); setContextMenu(null); }}>削除</div>
              )}
            </>
          )}
        </div>
      )}

      {editingBookmark && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setEditingBookmark(null)}>
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-white/20 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h2 className="font-black mb-8 text-2xl tracking-tighter flex items-center gap-3">✏️ 編集</h2>
            <div className="space-y-6 text-[10px] font-black text-slate-400 uppercase text-left">
              <div>URL<input className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-100 text-sm font-medium" value={editingBookmark.url} onChange={e => setEditingBookmark({...editingBookmark, url: e.target.value})} /></div>
              <div>タイトル<input className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-100 text-sm font-medium" value={editingBookmark.title} onChange={e => setEditingBookmark({...editingBookmark, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>メモ<input className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-100 text-xs font-medium" value={editingBookmark.memo} onChange={e => setEditingBookmark({...editingBookmark, memo: e.target.value})} /></div>
                <div>タグ<input className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-100 text-xs font-medium" value={editingBookmark.tags?.join(", ")} onChange={e => setEditingBookmark({...editingBookmark, tags: e.target.value.split(",").map(t => t.trim())})} /></div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button className="flex-1 py-4 text-[10px] font-black uppercase border rounded-2xl hover:bg-slate-50 transition-all" onClick={() => setEditingBookmark(null)}>キャンセル</button>
              <button className="flex-1 py-4 text-[10px] font-black uppercase bg-indigo-600 text-white rounded-2xl shadow-xl transition-all" onClick={() => { setBookmarks(bs => bs.map(b => b.id === editingBookmark.id ? editingBookmark : b)); setEditingBookmark(null); }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
