import Behaviour from './Behaviour'
import BehaviourNames from './BehaviourNames'
import Particle from '../Particle'
import type { Graphics } from 'pixi.js'
import { createNoise3D } from 'simplex-noise'

type ShapeType =
  | 'cube'
  | 'sphere'
  | 'pyramid'
  | 'torus'
  | 'cylinder'
  | 'tetrahedron'
  | 'octahedron'
  | 'grid'
  | 'lattice'
  | 'custom'

interface Vec3 {
  x: number
  y: number
  z: number
}

interface WireframeItem {
  shapeType: ShapeType
  size: number
  lineColor: number
  lineWidth: number
  rotationSpeedX: number
  rotationSpeedY: number
  rotationSpeedZ: number
  offsetX: number
  offsetY: number
  offsetZ: number
}

export default class Wireframe3DBehaviour extends Behaviour {
  enabled = false
  priority = 50

  shapeType: ShapeType = 'cube'
  size = 100
  rotationSpeedX = 0.5
  rotationSpeedY = 0.3
  rotationSpeedZ = 0.2
  lineColor = 0xffffff
  lineWidth = 1
  perspective = 400
  cameraZ = 500

  /** Depth: 'none' | 'fade' | 'thickness' | 'both' */
  depthStyle: string = 'none'
  sortByDepth = false

  orbitEnabled = false
  orbitRadius = 50
  orbitSpeed = 1

  pulsateEnabled = false
  pulsateMin = 80
  pulsateMax = 120
  pulsateSpeed = 2

  pathType: string = 'none'
  pathSpeed = 1
  pathScale = 50

  dashedEnabled = false
  dashLength = 10
  gapLength = 5

  colorOverTimeEnabled = false
  colorOverTimeSpeed = 1
  perVertexColor = false

  noiseWobbleEnabled = false
  noiseWobbleAmount = 10
  noiseWobbleSpeed = 1

  attractParticlesEnabled = false
  attractStrength = 0.5

  latticeSegmentsX = 4
  latticeSegmentsY = 4
  latticeSegmentsZ = 4
  gridSegments = 8
  torusInnerRadius = 0.4
  cylinderHeight = 1

  customVertices: { x: number; y: number; z: number }[] = []
  customEdges: number[] = []

  wireframes: WireframeItem[] = []

  private _rotationX = 0
  private _rotationY = 0
  private _rotationZ = 0
  private _time = 0
  private _noise3D: ((x: number, y: number, z: number) => number) | null = null

  init = () => {
    //
  }

  apply = (particle: Particle, _deltaTime: number) => {
    if (!this.enabled || !this.attractParticlesEnabled || this.attractStrength === 0) return
    const dx = -particle.movement.x
    const dy = -particle.movement.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const pull = Math.min(this.attractStrength / dist, 1)
    particle.acceleration.x += (dx / dist) * pull * 100
    particle.acceleration.y += (dy / dist) * pull * 100
  }

  draw(graphics: Graphics, deltaTime: number): void {
    if (!this.enabled) return

    graphics.clear()

    this._time += deltaTime
    this._rotationX += deltaTime * this.rotationSpeedX
    this._rotationY += deltaTime * this.rotationSpeedY
    this._rotationZ += deltaTime * this.rotationSpeedZ

    const offsetX = this.getPathOffsetX()
    const offsetY = this.getPathOffsetY()
    const orbitOffset = this.getOrbitOffset()
    const currentSize = this.getPulsateSize()
    const currentColor = this.getColorOverTime()

    if (this.wireframes && this.wireframes.length > 0) {
      for (let i = 0; i < this.wireframes.length; i++) {
        const w = this.wireframes[i]
        const itemSize = w.size
        const { vertices, edges } = this.getShapeDataForType(w.shapeType, itemSize, w.offsetX, w.offsetY, w.offsetZ)
        this.drawWireframe(
          graphics,
          vertices,
          edges,
          offsetX + orbitOffset.x,
          offsetY + orbitOffset.y,
          currentColor !== null ? currentColor : w.lineColor,
          w.lineWidth,
          this._rotationX,
          this._rotationY,
          this._rotationZ,
          i,
        )
      }
    } else {
      const { vertices, edges } = this.getShapeData()
      this.drawWireframe(
        graphics,
        vertices,
        edges,
        offsetX + orbitOffset.x,
        offsetY + orbitOffset.y,
        currentColor !== null ? currentColor : this.lineColor,
        this.lineWidth,
        this._rotationX,
        this._rotationY,
        this._rotationZ,
        0,
      )
    }
  }

