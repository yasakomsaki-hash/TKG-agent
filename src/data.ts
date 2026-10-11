import { sourcePoint } from './originalMap';

export const venues = [
  { id: 'nst', code: 'NST', name: 'National Stadium', zh: '国家体育场', color: '#d3dd99', ...sourcePoint(740, 489), note: '地图中央的大型椭圆场馆。AQC 位于西北侧，OCBC Arena 位于东侧。' },
  { id: 'aqc', code: 'AQC', name: 'OCBC Aquatic Centre', zh: '华侨银行游泳中心', color: '#83cbd1', ...sourcePoint(530, 350), note: 'National Stadium 西北侧，Kallang Wave Mall 北侧。' },
  { id: 'arena', code: 'ARENA', name: 'OCBC Arena', zh: '华侨银行体育馆', color: '#edba75', ...sourcePoint(995, 386), note: 'National Stadium 东侧；地图中上下两栋橙色建筑均属 OCBC Arena。' },
  { id: 'kth', code: 'KTH', name: 'Kallang Tennis Hub', zh: '加冷网球中心', color: '#f1d482', ...sourcePoint(1190, 885), note: '场地东南侧，Kallang Leisure Park 东侧，沿 Stadium Crescent。' },
  { id: 'sis', code: 'SIS', name: 'Singapore Indoor Stadium', zh: '新加坡室内体育馆', color: '#bcaad2', ...sourcePoint(750, 1015), note: 'National Stadium 南侧，靠近 Kallang Basin 与 Stadium Walk。' },
  { id: 'mall', code: 'KWM', name: 'Kallang Wave Mall', zh: '加冷 Wave 商场', color: '#c5b2d6', ...sourcePoint(515, 489), note: 'National Stadium 西侧和西南侧，连接 Stadium Roar 与 OCBC Square。' },
  { id: 'leisure', code: 'KLP', name: 'Kallang Leisure Park', zh: '加冷休闲公园', color: '#e4c4b1', ...sourcePoint(1040, 807), note: 'Singapore Indoor Stadium 东北侧，Kallang Tennis Hub 西侧。' },
  { id: 'football', code: 'KFH', name: 'Kallang Football Hub', zh: '加冷足球中心', color: '#a7c5b0', ...sourcePoint(1505, 549), note: '地图东侧，靠近 Stadium Boulevard 和 Stadium Crescent。' },
  { id: 'water', code: 'WSC', name: 'Water Sports Centre', zh: '水上运动中心', color: '#80bdc9', ...sourcePoint(542, 972), note: '地图西南侧，临 Kallang Basin，Singapore Indoor Stadium 西侧。' },
  { id: 'practice', code: 'KPT', name: 'Kallang Practice Track', zh: '加冷训练跑道', color: '#9fc6ad', ...sourcePoint(1195, 315), note: 'OCBC Arena 东北侧的椭圆跑道。' },
  { id: 'waca', code: 'WACA', name: 'World Aquatics Championships Arena', zh: '世界水上运动锦标赛场馆', color: '#c2c8bc', ...sourcePoint(1190, 705), note: '参考图中的场馆，位于 OCBC Arena 东南侧。现时用途尚待官网核实。' },
] as const;

export type VenueId = (typeof venues)[number]['id'];
export const facilityTypes = [
  { id: 'locker', name: '储物柜', en: 'Locker', icon: 'locker.png', color: '#e9b643' },
  { id: 'water', name: '饮水机', en: 'Water dispenser', icon: 'water-dispenser.png', color: '#269b9e' },
  { id: 'ice', name: '制冰机', en: 'Ice machine', icon: 'ice-machine.png', color: '#9472cc' },
] as const;
export type FacilityType = (typeof facilityTypes)[number]['id'];
export type Location = { id: string; type: FacilityType; name: string; venueId: VenueId; description: string; x: number; y: number; needsPositionReview?: boolean };
export const STORAGE_KEY = 'tkg-work-map.locations.v1';
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function validateLocations(input: unknown): Location[] {
  if (!input || typeof input !== 'object' || !('version' in input) || input.version !== 1 || !('locations' in input) || !Array.isArray(input.locations)) throw new Error('请选择此地图导出的 version 1 JSON 文件。');
  if (input.locations.length > 2000) throw new Error('最多支持 2000 个设施。');
  const ids = new Set<string>();
  return input.locations.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('设施资料不完整。');
    const a = item as Record<string, unknown>;
    if (typeof a.id !== 'string' || !a.id || a.id.length > 100 || ids.has(a.id) || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 80 || typeof a.description !== 'string' || a.description.length > 500 || !facilityTypes.some(t => t.id === a.type) || !venues.some(v => v.id === a.venueId) || typeof a.x !== 'number' || typeof a.y !== 'number' || !Number.isFinite(a.x) || !Number.isFinite(a.y) || a.x < 0 || a.x > 1200 || a.y < 0 || a.y > 900) throw new Error('设施类型、场馆、名称或地图坐标不正确；原有资料已保留。');
    ids.add(a.id);
    return { id: a.id, type: a.type as FacilityType, name: a.name.trim(), venueId: a.venueId as VenueId, description: a.description, x: a.x, y: a.y, ...(a.needsPositionReview === true ? { needsPositionReview: true } : {}) };
  });
}
