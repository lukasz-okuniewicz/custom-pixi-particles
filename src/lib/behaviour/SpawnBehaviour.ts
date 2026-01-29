import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'

let canvas: any = null
let imageData: any = null
let particleCount: any = 0
let pixelPositions: Point[] = []

export default class SpawnBehaviour extends Behaviour {
  enabled: boolean = true
  priority = 0
  overOne: boolean = false
  trailProgress: number = 0 // Progress along the trail (0-1)
  trailingEnabled: boolean = false // Enable trailing
  spawnAlongTrail: boolean = false // Spawn particles along the entire trail
  trailSpeed: number = 1 // Speed of the trail
  trailRepeat: boolean = true // Loop the trail
  trailStart: number = 0 // Start the trail at 20% of its path
  currentProgress: number = 0

  customPoints: any[] = [
    {
      spawnType: 'Rectangle',
      word: 'Hello',
      fontSize: 50,
      fontSpacing: 5,
      particleDensity: 1,
      fontMaxWidth: 1334,
      fontMaxHeight: 750,
      textAlign: 'center',
      textBaseline: 'middle',
      radius: 100,
      radiusX: 100,
      radiusY: 100,
      starPoints: 5,
      rows: 10,
      columns: 10,
      cellSize: 20,
      center: { x: 0, y: 0, z: 0 },
      apex: { x: 0, y: 0, z: 0 },
      spread: 360,
      baseRadius: 100,
      coneDirection: 1,
      height: 100,
      coneAngle: 45,
      position: { x: 0, y: 0 },
      positionVariance: { x: 0, y: 0 },
      perspective: 0, // Distance for perspective
      maxZ: 0, // Maximum z distance for effects
      frequency: { x: 3, y: 2 },
      start: { x: 10, y: 10 },
      end: { x: 20, y: 20 },
      control1: { x: 0, y: 0 },
      control2: { x: 0, y: 0 },
      delta: 1,
      pitch: 50, // Vertical distance between consecutive loops
      turns: 5, // Number of turns in the helix
      pathPoints: [],
    },
  ]

  lastWordSettings: any = {}

  /**
   * Initialize particles for each custom point.
   * @param {Particle} particle - The particle to initialize.
   */
  init = (particle: Particle) => {
    if (this.customPoints.length === 0) return

    // Choose a random custom point
    const point = this.customPoints[Math.floor(Math.random() * this.customPoints.length)]

    // Safety check: Disable trailing for restricted spawn types
    // Note: Frame and FrameRectangle are allowed to use trailing
    const restrictedSpawnTypes = ['Word', 'Sphere', 'Rectangle', 'Helix', 'Grid', 'Cone']
    if (this.trailingEnabled && restrictedSpawnTypes.includes(point.spawnType)) {
      // Reset trail state and disable trailing for restricted types
      this.trailingEnabled = false
      this.trailProgress = 0
      this.currentProgress = 0
      this.overOne = false
    }

    if (this.trailingEnabled) {
      const { positions, probabilities } = this.spawnAlongTrail
        ? this.calculateTrailRangePositions(point)
        : { positions: [this.calculateTrailPosition(point)], probabilities: [1] }

      // Use weighted random selection for position
      const positionIndex = this.weightedRandomIndex(probabilities)
      const position = positions[positionIndex]

      particle.movement.x = this.calculate(point.position.x, point.positionVariance.x) + position.x
      particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + position.y
      particle.z = Math.random() * point.maxZ
    } else {
      // Normal spawning logic
      this.spawnParticleAtPoint(particle, point)
    }

    if (point.perspective && point.maxZ) {
      // Apply perspective scaling based on z
      const scale = point.perspective / (point.perspective + particle.z)
      particle.movement.x *= scale
      particle.movement.y *= scale

      // Adjust particle opacity based on z
      particle.superColorAlphaEnd = 1 - particle.z / point.maxZ
      particle.size.x = 1 - particle.z / point.maxZ
      particle.size.y = 1 - particle.z / point.maxZ
    }
  }

  apply = () => {
    // do nothing
  }

