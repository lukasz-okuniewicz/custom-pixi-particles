CustomPIXIParticles by [@lukasz-okuniewicz](http://github.com/lukasz-okuniewicz)
=========

Custom PIXI Particles.

How to use:
```
npm install custom-pixi-particles
```

then:
```javascript
const customPIXIParticles = require('custom-pixi-particles')
// or
import customPIXIParticles from 'custom-pixi-particles'
```

```javascript
// Define array of textures
const textures = ['texture1.png', 'texture2.png']
// Define generated emiter config
const emitterConfig = {...}
// Create particles
this.particles = customParticles.create({ textures, emitterConfig })
// Add particles to PIXI container
container.addChild(this.particles)
```

```javascript
// On complete
this.particles.onComplete = () => {
  //...
}
```

```javascript
// Define array of new textures
const newTextures = ['texture3.png', 'texture4.png']
// Change textures
this.particles.setTextures(newTextures)
```
