export type SpawnTypeCapability = {
  supportsTrail: boolean
  supportsFill: boolean
  supports3D: boolean
}

export const spawnTypeCapabilities: Record<string, SpawnTypeCapability> = {
  Rectangle: { supportsTrail: false, supportsFill: true, supports3D: false },
  Frame: { supportsTrail: true, supportsFill: false, supports3D: false },
  FrameRectangle: { supportsTrail: true, supportsFill: false, supports3D: false },
  Ring: { supportsTrail: true, supportsFill: true, supports3D: false },
  Star: { supportsTrail: true, supportsFill: true, supports3D: false },
  Word: { supportsTrail: false, supportsFill: true, supports3D: false },
  Sphere: { supportsTrail: false, supportsFill: true, supports3D: true },
  Cone: { supportsTrail: false, supportsFill: true, supports3D: true },
  Grid: { supportsTrail: false, supportsFill: true, supports3D: false },
  Lissajous: { supportsTrail: true, supportsFill: false, supports3D: false },
  Bezier: { supportsTrail: true, supportsFill: false, supports3D: false },
  Heart: { supportsTrail: true, supportsFill: true, supports3D: false },
  Helix: { supportsTrail: false, supportsFill: false, supports3D: true },
  Spring: { supportsTrail: false, supportsFill: false, supports3D: true },
  Path: { supportsTrail: true, supportsFill: false, supports3D: true },
  Oval: { supportsTrail: true, supportsFill: true, supports3D: false },
  Polygon: { supportsTrail: true, supportsFill: true, supports3D: false },
  Arc: { supportsTrail: true, supportsFill: true, supports3D: false },
  Sector: { supportsTrail: true, supportsFill: true, supports3D: false },
}

export const getSpawnTypeCapability = (spawnType: string | undefined): SpawnTypeCapability => {
  if (!spawnType || !spawnTypeCapabilities[spawnType]) {
    return { supportsTrail: true, supportsFill: true, supports3D: false }
  }
  return spawnTypeCapabilities[spawnType]
}
