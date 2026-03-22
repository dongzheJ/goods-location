import React, { useState, useEffect, useMemo } from 'react';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import productsData from './data/products.json';
import initialShelves from './data/shelves.json';
import { 
  Package, 
  Map as MapIcon, 
  Edit, 
  Download, 
  Plus, 
  Trash2, 
  Layout, 
  Info,
  X,
  Sparkles
} from 'lucide-react';
import { detectColoredZones } from './utils/autoMapper';

function App() {
  const [products] = useState(productsData);
  const [shelves, setShelves] = useState(initialShelves);
  const [searchResult, setSearchResult] = useState(null);
  const [activeShelfId, setActiveShelfId] = useState(null);
  const [mappingMode, setMappingMode] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');

  const isSidebarActive = searchResult || mappingMode;

  // Helper to simplify location (e.g., 2F-BH28-07 -> B-28)
  const simplifyLocation = (loc) => {
    if (!loc) return '';
    const parts = loc.split('-');
    if (parts.length < 2) return loc;
    
    const shelfPart = parts[1]; // e.g. BH28
    // Extract first letter and digits
    const letter = shelfPart.charAt(0);
    const numbers = shelfPart.match(/\d+/);
    if (letter && numbers) {
      return `${letter}-${numbers[0]}`;
    }
    return shelfPart;
  };

  // Search logic
  const handleSearch = (query) => {
    if (!query) {
      setSearchResult(null);
      setActiveShelfId(null);
      return;
    }
    const result = products.find(p => p.id.includes(query) || p.name.toLowerCase().includes(query.toLowerCase()));
    setSearchResult(result);
    if (result) {
      // Use simplified location for shelf lookup (e.g., 2F-BH28-07 -> B-28)
      const shelfId = simplifyLocation(result.location);
      setActiveShelfId(shelfId);
    } else {
      setActiveShelfId(null);
    }
  };

  const handleMappingComplete = (shelf) => {
    const shelfName = prompt("请输入货架编号 (例如 B-28):", newShelfName) || `货架-${Date.now()}`;
    setShelves(prev => ({
      ...prev,
      [shelfName]: shelf
    }));
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(shelves, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "shelves.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const removeShelf = (id) => {
    const newShelves = { ...shelves };
    delete newShelves[id];
    setShelves(newShelves);
  };

  const handleShelfSelect = (id) => {
    if (mappingMode) {
      const newName = prompt(`将货架 "${id}" 重命名为:`, id);
      if (newName && newName !== id) {
        setShelves(prev => {
          const updated = { ...prev };
          updated[newName] = updated[id];
          delete updated[id];
          return updated;
        });
        if (activeShelfId === id) setActiveShelfId(newName);
      }
    } else {
      setActiveShelfId(id);
    }
  };

  const handleAutoMap = async () => {
    try {
      const detected = await detectColoredZones('/shelf-blueprint.jpg');
      setShelves(prev => ({ ...prev, ...detected }));
      alert(`Detected ${Object.keys(detected).length} new zones!`);
    } catch (err) {
      console.error(err);
      alert("Failed to auto-map. Check console for details.");
    }
  };

  return (
    <div className="w-full h-[100dvh] relative overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-40 flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:top-4 md:left-4 md:right-4 md:rounded-2xl bg-slate-900/80 md:bg-slate-900/60 backdrop-blur-xl border-b md:border border-slate-800 shadow-2xl pointer-events-auto">
        <div className="flex items-center justify-between w-full md:w-auto md:justify-start gap-2 md:gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-blue-600 p-1.5 md:p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <MapIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">GeoGoods <span className="hidden sm:inline text-blue-500 text-sm font-medium ml-1">货位导航系统</span></h1>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={() => setMappingMode(!mappingMode)}
              className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                mappingMode 
                ? 'bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={mappingMode ? '退出标注' : '标注模式'}
            >
              <Edit className="w-4 h-4" />
            </button>
            {mappingMode && (
              <button 
                onClick={exportData}
                className="flex items-center justify-center p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
                title="导出"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="w-full md:w-auto md:flex-1 md:max-w-md mx-auto order-last md:order-none mt-1 md:mt-0">
          <SearchBar onSearch={handleSearch} />
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => setMappingMode(!mappingMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              mappingMode 
              ? 'bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Edit className="w-4 h-4" />
            {mappingMode ? '退出标注' : '标注模式'}
          </button>
          
          {mappingMode && (
            <button 
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="absolute inset-0 z-0 w-full h-full pointer-events-auto">
        {/* Sidebar for info or mapping list */}
        <aside className={`absolute bottom-0 left-0 right-0 md:top-28 md:bottom-6 md:left-6 md:right-auto md:w-80 z-30 max-h-[45vh] md:max-h-none bg-slate-900/95 md:bg-slate-900/80 backdrop-blur-xl border-t md:border border-slate-700/50 p-4 md:p-6 flex flex-col gap-4 md:gap-6 overflow-y-auto rounded-t-3xl md:rounded-2xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.7)] md:shadow-2xl transition-all duration-500 ease-out pointer-events-auto ${isSidebarActive ? 'translate-y-0 opacity-100' : 'translate-y-[120%] md:translate-y-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto'}`}>
          {searchResult && (
            <div className="bg-slate-800/80 rounded-2xl p-5 border border-blue-500/30 shadow-xl animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-500/20 text-blue-300 rounded-md">Found</span>
              </div>
              <h3 className="text-lg font-bold mb-1">{searchResult.name}</h3>
              <p className="text-slate-400 text-sm font-mono mb-4 text-xs">SKU: {searchResult.id}</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400">目标货位</span>
                  <span className="font-bold text-blue-400 font-mono italic">{simplifyLocation(searchResult.location)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400">原始编码</span>
                  <span className="text-slate-400 text-[10px] font-mono">{searchResult.location}</span>
                </div>
              </div>
            </div>
          )}

          {!searchResult && !mappingMode && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                <Info className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-sm">在上方输入商品名称或编号即可快速定位。</p>
            </div>
          )}

          {mappingMode && (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-300 flex items-center gap-2">
                  <Layout className="w-4 h-4" /> 货架列表
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleAutoMap}
                    title="自动识别分区 (A, B, C, D)"
                    className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-all border border-blue-500/20"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">{Object.keys(shelves).length}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4 px-1">在地图上按住并拖动鼠标即可框选新货架。</p>
              <div className="space-y-2">
                {Object.entries(shelves).map(([id, s]) => (
                  <div key={id} className="group flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-300">{id}</span>
                      <span className="text-[10px] text-slate-500 font-mono italic">X:{s.x} Y:{s.y}</span>
                    </div>
                    <button 
                      onClick={() => removeShelf(id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Map View Area */}
        <div className="w-full h-full relative">
          <MapView 
            imageUrl="/shelf-blueprint.jpg" 
            width={1206} 
            height={1396} 
            shelves={shelves}
            activeShelfId={activeShelfId}
            mappingMode={mappingMode}
            onMappingComplete={handleMappingComplete}
            onShelfSelect={handleShelfSelect}
          />
          
          {/* Legend / Overlay info */}
          <div className="absolute top-36 right-4 md:top-auto md:bottom-10 md:right-10 z-20 p-3 md:p-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl md:rounded-2xl shadow-2xl flex flex-col gap-1.5 md:gap-2">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-3 h-3 rounded-full bg-blue-500/50 border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              <span className="text-slate-400">常规货架</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse"></div>
              <span className="text-slate-200 font-medium">目标货位</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