  /**
   * Calculate trail positions along the range from trailStart to currentProgress.
   * @param {Object} point - The custom point configuration.
   * @returns {Point[]} List of positions along the trail.
   */
  calculateTrailRangePositions = (point: any) => {
    const positions = []
    const segments = 20 // Increase segments for finer granularity
    const trailStart = this.trailStart || 0
    const weights = [] // Store probabilities for positions

    const startProgress = Math.max(trailStart, 0)
    const endProgress = Math.min(this.currentProgress, 1)

    for (let i = startProgress; i <= endProgress; i += (endProgress - startProgress) / segments) {
      const position = this.calculateTrailPosition(point, i)
      positions.push(position)

      // Assign a weight inversely proportional to distance from trail center
      const weightFactor = 4 // Higher values give steeper drops
      const distanceToTrail = Math.abs(i - this.currentProgress)
      weights.push(Math.exp(-distanceToTrail * weightFactor))
    }

    // Normalize weights to create probabilities
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    const probabilities = weights.map((w) => w / totalWeight)

    return { positions, probabilities }
  }

  /**
   * Spawn particle at the specified point configuration.
   * @param {Particle} particle - The particle to be initialized.
   * @param {Object} point - The custom point configuration.
   */
  spawnParticleAtPoint = (particle: Particle, point: any) => {
    // Assign particle z-coordinate within the max range
    // particle.z = Math.random() * point.maxZ

    if (
      point.spawnType === 'Word' &&
      (this.lastWordSettings.word !== point.word ||
        point.fontSize !== this.lastWordSettings.fontSize ||
        point.fontSpacing !== this.lastWordSettings.fontSpacing ||
        point.particleDensity !== this.lastWordSettings.particleDensity ||
        point.textAlign !== this.lastWordSettings.textAlign ||
        point.textBaseline !== this.lastWordSettings.textBaseline ||
        point.fontMaxWidth !== this.lastWordSettings.fontMaxWidth ||
        point.fontMaxHeight !== this.lastWordSettings.fontMaxHeight)
    ) {
      this.lastWordSettings = {
        word: point.word,
        fontSize: point.fontSize,
        fontSpacing: point.fontSpacing,
        particleDensity: point.particleDensity,
        textAlign: point.textAlign,
        textBaseline: point.textBaseline,
        fontMaxWidth: point.fontMaxWidth,
        fontMaxHeight: point.fontMaxHeight,
      }
      this.calculateCtx(point)
      particle.reset() // Reset the particle's position and movement
    }

    // Assign a random z-coordinate within a range
    particle.z = Math.random() * point.maxZ

    if (point.spawnType === 'Rectangle') {
      particle.movement.x = this.calculate(point.position.x, point.positionVariance.x)
      particle.movement.y = this.calculate(point.position.y, point.positionVariance.y)
    } else if (point.spawnType === 'Ring') {
      const angle = Math.random() * Math.PI * 2
      particle.movement.x = this.calculate(point.position.x, point.positionVariance.x) + Math.cos(angle) * point.radius
      particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + Math.sin(angle) * point.radius
    } else if (point.spawnType === 'Star') {
      const points = point.starPoints // Configurable number of star points
      const angle = (Math.PI * 2 * particle.uid) / points
      const radius = particle.uid % 2 === 0 ? point.radius : point.radius / 2
      particle.movement.x = this.calculate(point.position.x, point.positionVariance.x) + Math.cos(angle) * radius
      particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + Math.sin(angle) * radius
    } else if (point.spawnType === 'FrameRectangle') {
      const w = point.radiusX
      const h = point.radiusY
      if (Math.random() < w / (w + h)) {
        particle.movement.x = Math.random() * w + particle.movement.x
        particle.movement.y = Math.random() < 0.5 ? particle.movement.y : particle.movement.y + h - 1
      } else {
        particle.movement.y = Math.random() * h + particle.movement.y
        particle.movement.x = Math.random() < 0.5 ? particle.movement.x : particle.movement.x + w - 1
      }
      particle.movement.x += this.calculate(point.position.x, point.positionVariance.x)
      particle.movement.y += this.calculate(point.position.y, point.positionVariance.y)
    } else if (point.spawnType === 'Frame') {
      const w = point.radius
      const h = point.radius
      if (Math.random() < w / (w + h)) {
        particle.movement.x = Math.random() * w + particle.movement.x
        particle.movement.y = Math.random() < 0.5 ? particle.movement.y : particle.movement.y + h - 1
      } else {
        particle.movement.y = Math.random() * h + particle.movement.y
        particle.movement.x = Math.random() < 0.5 ? particle.movement.x : particle.movement.x + w - 1
      }
      particle.movement.x += this.calculate(point.position.x, point.positionVariance.x)
      particle.movement.y += this.calculate(point.position.y, point.positionVariance.y)
    } else if (point.spawnType === 'Sphere') {
      const phi = Math.random() * Math.PI * 2 // Random azimuthal angle
      const theta = Math.random() * (point.spread / 180) * Math.PI // Random polar angle
      particle.movement.x =
        this.calculate(point.position.x, point.positionVariance.x) +
        point.center.x +
        point.radius * Math.sin(theta) * Math.cos(phi)
      particle.movement.y =
        this.calculate(point.position.y, point.positionVariance.y) +
        point.center.y +
        point.radius * Math.sin(theta) * Math.sin(phi)
      particle.z = point.center.z + point.radius * Math.cos(theta)
    } else if (point.spawnType === 'Cone') {
      const angle = (Math.random() * point.coneAngle - point.coneAngle / 2) * (Math.PI / 180)
      const distance = Math.random() * point.baseRadius // Random distance from apex
      const localX = Math.cos(angle) * distance // Local x position within cone
      const localY = Math.sin(angle) * distance // Local y position within cone

      // Convert coneDirection to radians
      const coneDirectionRad = (point.coneDirection || 0) * (Math.PI / 180)

      // Apply rotation to align the cone to the specified direction
      particle.movement.x =
        this.calculate(point.position.x, point.positionVariance.x) +
        point.apex.x +
        Math.cos(coneDirectionRad) * localX -
        Math.sin(coneDirectionRad) * localY

      particle.movement.y =
        this.calculate(point.position.y, point.positionVariance.y) +
        point.apex.y +
        Math.sin(coneDirectionRad) * localX +
        Math.cos(coneDirectionRad) * localY

      particle.z = point.apex.z + Math.random() * point.height
    } else if (point.spawnType === 'Grid') {
      const row = Math.floor(Math.random() * point.rows)
      const column = Math.floor(Math.random() * point.columns)
      particle.movement.x = this.calculate(point.position.x, point.positionVariance.x) + column * point.cellSize
      particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + row * point.cellSize
    } else if (point.spawnType === 'Word') {
      if (particleCount > 0 && pixelPositions.length > 0) {
        const selectedPixel = pixelPositions[Math.floor(Math.random() * particleCount)]
        particle.movement.x = point.position.x + selectedPixel.x - canvas.width / 2
        particle.movement.y = point.position.y + selectedPixel.y - canvas.height / 2

        // Add a bit of random jitter to make the word more dynamic
        particle.movement.x += Math.random() * point.positionVariance.x - point.positionVariance.x / 2
        particle.movement.y += Math.random() * point.positionVariance.y - point.positionVariance.y / 2
      }
    } else if (point.spawnType === 'Lissajous') {
      const a = point.frequency.x // Frequency in x-axis
      const b = point.frequency.y // Frequency in y-axis
      const delta = point.delta || Math.PI / 2 // Phase difference
      const t = particle.uid * 0.1
      particle.movement.x =
        this.calculate(point.position.x, point.positionVariance.x) + Math.sin(a * t + delta) * point.radius
      particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + Math.sin(b * t) * point.radius
    } else if (point.spawnType === 'Bezier') {
      const t = Math.random() // Progress along the curve
      const cx1 = point.control1.x
      const cy1 = point.control1.y
      const cx2 = point.control2.x
      const cy2 = point.control2.y
      const x =
        this.calculate(point.position.x, point.positionVariance.x) +
        (1 - t) ** 3 * point.start.x +
        3 * (1 - t) ** 2 * t * cx1 +
        3 * (1 - t) * t ** 2 * cx2 +
        t ** 3 * point.end.x
      const y =
        this.calculate(point.position.x, point.positionVariance.x) +
        (1 - t) ** 3 * point.start.y +
        3 * (1 - t) ** 2 * t * cy1 +
        3 * (1 - t) * t ** 2 * cy2 +
        t ** 3 * point.end.y
      particle.movement.x = x
      particle.movement.y = y
    } else if (point.spawnType === 'Heart') {
      // Heart shape formula: (x^2 + y^2 - 1)^3 - x^2 * y^3 = 0
      const t = Math.random() * 2 * Math.PI // Parametric angle
      const scale = point.radius || 100 // Scale based on radius
      const x = scale * 16 * Math.sin(t) ** 3 // Parametric x-coordinate
      const y = -scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))

