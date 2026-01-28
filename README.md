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
  minFPS: Number,                 // Minimum FPS threshold (default: 30)
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
  mode: 'radial',         // 'radial', 'directional', or 'swirl'.
  explosionPower: 1000,   // Velocity of the fragments (default: 1000)
  enableRotation: true,   // Whether fragments spin (default: true)
  rotationStrength: 1.0,  // Multiplier for fragment spin speed (default: 1.0)
  gravity: 600,           // Gravity force applied to fragments (default: 500)
  friction: 0.96,         // Velocity air resistance (default: 0.96)
  turbulence: 0.2,        // Randomness of fragment angles (default: 0.2)
  lifetime: 2.5,          // Lifetime of fragments in seconds (default: 2)
  fadeOutDuration: 0.3,   // Fade out duration at the end of lifetime (default: 0.3)
  endTint: 0xFFFFFF       // Color to lerp toward as fragments die (default: 0xFFFFFF)
})

// Add to stage
app.stage.addChild(shatterEffect)

// Trigger explosion with optional completion callback
shatterEffect.Explode().then(() => {
  console.log("Boom! Animation complete.");
  effect.destroy();
});

// Or Simple Usage (Static Method)
await ShatterEffect.shatter(mySprite, {
  gridCols: 10,
  gridRows: 10,
  explosionPower: 1200,
  enableRotation: true,
  rotationStrength: 1.5
});
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

### Dissolve Effect
Create a smooth dissolving effect that breaks sprites into pixelated fragments that drift away.

```javascript
import { DissolveEffect } from 'custom-pixi-particles'
import { Sprite, Texture } from 'pixi.js'

const sprite = new Sprite(Texture.from('my-image.png'))
sprite.anchor.set(0.5, 0.5)
sprite.x = 400
sprite.y = 300

const dissolveEffect = new DissolveEffect(sprite, {
  pixelSize: 2,              // Size of each fragment (default: 2)
  edgeSoftness: 0.5,         // Softness of dissolve edges (default: 0.5)
  driftStrength: 50,        // How far fragments drift (default: 50)
  noiseIntensity: 0.3,       // Randomness in dissolve pattern (default: 0.3)
  lifetime: 2.5,             // How long fragments last (default: 2.5)
  fadeOutDuration: 0.3,      // Fade out time at end (default: 0.3)
  direction: 'center-out',   // 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' | 'center-out' (default: 'center-out')
  windAngle: 0               // Wind direction in radians (default: 0)
})

app.stage.addChild(dissolveEffect)

// Trigger dissolve with optional completion callback
dissolveEffect.dissolve().then(() => {
  console.log("Dissolve complete!")
  dissolveEffect.destroy()
})
```

**DissolveEffect Methods:**
- `dissolve(onComplete?)` - Triggers the dissolve animation. Optionally accepts a callback when animation completes.
- `reset()` - Resets the effect to its initial state.
- `destroy()` - Destroys the effect and cleans up all resources.

### Magnetic Assembly Effect
Create an effect where fragments assemble together to form a sprite, with various assembly modes.

```javascript
import { MagneticAssemblyEffect } from 'custom-pixi-particles'
import { Sprite, Texture } from 'pixi.js'

const sprite = new Sprite(Texture.from('my-image.png'))
sprite.anchor.set(0.5, 0.5)
sprite.x = 400
sprite.y = 300

const assemblyEffect = new MagneticAssemblyEffect(sprite, {
  gridCols: 10,              // Number of horizontal divisions (default: 10)
  gridRows: 10,              // Number of vertical divisions (default: 10)
  duration: 1.5,             // Assembly duration in seconds (default: 1.5)
  easing: 'back.out',       // Easing function: 'back.out' | 'power1.inOut' | 'bounce.out' | 'linear' (default: 'back.out')
  scatterRange: 200,         // How far fragments start from target (default: 200)
  stagger: 0.1,              // Delay between fragments (0-1, default: 0.1)
  mode: 'random-scatter',    // 'random-scatter' | 'from-center' | 'off-screen' | 'vortex' (default: 'random-scatter')
  startAlpha: 0              // Initial alpha of fragments (default: 0)
})

app.stage.addChild(assemblyEffect)

// Trigger assembly
assemblyEffect.assemble().then(() => {
  console.log("Assembly complete!")
})
```

**MagneticAssemblyEffect Methods:**
- `assemble(onComplete?)` - Triggers the assembly animation. Optionally accepts a callback when animation completes.
- `reset()` - Resets the effect to its initial state.
- `destroy()` - Destroys the effect and cleans up all resources.

