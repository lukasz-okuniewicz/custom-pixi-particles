import { Point } from '../util'
import { Behaviour, BehaviourNames } from './index'
import Particle from '../Particle'
import Model from '../Model'

let canvas: any = null
let imageData: any = null
let particleCount: any = 0
let pixelPositions: Point[] = []

export default class SpawnBehaviour extends Behaviour {
  enabled: boolean = true
  priority = 0
  spawnType: string = 'Rectangle'
  word: string = 'Hello'
  lastWord: string = ''
  fontSize = 50
  fontSpacing = 5
  particleDensity = 1
  fontMaxWidth = 1334
  fontMaxHeight = 750
  textAlign: 'center' | 'end' | 'left' | 'right' | 'start' = 'center'
  textBaseline: 'alphabetic' | 'bottom' | 'hanging' | 'ideographic' | 'middle' | 'top' = 'middle'
  radius: number = 0
  radiusX: number = 0
  radiusY: number = 0
  starPoints: number = 5
  rows: number = 10
  columns: number = 10
  cellSize: number = 20
  center = { x: 0, y: 0, z: 0 }
  apex = { x: 0, y: 0, z: 0 }
  spread = 360
  baseRadius = 0
  coneDirection = 0
  height = 0
  coneAngle = 45
  position = new Point()
  positionVariance = new Point()

  // Perspective parameters
  perspective = 0 // Distance for perspective
  maxZ = 0 // Maximum z distance for effects

  /**
   * Initialize particle position based on spawn type
   * @param {Particle} particle - The particle to initialize
   */
  init = (particle: Particle) => {
    // Reset particles if the word has changed
    if (this.spawnType === 'Word' && this.lastWord !== this.word) {
      this.lastWord = this.word
      this.calculateCtx()
      particle.reset() // Reset the particle's position and movement
    }

    // Assign a random z-coordinate within a range
    particle.z = Math.random() * this.maxZ

    if (this.spawnType === 'Rectangle') {
      particle.movement.x = this.calculate(this.position.x, this.positionVariance.x)
      particle.movement.y = this.calculate(this.position.y, this.positionVariance.y)
    } else if (this.spawnType === 'Ring') {
      const angle = Math.random() * Math.PI * 2
      particle.movement.x = this.calculate(this.position.x, this.positionVariance.x) + Math.cos(angle) * this.radius
      particle.movement.y = this.calculate(this.position.y, this.positionVariance.y) + Math.sin(angle) * this.radius
    } else if (this.spawnType === 'Star') {
      const points = this.starPoints // Configurable number of star points
      const angle = (Math.PI * 2 * particle.uid) / points
      const radius = particle.uid % 2 === 0 ? this.radius : this.radius / 2
      particle.movement.x = this.calculate(this.position.x, this.positionVariance.x) + Math.cos(angle) * radius
      particle.movement.y = this.calculate(this.position.y, this.positionVariance.y) + Math.sin(angle) * radius
    } else if (this.spawnType === 'FrameRectangle') {
      const w = this.radiusX
      const h = this.radiusY
      if (Math.random() < w / (w + h)) {
        particle.movement.x = Math.random() * w + particle.movement.x
        particle.movement.y = Math.random() < 0.5 ? particle.movement.y : particle.movement.y + h - 1
      } else {
        particle.movement.y = Math.random() * h + particle.movement.y
        particle.movement.x = Math.random() < 0.5 ? particle.movement.x : particle.movement.x + w - 1
      }
      particle.movement.x += this.calculate(this.position.x, this.positionVariance.x)
      particle.movement.y += this.calculate(this.position.y, this.positionVariance.y)
    } else if (this.spawnType === 'Frame') {
      const w = this.radius
      const h = this.radius
      if (Math.random() < w / (w + h)) {
        particle.movement.x = Math.random() * w + particle.movement.x
        particle.movement.y = Math.random() < 0.5 ? particle.movement.y : particle.movement.y + h - 1
      } else {
        particle.movement.y = Math.random() * h + particle.movement.y
        particle.movement.x = Math.random() < 0.5 ? particle.movement.x : particle.movement.x + w - 1
      }
      particle.movement.x += this.calculate(this.position.x, this.positionVariance.x)
      particle.movement.y += this.calculate(this.position.y, this.positionVariance.y)
    } else if (this.spawnType === 'Sphere') {
      const phi = Math.random() * Math.PI * 2 // Random azimuthal angle
      const theta = Math.random() * (this.spread / 180) * Math.PI // Random polar angle
      particle.movement.x =
        this.calculate(this.position.x, this.positionVariance.x) +
        this.center.x +
        this.radius * Math.sin(theta) * Math.cos(phi)
      particle.movement.y =
        this.calculate(this.position.y, this.positionVariance.y) +
        this.center.y +
        this.radius * Math.sin(theta) * Math.sin(phi)
      particle.z = this.center.z + this.radius * Math.cos(theta)
    } else if (this.spawnType === 'Cone') {
      const angle = (Math.random() * this.coneAngle - this.coneAngle / 2) * (Math.PI / 180)
      const distance = Math.random() * this.baseRadius // Random distance from apex
      const localX = Math.cos(angle) * distance // Local x position within cone
      const localY = Math.sin(angle) * distance // Local y position within cone

      // Convert coneDirection to radians
      const coneDirectionRad = (this.coneDirection || 0) * (Math.PI / 180)

      // Apply rotation to align the cone to the specified direction
      particle.movement.x =
        this.calculate(this.position.x, this.positionVariance.x) +
        this.apex.x +
        Math.cos(coneDirectionRad) * localX -
        Math.sin(coneDirectionRad) * localY

      particle.movement.y =
        this.calculate(this.position.y, this.positionVariance.y) +
        this.apex.y +
        Math.sin(coneDirectionRad) * localX +
        Math.cos(coneDirectionRad) * localY

      particle.z = this.apex.z + Math.random() * this.height
    } else if (this.spawnType === 'Grid') {
      const row = Math.floor(Math.random() * this.rows)
      const column = Math.floor(Math.random() * this.columns)
      particle.movement.x = this.position.x + column * this.cellSize
      particle.movement.y = this.position.y + row * this.cellSize
    } else if (this.spawnType === 'Word') {
      if (particleCount > 0 && pixelPositions.length > 0) {
        const selectedPixel = pixelPositions[Math.floor(Math.random() * particleCount)]
        particle.movement.x = this.position.x + selectedPixel.x - canvas.width / 2
        particle.movement.y = this.position.y + selectedPixel.y - canvas.height / 2

        // Add a bit of random jitter to make the word more dynamic
        particle.movement.x += Math.random() * this.positionVariance.x - this.positionVariance.x / 2
        particle.movement.y += Math.random() * this.positionVariance.y - this.positionVariance.y / 2
      }
    }

    if (this.perspective && this.maxZ) {
      // Apply perspective scaling based on z
      const scale = this.perspective / (this.perspective + particle.z)
      particle.movement.x *= scale
      particle.movement.y *= scale

      // Adjust particle opacity based on z
      particle.color.alpha = 1 - particle.z / this.maxZ
    }
  }