  private getOrbitOffset(): { x: number; y: number } {
    if (!this.orbitEnabled) return { x: 0, y: 0 }
    const t = this._time * this.orbitSpeed
    return {
      x: Math.cos(t) * this.orbitRadius,
      y: Math.sin(t) * this.orbitRadius,
    }
  }

  private getPathOffsetX(): number {
    if (this.pathType === 'none') return 0
    const t = this._time * this.pathSpeed
    const s = this.pathScale
    if (this.pathType === 'circle') return Math.cos(t) * s
    if (this.pathType === 'lissajous') return Math.sin(t * 2) * s
    if (this.pathType === 'figure8') return Math.sin(t) * s
    return 0
  }

  private getPathOffsetY(): number {
    if (this.pathType === 'none') return 0
    const t = this._time * this.pathSpeed
    const s = this.pathScale
    if (this.pathType === 'circle') return Math.sin(t) * s
    if (this.pathType === 'lissajous') return Math.sin(t * 3) * s
    if (this.pathType === 'figure8') return Math.sin(t * 2) * s * 0.5
    return 0
  }

  private getPulsateSize(): number {
    if (!this.pulsateEnabled) return this.size
    const t = this._time * this.pulsateSpeed
    const range = (this.pulsateMax - this.pulsateMin) / 2
    const mid = (this.pulsateMax + this.pulsateMin) / 2
    return mid + Math.sin(t) * range
  }

  private getColorOverTime(): number | null {
    if (!this.colorOverTimeEnabled) return null
    const hue = ((this._time * this.colorOverTimeSpeed * 0.1) % 1) * 360
    return this.hslToHex(hue, 1, 0.5)
  }

