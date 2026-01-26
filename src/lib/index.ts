import * as controller from './emission'
import * as behaviour from './behaviour'
import * as parser from './parser'
import * as effects from './effects'
import Particle from './Particle'
import ParticlePool from './ParticlePool'
import { Duration, Emitter } from './emitter'
import { Color, Point, Random } from './util'

const cpp = {
  Particle,
  ParticlePool,
  parser,
  controller,
  behaviour,
  effects,
  Color,
  Point,
  Random,
  Duration,
  Emitter,
}

export default cpp
