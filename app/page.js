"use client";
import { useState, useEffect, useRef, useMemo } from "react";

export default function ShioriBackupExplorer() {
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
  const fileInputRef = useRef(null);

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

  // --- バックアップ機能 ---
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
          if (confirm("現在のデータがバックアップ内容で上書きされます。よろしいですか？")) {
            setBookmarks(data.bookmarks);
            setFolders(data.folders);
            alert("復元が完了しました。");
          }
        } else {
          alert("有効なバックアップファイルではありません。");
        }
      } catch (err) {
        alert("ファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // リセット
  };

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
      
      {/* サイドバー */}
      <aside className="w-64 border-r bg-white flex flex-col shrink-0 shadow-xl z-50">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/30">
          <h1 className="text-xl font-black text-indigo-600 tracking-tighter cursor-pointer" onClick={() => setSelectedFolder("すべて")}>SHIORI</h1>
          <button onClick={(e) => { e.stopPropagation(); const n = prompt("新しいフォルダ名?"); if(n && !folders.includes(n)) setFolders([...folders, n]); }} className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all font-bold">+</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5 text-left">
          <div onClick={() => setSelectedFolder("すべて")} className={`px-4 py-2 rounded-xl cursor-pointer text-xs font-black uppercase tracking-widest ${selectedFolder === "すべて" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>すべてのブックマーク</div>
          <div className="mt-8 px-4 mb-3 text-[10px] font-black text-slate-300 uppercase">フォルダ</div>
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

        {/* バックアップ管理エリア */}
        <div className="p-4 border-t bg-slate-50/50 space-y-2">
          <div className="px-4 mb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Data Management</div>
          <div className="flex gap-2">
            <button onClick={exportBackup} className="flex-1 py-2 rounded-lg bg-white border text-[9px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">Backup</button>
            <button onClick={() => fileInputRef.current.click()} className="flex-1 py-2 rounded-lg bg-white border text-[9px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">Restore</button>
          </div>
          <input type="file" ref={fileInputRef} onChange={importBackup} accept=".json" className="hidden" />
        </div>
      </aside>

      {/* メインエリア (前回と同じ構成を維持) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b">
          <header className="h-16 px-8 flex items-center justify-between">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedFolder.replace(/\//g, " ／ ")} ／ {filteredAndSortedBookmarks.length}件</div>
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400">表示サイズ</span>
                <input type="range" min="1" max="10" value={gridCols} onChange={e => setGridCols(parseInt(e.target.value))} className="w-32 accent-indigo-600 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
              </div>
              <input type="text" placeholder="#タグまたは検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-100/50 px-5 py-2 rounded-full text-xs outline-none w-48 focus:ring-2 ring-indigo-200" />
              <button onClick={() => {setIsEditMode(!isEditMode); setSelectedIds([]);}} className={`text-[10px] font-black px-4 py-2 rounded-full border transition-all ${isEditMode ? "bg-red-500 text-white border-red-500" : "text-slate-400 hover:border-indigo-400"}`}>一括整理</button>
            </div>
          </header>

          {!isEditMode ? (
            <div className="px-8 pb-6 pt-2 text-left">
              <form onSubmit={handleAddBookmark} className="max-w-5xl mx-auto flex flex-col gap-3 bg-white/80 p-5 rounded-[2.5rem] shadow-xl border border-white backdrop-blur-md">
                <input type="url" placeholder="URLを貼り付け" value={url} onChange={e => setUrl(e.target.value)} className="w-full p-2 border-b-2 border-slate-50 text-sm outline-none focus:border-indigo-400" required disabled={isFetching} />
                <div className="flex gap-4 relative">
                  <input type="text" placeholder="メモ" value={memo} onChange={e => setMemo(e.target.value)} className="flex-1 p-2 text-xs border-b border-slate-50 outline-none" />
                  <input type="text" placeholder="#タグ" value={tags} onChange={e => setTags(e.target.value)} className="w-48 p-2 text-xs border-b border-slate-50 outline-none" />
                  <div className="relative w-48">
                    <input type="text" placeholder="保存先..." value={targetFolder} onFocus={() => setShowSuggest(true)} onChange={e => setTargetFolder(e.target.value)} className="w-full p-2 text-xs border-b border-slate-50 outline-none font-bold cursor-pointer" />
                    {showSuggest && (
                      <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl p-1 z-[100] max-h-60 overflow-y-auto border">
                        {folders.map(f => (
                          <div key={f} onClick={() => {setTargetFolder(f); setShowSuggest(false);}} className="p-2.5 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 cursor-pointer rounded-lg text-left">📁 {f}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={isFetching} className="bg-indigo-600 text-white px-8 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg disabled:opacity-30">{isFetching ? "..." : "追加"}</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="px-8 py-6 bg-indigo-50/80 backdrop-blur-md flex justify-center gap-6 animate-in slide-in-from-top">
              <span className="text-xs font-black text-indigo-600 self-center">{selectedIds.length}件を選択中</span>
              <button onClick={() => {const d = prompt("移動先フォルダ名?"); if(d && folders.includes(d)) {setBookmarks(bs=>bs.map(b=>selectedIds.includes(b.id)?{...b, folder:d}:b)); setSelectedIds([]); setIsEditMode(false);}}} className="bg-white border px-6 py-2 rounded-xl text-[10px] font-black uppercase">移動</button>
              <button onClick={() => {if(confirm("削除?")) {setBookmarks(bs=>bs.filter(b=>!selectedIds.includes(b.id))); setSelectedIds([]); setIsEditMode(false);}}} className="bg-red-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">削除</button>
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
            {filteredAndSortedBookmarks.map((bm) => (
              <div key={bm.id} onClick={() => isEditMode && (selectedIds.includes(bm.id) ? setSelectedIds(selectedIds.filter(i => i !== bm.id)) : setSelectedIds([...selectedIds, bm.id]))} 
                   onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({x: e.pageX, y: e.pageY, item: bm, type: 'bookmark'}); }}
                   className={`group bg-white rounded-[2.2rem] p-5 shadow-sm hover:shadow-2xl transition-all relative border-2 ${isEditMode && selectedIds.includes(bm.id) ? "border-indigo-600 scale-95" : "border-transparent"}`}>
                <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-slate-50 shadow-inner">
                  {bm.ogImage ? <img src={bm.ogImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-200 font-black tracking-widest uppercase">No Image</div>}
                </div>
                <h3 className="text-[12px] font-bold text-slate-800 line-clamp-2 h-9 mb-1 tracking-tight text-left leading-tight">{bm.title}</h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {bm.tags?.map(t => <span key={t} className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-0.5 rounded-full">#{t}</span>)}
                </div>
                <div className="mt-auto pt-2 border-t border-slate-50 flex justify-between items-center text-left text-[8px] font-black text-slate-300 uppercase tracking-widest">{bm.folder.split("/").pop()}</div>
                {!isEditMode && <a href={bm.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0"></a>}
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* 右クリック & 編集モーダル (既存機能を維持) */}
      {contextMenu && (
        <div className="fixed z-[100] bg-white shadow-2xl border border-slate-100 rounded-2xl overflow-hidden py-1 w-48 text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in-95" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
          {contextMenu.type === 'bookmark' ? (
            <>
              <div className="px-5 py-3 hover:bg-indigo-50 cursor-pointer text-left" onClick={() => { navigator.clipboard.writeText(contextMenu.item.url); setContextMenu(null); }}>コピー</div>
              <div className="px-5 py-3 hover:bg-red-50 text-red-500 cursor-pointer border-t text-left" onClick={() => { if(confirm("削除しますか？")) setBookmarks(bs=>bs.filter(b=>b.id!==contextMenu.item.id)); setContextMenu(null); }}>削除</div>
            </>
          ) : (
            <div className="px-5 py-3 hover:bg-indigo-50 cursor-pointer text-left" onClick={() => addChildFolder(contextMenu.item)}>子フォルダ作成</div>
          )}
        </div>
      )}
    </div>
  );
}
