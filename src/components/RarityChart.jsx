import { useMemo, useEffect } from 'react'
import { RARITY_COLORS } from '../utils'

const CHART_COLORS = [
  '#f5a623','#b44eed','#49b9e9','#69bb45','#bebebe',
  '#ed1d24','#0078f0','#1db954','#ff6b00','#ffe533',
]

const R = 62
const SW = 22
const CX = 90
const CY = 90
const CIRCUMFERENCE = 2 * Math.PI * R

function buildSegments(items) {
  const total = items.reduce((s, [, n]) => s + n, 0)
  let cumAngle = 0
  return items.map(([label, count], i) => {
    const fraction = count / total
    const dash = fraction * CIRCUMFERENCE
    const startAngle = cumAngle
    cumAngle += fraction * 360
    return {
      label, count,
      pct: Math.round(fraction * 100),
      dash,
      startAngle,
      color: RARITY_COLORS[label.toLowerCase()] || CHART_COLORS[i % CHART_COLORS.length],
    }
  })
}

export default function RarityChart({ skins, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const segments = useMemo(() => {
    const counts = {}
    skins.forEach(s => {
      const key = s.series?.displayValue || s.rarity?.displayValue || 'Other'
      counts[key] = (counts[key] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 9)
    const rest = sorted.slice(9).reduce((s, [, n]) => s + n, 0)
    if (rest > 0) top.push(['Other', rest])
    return buildSegments(top)
  }, [skins])

  const total = skins.length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="chart-inner" onClick={e => e.stopPropagation()}>
        <div className="chart-head">
          <h2>Skin Breakdown</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="chart-sub">{total.toLocaleString()} skins total</p>
        <div className="chart-body">
          <div className="donut-wrap">
            <svg viewBox={`0 0 ${CX * 2} ${CY * 2}`} className="donut-svg">
              <circle cx={CX} cy={CY} r={R} fill="none"
                stroke="var(--bg3)" strokeWidth={SW} />
              {segments.map(seg => (
                <circle
                  key={seg.label}
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={SW}
                  strokeDasharray={`${seg.dash} ${CIRCUMFERENCE - seg.dash}`}
                  strokeDashoffset={CIRCUMFERENCE / 4}
                  transform={`rotate(${seg.startAngle} ${CX} ${CY})`}
                />
              ))}
            </svg>
            <div className="donut-center">
              <span className="donut-total">{total.toLocaleString()}</span>
              <span className="donut-lbl">skins</span>
            </div>
          </div>
          <div className="chart-legend">
            {segments.map(seg => (
              <div key={seg.label} className="legend-row">
                <span className="legend-swatch" style={{ background: seg.color }} />
                <span className="legend-name">{seg.label}</span>
                <span className="legend-count">{seg.count.toLocaleString()}</span>
                <span className="legend-pct">{seg.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
