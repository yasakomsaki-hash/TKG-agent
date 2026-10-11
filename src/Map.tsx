import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Crosshair, ImagePlus, Minus, Plus, RotateCcw } from 'lucide-react';
import { asset, facilityTypes, venues } from './data';
import type { Location, VenueId } from './data';
import { MAP_OFFSET_Y, MAP_SCALE, SOURCE_HEIGHT, SOURCE_WIDTH, mapTransform, venueOutlines } from './originalMap';

type Props = {
  src: string | null;
  loading: boolean;
  onChooseImage: () => void;
  highlighted: VenueId[];
  focused: boolean;
  locations: Location[];
  selectedId: string | null;
  editing: boolean;
  placing: boolean;
  onVenue: (id: VenueId) => void;
  onLocation: (id: string) => void;
  onPlace: (x: number, y: number) => void;
};

export default function Map({ src, loading, onChooseImage, highlighted, focused, locations, selectedId, editing, placing, onVenue, onLocation, onPlace }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number; moved: boolean; pointerId: number } | null>(null);
  const ignoreClick = useRef(false);
  const [view, setView] = useState({ x: 0, y: 0, w: 1200, h: 900 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setImageFailed(false); }, [src]);
  const hasImage = !!src && !imageFailed;

  function zoom(factor: number) {
    setView(v => {
      const w = Math.min(1200, Math.max(180, v.w * factor));
      const h = w * .75;
      return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
    });
  }
  function point(clientX: number, clientY: number) {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  }
  function pointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0 || placing) return;
    drag.current = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false, pointerId: e.pointerId };
    ignoreClick.current = false;
  }
  function pointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5 && !d.moved) return;
    d.moved = true;
    setIsDragging(true);
    svgRef.current?.setPointerCapture(e.pointerId);
    const start = point(d.x, d.y), end = point(e.clientX, e.clientY);
    if (start && end) setView(v => ({ ...v, x: v.x + start.x - end.x, y: v.y + start.y - end.y }));
    d.x = e.clientX; d.y = e.clientY;
  }
  function pointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    ignoreClick.current = !!drag.current?.moved;
    drag.current = null;
    setIsDragging(false);
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
  }
  function clickVenue(id: VenueId) { if (!placing && !ignoreClick.current) onVenue(id); }

  return <div className={`map-canvas original-map-canvas ${placing ? 'placing' : ''} ${isDragging ? 'dragging' : ''}`}>
    {!hasImage ? <div className="original-map-empty">
      <ImagePlus size={38} strokeWidth={1.2} />
      <h3>{loading ? '正在读取原图…' : imageFailed ? '原图未能加载' : '选择你的原本地图'}</h3>
      <p>直接使用完整地图图片，保留原有布局、场馆和文字。</p>
      <button className="primary-button" disabled={loading} onClick={onChooseImage}><ImagePlus size={17} /> 选择原图</button>
      <small>支持 JPG、PNG、WebP；选择后自动保存在此浏览器。</small>
      <a href="https://github.com/yasakomsaki-hash/TKG-agent/upload/main/public/maps" target="_blank" rel="noreferrer">上传原图到 GitHub，供所有设备使用 ↗</a>
    </div> : <>
      {placing && <div className="placement-banner"><Crosshair size={16} /> 点击原图，放置新设施</div>}
      <svg ref={svgRef} className="site-map" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} aria-label="The Kallang 原图互动工作地图" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onClick={e => {
        if (!placing) return;
        const p = point(e.clientX, e.clientY);
        if (p && p.x >= 0 && p.x <= 1200 && p.y >= MAP_OFFSET_Y && p.y <= MAP_OFFSET_Y + SOURCE_HEIGHT * MAP_SCALE) onPlace(Math.round(p.x), Math.round(p.y));
      }}>
        <defs>
          <filter id="grayscale"><feColorMatrix type="saturate" values="0" /></filter>
          <filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity=".15" /></filter>
          {venues.map(v => <clipPath id={`original-clip-${v.id}`} key={v.id} clipPathUnits="userSpaceOnUse"><path d={venueOutlines[v.id]} /></clipPath>)}
        </defs>
        <g transform={mapTransform}>
          <g filter={focused ? 'url(#grayscale)' : undefined} className={focused ? 'muted-map' : undefined}>
            <image data-original-map="true" href={src!} x="0" y="0" width={SOURCE_WIDTH} height={SOURCE_HEIGHT} preserveAspectRatio="xMidYMid meet" onError={() => setImageFailed(true)} pointerEvents="none" />
          </g>
          {highlighted.map(id => <g key={id} data-highlighted={id} pointerEvents="none">
            <image href={src!} x="0" y="0" width={SOURCE_WIDTH} height={SOURCE_HEIGHT} preserveAspectRatio="xMidYMid meet" clipPath={`url(#original-clip-${id})`} />
            <path d={venueOutlines[id]} className="original-highlight-outline" />
          </g>)}
          {venues.map(v => <path key={v.id} d={venueOutlines[v.id]} role="button" tabIndex={placing ? -1 : 0} aria-label={`${v.code} ${v.name}`} className="original-venue-target" onClick={e => { if (!placing) e.stopPropagation(); clickVenue(v.id); }} onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickVenue(v.id); }
          }}><title>{v.name}</title></path>)}
        </g>
        {locations.map(l => {
          const type = facilityTypes.find(t => t.id === l.type)!;
          const dimmed = focused && (!highlighted.includes(l.venueId) || (selectedId !== null && selectedId !== l.id));
          return <g key={l.id} role="button" tabIndex={placing ? -1 : 0} aria-label={`${l.name}，${type.name}`} filter={dimmed ? 'url(#grayscale)' : undefined} opacity={dimmed ? .65 : 1} className={`facility-marker ${selectedId === l.id ? 'selected' : ''}`} transform={`translate(${l.x} ${l.y})`} onClick={e => { if (!placing) { e.stopPropagation(); if (!ignoreClick.current) onLocation(l.id); } }} onKeyDown={e => { if (!placing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onLocation(l.id); } }}>
            <title>{l.name}</title><circle r="24" fill="white" stroke={type.color} strokeWidth={selectedId === l.id ? 4 : 2} filter="url(#markerShadow)" /><image href={asset(`icons/${type.icon}`)} x="-16" y="-18" width="32" height="36" /><text y="39" textAnchor="middle" className="marker-name">{l.name.length > 14 ? `${l.name.slice(0, 14)}…` : l.name}</text>
          </g>;
        })}
        {editing && <rect x="0" y={MAP_OFFSET_Y} width="1200" height={SOURCE_HEIGHT * MAP_SCALE} fill="none" stroke="#be934d" strokeWidth="3" strokeDasharray="10 9" pointerEvents="none" />}
      </svg>
      <div className="zoom-controls"><button aria-label="放大地图" onClick={() => zoom(.8)} disabled={view.w <= 180}><Plus size={18} /></button><button aria-label="缩小地图" onClick={() => zoom(1.25)} disabled={view.w >= 1200}><Minus size={18} /></button><span /><button aria-label="重置地图视角" onClick={() => setView({ x: 0, y: 0, w: 1200, h: 900 })}><RotateCcw size={17} /></button></div>
      <div className="original-map-caption">原图底图 · 设施标记为独立图层</div>
    </>}
  </div>;
}
