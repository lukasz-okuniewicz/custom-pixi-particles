import { describe, expect, it } from 'vitest'
import Duration from './Duration'

describe('Duration', () => {
  it('treats maxTime <= 0 as no duration cap', () => {
    const d = new Duration()
    d.maxTime = -1
    d.update(999)
    expect(d.isTimeElapsed()).toBe(false)
  })

  it('isTimeElapsed when elapsed meets positive maxTime', () => {
    const d = new Duration()
    d.maxTime = 100
    d.update(50)
    expect(d.isTimeElapsed()).toBe(false)
    d.update(50)
    expect(d.isTimeElapsed()).toBe(true)
  })

  it('stop forces isTimeElapsed', () => {
    const d = new Duration()
    d.maxTime = 10000
    d.update(1)
    expect(d.isTimeElapsed()).toBe(false)
    d.stop()
    expect(d.isTimeElapsed()).toBe(true)
  })

  it('start clears stop flag for elapsed check', () => {
    const d = new Duration()
    d.maxTime = -1
    d.stop()
    expect(d.isTimeElapsed()).toBe(true)
    d.start()
    expect(d.isTimeElapsed()).toBe(false)
  })

  it('reset clears stop and elapsed', () => {
    const d = new Duration()
    d.maxTime = 10
    d.stop()
    d.update(20)
    d.reset()
    expect(d.isTimeElapsed()).toBe(false)
    d.update(10)
    expect(d.isTimeElapsed()).toBe(true)
  })
})
