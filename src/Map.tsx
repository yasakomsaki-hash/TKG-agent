import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Crosshair, Minus, Plus, RotateCcw } from 'lucide-react';
import { asset, facilityTypes, venues } from './data';
import type { Location, VenueId } from './data';

type Props = {
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

function VenueShape({ id }: { id: VenueId }) {
  switch (id) {
    case 'nst': return <g transform="rotate(-25 499 359)"><ellipse cx="499" cy="359" rx="203" ry="157" /><ellipse className="stadium-ring" cx="499" cy="359" rx="175" ry="130" /><rect className="pitch" x="388" y="300" width="222" height="118" rx="6" /><path className="pitch-lines" d="M499 300v118 M388 323h35v71h-35 M610 323h-35v71h35" /><circle className="pitch-lines" cx="499" cy="359" r="24" /></g>;
    case 'aqc': return <g transform="rotate(28 295 252)"><rect x="231" y="188" width="128" height="130" rx="10" /><rect className="pool" x="248" y="205" width="94" height="63" rx="3" /><path className="pool-lines" d="M248 215h94 M248 226h94 M248 237h94 M248 248h94 M248 259h94" /><rect className="pool" x="248" y="280" width="38" height="22" rx="2" /><rect className="pool" x="297" y="280" width="45" height="22" rx="2" /></g>;
    case 'arena': return <g transform="rotate(-19 724 372)"><rect x="668" y="267" width="116" height="112" rx="9" /><rect x="670" y="398" width="114" height="95" rx="9" /><path className="building-detail" d="M684 286h83v72h-83z M685 415h83v60h-83z" /></g>;
    case 'kth': return <g transform="rotate(-23 835 681)"><rect x="740" y="610" width="200" height="154" rx="8" />{[0, 1, 2, 3, 4, 5].map(n => <g key={n} className="court" transform={`translate(${752 + (n % 3) * 62} ${623 + Math.floor(n / 3) * 69})`}><rect width="52" height="58" rx="2" /><path d="M0 29h52 M8 0v58 M44 0v58 M8 13h36 M8 45h36 M26 13v32" /></g>)}</g>;
    case 'sis': return <g transform="rotate(-24 487 741)"><path d="M412 658h148l23 139-96 57-91-61z" /><path className="building-detail" d="M426 675h120l-7 104-51 48-60-42z" /></g>;
    case 'mall': return <g><path d="M233 341l83 12-9 146 64 23 73-18 29 84-117 48-83-107z" /><path className="building-detail" d="M255 361l38 4-11 144 80 35 67-18 17 48-86 34-65-95z" /></g>;
    case 'leisure': return <g transform="rotate(-23 684 641)"><rect x="616" y="593" width="136" height="96" rx="7" /><path className="building-detail" d="M630 607h108v68H630z" /></g>;
    case 'football': return <g transform="rotate(-24 1020 406)"><rect x="934" y="294" width="177" height="225" rx="9" />{[0, 1, 2, 3].map(n => <g key={n} className="court football-court" transform={`translate(${946 + (n % 2) * 80} ${309 + Math.floor(n / 2) * 98})`}><rect width="69" height="87" rx="2" /><path d="M0 43.5h69 M19 0v14h31V0 M19 87V73h31v14" /><circle cx="34.5" cy="43.5" r="10" /></g>)}</g>;
    case 'water': return <g transform="rotate(-24 286 731)"><rect x="252" y="666" width="68" height="127" rx="32" /><ellipse className="pool" cx="286" cy="709" rx="17" ry="29" /><ellipse className="pool" cx="286" cy="763" rx="15" ry="18" /></g>;
    case 'practice': return <g transform="rotate(-22 930 227)"><rect x="875" y="143" width="111" height="168" rx="56" /><rect className="track-ring" x="888" y="156" width="85" height="142" rx="43" /><rect className="track-ring" x="899" y="167" width="63" height="120" rx="32" /></g>;
    case 'waca': return <g transform="rotate(-24 848 522)"><rect x="776" y="464" width="144" height="116" rx="5" /><path className="building-detail" d="M790 479h116v85H790z" /></g>;
  }
}

export default function Map({ highlighted, focused, locations, selectedId, editing, placing, onVenue, onLocation, onPlace }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number; moved: boolean; pointerId: number } | null>(null);
  const ignoreClick = useRef(false);
  const [view, setView] = useState({ x: 0, y: 0, w: 1200, h: 900 });
  const [isDragging, setIsDragging] = useState(false);
  function zoom(factor: number) {
    setView(v => {
      const w = Math.min(1200, Math.max(400, v.w * factor));
      const h = w * .75;
      return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
    });
  }
  function point(clientX: number, clientY: number) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
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
    d.x = e.clientX;
    d.y = e.clientY;
  }
  function pointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    ignoreClick.current = !!drag.current?.moved;
    drag.current = null;
    setIsDragging(false);
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
  }
  const clickVenue = (id: VenueId) => { if (!placing && !ignoreClick.current) onVenue(id); };
  return <div className={`map-canvas ${placing ? 'placing' : ''} ${isDragging ? 'dragging' : ''}`}>
    <div className="map-compass" aria-label="北方"><span>N</span><svg width="20" height="26" viewBox="0 0 20 26" aria-hidden="true"><path d="M10 2L3 23l7-5 7 5z" fill="#25433b" /><path d="M10 2v16l7 5z" fill="#b7c1b7" /></svg></div>
    {placing && <div className="placement-banner"><Crosshair size={16} /> 点击地图，放置新设施</div>}
    <svg ref={svgRef} className="site-map" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} aria-label="The Kallang 互动工作地图" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onClick={e => {
      if (!placing) return;
      const p = point(e.clientX, e.clientY);
      if (p && p.x >= 0 && p.x <= 1200 && p.y >= 0 && p.y <= 900) onPlace(Math.round(p.x), Math.round(p.y));
    }}>
      <defs><pattern id="mapGrid" width="45" height="45" patternUnits="userSpaceOnUse"><path d="M45 0H0v45" fill="none" stroke="#788e79" strokeOpacity=".07" /></pattern><filter id="grayscale"><feColorMatrix type="saturate" values="0" /></filter><filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity=".15" /></filter></defs>
      <g filter={focused ? 'url(#grayscale)' : undefined} className={focused ? 'muted-map' : undefined}>
        <rect width="1200" height="900" fill="#e9eddf" />
        <rect width="1200" height="900" fill="url(#mapGrid)" />
        <path d="M0 0h133L0 136z M0 347Q81 306 153 378T187 624Q192 775 416 900H0z M1200 580Q1145 690 990 805L861 900h339z" fill="#b8dce3" />
        <path d="M0 85Q113 125 124 232t96 304Q205 703 416 900 M1170 0L1100 255Q1165 432 1085 625T855 900" fill="none" stroke="#fafbf4" strokeWidth="7" />
        <g className="roads"><path d="M0 190Q190 127 406 110L774 73Q951 36 987 0 M137 145Q152 209 174 297L211 507Q235 638 381 650 M403 127Q685 98 784 176L840 333Q862 402 978 425 M750 446L904 418Q941 421 966 510L1041 692 M580 818Q750 788 925 724L1041 692Q1154 596 1200 540 M596 559L670 535Q760 512 750 446 M541 619L608 792" stroke="#fcfcf7" strokeWidth="26" /><path d="M0 190Q190 127 406 110L774 73Q951 36 987 0 M137 145Q152 209 174 297L211 507Q235 638 381 650 M403 127Q685 98 784 176L840 333Q862 402 978 425 M750 446L904 418Q941 421 966 510L1041 692 M580 818Q750 788 925 724L1041 692Q1154 596 1200 540 M596 559L670 535Q760 512 750 446 M541 619L608 792" stroke="#ccd2c3" strokeWidth="15" /></g>
        <g className="road-labels"><text x="504" y="94" transform="rotate(-6 504 94)">NICOLL HIGHWAY</text><text x="192" y="374" transform="rotate(80 192 374)">STADIUM DRIVE</text><text x="865" y="397" transform="rotate(-9 865 397)">STADIUM BOULEVARD</text><text x="613" y="706" transform="rotate(68 613 706)">STADIUM WALK</text><text x="909" y="776" transform="rotate(-23 909 776)">STADIUM CRESCENT</text></g>
        <g className="green-spaces"><path d="M581 540l87-35 15 24-88 42z M592 578l117-45 16 21-119 47z" /><path d="M438 125l40 37 60-15-35-31z M799 605l36-19 92 25-18 27z" /><circle cx="382" cy="150" r="12" /><circle cx="365" cy="163" r="9" /><circle cx="804" cy="452" r="9" /><circle cx="829" cy="448" r="12" /></g>
        {venues.map(v => <g key={v.id} className="venue-shape" style={{ fill: v.color }}><VenueShape id={v.id} /></g>)}
        <g className="landmark-labels"><text x="101" y="659" transform="rotate(-67 101 659)">KALLANG BASIN</text><text x="1120" y="805" transform="rotate(-46 1120 805)">GEYLANG RIVER</text><text x="392" y="660">OCBC SQUARE</text><text x="660" y="565" transform="rotate(-24 660 565)">STADIUM MRT</text></g>
        <g transform="translate(699 554)"><rect x="-12" y="-12" width="24" height="24" rx="6" fill="#d78787" /><text y="4" textAnchor="middle" fontSize="11" fill="white" fontWeight="700">M</text></g>
      </g>
      {highlighted.map(id => {
        const v = venues.find(v => v.id === id)!;
        return <g key={id} data-highlighted={id} className="venue-shape venue-highlight" style={{ fill: v.color }}><VenueShape id={id} /></g>;
      })}
      {venues.map(v => <g key={v.id} role="button" tabIndex={placing ? -1 : 0} aria-label={`${v.code} ${v.name}`} filter={focused && !highlighted.includes(v.id) ? 'url(#grayscale)' : undefined} opacity={focused && !highlighted.includes(v.id) ? .65 : 1} className={`venue-target ${highlighted.includes(v.id) ? 'active' : ''}`} onClick={e => { if (!placing) e.stopPropagation(); clickVenue(v.id); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickVenue(v.id); } }}>
        <title>{v.name}</title><g className="venue-hit"><VenueShape id={v.id} /></g>
        <g transform={`translate(${v.x} ${v.y})`} className="venue-label">
          <rect x="-27" y="-19" width="54" height="24" rx="7" />
          <text className="venue-code" textAnchor="middle" y="-3">{v.code}</text>
          <text className="venue-name" textAnchor="middle" y="21">{v.name.length > 23 ? v.name.split(' ').slice(0, 2).join(' ') : v.name}</text>
          {v.name.length > 23 && <text className="venue-name" textAnchor="middle" y="36">{v.name.split(' ').slice(2).join(' ')}</text>}
        </g>
      </g>)}
      {locations.map(l => {
        const type = facilityTypes.find(t => t.id === l.type)!;
        const dimmed = focused && (!highlighted.includes(l.venueId) || (selectedId !== null && selectedId !== l.id));
        return <g key={l.id} role="button" tabIndex={placing ? -1 : 0} aria-label={`${l.name}，${type.name}`} filter={dimmed ? 'url(#grayscale)' : undefined} opacity={dimmed ? .65 : 1} className={`facility-marker ${selectedId === l.id ? 'selected' : ''}`} transform={`translate(${l.x} ${l.y})`} onClick={e => { if (!placing) { e.stopPropagation(); if (!ignoreClick.current) onLocation(l.id); } }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLocation(l.id); } }}>
          <title>{l.name}</title><circle r="24" fill="white" stroke={type.color} strokeWidth={selectedId === l.id ? 4 : 2} filter="url(#markerShadow)" /><image href={asset(`icons/${type.icon}`)} x="-16" y="-18" width="32" height="36" /><text y="39" textAnchor="middle" className="marker-name">{l.name.length > 14 ? `${l.name.slice(0, 14)}…` : l.name}</text>
        </g>;
      })}
      {editing && <rect x="0" y="0" width="1200" height="900" fill="none" stroke="#be934d" strokeWidth="3" strokeDasharray="10 9" pointerEvents="none" />}
    </svg>
    <div className="zoom-controls"><button aria-label="放大地图" onClick={() => zoom(.8)} disabled={view.w <= 400}><Plus size={18} /></button><button aria-label="缩小地图" onClick={() => zoom(1.25)} disabled={view.w >= 1200}><Minus size={18} /></button><span /><button aria-label="重置地图视角" onClick={() => setView({ x: 0, y: 0, w: 1200, h: 900 })}><RotateCcw size={17} /></button></div>
    <div className="map-scale"><span />示意地图 · 非按比例</div>
    <div className="map-legend"><span><i style={{ background: '#c8d5a4' }} />场馆</span><span><i style={{ background: '#b8dce3' }} />水域</span><span><i style={{ background: '#ccd2c3' }} />道路</span></div>
  </div>;
}
