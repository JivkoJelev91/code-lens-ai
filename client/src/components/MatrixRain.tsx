import { useEffect, useRef } from 'react'
import '@/components/MatrixRain.scss'

const GLYPHS = 'アイウエオカキクケコ0123456789<>/{}[]#'
const FONT_SIZE = 18
const DROP_SPEED = 50 // higher = slower

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    let width = 0
    let height = 0
    let columns = 0
    let drops: number[] = []
    let frameId = 0
    let lastTime = 0

    const resize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      columns = Math.floor(width / FONT_SIZE)

      drops = Array.from(
        { length: columns },
        () => Math.floor(Math.random() * (-height / FONT_SIZE)),
      )

      context.fillStyle = '#000'
      context.fillRect(0, 0, width, height)
    }

    const draw = (time: number) => {
      if (time - lastTime < DROP_SPEED) {
        frameId = requestAnimationFrame(draw)
        return
      }

      lastTime = time

      context.fillStyle = 'rgba(0, 0, 0, 0.08)'
      context.fillRect(0, 0, width, height)
      context.font = `${FONT_SIZE}px monospace`

      for (let i = 0; i < columns; i++) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        const x = i * FONT_SIZE
        const y = drops[i] * FONT_SIZE

        if (Math.random() > 0.975) {
          context.fillStyle = '#b4ffb4'
          context.fillText(glyph, x, y - FONT_SIZE)
        }

        context.fillStyle = '#00ff41'
        context.fillText(glyph, x, y)

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0
        }

        drops[i]++
      }

      frameId = requestAnimationFrame(draw)
    }

    resize()
    frameId = requestAnimationFrame(draw)

    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="matrix-rain" />
}

export default MatrixRain