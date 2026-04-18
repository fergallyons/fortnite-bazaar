import { useEffect, useMemo, useState } from 'react'
import { getRarityColor, convertVBucks, formatCurrency } from '../utils'

function ShopHistory({ dates }) {
  if (!dates?.length) return (
    <div className="modal-meta-block">
      <span className="modal-label">Shop history</span>
      <span className="never-seen-tag">Never in shop</span>
    </div>
  )
  const recent = [...dates].sort((a, b) => new Date(b) - new Date(a)).slice(0, 5)
  return (
    <div className="modal-meta-block">
      <span className="modal-label">Shop history</span>
      <div className="shop-history">
        {recent.map(d => (
          <span key={d} className="history-date">
            {new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        ))}
      </div>
    </div>
  )
}

function SimilarCard({ skin, onSelect }) {
  const color = getRarityColor(skin)
  const img = skin.images?.icon || skin.images?.smallIcon
  return (
    <div className="similar-card" style={{ '--rc': color }} onClick={() => onSelect(skin)}>
      {img && <img src={img} alt={skin.name} loading="lazy" />}
      <span className="similar-name">{skin.name}</span>
    </div>
  )
}

export default function SkinModal({
  skin, allSkins, currency, rates,
  onClose, onSelect, isWishlisted, onWishlistToggle, showToast,
}) {
  const color = getRarityColor(skin)
  const localPrice = convertVBucks(skin.price, currency, rates)
  const featuredImg = skin.images?.featured || skin.images?.icon
  const label = skin.series?.displayValue || skin.rarity?.displayValue || ''
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const similar = useMemo(() => {
    const bySameSet = skin.set?.value
      ? allSkins.filter(s => s.id !== skin.id && s.set?.value === skin.set.value)
      : []
    if (bySameSet.length >= 3) return bySameSet.slice(0, 8)
    if (skin.series?.value) {
      return allSkins
        .filter(s => s.id !== skin.id && s.series?.value === skin.series.value)
        .slice(0, 8)
    }
    return bySameSet
  }, [skin, allSkins])

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#skin=${skin.id}`
    setSharing(true)
    setTimeout(() => setSharing(false), 2000)
    try {
      if (navigator.share) {
        await navigator.share({ title: skin.name, text: `Check out ${skin.name}!`, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast?.('Link copied!')
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        showToast?.('Link copied!')
      } catch { /* clipboard unavailable */ }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-action-row">
          <button
            className={`fav-btn-modal ${isWishlisted ? 'active' : ''}`}
            onClick={onWishlistToggle}
            title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isWishlisted ? '♥' : '♡'}
          </button>
          <button className="share-btn" onClick={handleShare} title="Share skin">
            {sharing ? '✓' : '↗'}
          </button>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-hero" style={{ '--rc': color }}>
          {featuredImg && <img src={featuredImg} alt={skin.name} />}
          <div className="modal-hero-fade" />
        </div>

        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-name">{skin.name}</h2>
            <span className="modal-rarity" style={{ color }}>{label}</span>
            {skin.set?.text && <span className="modal-set">{skin.set.text}</span>}
          </div>

          {skin.description && (
            <p className="modal-description">{skin.description}</p>
          )}

          <div className="modal-price-block">
            <div className="modal-vbucks">
              <span className="vb">V</span>
              {skin.price?.toLocaleString()} V-Bucks
            </div>
            {localPrice != null && (
              <div className="modal-local-price">≈ {formatCurrency(localPrice, currency)}</div>
            )}
          </div>

          <div className="modal-meta">
            {skin.introduction?.text && (
              <div className="modal-meta-block">
                <span className="modal-label">Introduced</span>
                <span>{skin.introduction.text}</span>
              </div>
            )}
            {skin.series?.displayValue && (
              <div className="modal-meta-block">
                <span className="modal-label">Series</span>
                <span style={{ color }}>{skin.series.displayValue}</span>
              </div>
            )}
            <ShopHistory dates={skin.shopHistory} />
          </div>
        </div>

        {similar.length > 0 && (
          <div className="modal-similar">
            <h3 className="modal-similar-title">
              {skin.set?.value ? `More from ${skin.set.value}` : `More ${label}`}
            </h3>
            <div className="similar-grid">
              {similar.map(s => (
                <SimilarCard key={s.id} skin={s} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