### Ghost Effect
Create a trailing ghost/echo effect that follows a sprite's movement, perfect for motion trails.

```javascript
import { GhostEffect } from 'custom-pixi-particles'
import { Sprite, Texture, BLEND_MODES } from 'pixi.js'

const sprite = new Sprite(Texture.from('my-image.png'))
sprite.anchor.set(0.5, 0.5)

const ghostEffect = new GhostEffect(sprite, {
  spawnInterval: 0.05,       // Seconds between echo spawns (default: 0.05)
  ghostLifetime: 0.5,        // How long each echo stays visible (default: 0.5)
  startAlpha: 0.6,           // Initial transparency (default: 0.6)
  endAlpha: 0,               // Final transparency (default: 0)
  startTint: 0xFFFFFF,       // Initial color (default: 0xFFFFFF)
  endTint: 0x00AAFF,         // Target color (default: 0x00AAFF)
  blendMode: BLEND_MODES.ADD, // Blend mode (default: BLEND_MODES.NORMAL)
  maxGhosts: 20              // Maximum active echoes (default: 20)
})

app.stage.addChild(ghostEffect)
app.stage.addChild(sprite)

// Start tracking (ghosts will follow sprite movement)
ghostEffect.start()

// Stop tracking
ghostEffect.stop()

// Clean up
ghostEffect.destroy()
```

**GhostEffect Methods:**
- `start()` - Begins generating ghost echoes.
- `stop()` - Stops generating new echoes (existing ones fade out).
- `destroy()` - Destroys the effect and cleans up all resources.

### Glitch Effect
Create a digital glitch effect with RGB splitting, flickering, and horizontal displacement.

```javascript
import { GlitchEffect } from 'custom-pixi-particles'
import { Sprite, Texture } from 'pixi.js'

const sprite = new Sprite(Texture.from('my-image.png'))
sprite.anchor.set(0.5, 0.5)
sprite.x = 400
sprite.y = 300

const glitchEffect = new GlitchEffect(sprite, {
  slices: 15,                 // Number of horizontal strips (default: 15)
  offsetRange: 30,            // Max horizontal shift in pixels (default: 30)
  flickerIntensity: 0.3,      // Probability of slice disappearing (0-1, default: 0.3)
  rgbSplit: true,             // Enable RGB channel separation (default: true)
  rgbOffset: 10,              // How far R/G/B channels drift apart (default: 10)
  duration: 1.0,              // How long the glitch lasts (default: 1.0)
  refreshRate: 0.05           // How often patterns change in seconds (default: 0.05)
})

app.stage.addChild(glitchEffect)

// Trigger glitch
glitchEffect.glitch().then(() => {
  console.log("Glitch complete!")
  glitchEffect.destroy()
})
```

**GlitchEffect Methods:**
- `glitch(onComplete?)` - Triggers the glitch animation. Optionally accepts a callback when animation completes.
- `reset()` - Resets the effect to its initial state.
- `destroy()` - Destroys the effect and cleans up all resources.

### Melt Effect
Create a liquid melting effect where sprites appear to melt and drip downward with realistic physics.

```javascript
import { MeltEffect } from 'custom-pixi-particles'
import { Sprite, Texture } from 'pixi.js'

const sprite = new Sprite(Texture.from('my-image.png'))
sprite.anchor.set(0.5, 0.5)
sprite.x = 400
sprite.y = 300

const meltEffect = new MeltEffect(sprite, {
  gridCols: 10,               // Number of horizontal divisions (default: 10)
  gridRows: 10,               // Number of vertical divisions (default: 10)
  gravity: 1200,              // Downward force (default: 1200)
  viscosity: 0.98,            // Friction/resistance (default: 0.98)
  horizontalSpread: 50,       // Sideways movement amount (default: 50)
  duration: 3.0,              // Effect duration (default: 3.0)
  blurAmount: 6,              // Liquid blur intensity (default: 6)
  threshold: 0.5              // Alpha clipping point 0-1 (default: 0.5)
})

app.stage.addChild(meltEffect)

// Trigger melt
meltEffect.melt().then(() => {
  console.log("Melt complete!")
  meltEffect.destroy()
})
```

**MeltEffect Methods:**
- `melt(onComplete?)` - Triggers the melt animation. Optionally accepts a callback when animation completes.
- `reset()` - Resets the effect to its initial state.
- `destroy()` - Destroys the effect and cleans up all resources.

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