  calculateCtx = () => {
    const text = this.word // The word to render
    const fontSize = this.fontSize // Font size for rendering

    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = this.fontMaxWidth
      canvas.height = this.fontMaxHeight
    }

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height) // Clear the canvas

    ctx.font = `${fontSize}px Arial`
    ctx.textAlign = this.textAlign
    ctx.textBaseline = this.textBaseline
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    // Get pixel data
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const { data, width, height } = imageData
    const spacing = this.fontSpacing // Spacing between pixels

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
    particleCount = Math.floor(pixelPositions.length * this.particleDensity)
  }

  apply = (particle: Particle, deltaTime: number, model: Model) => {
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
   * @description Retrieves the properties of the object.
   * @returns {Object} The properties of the object.
   */
  getProps() {
    return {
      enabled: this.enabled,
      priority: this.priority,
      position: {
        x: this.position.x,
        y: this.position.y,
      },
      positionVariance: {
        x: this.positionVariance.x,
        y: this.positionVariance.y,
      },
      spawnType: this.spawnType,
      word: this.word,
      fontSize: this.fontSize,
      fontSpacing: this.fontSpacing,
      particleDensity: this.particleDensity,
      fontMaxWidth: this.fontMaxWidth,
      fontMaxHeight: this.fontMaxHeight,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      radius: this.radius,
      radiusX: this.radiusX,
      radiusY: this.radiusY,
      starPoints: this.starPoints,
      rows: this.rows,
      columns: this.columns,
      cellSize: this.cellSize,
      center: this.center,
      apex: this.apex,
      spread: this.spread,
      baseRadius: this.baseRadius,
      coneDirection: this.coneDirection,
      height: this.height,
      coneAngle: this.coneAngle,
      perspective: this.perspective,
      maxZ: this.maxZ,
      name: this.getName(),
    }
  }
}
