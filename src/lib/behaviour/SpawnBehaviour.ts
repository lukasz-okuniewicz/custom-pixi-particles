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

    // Assign particle z-coordinate within the max range
    particle.z = Math.random() * point.maxZ

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

  apply = (particle: Particle, deltaTime: number) => {
    // No updates here for now
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
      customPoints: this.customPoints,
      name: this.getName(),
    }
  }
}
