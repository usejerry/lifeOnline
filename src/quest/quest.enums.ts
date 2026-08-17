export enum Mood {
  RELAXED = 'relaxed',
  FRESH = 'fresh',
  ACHIEVEMENT = 'achievement',
  COMPANY = 'company',
}

export enum Scene {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  ANY = 'any',
  ONLINE = 'online',
}

/** 地点限制方式：不限地点、后台指定地点、按 POI 类型动态寻找地点。 */
export enum LocationMode {
  ANYWHERE = 'anywhere',
  FIXED = 'fixed',
  POI_TYPE = 'poi_type',
}
