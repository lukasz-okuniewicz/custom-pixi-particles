# custom-pixi-particles by [@lukasz-okuniewicz](http://github.com/lukasz-okuniewicz)

**custom-pixi-particles** is a lightweight, high-performance library designed for creating and managing customizable particle effects in **PIXI.js** applications. It offers an intuitive API, flexible configuration options, and seamless compatibility with modern PIXI.js versions, making it an essential tool for developers looking to create stunning visual effects.

## 📑 Table of Contents

- [Features](#-features)
- [Demo](#-demo)
- [Installation](#️-installation)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Configuration Guide](#-configuration-guide)
  - [Emission Types](#emission-types)
  - [Behaviours](#behaviours)
- [Examples](#-examples)
- [Performance Tips](#-performance-tips)
- [Troubleshooting](#-troubleshooting)
- [Special Effects](#special-effects)
  - [Shatter Effect](#shatter-effect)
  - [Dissolve Effect](#dissolve-effect)
  - [Magnetic Assembly Effect](#magnetic-assembly-effect)
  - [Ghost Effect](#ghost-effect)
  - [Glitch Effect](#glitch-effect)
  - [Melt Effect](#melt-effect)
- [Versions Compatibility](#️-versions-compatibility)
- [Advanced Editor](#️-advanced-editor)
- [Contributing](#-contributing)

---

### Support My Work
If you find **custom-pixi-particles** useful and would like to support my work, you can buy me a coffee. Your contributions help me dedicate more time to improving this library and creating new features for the community. Thank you for your support! ☕💖

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
Try it out here: [custom-pixi-particles Live Editor](https://okuniewicz.eu/)

---

## 🛠️ Installation

Install via npm:

```bash
npm install custom-pixi-particles
```

---

## 🚀 Quick Start

### Import or Require
```javascript
// ES6 Modules
import customPixiParticles from 'custom-pixi-particles'

// CommonJS
const customPixiParticles = require('custom-pixi-particles')
```

### Basic Example
```javascript
import { Application } from 'pixi.js'
import customPixiParticles from 'custom-pixi-particles'

// Create PIXI application
const app = new Application()
await app.init({ width: 800, height: 600 })
document.body.appendChild(app.canvas)

// Define textures and emitter configuration
const textures = ['particle.png']
const emitterConfig = {
  behaviours: [
    {
      priority: 10000,
      enabled: true,
      maxLifeTime: 2,
      timeVariance: 0.5,
      name: 'LifeBehaviour',
    },
    {
      priority: 100,
      enabled: true,
      position: { x: 400, y: 300 },
      positionVariance: { x: 0, y: 0 },
      velocity: { x: 0, y: -50 },
      velocityVariance: { x: 20, y: 10 },
      acceleration: { x: 0, y: 50 },
      accelerationVariance: { x: 0, y: 0 },
      name: 'PositionBehaviour',
    },
    {
      priority: 0,
      enabled: true,
      allowNegativeValues: false,
      sizeStart: { x: 10, y: 10 },
      sizeEnd: { x: 5, y: 5 },
      startVariance: 2,
      endVariance: 1,
      name: 'SizeBehaviour',
    },
    {
      priority: 0,
      enabled: true,
      start: { _r: 255, _g: 100, _b: 0, _alpha: 1 },
      end: { _r: 255, _g: 200, _b: 0, _alpha: 0 },
      startVariance: { _r: 0, _g: 0, _b: 0, _alpha: 0 },
      endVariance: { _r: 0, _g: 0, _b: 0, _alpha: 0 },
      sinus: false,
      name: 'ColorBehaviour',
    },
  ],
  emitController: {
    _maxParticles: 1000,
    _maxLife: 1,
    _emitPerSecond: 50,
    name: 'UniformEmission',
  },
  duration: -1,
  alpha: 1,
  blendMode: 0,
}

// Initialize particle emitter
const particles = customPixiParticles.create({ 
  textures, 
  emitterConfig,
  maxParticles: 1000
})

// Add emitter to the PIXI container
app.stage.addChild(particles)

// Start the emitter
particles.play()
```

---

## 📖 API Reference

### Creating a Particle Emitter

Initializes a particle emitter with the specified configuration.

```javascript
const particles = customPixiParticles.create({
  textures: [String],             // Array of particle texture paths or PIXI.Texture objects
  emitterConfig: Object,          // Configuration object for the emitter (see Configuration section)
  animatedSpriteZeroPad: Number,  // Zero-padding for animated sprite names (default: 2)
  animatedSpriteIndexToStart: Number, // Initial frame index for animated sprites (default: 0)
  finishingTextures: [String],    // Textures used for particle finishing animations
  vertices: Boolean,              // Use vertex mode for rendering (default: true)
  position: Boolean,              // Allow position-based behavior (default: true)
  rotation: Boolean,              // Allow rotation-based behavior (default: true)
  uvs: Boolean,                   // Apply UV mapping (default: true)
  tint: Boolean,                  // Apply tint to particles (default: true)
  maxParticles: Number,           // Maximum particles allowed (default: 10000)
  maxFPS: Number,                 // Cap emitter update frequency (default: 60)
  minFPS: Number,                 // Minimum FPS threshold (default: 30)
  tickerSpeed: Number,            // Speed of the PIXI ticker (default: 0.02)
})
```

### Configuration Object Structure

The `emitterConfig` object contains all the settings for your particle system:

```javascript
const emitterConfig = {
  // Emission Control
  emitController: {
    name: 'UniformEmission',      // 'UniformEmission' | 'StandardEmission' | 'RandomEmission'
    _maxParticles: 1000,          // Maximum particles (for Standard/Random)
    _maxLife: 1,                  // Maximum lifetime (for Standard/Random)
    _emitPerSecond: 50,           // Particles per second (for Uniform)
    _emissionRate: 100,           // Emission rate (for Standard/Random)
  },
  
  // Global Settings
  duration: -1,                   // Emitter duration in seconds (-1 = infinite)
  alpha: 1,                       // Global alpha (0-1)
  blendMode: 0,                   // PIXI.js blend mode
  
  // Behaviours Array
  behaviours: [
    // See Behaviours section for details
  ],
}
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

## 🎨 Special Effects

The library includes several pre-built special effects for common use cases.

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

## 📚 Configuration Guide

### Emission Types

The library supports three emission types that control how particles are emitted:

#### 1. Uniform Emission
Particles are emitted at a consistent rate per second.

```javascript
emitController: {
  name: 'UniformEmission',
  _emitPerSecond: 50,  // Particles emitted per second
}
```

#### 2. Standard Emission
Particles are emitted up to a maximum count with a defined rate.

```javascript
emitController: {
  name: 'StandardEmission',
  _maxParticles: 1000,      // Maximum particles that can exist
  _maxLife: 1,               // Maximum lifetime
  _emissionRate: 100,       // Emission rate
}
```

#### 3. Random Emission
Particles are emitted randomly with variance.

```javascript
emitController: {
  name: 'RandomEmission',
  _maxParticles: 1000,
  _maxLife: 1,
  _emissionRate: 100,
}
```

### Behaviours

Behaviours define how particles behave throughout their lifetime. Each behaviour has a `priority` (higher = processed first) and can be `enabled` or disabled.

#### Custom behaviours (IBehaviour)

You can add your own behaviours by implementing the **IBehaviour** interface (or extending the base **Behaviour** class) and registering them with **BehaviourRegistry**. Custom behaviours can then be used by name in your emitter config (e.g. from JSON or the editor).

```javascript
import { Behaviour, BehaviourRegistry, customPixiParticles } from 'custom-pixi-particles'

// Extend Behaviour and implement required methods
class MyCustomBehaviour extends Behaviour {
  enabled = true
  priority = 0
  getName() { return 'MyCustomBehaviour' }
  getProps() { return { enabled: this.enabled, priority: this.priority, name: this.getName() } }
  init(particle, model, turbulencePool) { /* ... */ }
  apply(particle, deltaTime, model) { /* ... */ }
}

// Register so config can create it by name
BehaviourRegistry.register('MyCustomBehaviour', MyCustomBehaviour)

// Your emitter config can now include: { behaviours: [{ name: 'MyCustomBehaviour', ... }] }
```

You can also add a custom behaviour instance at runtime: get the emitter from your renderer and call `emitter.behaviours.add(myCustomBehaviour)`.

#### Life Behaviour
Controls particle lifetime.

```javascript
{
  priority: 10000,           // High priority (processed first)
  enabled: true,
  maxLifeTime: 2,            // Maximum lifetime in seconds
  timeVariance: 0.5,         // Random variance in lifetime
  name: 'LifeBehaviour',
}
```

#### Position Behaviour
Controls particle position, velocity, and acceleration.

```javascript
{
  priority: 100,
  enabled: true,
  position: { x: 400, y: 300 },           // Initial position
  positionVariance: { x: 10, y: 10 },     // Position randomness
  velocity: { x: 0, y: -50 },             // Initial velocity
  velocityVariance: { x: 20, y: 10 },     // Velocity randomness
  acceleration: { x: 0, y: 50 },           // Constant acceleration
  accelerationVariance: { x: 0, y: 0 },    // Acceleration randomness
  name: 'PositionBehaviour',
}
```

#### Spawn Behaviour
Defines where and how particles spawn. Supports multiple spawn types.

```javascript
{
  priority: 100,
  enabled: true,
  customPoints: [
    {
      spawnType: 'Rectangle',  // See Spawn Types below
      position: { x: 0, y: 0 },
      positionVariance: { x: 100, y: 100 },
      // ... spawn type specific properties
    },
  ],
  trailingEnabled: false,      // Enable trail effects
  spawnAlongTrail: false,     // Spawn along entire trail
  trailSpeed: 1,              // Trail animation speed
  name: 'SpawnBehaviour',
}
```

**Available Spawn Types:**
- `Rectangle` - Uniform distribution in a rectangular area
- `Ring` - Circular particle arrangement
- `Star` - Star-shaped distribution with configurable points
- `Grid` - Organized grid with rows and columns
- `Word` - Particles form text/word shapes
- `Sphere` - 3D sphere-shaped spawning
- `Cone` - Conical distribution with customizable angles
- `Frame` - Particles along frame edges
- `FrameRectangle` - Rectangular frame outline
- `Bezier` - Particles follow Bezier curve paths
- `Helix` - Spiral helix with adjustable pitch and turns
- `Heart` - Heart-shaped formations
- `Lissajous` - Complex figure-eight-like paths
- `Spring` - Spring-like patterns with coiled loops
- `Path` - Custom path defined by points
- `Oval` - Elliptical distributions

#### Size Behaviour
Controls particle size over time.

```javascript
{
  priority: 0,
  enabled: true,
  allowNegativeValues: false,
  sizeStart: { x: 10, y: 10 },      // Initial size
  sizeEnd: { x: 5, y: 5 },          // Final size
  startVariance: 2,                 // Size start randomness
  endVariance: 1,                   // Size end randomness
  name: 'SizeBehaviour',
}
```

#### Color Behaviour
Controls particle color and alpha over time.

```javascript
{
  priority: 0,
  enabled: true,
  start: { _r: 255, _g: 100, _b: 0, _alpha: 1 },    // Start color (RGBA)
  end: { _r: 255, _g: 200, _b: 0, _alpha: 0 },      // End color (RGBA)
  startVariance: { _r: 0, _g: 0, _b: 0, _alpha: 0 }, // Color start variance
  endVariance: { _r: 0, _g: 0, _b: 0, _alpha: 0 },   // Color end variance
  sinus: false,                                       // Use sine wave interpolation
  name: 'ColorBehaviour',
}
```

#### Rotation Behaviour
Controls particle rotation.

```javascript
{
  priority: 0,
  enabled: true,
  rotation: 0,          // Initial rotation in radians
  variance: 0.2,         // Rotation randomness
  name: 'RotationBehaviour',
}
```

#### Angular Velocity Behaviour
Controls particle spin speed.

```javascript
{
  priority: 0,
  enabled: true,
  angularVelocity: 1,   // Rotation speed
  variance: 0.5,        // Speed randomness
  name: 'AngularVelocityBehaviour',
}
```

#### Emit Direction Behaviour
Controls initial emission direction.

```javascript
{
  priority: 0,
  enabled: true,
  angle: 0,             // Emission angle in radians
  variance: 0.5,        // Angle randomness
  name: 'EmitDirectionBehaviour',
}
```

#### Turbulence Behaviour
Adds random motion to particles.

```javascript
{
  priority: 0,
  enabled: true,
  strength: 10,         // Turbulence strength
  scale: 0.1,           // Noise scale
  speed: 1,             // Turbulence speed
  name: 'TurbulenceBehaviour',
}
```

#### Collision Behaviour
Handles particle collisions with boundaries.

```javascript
{
  priority: 0,
  enabled: true,
  bounce: 0.5,          // Bounce coefficient (0-1)
  bounds: {              // Collision boundaries
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  },
  name: 'CollisionBehaviour',
}
```

#### Attraction/Repulsion Behaviour
Particles attract or repel from points.

```javascript
{
  priority: 0,
  enabled: true,
  points: [
    {
      x: 400,
      y: 300,
      strength: 100,     // Positive = attraction, Negative = repulsion
      radius: 200,       // Effect radius
    },
  ],
  name: 'AttractionRepulsionBehaviour',
}
```

#### Noise-Based Motion Behaviour
Uses Perlin noise for organic movement.

```javascript
{
  priority: 0,
  enabled: true,
  strength: 50,         // Noise strength
  scale: 0.01,           // Noise scale
  speed: 1,              // Animation speed
  name: 'NoiseBasedMotionBehaviour',
}
```

#### Force Fields Behaviour
Applies force fields to particles.

```javascript
{
  priority: 0,
  enabled: true,
  fields: [
    {
      type: 'vortex',    // 'vortex' | 'wind' | 'gravity'
      position: { x: 400, y: 300 },
      strength: 100,
      radius: 200,
    },
  ],
  name: 'ForceFieldsBehaviour',
}
```

#### Timeline Behaviour
Controls particle properties over time with keyframes.

```javascript
{
  priority: 0,
  enabled: true,
  keyframes: [
    { time: 0, property: 'alpha', value: 1 },
    { time: 0.5, property: 'alpha', value: 0.5 },
    { time: 1, property: 'alpha', value: 0 },
  ],
  name: 'TimelineBehaviour',
}
```

#### Grouping Behaviour
Groups particles together.

```javascript
{
  priority: 0,
  enabled: true,
  groupSize: 5,           // Particles per group
  cohesion: 0.5,         // Group cohesion strength
  name: 'GroupingBehaviour',
}
```

#### Sound Reactive Behaviour
Reacts to audio input.

```javascript
{
  priority: 0,
  enabled: true,
  audioSource: audioContext,  // Web Audio API source
  sensitivity: 1,            // Reaction sensitivity
  frequencyRange: [0, 1000], // Frequency range to react to
  name: 'SoundReactiveBehaviour',
}
```

#### Light Effect Behaviour
Adds lighting effects to particles.

```javascript
{
  priority: 0,
  enabled: true,
  lights: [
    {
      position: { x: 400, y: 300 },
      intensity: 1,
      radius: 200,
      color: 0xFFFFFF,
    },
  ],
  name: 'LightEffectBehaviour',
}
```

#### Stretch Behaviour
Stretches particles based on velocity.

```javascript
{
  priority: 0,
  enabled: true,
  stretchFactor: 2,      // Stretch multiplier
  minStretch: 1,          // Minimum stretch
  maxStretch: 5,         // Maximum stretch
  name: 'StretchBehaviour',
}
```

#### Temperature Behaviour
Simulates temperature effects.

```javascript
{
  priority: 0,
  enabled: true,
  temperature: 100,      // Base temperature
  variance: 20,          // Temperature variance
  name: 'TemperatureBehaviour',
}
```

#### Move To Point Behaviour
Moves particles toward specific points.

```javascript
{
  priority: 0,
  enabled: true,
  target: { x: 400, y: 300 },
  speed: 100,            // Movement speed
  easing: 0.1,           // Easing factor
  name: 'MoveToPointBehaviour',
}
```

---

## 💡 Examples

### Fire Effect
```javascript
const fireConfig = {
  behaviours: [
    {
      priority: 10000,
      enabled: true,
      maxLifeTime: 1.5,
      timeVariance: 0.5,
      name: 'LifeBehaviour',
    },
    {
      priority: 100,
      enabled: true,
      position: { x: 400, y: 500 },
      positionVariance: { x: 20, y: 0 },
      velocity: { x: 0, y: -80 },
      velocityVariance: { x: 15, y: 20 },
      acceleration: { x: 0, y: -30 },
      name: 'PositionBehaviour',
    },
    {
      priority: 0,
      enabled: true,
      sizeStart: { x: 20, y: 20 },
      sizeEnd: { x: 5, y: 5 },
      name: 'SizeBehaviour',
    },
    {
      priority: 0,
      enabled: true,
      start: { _r: 255, _g: 100, _b: 0, _alpha: 1 },
      end: { _r: 255, _g: 0, _b: 0, _alpha: 0 },
      name: 'ColorBehaviour',
    },
  ],
  emitController: {
    _emitPerSecond: 100,
    name: 'UniformEmission',
  },
  duration: -1,
  alpha: 1,
  blendMode: 2, // ADD blend mode
}

const fire = customPixiParticles.create({
  textures: ['flame.png'],
  emitterConfig: fireConfig,
})
```

### Explosion Effect
```javascript
const explosionConfig = {
  behaviours: [
    {
      priority: 10000,
      enabled: true,
      maxLifeTime: 0.5,
      timeVariance: 0.2,
      name: 'LifeBehaviour',
    },
    {
      priority: 100,
      enabled: true,
      customPoints: [{
        spawnType: 'Ring',
        radius: 0,
        position: { x: 400, y: 300 },
      }],
      velocity: { x: 0, y: 0 },
      velocityVariance: { x: 200, y: 200 },
      acceleration: { x: 0, y: 100 },
      name: 'SpawnBehaviour',
    },
    {
      priority: 100,
      enabled: true,
      position: { x: 400, y: 300 },
      name: 'PositionBehaviour',
    },
    {
      priority: 0,
      enabled: true,
      sizeStart: { x: 15, y: 15 },
      sizeEnd: { x: 5, y: 5 },
      name: 'SizeBehaviour',
    },
    {
      priority: 0,
      enabled: true,
      start: { _r: 255, _g: 255, _b: 0, _alpha: 1 },
      end: { _r: 255, _g: 0, _b: 0, _alpha: 0 },
      name: 'ColorBehaviour',
    },
  ],
  emitController: {
    _maxParticles: 500,
    _maxLife: 1,
    _emissionRate: 1000,
    name: 'StandardEmission',
  },
  duration: 0.1,
}

const explosion = customPixiParticles.create({
  textures: ['spark.png'],
  emitterConfig: explosionConfig,
})
explosion.play()
```

### Text Effect
```javascript
const textConfig = {
  behaviours: [
    {
      priority: 10000,
      enabled: true,
      maxLifeTime: 2,
      name: 'LifeBehaviour',
    },
    {
      priority: 100,
      enabled: true,
      customPoints: [{
        spawnType: 'Word',
        word: 'Hello',
        fontSize: 100,
        fontSpacing: 5,
        particleDensity: 1,
        position: { x: 400, y: 300 },
      }],
      velocity: { x: 0, y: 0 },
      name: 'SpawnBehaviour',
    },
    {
      priority: 0,
      enabled: true,
      sizeStart: { x: 3, y: 3 },
      sizeEnd: { x: 3, y: 3 },
      name: 'SizeBehaviour',
    },
    {
      priority: 0,
      enabled: true,
      start: { _r: 255, _g: 255, _b: 255, _alpha: 1 },
      end: { _r: 255, _g: 255, _b: 255, _alpha: 1 },
      name: 'ColorBehaviour',
    },
  ],
  emitController: {
    _maxParticles: 1000,
    _maxLife: 1,
    _emissionRate: 500,
    name: 'StandardEmission',
  },
  duration: 0.1,
}
```

---

## ⚡ Performance Tips

1. **Limit Particle Count**: Use `maxParticles` to cap the number of active particles
2. **Optimize Textures**: Use small, optimized texture files
3. **Disable Unused Features**: Set `vertices`, `rotation`, `tint` to `false` if not needed
4. **Use Object Pooling**: The library automatically pools particles - avoid creating new emitters frequently
5. **FPS Capping**: Use `maxFPS` and `minFPS` to control update frequency
6. **Batch Updates**: Update multiple emitters in a single frame when possible
7. **Clean Up**: Call `destroy()` and `clearPool()` when done with emitters

---

## 🐛 Troubleshooting

### Particles Not Appearing
- Check that textures are loaded before creating the emitter
- Verify `emitterConfig` structure is correct
- Ensure emitter is added to the stage and `play()` is called
- Check that behaviours are enabled

### Performance Issues
- Reduce `maxParticles` count
- Lower `_emitPerSecond` or `_emissionRate`
- Disable unused behaviours
- Use simpler spawn types (avoid complex paths)

### Particles Not Following Expected Path
- Check behaviour priorities (higher priority = processed first)
- Verify position, velocity, and acceleration values
- Ensure SpawnBehaviour is configured correctly for your spawn type

### Memory Leaks
- Always call `destroy()` on emitters when done
- Use `clearPool()` periodically for long-running applications
- Avoid creating new emitters every frame

---

## 🎯 Common Use Cases

### Game Effects
- **Explosions**: Use burst emission with high velocity variance
- **Fire/Smoke**: Continuous emission with upward velocity and color gradients
- **Magic Spells**: Combine multiple emitters with different spawn types
- **Hit Effects**: Short-duration bursts with radial emission
- **Trails**: Use GhostEffect for character movement trails

### UI Effects
- **Button Hover**: Subtle particle bursts on interaction
- **Loading Animations**: Continuous particle streams
- **Transitions**: Dissolve or shatter effects for scene changes
- **Notifications**: Brief particle celebrations

### Visual Effects
- **Text Animations**: Use Word spawn type for text effects
- **Background Ambiance**: Low-intensity continuous emitters
- **Weather Effects**: Rain, snow, or leaves with appropriate physics
- **Particle Art**: Create artistic patterns with custom spawn paths

---

## 🔧 Best Practices

1. **Start Simple**: Begin with basic behaviours and add complexity gradually
2. **Use the Editor**: Leverage the visual editor to prototype effects quickly
3. **Profile Performance**: Monitor FPS and particle counts during development
4. **Reuse Configurations**: Save and reuse emitter configs for consistency
5. **Test on Target Devices**: Performance varies across devices - test early
6. **Clean Up Properly**: Always destroy emitters when switching scenes
7. **Optimize Textures**: Use texture atlases and appropriate sizes
8. **Layer Effects**: Combine multiple emitters for complex effects

---

## 🖥️ Versions Compatibility
| PixiJS      | custom-pixi-particles |
|-------------|-----------------------|
| v5.x - v6.x | v4.x                  |
| v7.x        | v7.x                  |
| v8.x        | v8.x                  |

---

## 🛠️ Advanced Editor
Easily design and fine-tune your particle effects with the custom-pixi-particles Editor.
🔗 [custom-pixi-particles Live Editor](https://okuniewicz.eu/)

---

## 🤝 Contributing
Contributions, feature suggestions, and bug reports are welcome! Open an issue or submit a pull request on the [GitHub repository](https://github.com/lukasz-okuniewicz/custom-pixi-particles).

---

With custom-pixi-particles, you're not just building animations; you're crafting immersive experiences! 🌟
