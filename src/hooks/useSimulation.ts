import { useState, useRef, useCallback, useEffect } from 'react'
import { SimStatus, RouteInfo } from '../types'

interface SimState {
  status: SimStatus
  progress: number
  speed: number
}

export function useSimulation(route: RouteInfo | null) {
  const [sim, setSim] = useState<SimState>({ status: 'idle', progress: 0, speed: 1 })
  const raf = useRef<number>()
  const prog = useRef(0)
  const spd = useRef(1)
  const last = useRef(0)

  const tick = useCallback((ts: number) => {
    const dt = ts - last.current
    last.current = ts
    if (dt > 0 && dt < 200) {
      prog.current = Math.min(1, prog.current + 0.0003 * spd.current * (dt / 16))
      setSim(prevSim => ({ ...prevSim, progress: prog.current }))
      if (prog.current >= 1) {
        setSim(p => ({ ...p, status: 'idle', progress: 1 }))
        return
      }
    }
    raf.current = requestAnimationFrame(tick)
  }, [])

  const play = useCallback(() => {
    if (!route) return
    if (prog.current >= 1) {
      prog.current = 0
    }

    setSim(prevSim => ({ ...prevSim, status: 'playing', progress: prog.current }))
    last.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  }, [route, tick])

  const pause = useCallback(() => {
    setSim(prev => ({ ...prev, status: 'paused' }))
    if (raf.current) {
      cancelAnimationFrame(raf.current);
    }
  }, [])

  const reset = useCallback(() => {
    if (raf.current) {
      cancelAnimationFrame(raf.current);
    }
    prog.current = 0
    setSim({ status: 'idle', progress: 0, speed: spd.current })
  }, [])

  const setSpeed = useCallback((speed: number) => {
    spd.current = speed
    setSim(prev => ({ ...prev, speed: speed }))
  }, [])

  const setProgress = useCallback((newProgress: number) => {
    prog.current = Math.max(0, Math.min(1, newProgress))
    setSim(prev => ({ ...prev, progress: prog.current }))
  }, [])

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current)
  }, []);

  useEffect(() => {
    reset()
  }, [route, reset]);

  return { sim, play, pause, reset, setSpeed, setProgress }
}
