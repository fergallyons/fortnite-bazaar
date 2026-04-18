import { useState, useEffect } from 'react'

export default function ShopCountdown() {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const next = new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1
      ))
      const diff = next - now
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(`resets in ${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return <span className="shop-countdown">{label}</span>
}
