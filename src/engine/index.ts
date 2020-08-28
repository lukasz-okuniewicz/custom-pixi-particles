import * as controller from './emission'
import * as behaviour from './behaviour'
import * as parser from './parser'
import Particle from './Particle'
import ParticlePool from './ParticlePool'
import { Duration, Emitter } from './emitter'
import { Color, Point, Random } from './util'

const customPixiParticles = {
  Particle,
  ParticlePool,
  parser,
  controller,
  behaviour,
  Color,
  Point,
  Random,
  Duration,
  Emitter,
}

export default customPixiParticles
