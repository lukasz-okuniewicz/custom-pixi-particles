# CustomPIXIParticles by [@lukasz-okuniewicz](http://github.com/lukasz-okuniewicz)

CustomPIXIParticles is a lightweight and flexible library for creating and managing particle effects in PIXI.js applications. It provides a simple API for defining particle emitters, textures, and configurations, allowing developers to create a wide range of visual effects with ease.

### Features
* Easy-to-use API: Create particle emitters with just a few lines of code
* Flexible configuration: Customize particle behavior, appearance, and animation
* High performance: Render particles efficiently without impacting application performance
* Compatible with PIXI.js v7: Works seamlessly with the latest version of PIXI.js

### Versions Compatibility

| PixiJS | CustomPIXIParticles |
|---|---|
| v5.x - v6.x | v4.x |
| v7.x | v5.x |

### Demo 
[custom-pixi-particles](http://particles.okuniewicz.eu/)

#### Installation:

```
npm install custom-pixi-particles
```

#### Usage:
Import or require the library:
```javascript
const customPixiParticles = require('custom-pixi-particles')
// or
import customPixiParticles from 'custom-pixi-particles'
```

```javascript
// Define array of textures
const textures = ['texture1.png', 'texture2.png']
// Define generated emiter config
const emitterConfig = {...}
// Create particles
this.particles = customParticles.create({ textures, emitterConfig })
// Start to play
this.particles.play()
// Add particles to PIXI container
container.addChild(this.particles)
```

### API Reference
`create`
```javascript
// All possible params which can be passed during particles creation
this.particles = customPixiParticles.create({
  textures: [String],
  animatedSpriteZeroPad: Boolean,
  animatedSpriteIndexToStart: Number,
  emitterConfig: Object,
  finishingTextures: [String],
  vertices: Boolean,
  position: Boolean,
  rotation: Boolean,
  uvs: Boolean,
  tint: Boolean,
  maxParticles: Number,
  maxFPS: Number,
  tickerSpeed: Number,
})
```

```javascript
// Callback function called when the particle animation completes.
this.particles.onComplete = () => {
  //...
}
```

```javascript
// Define array of new textures
const newTextures = ['texture3.png', 'texture4.png']
// Updates the particle emitter's textures.
this.particles.setTextures(newTextures)
```

```javascript
// Updates the particle emitter's configuration.
this.particles.updateConfig({
  // Update emitter configuration properties
})
```

```javascript
// Sets the paused state
pause(isPaused)

// Starts the emitter
start()

// Resets the particle emitters in this class without removing existing particles and plays them
play()

// Immediately stops emitting particles
stopImmediately()

// Destroy particles
destroy()

// Terminates the emitter
stop()

// Resets the emitters to their initial state
resetEmitter()

// Update textures used by the emitter
setTextures(textures)

// Updates the configuration of the emitter
updateConfig(config, resetDuration = true)

// Updates the position of the emitter
updatePosition(position, resetDuration = true)

// Clear pools
clearPool()
```

### Additional Resources
Editor for particles: [custom-pixi-particles-editor](https://github.com/lukasz-okuniewicz/custom-pixi-particles-editor)
