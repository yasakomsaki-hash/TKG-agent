export const venues = [
  { id: 'nst', code: 'NST', name: 'National Stadium', zh: '国家体育场', color: '#d3dd99', x: 499, y: 359, note: '地图中央的大型椭圆场馆。AQC 位于西北侧，OCBC Arena 位于东侧。' },
  { id: 'aqc', code: 'AQC', name: 'OCBC Aquatic Centre', zh: '华侨银行游泳中心', color: '#83cbd1', x: 295, y: 252, note: 'National Stadium 西北侧，Kallang Wave Mall 北侧。' },
  { id: 'arena', code: 'ARENA', name: 'OCBC Arena', zh: '华侨银行体育馆', color: '#edba75', x: 724, y: 339, note: 'National Stadium 东侧；地图中上下两栋橙色建筑均属 OCBC Arena。' },
  { id: 'kth', code: 'KTH', name: 'Kallang Tennis Hub', zh: '加冷网球中心', color: '#f1d482', x: 835, y: 681, note: '场地东南侧，Kallang Leisure Park 东侧，沿 Stadium Crescent。' },
  { id: 'sis', code: 'SIS', name: 'Singapore Indoor Stadium', zh: '新加坡室内体育馆', color: '#bcaad2', x: 487, y: 741, note: 'National Stadium 南侧，靠近 Kallang Basin 与 Stadium Walk。' },
  { id: 'mall', code: 'KWM', name: 'Kallang Wave Mall', zh: '加冷 Wave 商场', color: '#c5b2d6', x: 340, y: 464, note: 'National Stadium 西侧和西南侧，连接 Stadium Roar 与 OCBC Square。' },
  { id: 'leisure', code: 'KLP', name: 'Kallang Leisure Park', zh: '加冷休闲公园', color: '#e4c4b1', x: 684, y: 641, note: 'Singapore Indoor Stadium 东北侧，Kallang Tennis Hub 西侧。' },
  { id: 'football', code: 'KFH', name: 'Kallang Football Hub', zh: '加冷足球中心', color: '#a7c5b0', x: 1020, y: 406, note: '地图东侧，靠近 Stadium Boulevard 和 Stadium Crescent。' },
  { id: 'water', code: 'WSC', name: 'Water Sports Centre', zh: '水上运动中心', color: '#80bdc9', x: 286, y: 731, note: '地图西南侧，临 Kallang Basin，Singapore Indoor Stadium 西侧。' },
  { id: 'practice', code: 'KPT', name: 'Kallang Practice Track', zh: '加冷训练跑道', color: '#9fc6ad', x: 930, y: 227, note: 'OCBC Arena 东北侧的椭圆跑道。' },
  { id: 'waca', code: 'WACA', name: 'World Aquatics Championships Arena', zh: '世界水上运动锦标赛场馆', color: '#c2c8bc', x: 848, y: 522, note: '参考图中的场馆，位于 OCBC Arena 东南侧。现时用途尚待官网核实。' },
] as const;

export type VenueId = (typeof venues)[number]['id'];
export const facilityTypes = [
  { id: 'locker', name: '储物柜', en: 'Locker', icon: 'locker.png', color: '#e9b643' },
  { id: 'water', name: '饮水机', en: 'Water dispenser', icon: 'water-dispenser.png', color: '#269b9e' },
  { id: 'ice', name: '制冰机', en: 'Ice machine', icon: 'ice-machine.png', color: '#9472cc' },
] as const;
export type FacilityType = (typeof facilityTypes)[number]['id'];
export type Location = { id: string; type: FacilityType; name: string; venueId: VenueId; description: string; x: number; y: number };
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
    return { id: a.id, type: a.type as FacilityType, name: a.name.trim(), venueId: a.venueId as VenueId, description: a.description, x: a.x, y: a.y };
  });
}
