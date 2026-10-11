import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Check, CheckCheck, ChevronRight, CircleHelp, ExternalLink, Layers3, MapPin, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Map from './Map';
import { asset, facilityTypes, STORAGE_KEY, validateLocations, venues } from './data';
import type { FacilityType, Location, VenueId } from './data';

export default function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FacilityType | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'venues' | 'facilities'>('venues');
  const [draft, setDraft] = useState<Location | null>(null);
  const [moving, setMoving] = useState<Location | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  const [message, setMessage] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const editToggleRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const modal = !!draft || !!deleteId || about;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          const parsed = validateLocations(JSON.parse(saved));
          if (active) { setLocations(parsed); setLoaded(true); }
          return;
        }
      } catch { if (active) setStorageWarning('无法读取本地备份。原有存储未改动；可导入备份恢复资料。'); }
      try {
        const response = await fetch(asset('data/locations.json'));
        if (!response.ok) throw new Error('load');
        const parsed = validateLocations(await response.json());
        if (active) setLocations(parsed);
      } catch { if (active) setStorageWarning('地图设施资料未能载入。你仍可添加设施或导入备份。'); }
      finally { if (active) setLoaded(true); }
    }
    void load();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!modal) return;
    lastFocused.current = document.activeElement as HTMLElement;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, a[href]') ?? []);
    (dialog?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === 'Escape') { setDraft(null); setDeleteId(null); setAbout(false); }
      if (e.key === 'Tab') {
        const list = focusables(), first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = original; document.removeEventListener('keydown', keydown); if (lastFocused.current?.isConnected) lastFocused.current.focus(); else editToggleRef.current?.focus(); };
  }, [modal]);

  function persist(next: Location[]) {
    setLocations(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, locations: next })); setStorageWarning(''); }
    catch { setStorageWarning('此浏览器无法保存。请下载数据备份，否则关闭页面会丢失编辑。'); }
  }
  function clearSelection() { setSelectedVenue(null); setSelectedId(null); setTypeFilter(null); setQuery(''); }
  function chooseVenue(id: VenueId) { setSelectedVenue(id); setSelectedId(null); setTypeFilter(null); setPlacing(false); setMoving(null); }
  function chooseLocation(id: string) { setSelectedId(id); setSelectedVenue(null); setPlacing(false); setMoving(null); }
  function place(x: number, y: number) {
    if (moving) { setDraft({ ...moving, x, y }); setMoving(null); setPlacing(false); return; }
    const nearest = venues.reduce((a, b) => Math.hypot(a.x - x, a.y - y) < Math.hypot(b.x - x, b.y - y) ? a : b);
    setDraft({ id: crypto.randomUUID(), type: typeFilter ?? 'locker', name: '', venueId: selectedVenue ?? nearest.id, description: '', x, y });
    setPlacing(false);
  }
  function download() {
    const blob = new Blob([JSON.stringify({ version: 1, locations }, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'tkg-locations.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('已导出设施数据；可在另一台设备导入，或保存到 GitHub。');
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('文件过大，请选择小于 2 MB 的 JSON 备份。');
      const incoming = validateLocations(JSON.parse(await file.text()));
      const merged = new globalThis.Map(locations.map(l => [l.id, l]));
      incoming.forEach(l => merged.set(l.id, l));
      const next = validateLocations({ version: 1, locations: [...merged.values()] });
      persist(next); setMessage(`已合并导入 ${incoming.length} 个设施，原有其他设施已保留。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '导入失败，原有资料已保留。'); }
    if (importRef.current) importRef.current.value = '';
  }
  const selectedLocation = locations.find(l => l.id === selectedId);
  const currentVenue = venues.find(v => v.id === (selectedLocation?.venueId ?? selectedVenue));
  const currentType = facilityTypes.find(t => t.id === typeFilter);
  const normalized = query.toLocaleLowerCase().trim();
  const visibleVenues = venues.filter(v => `${v.code} ${v.name} ${v.zh}`.toLocaleLowerCase().includes(normalized));
  const visibleLocations = locations.filter(l => {
    const v = venues.find(v => v.id === l.venueId)!;
    const t = facilityTypes.find(t => t.id === l.type)!;
    return (!typeFilter || l.type === typeFilter) && `${l.name} ${l.description} ${v.code} ${v.name} ${t.name} ${t.en}`.toLocaleLowerCase().includes(normalized);
  });
  const mapLocations = visibleLocations.filter(l => !selectedVenue || l.venueId === selectedVenue);
  const highlights: VenueId[] = currentVenue ? [currentVenue.id] : typeFilter ? [...new Set(visibleLocations.map(l => l.venueId))] : [];
  const focus = !!currentVenue || !!typeFilter;
  const currentFacilityType = facilityTypes.find(t => t.id === selectedLocation?.type);

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); clearSelection(); }} aria-label="The Kallang 工作地图首页"><span className="brand-mark">K<span>•</span></span><span className="brand-name">THE KALLANG<small>工作地图 / WORK MAP</small></span></a>
      <nav aria-label="主导航"><span className="nav-current"><MapPin size={16} /> 工作地图</span><button className="about-button" onClick={() => setAbout(true)}><CircleHelp size={16} /><span>关于地图</span></button></nav>
      <div className="header-actions"><span className="local-status"><span /> {loaded ? '本地工作空间' : '载入中'}</span><button ref={editToggleRef} className={`edit-toggle ${editing ? 'enabled' : ''}`} disabled={!loaded} aria-pressed={editing} onClick={() => { setEditing(!editing); setPlacing(false); setMoving(null); }}><Pencil size={15} />{editing ? '完成编辑' : '编辑地图'}{editing && <Check size={15} />}</button></div>
    </header>

    <div className="workspace">
      <aside className="sidebar" aria-label="地点和设施筛选">
        <div className="sidebar-top"><p className="eyebrow">YOUR PLACE, AT A GLANCE</p><h1>每个地点，<br />一眼找到<span>。</span></h1><p className="sidebar-intro">你的 The Kallang 工作地图。</p>
          <label className="search-box"><Search size={18} /><input aria-label="搜索场馆或设施" placeholder="搜索场馆、设施或位置…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="清除搜索" onClick={() => setQuery('')}><X size={14} /></button>}</label>
        </div>
        <section className="facility-section"><div className="section-label"><h2>设施标签</h2><span>点击查看位置</span></div><div className="facility-filters">{facilityTypes.map(t => <button key={t.id} aria-pressed={typeFilter === t.id} className={`facility-filter ${typeFilter === t.id ? 'active' : ''}`} style={{ '--facility-color': t.color } as React.CSSProperties} onClick={() => { setTypeFilter(typeFilter === t.id ? null : t.id); setSelectedVenue(null); setSelectedId(null); setTab('facilities'); setPlacing(false); setMoving(null); }}><img src={asset(`icons/${t.icon}`)} alt="" /><span>{t.name}</span><small>{locations.filter(l => l.type === t.id).length} 个</small></button>)}</div></section>
        {editing && <div className="editor-panel"><div className="editor-title"><span><Pencil size={13} /> 编辑模式</span><span className="editor-dot" /></div><p>{placing ? '点击地图选择位置，随后填写设施资料。' : '先选设施标签，再在地图上标记位置。'}</p><button className="add-button" aria-pressed={placing} onClick={() => { setPlacing(!placing); setMoving(null); }}>{placing ? <X size={16} /> : <Plus size={16} />}{placing ? '取消放置' : `添加${currentType?.name ?? '设施'}`}</button><div className="data-actions"><button onClick={download}><ArrowDownToLine size={14} /> 导出备份</button><button onClick={() => importRef.current?.click()}><ArrowUpFromLine size={14} /> 导入数据</button></div><input ref={importRef} className="hidden-input" type="file" accept="application/json,.json" aria-label="导入设施 JSON" onChange={e => void importFile(e.target.files?.[0])} /><small>自动保存在此浏览器。跨设备使用请导出、导入。</small></div>}
        <div className="list-tabs" role="tablist" aria-label="地点列表"><button role="tab" aria-selected={tab === 'venues'} id="venues-tab" aria-controls="place-list" onClick={() => setTab('venues')}>场馆 <span>{visibleVenues.length}</span></button><button role="tab" aria-selected={tab === 'facilities'} id="facilities-tab" aria-controls="place-list" onClick={() => setTab('facilities')}>设施 <span>{visibleLocations.length}</span></button></div>
        <div className="place-list" id="place-list" role="tabpanel" aria-labelledby={tab === 'venues' ? 'venues-tab' : 'facilities-tab'}>
          {tab === 'venues' ? visibleVenues.map(v => <button key={v.id} className={`place-item ${currentVenue?.id === v.id ? 'active' : ''}`} onClick={() => chooseVenue(v.id)}><span className="venue-swatch" style={{ background: v.color }}><MapPin size={16} /></span><span className="place-copy"><strong>{v.code}<span>{v.zh}</span></strong><small>{v.name}</small></span><ChevronRight size={15} /></button>) : visibleLocations.map(l => {
            const t = facilityTypes.find(t => t.id === l.type)!, v = venues.find(v => v.id === l.venueId)!;
            return <button key={l.id} className={`place-item ${l.id === selectedId ? 'active' : ''}`} onClick={() => chooseLocation(l.id)}><span className="facility-thumb"><img src={asset(`icons/${t.icon}`)} alt="" /></span><span className="place-copy"><strong>{l.name}</strong><small>{v.code} · {t.name}</small></span><ChevronRight size={15} /></button>;
          })}
          {((tab === 'venues' && !visibleVenues.length) || (tab === 'facilities' && !visibleLocations.length)) && <div className="empty-state"><MapPin size={26} /><strong>{query ? '没有找到这个地点' : `还没有${currentType?.name ?? '设施'}位置`}</strong><p>{query ? '试试场馆简称，例如 AQC、KTH。' : '在编辑模式中，把你知道的位置加进地图。'}</p>{!query && !editing && <button onClick={() => setEditing(true)}>开始添加 <ArrowRight size={14} /></button>}</div>}
        </div>
        <div className="sidebar-footer"><Layers3 size={17} /><span>为工作而整理。<small>让地图更简单，让地点更清楚。</small></span></div>
      </aside>

      <main className="map-workspace">
        <div className="map-topbar"><div><div className="breadcrumb">THE KALLANG <ChevronRight size={11} /> WORK MAP</div><h2>{placing ? '为你的地图添加一个地点' : currentVenue ? currentVenue.name : currentType ? `${currentType.name}在哪里？` : '探索你的工作区域'}</h2></div><button className="overview-button" onClick={clearSelection}><Layers3 size={15} /> 全部区域</button></div>
        <div className="map-frame">
          <div className="map-badges"><span className="map-badge"><span />{venues.length} 个场馆</span><span className="map-badge">{locations.length} 个设施</span>{focus && <button className="selection-badge" onClick={clearSelection}>{currentVenue?.code ?? currentType?.name}<X size={13} /></button>}</div>
          <Map highlighted={highlights} focused={focus} locations={mapLocations} selectedId={selectedId} editing={editing} placing={placing} onVenue={chooseVenue} onLocation={chooseLocation} onPlace={place} />
          {currentVenue && !placing && <section className="detail-card" aria-label="选中地点资料"><button className="detail-close" aria-label="关闭地点资料" onClick={clearSelection}><X size={16} /></button><div className="detail-category"><span style={{ background: currentFacilityType?.color ?? currentVenue.color }} />{selectedLocation ? currentFacilityType?.en : 'VENUE / 场馆'}<span className="detail-code">{currentVenue.code}</span></div><h3>{selectedLocation?.name ?? currentVenue.zh}</h3><p className="detail-english">{currentVenue.name}</p><div className="detail-divider" /><p className="detail-description"><MapPin size={17} />{selectedLocation ? selectedLocation.description || '尚未填写详细位置说明。' : currentVenue.note}</p>{selectedLocation ? editing && <div className="detail-actions"><button onClick={() => setDraft({ ...selectedLocation })}><Pencil size={14} /> 修改资料</button><button className="delete-button" onClick={() => setDeleteId(selectedLocation.id)}><Trash2 size={14} /> 删除</button></div> : <button className="venue-facilities-link" onClick={() => { setQuery(currentVenue.code); setTab('facilities'); }}>{locations.filter(l => l.venueId === currentVenue.id).length} 个已记录设施 <ArrowRight size={14} /></button>}</section>}
        </div>
        <div className="map-footer"><span><MapPin size={13} />{placing ? '点击地图放置设施' : '点击场馆查看区域 · 拖动地图移动 · 使用 + / − 缩放'}</span><button onClick={() => setAbout(true)}>地图说明 <ExternalLink size={12} /></button></div>
        {storageWarning && <div className="storage-warning" role="alert">{storageWarning}<button onClick={download}>下载当前数据</button></div>}
      </main>
    </div>
    {message && <div className="toast" role="status"><CheckCheck size={18} /><span>{message}</span><button aria-label="关闭提示" onClick={() => setMessage('')}><X size={15} /></button></div>}

    {draft && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="editor-heading"><button className="modal-close" aria-label="关闭编辑窗口" onClick={() => setDraft(null)}><X size={19} /></button><p className="eyebrow">MAKE THIS MAP YOURS</p><h2 id="editor-heading">{locations.some(l => l.id === draft.id) ? '编辑设施' : '添加一个新设施'}</h2><p className="modal-intro">标记你熟悉的位置，下次一眼就能找到。</p><form onSubmit={e => {
      e.preventDefault();
      const next = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
      if (!next.name) return;
      persist([...locations.filter(l => l.id !== next.id), next]);
      setDraft(null); setSelectedId(next.id); setSelectedVenue(null); setTypeFilter(next.type); setQuery(''); setTab('facilities'); setMessage('设施已保存。');
    }}><label>设施名称<input data-autofocus required maxLength={80} value={draft.name} placeholder="例如：AQC 一楼饮水机" onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><div className="form-row"><label>设施类型<select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as FacilityType })}>{facilityTypes.map(t => <option key={t.id} value={t.id}>{t.name} / {t.en}</option>)}</select></label><label>所属场馆<select value={draft.venueId} onChange={e => setDraft({ ...draft, venueId: e.target.value as VenueId })}>{venues.map(v => <option key={v.id} value={v.id}>{v.code} · {v.name}</option>)}</select></label></div><label>位置说明<textarea rows={3} maxLength={500} placeholder="例如：Level 1，员工入口右侧，靠近更衣室。" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label><div className="position-field"><span><CrosshairIcon /> 已标记地图位置</span><button type="button" onClick={() => { setMoving(draft); setDraft(null); setPlacing(true); }}>重新选择位置</button></div><div className="modal-actions"><button ref={cancelRef} type="button" onClick={() => setDraft(null)}>取消</button><button className="primary-button" type="submit"><Check size={16} /> 保存设施</button></div></form></section></div>}
    {deleteId && <div className="modal-backdrop"><section className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="delete-heading"><h2 id="delete-heading">删除这个设施？</h2><p>将从此浏览器的地图中移除「{locations.find(l => l.id === deleteId)?.name}」。</p><div className="modal-actions"><button data-autofocus onClick={() => setDeleteId(null)}>取消</button><button className="danger-button" onClick={() => { persist(locations.filter(l => l.id !== deleteId)); setDeleteId(null); setSelectedId(null); setMessage('设施已删除。'); }}>确认删除</button></div></section></div>}
    {about && <div className="modal-backdrop"><section className="modal about-modal" role="dialog" aria-modal="true" aria-labelledby="about-heading"><button className="modal-close" aria-label="关闭地图说明" onClick={() => setAbout(false)}><X size={19} /></button><p className="eyebrow">ABOUT YOUR WORK MAP</p><h2 id="about-heading">一张更简单的工作地图。</h2><p>根据你提供的 The Kallang 地图重绘，保留场馆、主要道路、水域与 MRT 参考，简化公交编号、停车和宣传资讯。</p><p>这是工作定位示意图，不按比例绘制。场馆名称和相对布局来自参考图；实际设施位置由你在编辑模式中记录，初版未预设未经确认的位置。</p><p>地图是独立项目。官网资料与现时场馆用途尚待核实，可前往 The Kallang 官网查看最新资讯。</p><a className="official-link" href="https://www.thekallang.com" target="_blank" rel="noreferrer">The Kallang 官方网站 <ExternalLink size={14} /></a><div className="about-storage"><strong>编辑与备份</strong><p>编辑自动保存在当前浏览器，刷新后仍可使用。不同设备暂不自动同步；通过编辑模式的导出 / 导入功能迁移数据。要在所有设备显示相同设施，可将备份存入项目的 public/data/locations.json，再重新部署。</p></div></section></div>}
  </div>;
}

function CrosshairIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" stroke="currentColor" fill="none" strokeWidth="1.8" /><path d="M12 1v5m0 12v5M1 12h5m12 0h5" stroke="currentColor" strokeWidth="1.8" /></svg>; }
