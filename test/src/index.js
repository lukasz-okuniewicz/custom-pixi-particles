import { customPixiParticles } from 'custom-pixi-particles'
import { Application } from 'pixi.js-legacy'

const config = {
  emitterConfig: {
    behaviours: [
      {
        priority: 10000,
        enabled: true,
        maxLifeTime: 6,
        timeVariance: 0,
        name: 'LifeBehaviour',
      },
      {
        priority: 100,
        enabled: true,
        spawnType: 'Ring',
        radius: 15,
        sinX: false,
        sinY: false,
        sinXVal: { x: 50, y: 10 },
        sinYVal: { x: 50, y: 10 },
        sinXValVariance: { x: 100, y: 20 },
        sinYValVariance: { x: 100, y: 20 },
        position: { x: 200, y: 265 },
        positionVariance: { x: 10, y: 10 },
        velocity: { x: 30, y: 10 },
        velocityVariance: { x: 10, y: 0 },
        acceleration: { x: 0, y: -10 },
        accelerationVariance: { x: 0, y: 0 },
        name: 'PositionBehaviour',
      },
      {
        priority: 0,
        enabled: true,
        allowNegativeValues: false,
        sizeStart: { x: 0, y: 0 },
        sizeEnd: { x: 0, y: 0 },
        startVariance: 2,
        endVariance: 2,
        name: 'SizeBehaviour',
      },
      {
        priority: 0,
        enabled: true,
        start: { _r: 80, _g: 80, _b: 80, _alpha: 1 },
        end: { _r: 1, _g: 169, _b: 185, _alpha: 1 },
        startVariance: { _r: 0, _g: 0, _b: 0, _alpha: 0 },
        endVariance: { _r: 0, _g: 0, _b: 0, _alpha: 1 },
        sinus: true,
        name: 'ColorBehaviour',
      },
      {
        priority: 0,
        enabled: true,
        rotation: 0,
        variance: 0.2,
        name: 'RotationBehaviour',
      },
    ],
    emitController: {
      _maxParticles: 0,
      _maxLife: 1,
      _emitPerSecond: 150,
      name: 'UniformEmission',
    },
    duration: -1,
    alpha: 1,
    blendMode: 0,
  },
  textures: ['block_blue.png'],
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new Application({ backgroundColor: 0 })
  globalThis.__PIXI_APP__ = app

  const particles = customPixiParticles.create(config)
  app.stage.addChild(particles)
  app.ticker.maxFPS = 60
  particles.play()
  document.body.getElementsByClassName('content')[0].appendChild(app.view)

  window.test = (isPaused) => {
    particles.pause(isPaused)
  }
})