  private hslToHex(h: number, s: number, l: number): number {
    h = h / 360
    // tslint:disable-next-line:one-variable-per-declaration
    let r: number, g: number, b: number
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }
    // tslint:disable-next-line:no-bitwise
    return ((Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255)) >>> 0
  }

  private getNoise3D(): (x: number, y: number, z: number) => number {
    if (!this._noise3D) this._noise3D = createNoise3D()
    return this._noise3D
  }

  private applyNoiseWobble(vertices: Vec3[]): Vec3[] {
    if (!this.noiseWobbleEnabled || this.noiseWobbleAmount === 0) return vertices
    const noise = this.getNoise3D()
    const scale = 0.01
    const t = this._time * this.noiseWobbleSpeed
    return vertices.map((v, i) => ({
      x: v.x + noise(v.x * scale, v.y * scale, t + i * 0.1) * this.noiseWobbleAmount,
      y: v.y + noise(v.y * scale, v.z * scale, t + i * 0.1 + 10) * this.noiseWobbleAmount,
      z: v.z + noise(v.z * scale, v.x * scale, t + i * 0.1 + 20) * this.noiseWobbleAmount,
    }))
  }

  private drawWireframe(
    graphics: Graphics,
    vertices: Vec3[],
    edges: number[],
    offsetX: number,
    offsetY: number,
    lineColor: number,
    lineWidth: number,
    rotX: number,
    rotY: number,
    rotZ: number,
    _itemIndex: number,
  ): void {
    const verts = this.applyNoiseWobble(vertices)
    const rotated = verts.map((v) => this.rotateVertex(v, rotX, rotY, rotZ))
    const projected = rotated.map((v) => this.project(v))
    const viewZ = this.cameraZ

    type EdgeWithDepth = { a: number; b: number; depth: number }
    const edgeList: EdgeWithDepth[] = []
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i]
      const b = edges[i + 1]
      const va = rotated[a]
      const vb = rotated[b]
      if (!va || !vb) continue
      const midZ = (va.z + vb.z) / 2 + viewZ
      edgeList.push({ a, b, depth: midZ })
    }

    if (this.sortByDepth) {
      edgeList.sort((e1, e2) => e2.depth - e1.depth)
    }

    const minDepth = edgeList.length > 0 ? Math.min(...edgeList.map((e) => e.depth)) : viewZ
    const maxDepth = edgeList.length > 0 ? Math.max(...edgeList.map((e) => e.depth)) : viewZ
    const depthRange = Math.max(maxDepth - minDepth, 1)

    graphics.lineStyle(lineWidth, lineColor, 1)

    for (let i = 0; i < edgeList.length; i++) {
      const { a, b, depth } = edgeList[i]
      const pa = projected[a]
      const pb = projected[b]
      if (!pa || !pb) continue

      const depthNorm = Math.max(0, Math.min(1, 1 - (depth - minDepth) / depthRange))
      let alpha = 1
      let width = lineWidth
      if (this.depthStyle === 'fade' || this.depthStyle === 'both') {
        alpha = 0.3 + 0.7 * depthNorm
      }
      if (this.depthStyle === 'thickness' || this.depthStyle === 'both') {
        width = lineWidth * (0.5 + 0.5 * depthNorm)
      }
      if (this.perVertexColor) {
        const za = Math.max(0, Math.min(1, 1 - (rotated[a].z + viewZ - minDepth) / depthRange))
        const zb = Math.max(0, Math.min(1, 1 - (rotated[b].z + viewZ - minDepth) / depthRange))
        alpha = 0.4 + 0.6 * ((za + zb) / 2)
      }

      const x1 = pa.x + offsetX
      const y1 = pa.y + offsetY
      const x2 = pb.x + offsetX
      const y2 = pb.y + offsetY

      graphics.lineStyle(width, lineColor, alpha)

      if (this.dashedEnabled && this.dashLength > 0) {
        this.drawDashedLine(graphics, x1, y1, x2, y2)
      } else {
        graphics.moveTo(x1, y1)
        graphics.lineTo(x2, y2)
      }
    }
  }

  private drawDashedLine(graphics: Graphics, x1: number, y1: number, x2: number, y2: number): void {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / len
    const uy = dy / len
    const total = this.dashLength + this.gapLength
    let d = 0
    let drawing = true
    let segStartX = x1
    let segStartY = y1
    while (d < len) {
      const step = drawing ? Math.min(this.dashLength, len - d) : Math.min(this.gapLength, len - d)
      d += step
      const nx = x1 + ux * d
      const ny = y1 + uy * d
      if (drawing) {
        graphics.moveTo(segStartX, segStartY)
        graphics.lineTo(nx, ny)
      } else {
        segStartX = nx
        segStartY = ny
      }
      drawing = !drawing
    }
  }

  private rotateVertex(v: Vec3, rotX?: number, rotY?: number, rotZ?: number): Vec3 {
    const rx = rotX ?? this._rotationX
    const ry = rotY ?? this._rotationY
    const rz = rotZ ?? this._rotationZ
    let { x, y, z } = v
    const cx = Math.cos(rx)
    const sx = Math.sin(rx)
    const cy = Math.cos(ry)
    const sy = Math.sin(ry)
    const cz = Math.cos(rz)
    const sz = Math.sin(rz)
    let t = y * cx - z * sx
    z = y * sx + z * cx
    y = t
    t = x * cy + z * sy
    z = -x * sy + z * cy
    x = t
    t = x * cz - y * sz
    y = x * sz + y * cz
    x = t
    return { x, y, z }
  }

  private project(v: Vec3): { x: number; y: number } | null {
    const z = v.z + this.cameraZ
    if (z <= 0) return null
    if (this.perspective <= 0) return { x: v.x, y: v.y }
    const f = this.perspective / z
    return { x: v.x * f, y: v.y * f }
  }

  private getShapeData(): { vertices: Vec3[]; edges: number[] } {
    const s = this.wireframes.length > 0 ? this.size : this.getPulsateSize()
    return this.getShapeDataForType(this.shapeType, s, 0, 0, 0)
  }

  private getShapeDataForType(
    shape: ShapeType,
    s: number,
    ox: number,
    oy: number,
    oz: number,
  ): { vertices: Vec3[]; edges: number[] } {
    const add = (v: Vec3) => ({ x: v.x + ox, y: v.y + oy, z: v.z + oz })
    const valid =
      shape === 'sphere' ||
      shape === 'pyramid' ||
      shape === 'torus' ||
      shape === 'cylinder' ||
      shape === 'tetrahedron' ||
      shape === 'octahedron' ||
      shape === 'grid' ||
      shape === 'lattice' ||
      shape === 'custom'
        ? shape
        : 'cube'

    switch (valid) {
      case 'cube': {
        const h = s / 2
        const vertices: Vec3[] = [
          { x: -h, y: -h, z: -h },
          { x: h, y: -h, z: -h },
          { x: h, y: h, z: -h },
          { x: -h, y: h, z: -h },
          { x: -h, y: -h, z: h },
          { x: h, y: -h, z: h },
          { x: h, y: h, z: h },
          { x: -h, y: h, z: h },
        ].map(add)
        const edges = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]
        return { vertices, edges }
      }
      case 'pyramid': {
        const h = s
        const vertices: Vec3[] = [
          { x: 0, y: -h / 2, z: 0 },
          { x: -s / 2, y: h / 2, z: -s / 2 },
          { x: s / 2, y: h / 2, z: -s / 2 },
          { x: s / 2, y: h / 2, z: s / 2 },
          { x: -s / 2, y: h / 2, z: s / 2 },
        ].map(add)
        const edges = [0, 1, 0, 2, 0, 3, 0, 4, 1, 2, 2, 3, 3, 4, 4, 1]
        return { vertices, edges }
      }
      case 'tetrahedron': {
        const h = s * 0.6
        const vertices: Vec3[] = [
          { x: 0, y: h, z: 0 },
          { x: s / 2, y: -h / 2, z: s / (2 * Math.sqrt(3)) },
          { x: -s / 2, y: -h / 2, z: s / (2 * Math.sqrt(3)) },
          { x: 0, y: -h / 2, z: -s / Math.sqrt(3) },
        ].map(add)
        const edges = [0, 1, 0, 2, 0, 3, 1, 2, 2, 3, 3, 1]
        return { vertices, edges }
      }
      case 'octahedron': {
        const h = s / 2
        const vertices: Vec3[] = [
          { x: 0, y: h, z: 0 },
          { x: h, y: 0, z: 0 },
          { x: 0, y: 0, z: h },
          { x: -h, y: 0, z: 0 },
          { x: 0, y: 0, z: -h },
          { x: 0, y: -h, z: 0 },
        ].map(add)
        const edges = [0, 1, 0, 2, 0, 3, 0, 4, 1, 2, 2, 3, 3, 4, 4, 1, 5, 1, 5, 2, 5, 3, 5, 4]
        return { vertices, edges }
      }
      case 'sphere': {
        const segments = 12
        const rings = 6
        const vertices: Vec3[] = []
        const edges: number[] = []
        for (let ring = 0; ring <= rings; ring++) {
          const phi = (ring / rings) * Math.PI
          const y = Math.cos(phi) * s
          const r = Math.sin(phi) * s
          for (let seg = 0; seg <= segments; seg++) {
            const theta = (seg / segments) * Math.PI * 2
            vertices.push(add({ x: r * Math.cos(theta), y, z: r * Math.sin(theta) }))
          }
        }
        const idx = (ring: number, seg: number) => ring * (segments + 1) + seg
        for (let ring = 0; ring <= rings; ring++) {
          for (let seg = 0; seg < segments; seg++) edges.push(idx(ring, seg), idx(ring, seg + 1))
        }
        for (let seg = 0; seg <= segments; seg++) {
          for (let ring = 0; ring < rings; ring++) edges.push(idx(ring, seg), idx(ring + 1, seg))
        }
        return { vertices, edges }
      }
      case 'torus': {
        const R = s / 2
        const r = R * this.torusInnerRadius
        const segments = 16
        const tubes = 12
        const vertices: Vec3[] = []
        const edges: number[] = []
        for (let i = 0; i <= segments; i++) {
          const u = (i / segments) * Math.PI * 2
          for (let j = 0; j <= tubes; j++) {
            const v = (j / tubes) * Math.PI * 2
            vertices.push(
              add({
                x: (R + r * Math.cos(v)) * Math.cos(u),
                y: r * Math.sin(v),
                z: (R + r * Math.cos(v)) * Math.sin(u),
              }),
            )
          }
        }
        const idx = (i: number, j: number) => i * (tubes + 1) + j
        for (let i = 0; i < segments; i++) {
          for (let j = 0; j <= tubes; j++) {
            edges.push(idx(i, j), idx(i + 1, j))
            edges.push(idx(i, j), idx(i, j + 1 > tubes ? 0 : j + 1))
          }
        }
        return { vertices, edges }
      }
      case 'cylinder': {
        const r = s / 2
        const halfH = (s * this.cylinderHeight) / 2
        const segments = 16
        const vertices: Vec3[] = []
        const edges: number[] = []
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2
          vertices.push(add({ x: r * Math.cos(theta), y: halfH, z: r * Math.sin(theta) }))
          vertices.push(add({ x: r * Math.cos(theta), y: -halfH, z: r * Math.sin(theta) }))
        }
        for (let i = 0; i < segments; i++) {
          const a = i * 2
          const b = (i + 1) * 2
          edges.push(a, b)
          edges.push(a + 1, b + 1)
          edges.push(a, a + 1)
        }
        edges.push(segments * 2, 0)
        edges.push(segments * 2 + 1, 1)
        return { vertices, edges }
      }
      case 'grid': {
        const n = this.gridSegments
        const half = (s / 2) * (n / 4)
        const vertices: Vec3[] = []
        const edges: number[] = []
        for (let i = 0; i <= n; i++) {
          const x = -half + (i / n) * half * 2
          for (let j = 0; j <= n; j++) {
            const z = -half + (j / n) * half * 2
            vertices.push(add({ x, y: 0, z }))
          }
        }
        const idx = (i: number, j: number) => i * (n + 1) + j
        for (let i = 0; i <= n; i++) {
          for (let j = 0; j < n; j++) edges.push(idx(i, j), idx(i, j + 1))
        }
        for (let j = 0; j <= n; j++) {
          for (let i = 0; i < n; i++) edges.push(idx(i, j), idx(i + 1, j))
        }
        return { vertices, edges }
      }
      case 'lattice': {
        const nx = Math.max(1, this.latticeSegmentsX)
        const ny = Math.max(1, this.latticeSegmentsY)
        const nz = Math.max(1, this.latticeSegmentsZ)
        const vertices: Vec3[] = []
        const edges: number[] = []
        const sx = s / nx
        const sy = s / ny
        const sz = s / nz
        for (let ix = 0; ix <= nx; ix++) {
          for (let iy = 0; iy <= ny; iy++) {
            for (let iz = 0; iz <= nz; iz++) {
              vertices.push(
                add({
                  x: -s / 2 + ix * sx,
                  y: -s / 2 + iy * sy,
                  z: -s / 2 + iz * sz,
                }),
              )
            }
          }
        }
        const idx = (ix: number, iy: number, iz: number) => ix * (ny + 1) * (nz + 1) + iy * (nz + 1) + iz
        for (let ix = 0; ix <= nx; ix++) {
          for (let iy = 0; iy <= ny; iy++) {
            for (let iz = 0; iz < nz; iz++) {
              edges.push(idx(ix, iy, iz), idx(ix, iy, iz + 1))
            }
          }
        }
        for (let ix = 0; ix <= nx; ix++) {
          for (let iz = 0; iz <= nz; iz++) {
            for (let iy = 0; iy < ny; iy++) {
              edges.push(idx(ix, iy, iz), idx(ix, iy + 1, iz))
            }
          }
        }
        for (let iy = 0; iy <= ny; iy++) {
          for (let iz = 0; iz <= nz; iz++) {
            for (let ix = 0; ix < nx; ix++) {
              edges.push(idx(ix, iy, iz), idx(ix + 1, iy, iz))
            }
          }
        }
        return { vertices, edges }
      }
      case 'custom': {
        if (!this.customVertices.length || !this.customEdges.length) {
          return this.getShapeDataForType('cube', s, ox, oy, oz)
        }
        const verts = this.customVertices.map((cv) => add({ x: cv.x, y: cv.y, z: cv.z }))
        return { vertices: verts, edges: this.customEdges.slice() }
      }
      default:
        return this.getShapeDataForType('cube', s, ox, oy, oz)
    }
  }

  getName() {
    return BehaviourNames.WIREFRAME_3D_BEHAVIOUR
  }

  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      shapeType: this.shapeType,
      size: this.size,
      rotationSpeedX: this.rotationSpeedX,
      rotationSpeedY: this.rotationSpeedY,
      rotationSpeedZ: this.rotationSpeedZ,
      lineColor: this.lineColor,
      lineWidth: this.lineWidth,
      perspective: this.perspective,
      cameraZ: this.cameraZ,
      depthStyle: this.depthStyle,
      sortByDepth: this.sortByDepth,
      orbitEnabled: this.orbitEnabled,
      orbitRadius: this.orbitRadius,
      orbitSpeed: this.orbitSpeed,
      pulsateEnabled: this.pulsateEnabled,
      pulsateMin: this.pulsateMin,
      pulsateMax: this.pulsateMax,
      pulsateSpeed: this.pulsateSpeed,
      pathType: this.pathType,
      pathSpeed: this.pathSpeed,
      pathScale: this.pathScale,
      dashedEnabled: this.dashedEnabled,
      dashLength: this.dashLength,
      gapLength: this.gapLength,
      colorOverTimeEnabled: this.colorOverTimeEnabled,
      colorOverTimeSpeed: this.colorOverTimeSpeed,
      perVertexColor: this.perVertexColor,
      noiseWobbleEnabled: this.noiseWobbleEnabled,
      noiseWobbleAmount: this.noiseWobbleAmount,
      noiseWobbleSpeed: this.noiseWobbleSpeed,
      attractParticlesEnabled: this.attractParticlesEnabled,
      attractStrength: this.attractStrength,
      latticeSegmentsX: this.latticeSegmentsX,
      latticeSegmentsY: this.latticeSegmentsY,
      latticeSegmentsZ: this.latticeSegmentsZ,
      gridSegments: this.gridSegments,
      torusInnerRadius: this.torusInnerRadius,
      cylinderHeight: this.cylinderHeight,
      customVertices: this.customVertices,
      customEdges: this.customEdges,
      wireframes: this.wireframes,
      name: this.getName(),
    }
  }
}