      particle.movement.x = this.calculate(point.position.x, point.positionVariance.x) + x
      particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + y
    } else if (point.spawnType === 'Helix') {
      const turns = point.turns || 5 // Default number of turns
      const pitch = point.pitch || 50 // Default pitch
      const radius = point.radius || 100 // Default radius
      const height = point.height || turns * pitch // Default height if not specified

      const t = Math.random() * turns * Math.PI * 2 // Angle along the helix
      const z = Math.random() * height // Random height within the helix

      const x = radius * Math.cos(t) // X-coordinate based on angle
      const y = radius * Math.sin(t) // Y-coordinate based on angle
      const adjustedZ = z % pitch // Adjust z for particles within a pitch interval

      particle.movement.x = this.calculate(point.position.x, point.positionVariance.x) + x
      particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + y
      particle.z = point.position.z + adjustedZ // Assign Z-coordinate to the particle
    } else if (point.spawnType === 'Spring') {
      const turns = point.turns || 5 // Number of loops in the spring
      const pitch = point.pitch || 50 // Distance between consecutive loops
      const radius = point.radius || 100 // Radius of the spring

      // Generate random position along the spring
      const t = Math.random() * turns * Math.PI * 2 // Angle in radians along the spring
      const z = (t / (Math.PI * 2)) * pitch // Z position increases linearly with the angle

      // Compute 3D positions
      const x = Math.cos(t) * radius // X-coordinate on the circle
      const y = Math.sin(t) * radius // Y-coordinate on the circle

      // Apply perspective scaling if enabled
      if (point.perspective > 0 && point.maxZ > 0) {
        const scale = point.perspective / (point.perspective + z) // Perspective scaling

        // Apply perspective scaling to coordinates
        particle.movement.x = (this.calculate(point.position.x, point.positionVariance.x) + x) * scale
        particle.movement.y = (this.calculate(point.position.y, point.positionVariance.y) + y) * scale

        // Adjust particle size and alpha based on depth
        particle.size.x = scale
        particle.size.y = scale
        particle.superColorAlphaEnd = 1 - z / point.maxZ
      } else {
        // No perspective: flat 2D visualization
        particle.movement.x = this.calculate(point.position.x, point.positionVariance.x) + x
        particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + y
      }

      // Assign Z-coordinate for reference
      particle.z = z
    } else if (point.spawnType === 'Path') {
      const pathPoints = point.pathPoints || [] // List of path points [{ x, y, z }]
      if (pathPoints.length < 2) return // Ensure at least two points for a path

      // Choose a random segment along the path
      const segmentIndex = Math.floor(Math.random() * (pathPoints.length - 1))
      const start = pathPoints[segmentIndex]
      const end = pathPoints[segmentIndex + 1]

      // Interpolate between the start and end points
      const t = Math.random() // Random position along the segment (0 to 1)
      const x = start.x + t * (end.x - start.x)
      const y = start.y + t * (end.y - start.y)
      const z = start.z + t * (end.z - start.z || 0) // Support z if defined

      // Apply perspective scaling if enabled
      if (point.perspective > 0 && point.maxZ > 0) {
        const scale = point.perspective / (point.perspective + z)
        particle.movement.x = (this.calculate(point.position.x, point.positionVariance.x) + x) * scale
        particle.movement.y = (this.calculate(point.position.y, point.positionVariance.y) + y) * scale

        // Adjust particle size and alpha based on depth
        particle.size.x = scale
        particle.size.y = scale
        particle.superColorAlphaEnd = 1 - z / point.maxZ
      } else {
        // Flat 2D path
        particle.movement.x = this.calculate(point.position.x, point.positionVariance.x) + x
        particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + y
      }

      particle.z = z // Assign Z-coordinate
    } else if (point.spawnType === 'Oval') {
      const angle = Math.random() * Math.PI * 2 // Random angle around the ellipse
      const radiusX = point.radiusX || 100 // Default radiusX
      const radiusY = point.radiusY || 50 // Default radiusY

      particle.movement.x = this.calculate(point.position.x, point.positionVariance.x) + Math.cos(angle) * radiusX

      particle.movement.y = this.calculate(point.position.y, point.positionVariance.y) + Math.sin(angle) * radiusY
    }
  }

  /**
   * Calculate canvas context for rendering text-based particles.
   * @param {Object} point - The custom point configuration.
   */
  calculateCtx = (point: any) => {
    const text = point.word // The word to render
    const fontSize = point.fontSize // Font size for rendering

    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = point.fontMaxWidth
      canvas.height = point.fontMaxHeight
    }

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height) // Clear the canvas

    ctx.font = `${fontSize}px Arial`
    ctx.textAlign = point.textAlign
    ctx.textBaseline = point.textBaseline
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    // Get pixel data
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const { data, width, height } = imageData
    const spacing = point.fontSpacing // Spacing between pixels

    // Find all non-transparent pixels
    pixelPositions = []
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const index = (y * width + x) * 4
        if (data[index + 3] > 128) {
          // Alpha channel > 128 means this pixel is part of the text
          pixelPositions.push(new Point(x, y))
        }
      }
    }
    pixelPositions = pixelPositions.sort(() => Math.random() - 0.5)

    // Use particleDensity to limit the number of particles
    particleCount = Math.floor(pixelPositions.length * point.particleDensity)
  }

  calculateTrailPosition = (point: any, overrideProgress?: number) => {
    const progress = overrideProgress !== undefined ? overrideProgress : this.currentProgress

    switch (point.spawnType) {
      case 'Rectangle': {
        // Rectangle spawns particles randomly within the area, but for trail we trace the perimeter
        const radiusX = point.radiusX || 100
        const radiusY = point.radiusY || 100
        const perimeter = 2 * radiusX + 2 * radiusY
        const segmentLength = perimeter * progress
        const localPosition = segmentLength % perimeter

        let x = point.position.x
        let y = point.position.y

        // Trace the rectangle perimeter starting from top-left, going clockwise
        if (localPosition <= radiusX) {
          // Top edge: left to right
          x += localPosition - radiusX / 2
          y -= radiusY / 2
        } else if (localPosition <= radiusX + radiusY) {
          // Right edge: top to bottom
          x += radiusX / 2
          y += (localPosition - radiusX) - radiusY / 2
        } else if (localPosition <= 2 * radiusX + radiusY) {
          // Bottom edge: right to left
          x += radiusX / 2 - (localPosition - radiusX - radiusY)
          y += radiusY / 2
        } else {
          // Left edge: bottom to top
          x -= radiusX / 2
          y += radiusY / 2 - (localPosition - 2 * radiusX - radiusY)
        }

        return { x, y, z: 0 }
      }

      case 'Ring': {
        const angle = progress * Math.PI * 2 // Progress is proportional to angle
        const x = point.position.x + Math.cos(angle) * point.radius
        const y = point.position.y + Math.sin(angle) * point.radius
        return { x, y, z: 0 }
      }

      case 'Star': {
        const totalPoints = point.starPoints * 2 // Include outer and inner points
        const pointIndex = Math.floor(progress * totalPoints)
        const localProgress = (progress * totalPoints) % 1

        const angle = (Math.PI * 2 * pointIndex) / totalPoints
        const nextAngle = (Math.PI * 2 * (pointIndex + 1)) / totalPoints

        const radius = pointIndex % 2 === 0 ? point.radius : point.radius / 2
        const nextRadius = (pointIndex + 1) % 2 === 0 ? point.radius : point.radius / 2

        const x =
          point.position.x +
          Math.cos(angle) * radius * (1 - localProgress) +
          Math.cos(nextAngle) * nextRadius * localProgress
        const y =
          point.position.y +
          Math.sin(angle) * radius * (1 - localProgress) +
          Math.sin(nextAngle) * nextRadius * localProgress

        return { x, y, z: 0 }
      }

      case 'Path': {
        const pathPoints = point.pathPoints || []
        if (pathPoints.length < 2) return { x: 0, y: 0, z: 0 }

        const totalSegments = pathPoints.length - 1
        const segmentIndex = Math.floor(progress * totalSegments)
        const localProgress = (progress * totalSegments) % 1

        const start = pathPoints[segmentIndex]
        const end = pathPoints[segmentIndex + 1]

        const x = start.x + localProgress * (end.x - start.x)
        const y = start.y + localProgress * (end.y - start.y)
        const z = start.z + localProgress * (end.z - start.z || 0)

        return { x, y, z }
      }

      case 'Lissajous': {
        const a = point.frequency.x
        const b = point.frequency.y
        const delta = point.delta || Math.PI / 2

        const t = progress * Math.PI * 2
        const x = point.position.x + Math.sin(a * t + delta) * point.radius
        const y = point.position.y + Math.sin(b * t) * point.radius

        return { x, y, z: 0 }
      }

      case 'Helix': {
        const turns = point.turns || 5
        const pitch = point.pitch || 50
        const angle = progress * turns * Math.PI * 2

        const x = point.position.x + Math.cos(angle) * point.radius
        const y = point.position.y + Math.sin(angle) * point.radius
        const z = point.position.z + progress * turns * pitch

        return { x, y, z }
      }

      case 'Heart': {
        const t = progress * Math.PI * 2 // Map progress to parametric angle
        const scale = point.radius || 100 // Scale based on radius

        // Parametric heart shape equations
        const x = scale * 16 * Math.sin(t) ** 3
        const y = -scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))

        // Apply position offset and variance
        return {
          x: point.position.x + x,
          y: point.position.y + y,
          z: 0,
        }
      }

      case 'Bezier': {
        const t = progress // Use progress directly as the parameter for the curve
        const { start, end, control1, control2 } = point

        // Calculate position along the Bezier curve
        const x =
          (1 - t) ** 3 * start.x +
          3 * (1 - t) ** 2 * t * control1.x +
          3 * (1 - t) * t ** 2 * control2.x +
          t ** 3 * end.x
        const y =
          (1 - t) ** 3 * start.y +
          3 * (1 - t) ** 2 * t * control1.y +
          3 * (1 - t) * t ** 2 * control2.y +
          t ** 3 * end.y

        return { x, y, z: 0 } // Bezier is 2D, so z is 0
      }

      case 'Frame': {
        // Frame uses radius for both width and height (square frame)
        const w = point.radius || 100
        const h = point.radius || 100
        // Perimeter: top (w) + right (h) + bottom (w) + left (h) = 2*(w+h)
        const perimeter = 2 * (w + h)
        const totalDistance = perimeter * progress
        const localPosition = totalDistance % perimeter

        // Start from position
        let x = point.position.x
        let y = point.position.y

        // Trace the frame perimeter starting from top-left, going clockwise
        // Spawn logic: 
        //   Top/Bottom: x = Math.random() * w (0 to w), y = 0 or h-1
        //   Left/Right: y = Math.random() * h (0 to h), x = 0 or w-1
        if (localPosition < w) {
          // Top edge: x from 0 to w, y = 0
          x += localPosition
          y += 0
        } else if (localPosition < w + h) {
          // Right edge: x = w-1, y from 0 to h
          x += w - 1
          y += localPosition - w
        } else if (localPosition < 2 * w + h) {
          // Bottom edge: x from w-1 down to 0, y = h-1
          const bottomProgress = localPosition - w - h
          x += w - 1 - bottomProgress
          y += h - 1
        } else {
          // Left edge: x = 0, y from h-1 down to 0
          const leftProgress = localPosition - 2 * w - h
          x += 0
          y += h - 1 - leftProgress
        }

        return { x, y, z: 0 }
      }

      case 'FrameRectangle': {
        // FrameRectangle uses radiusX for width and radiusY for height
        const w = point.radiusX || 100
        const h = point.radiusY || 100
        // Perimeter: top (w) + right (h) + bottom (w) + left (h) = 2*(w+h)
        const perimeter = 2 * (w + h)
        const totalDistance = perimeter * progress
        const localPosition = totalDistance % perimeter

        // Start from position
        let x = point.position.x
        let y = point.position.y

        // Trace the frame perimeter starting from top-left, going clockwise
        // Spawn logic:
        //   Top/Bottom: x = Math.random() * w (0 to w), y = 0 or h-1
        //   Left/Right: y = Math.random() * h (0 to h), x = 0 or w-1
        if (localPosition < w) {
          // Top edge: x from 0 to w, y = 0
          x += localPosition
          y += 0
        } else if (localPosition < w + h) {
          // Right edge: x = w-1, y from 0 to h
          x += w - 1
          y += localPosition - w
        } else if (localPosition < 2 * w + h) {
          // Bottom edge: x from w-1 down to 0, y = h-1
          const bottomProgress = localPosition - w - h
          x += w - 1 - bottomProgress
          y += h - 1
        } else {
          // Left edge: x = 0, y from h-1 down to 0
          const leftProgress = localPosition - 2 * w - h
          x += 0
          y += h - 1 - leftProgress
        }

        return { x, y, z: 0 }
      }

      case 'Oval': {
        const angle = progress * Math.PI * 2 // Progress determines angle
        const radiusX = point.radiusX || 100
        const radiusY = point.radiusY || 50

        const x = point.position.x + Math.cos(angle) * radiusX
        const y = point.position.y + Math.sin(angle) * radiusY

        return { x, y, z: 0 }
      }

      case 'Word': {
        if (!pixelPositions || pixelPositions.length === 0) {
          return { x: point.position.x, y: point.position.y, z: 0 } // Fallback if no pixel data is available
        }

        // Determine the number of pixels to reveal based on trailProgress
        const maxPixelIndex = Math.floor(progress * pixelPositions.length)

        // Slice the pixels to include only those within the current progress
        const revealedPixels = pixelPositions.slice(0, maxPixelIndex)

        // If no pixels are revealed yet, return the starting position
        if (revealedPixels.length === 0) {
          return { x: point.position.x - canvas.width / 2, y: point.position.y - canvas.height / 2, z: 0 }
        }

        // Choose the first pixel in the revealed portion for a left-to-right effect
        const selectedPixel = revealedPixels[revealedPixels.length - 1] || { x: 0, y: 0 }

        // Map the pixel position to the particle's position
        const x = point.position.x + selectedPixel.x - canvas.width / 2
        const y = point.position.y + selectedPixel.y - canvas.height / 2

        return { x, y, z: 0 }
      }

      default:
        return { x: 0, y: 0, z: 0 }
    }
  }

  /**
   * Update trail progress once per frame.
   * @param {number} deltaTime - Time since the last update
   */
  updateTrailProgress = (deltaTime: number) => {
    if (!this.trailingEnabled) return

    const trailStart = this.trailStart || 0

    // Increment trail progress
    this.trailProgress += this.trailSpeed * deltaTime

    if (trailStart > 0) {
      const remainingDistance = 1 - trailStart
      if (!this.overOne) {
        if (this.trailProgress > remainingDistance) {
          if (this.trailRepeat) {
            this.overOne = true
            this.trailProgress = 0
          } else {
            this.trailProgress = remainingDistance
          }
        }
        this.currentProgress = trailStart + (this.trailProgress / remainingDistance) * remainingDistance
      } else {
        if (this.trailProgress > 1) {
          if (this.trailRepeat) {
            this.trailProgress %= 1
          } else {
            this.trailingEnabled = false
            this.trailProgress = 1
          }
        }
        this.currentProgress = this.trailProgress
      }
    } else {
      if (this.trailProgress > 1) {
        if (this.trailRepeat) {
          this.trailProgress %= 1
        } else {
          this.trailingEnabled = false
          this.trailProgress = 1
        }
      }
      this.currentProgress = this.trailProgress
    }
  }

  // Utility function for weighted random selection
  weightedRandomIndex = (probabilities: any) => {
    const cumulative = probabilities.reduce((acc: any, prob: number, i: number) => {
      acc.push(prob + (acc[i - 1] || 0))
      return acc
    }, [])

    const randomValue = Math.random()
    return cumulative.findIndex((c: number) => randomValue <= c)
  }

  /**
   * Update method to be called once per frame.
   * @param {number} deltaTime - Time since the last frame
   */
  update = (deltaTime: number) => {
    this.updateTrailProgress(deltaTime) // Update trail once per frame
  }

  /**
   * Adds a random variance to the given value
   * @param {number} value - The value to calculate
   * @param {number} variance - The random variance to add
   * @returns {number} The calculated value
   */
  calculate = (value: number, variance: number) => {
    return value + this.varianceFrom(variance)
  }

  /**
   * Gets the name of the behaviour
   * @return {string} The name of the behaviour
   */
  getName() {
    return BehaviourNames.SPAWN_BEHAVIOUR
  }

  /**
   * Retrieves the properties of the custom points.
   * @returns {Object[]} The array of custom points and their properties.
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      trailingEnabled: this.trailingEnabled,
      spawnAlongTrail: this.spawnAlongTrail,
      trailSpeed: this.trailSpeed,
      trailRepeat: this.trailRepeat,
      trailStart: this.trailStart,
      customPoints: this.customPoints,
      name: this.getName(),
    }
  }
}
