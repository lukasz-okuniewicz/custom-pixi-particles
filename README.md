# CustomPIXIParticles by [@lukasz-okuniewicz](http://github.com/lukasz-okuniewicz)

**CustomPIXIParticles** is a lightweight, high-performance library designed for creating and managing customizable particle effects in **PIXI.js** applications. It offers an intuitive API, flexible configuration options, and seamless compatibility with modern PIXI.js versions, making it an essential tool for developers looking to create stunning visual effects.

---

### Support My Work
If you find **CustomPIXIParticles** useful and would like to support my work, you can buy me a coffee. Your contributions help me dedicate more time to improving this library and creating new features for the community. Thank you for your support! ☕💖

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support%20My%20Work-orange?logo=buy-me-a-coffee&logoColor=white)](https://buymeacoffee.com/lukasz.okuniewicz)

---

## ✨ Features
- **Simple API**: Effortlessly create particle emitters with minimal code.
- **Highly Configurable**: Adjust particle behavior, appearance, animation, and more.
- **Performance Optimized**: Handle thousands of particles with minimal performance overhead.
- **PIXI.js Compatibility**: Fully compatible with **PIXI.js v8**, **PIXI.js v7**, with legacy support for v5.x and v6.x.
- **Real-Time Customization**: Dynamically update textures, positions, configurations, and emitters on the fly.
- **Shatter Effect**: Create dramatic sprite shattering effects with realistic physics and automatic cleanup.

---

## 🎮 Demo
Try it out here: [CustomPIXIParticles Live Editor](https://okuniewicz.eu/)

---

## 🛠️ Installation

Install via npm:

```bash
npm install custom-pixi-particles
```

---

## 🚀 Quick Start
Import or Require
```javascript
// ES6 Modules
import customPixiParticles from 'custom-pixi-particles'

// CommonJS
const customPixiParticles = require('custom-pixi-particles')
```

Create Particle Effects
```javascript
// Define textures and emitter configuration
const textures = ['texture1.png', 'texture2.png']
const emitterConfig = {
  // Your configuration object
}

// Initialize particle emitter
const particles = customPixiParticles.create({ textures, emitterConfig })

// Add emitter to the PIXI container
container.addChild(particles)

// Start the emitter
particles.play()
```

---

## 📖 API Reference
Initializes a particle emitter.
```javascript
const particles = customPixiParticles.create({
  textures: [String],             // Array of particle textures
  emitterConfig: Object,          // Configuration object for the emitter
  animatedSpriteZeroPad: Number,  // Zero-padding for animated sprite names
  animatedSpriteIndexToStart: Number, // Initial frame index for animated sprites
  finishingTextures: [String],    // Textures used for particle finishing
  vertices: Boolean,              // Use vertex mode for rendering
  position: Boolean,              // Allow position-based behavior
  rotation: Boolean,              // Allow rotation-based behavior
  uvs: Boolean,                   // Apply UV mapping
  tint: Boolean,                  // Apply tint to particles
  maxParticles: Number,           // Maximum particles allowed
  maxFPS: Number,                 // Cap emitter update frequency
  tickerSpeed: Number,            // Speed of the PIXI ticker
})
```

### Event Callbacks
Triggered when the particle animation completes.
```javascript
particles.onComplete = () => {
  console.log("Particle animation finished!")
}
```

### Texture Management
Updates the particle emitter's textures.
```javascript
particles.setTextures(['texture3.png', 'texture4.png'])
```

### Configuration Updates
Dynamically update emitter configurations.
```javascript
particles.updateConfig({ /* New configuration properties */ })
```

### State Control
Starts or resumes the emitter.
```javascript
particles.play()
```
Toggles the paused state.
```javascript
particles.pause(isPaused)
```
Terminates the emitter and stops emission.
```javascript
particles.stop()
```
Halts all emissions immediately.
```javascript
particles.stopImmediately()
```
Resets the emitter to its initial state.
```javascript
particles.resetEmitter()
```

### Position Updates
Dynamically adjust the emitter's position.
```javascript
particles.updatePosition({ x: 100, y: 200 })
```

### Pool Management
Clears internal object pools to free memory.
```javascript
particles.clearPool()
```

### Shatter Effect
Create a dramatic shattering effect that slices a sprite into fragments with realistic physics.

```javascript
import { ShatterEffect } from 'custom-pixi-particles'
import { Sprite, Texture } from 'pixi.js'

// Create a sprite to shatter
const sprite = new Sprite(Texture.from('my-image.png'))
sprite.anchor.set(0.5, 0.5)
sprite.x = 400
sprite.y = 300

// Create shatter effect with custom options
const shatterEffect = new ShatterEffect(sprite, {
  gridCols: 10,           // Number of horizontal grid divisions (default: 8)
  gridRows: 10,           // Number of vertical grid divisions (default: 8)
  baseVelocity: 400,      // Base velocity magnitude for fragments (default: 300)
  velocityVariance: 0.5,  // Random variance for velocity (default: 0.5)
  rotationSpeed: 2,       // Base rotation speed in radians per second (default: 2)
  rotationVariance: 1,    // Random variance for rotation speed (default: 1)
  gravity: 600,           // Gravity force applied to fragments (default: 500)
  lifetime: 2.5,          // Lifetime of fragments in seconds (default: 2)
  fadeOutDuration: 0.3    // Fade out duration at the end of lifetime (default: 0.3)
})

// Add to stage
app.stage.addChild(shatterEffect)

// Trigger explosion with optional completion callback
shatterEffect.Explode(() => {
  console.log('Shatter animation complete!')
  shatterEffect.destroy()
})
```

**ShatterEffect Methods:**
- `Explode(onComplete?)` - Triggers the shatter animation. Optionally accepts a callback when animation completes.
- `reset()` - Resets the effect to its initial state, allowing it to be triggered again.
- `destroy()` - Destroys the effect and cleans up all resources.

**Features:**
- Automatically slices sprites into a grid of fragments
- Each fragment radiates outward from the sprite's center with random variance
- Realistic physics with gravity and rotation
- Automatic cleanup and memory management using object pooling
- Smooth fade-out animation at the end of fragment lifetime

---

## 🖥️ Versions Compatibility
| PixiJS      | CustomPIXIParticles |
|-------------|---------------------|
| v5.x - v6.x | v4.x                |
| v7.x        | v7.x                |
| v8.x        | v8.x                |

---

## 🛠️ Advanced Editor
Easily design and fine-tune your particle effects with the CustomPIXIParticles Editor.
🔗 [CustomPIXIParticles Live Editor](https://okuniewicz.eu/)

---

## 🤝 Contributing
Contributions, feature suggestions, and bug reports are welcome! Open an issue or submit a pull request on the [GitHub repository](https://github.com/lukasz-okuniewicz/custom-pixi-particles).

---

With CustomPIXIParticles, you're not just building animations; you're crafting immersive experiences! 🌟
