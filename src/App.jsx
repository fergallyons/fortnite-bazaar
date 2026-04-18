import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import './App.css'
import SkinModal from './components/SkinModal'
import NewsSection from './components/NewsSection'
import SkeletonCard from './components/SkeletonCard'
import ShopCountdown from './components/ShopCountdown'
import RarityChart from './components/RarityChart'
import {
  getSkinPrice, getRarityColor, convertVBucks, formatCurrency,
  CURRENCIES, detectCurrency, FALLBACK_RATES, COSMETIC_TYPES,
} from './utils'

const RARITIES = ['All', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common']
const PAGE_SIZE = 60

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function SkinCard({ skin, currency, rates, onClick, isWishlisted, onWishlistToggle }) {
  const color = getRarityColor(skin)
  const label = skin.series?.displayValue || skin.rarity?.displayValue || ''
  const imageUrl = skin.images?.icon || skin.images?.smallIcon
  const localPrice = convertVBucks(skin.price, currency, rates)
  const neverSeen = !skin.shopHistory?.length && skin.type?.value === 'outfit'

  return (
    <div className="skin-card" style={{ '--rc': color }} onClick={() => onClick(skin)}>
      {skin.inShop && <span className="badge">In Shop</span>}
      {neverSeen && !skin.inShop && <span className="badge badge-unseen">Unseen</span>}
      <button
        className={`fav-btn ${isWishlisted ? 'active' : ''}`}
        onClick={e => { e.stopPropagation(); onWishlistToggle(skin.id) }}
        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        {isWishlisted ? '♥' : '♡'}
      </button>
      <div className="skin-img">
        {imageUrl
          ? <img src={imageUrl} alt={skin.name} loading="lazy" />
          : <span className="no-img">?</span>}
      </div>
      <div className="skin-info">
        <div className="skin-name" title={skin.name}>{skin.name}</div>
        <div className="skin-rarity">{label}</div>
        <div className="skin-price">
          <span className="vb">V</span>
          {skin.price?.toLocaleString()}
        </div>
        {localPrice != null && (
          <div className="skin-local-price">{formatCurrency(localPrice, currency)}</div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  // ── data ─────────────────────────────────────────────────
  const [allCosmetics, setAllCosmetics] = useState([])
  const [shopPriceMap, setShopPriceMap] = useState({})
  const [news, setNews] = useState([])
  const [rates, setRates] = useState(FALLBACK_RATES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── preferences (persisted) ───────────────────────────────
  const [currency, setCurrency] = useState(detectCurrency)
  const [wishlist, setWishlist] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('fn-wishlist') || '[]')) }
    catch { return new Set() }
  })
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  // ── ui state ──────────────────────────────────────────────
  const [activeType, setActiveType] = useState('outfit')
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState('All')
  const [seriesFilter, setSeriesFilter] = useState('All')
  const [sort, setSort] = useState('name')
  const [inShopOnly, setInShopOnly] = useState(false)
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [vbucksMax, setVbucksMax] = useState(13500)
  const [calcOpen, setCalcOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedSkin, setSelectedSkin] = useState(null)
  const [showChart, setShowChart] = useState(false)
  const [toast, setToast] = useState('')

  const deepIdRef = useRef(
    window.location.hash.startsWith('#skin=')
      ? window.location.hash.slice(6)
      : null
  )

  // ── data loading ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [cosData, shopData, newsData, ratesData] = await Promise.all([
        safeFetch('https://fortnite-api.com/v2/cosmetics/br?language=en'),
        safeFetch('https://fortnite-api.com/v2/shop?language=en'),
        safeFetch('https://fortnite-api.com/v2/news/br?language=en'),
        safeFetch('https://open.er-api.com/v6/latest/USD'),
      ])

      if (!cosData) {
        setError('Could not reach the Fortnite API. Check your connection and try again.')
        setLoading(false)
        return
      }

      setAllCosmetics(cosData.data || [])

      if (shopData) {
        const priceMap = {}
        for (const entry of shopData.data?.entries || []) {
          const price = entry.finalPrice || entry.regularPrice
          for (const item of entry.brItems || entry.items || []) {
            if (item.id) priceMap[item.id] = price
          }
        }
        setShopPriceMap(priceMap)

        // Local notification when shop resets
        const shopDate = shopData.data?.date
        const lastDate = localStorage.getItem('fn-shop-date')
        if (shopDate) {
          if (lastDate && lastDate !== shopDate && Notification.permission === 'granted') {
            navigator.serviceWorker?.ready.then(reg => {
              reg.active?.postMessage({ type: 'SHOP_UPDATED' })
            }).catch(() => {})
          }
          localStorage.setItem('fn-shop-date', shopDate)
        }
      }

      if (newsData) {
        const motds = newsData.data?.motds || newsData.data?.messages || []
        setNews(motds.filter(m => !m.hidden))
      }

      setRates(ratesData?.rates ? { USD: 1, ...ratesData.rates } : FALLBACK_RATES)
      setLoading(false)
    }
    load()
  }, [])

  // ── derived data ──────────────────────────────────────────
  const allProcessed = useMemo(
    () => allCosmetics.map(s => ({ ...s, ...getSkinPrice(s, shopPriceMap) })),
    [allCosmetics, shopPriceMap],
  )

  const processedSkins = useMemo(
    () => allProcessed.filter(s => s.type?.value === activeType),
    [allProcessed, activeType],
  )

  const shopSkins = useMemo(
    () => allProcessed.filter(s => s.inShop),
    [allProcessed],
  )

  const seriesList = useMemo(() => {
    const set = new Set()
    processedSkins.forEach(s => { if (s.series?.displayValue) set.add(s.series.displayValue) })
    return ['All', ...Array.from(set).sort()]
  }, [processedSkins])

  const filtered = useMemo(() => {
    let r = processedSkins

    if (search) {
      const q = search.toLowerCase()
      r = r.filter(s => s.name?.toLowerCase().includes(q))
    }
    if (rarityFilter !== 'All')
      r = r.filter(s => s.rarity?.displayValue?.toLowerCase() === rarityFilter.toLowerCase())
    if (seriesFilter !== 'All')
      r = r.filter(s => s.series?.displayValue === seriesFilter)
    if (inShopOnly) r = r.filter(s => s.inShop)
    if (wishlistOnly) r = r.filter(s => wishlist.has(s.id))
    if (calcOpen) r = r.filter(s => (s.price || 0) <= vbucksMax)

    return [...r].sort((a, b) => {
      if (sort === 'price-asc')  return (a.price || 0) - (b.price || 0)
      if (sort === 'price-desc') return (b.price || 0) - (a.price || 0)
      if (sort === 'newest') {
        const ac = parseInt(a.introduction?.chapter || '1')
        const bc = parseInt(b.introduction?.chapter || '1')
        if (bc !== ac) return bc - ac
        return parseInt(b.introduction?.season || '0') - parseInt(a.introduction?.season || '0')
      }
      if (sort === 'never-seen') {
        const aLen = a.shopHistory?.length || 0
        const bLen = b.shopHistory?.length || 0
        if (!aLen && bLen) return -1
        if (aLen && !bLen) return 1
        if (!aLen && !bLen) return (a.name || '').localeCompare(b.name || '')
        const aLast = Math.max(...a.shopHistory.map(d => new Date(d)))
        const bLast = Math.max(...b.shopHistory.map(d => new Date(d)))
        return aLast - bLast
      }
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [processedSkins, search, rarityFilter, seriesFilter, sort, inShopOnly, wishlistOnly, wishlist, calcOpen, vbucksMax])

  const visible = filtered.slice(0, page * PAGE_SIZE)

  // ── deep link — open skin after cosmetics load ─────────────
  useEffect(() => {
    if (!deepIdRef.current || !allProcessed.length) return
    const skin = allProcessed.find(s => s.id === deepIdRef.current)
    if (skin) { setSelectedSkin(skin); deepIdRef.current = null }
  }, [allProcessed])

  // ── sync URL hash with open modal ─────────────────────────
  useEffect(() => {
    if (selectedSkin) {
      window.history.replaceState(null, '', `#skin=${selectedSkin.id}`)
    } else {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [selectedSkin])

  // ── callbacks ─────────────────────────────────────────────
  const resetPage = useCallback(() => setPage(1), [])

  const resetFilters = useCallback(() => {
    setSearch(''); setRarityFilter('All'); setSeriesFilter('All')
    setInShopOnly(false); setPage(1)
  }, [])

  const toggleWishlist = useCallback(id => {
    setWishlist(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('fn-wishlist', JSON.stringify([...next]))
      return next
    })
  }, [])

  const openRandom = useCallback(() => {
    if (!processedSkins.length) return
    setSelectedSkin(processedSkins[Math.floor(Math.random() * processedSkins.length)])
  }, [processedSkins])

  const showToast = useCallback(msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }, [])

  const requestNotifications = useCallback(async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    if (result === 'granted') showToast('Notifications enabled!')
  }, [showToast])

  // ── loading state — show skeleton grid ────────────────────
  if (loading) return (
    <div className="app">
      <header className="header">
        <div className="header-top"><h1>Cameron's Fortnite Bazaar</h1></div>
      </header>
      <div className="grid" style={{ marginTop: 24 }}>
        {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="full-center">
      <p className="err">{error}</p>
      <button className="btn-reload" onClick={() => window.location.reload()}>Retry</button>
    </div>
  )

  const activeTypeLabel = COSMETIC_TYPES.find(t => t.value === activeType)?.label || 'Skins'
  const calcBudgetPrice = formatCurrency(convertVBucks(vbucksMax, currency, rates), currency)

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-top">
          <h1>Cameron's Fortnite Bazaar</h1>
          <div className="header-actions">
            <select className="currency-select" value={currency}
              onChange={e => setCurrency(e.target.value)} title="Currency">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button className="icon-btn" onClick={() => setShowChart(true)} title="Skin stats">📊</button>
            {notifPermission !== 'denied' && (
              <button
                className={`icon-btn ${notifPermission === 'granted' ? 'bell-active' : ''}`}
                onClick={notifPermission === 'default' ? requestNotifications : undefined}
                title={notifPermission === 'granted' ? 'Shop notifications on' : 'Enable shop notifications'}
              >
                {notifPermission === 'granted' ? '🔔' : '🔕'}
              </button>
            )}
          </div>
        </div>
        <p className="header-sub">
          {allCosmetics.length.toLocaleString()} cosmetics
          {shopSkins.length > 0 && ` · ${shopSkins.length} in shop today`}
          {wishlist.size > 0 && ` · ${wishlist.size} wishlisted`}
        </p>
      </header>

      <NewsSection items={news} />

      {/* ── Today's Shop ── */}
      {shopSkins.length > 0 && (
        <section className="shop-section">
          <h2 className="section-title">
            <span className="section-dot" />
            Today's Shop
            <ShopCountdown />
          </h2>
          <div className="shop-strip">
            {shopSkins.map(skin => (
              <div key={skin.id} className="shop-strip-item">
                <SkinCard
                  skin={skin} currency={currency} rates={rates}
                  onClick={setSelectedSkin}
                  isWishlisted={wishlist.has(skin.id)}
                  onWishlistToggle={toggleWishlist}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Type tabs ── */}
      <div className="type-tabs">
        {COSMETIC_TYPES.map(t => (
          <button
            key={t.value}
            className={`type-tab ${activeType === t.value ? 'active' : ''}`}
            onClick={() => { setActiveType(t.value); resetFilters() }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="controls">
        <input
          className="search" type="search" placeholder={`Search ${activeTypeLabel.toLowerCase()}…`}
          value={search} onChange={e => { setSearch(e.target.value); resetPage() }}
        />
        <div className="filter-row">
          <select value={rarityFilter} onChange={e => { setRarityFilter(e.target.value); resetPage() }}>
            {RARITIES.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={seriesFilter} onChange={e => { setSeriesFilter(e.target.value); resetPage() }}>
            {seriesList.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="name">A – Z</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="newest">Newest</option>
            <option value="never-seen">Never in Shop</option>
          </select>
          <button className={`btn-shop${inShopOnly ? ' active' : ''}`}
            onClick={() => { setInShopOnly(v => !v); resetPage() }}>
            In Shop
          </button>
          <button
            className={`btn-shop${wishlistOnly ? ' active' : ''}`}
            onClick={() => { setWishlistOnly(v => !v); resetPage() }}
            title="Wishlist"
          >
            ♥{wishlist.size > 0 ? ` ${wishlist.size}` : ''}
          </button>
          <button className="btn-shop" onClick={openRandom} title="Random skin">🎲</button>
          <button
            className={`btn-shop${calcOpen ? ' active' : ''}`}
            onClick={() => setCalcOpen(v => !v)}
            title="V-Bucks calculator"
          >
            💰
          </button>
        </div>
      </div>

      {/* ── V-Bucks Calculator ── */}
      {calcOpen && (
        <div className="vbucks-panel">
          <div className="vbucks-readout">
            Budget: <span className="vb-inline">V</span>
            <strong>{vbucksMax.toLocaleString()}</strong>
            <span className="vb-local"> ≈ {calcBudgetPrice}</span>
          </div>
          <input
            className="vbucks-slider"
            type="range" min={100} max={13500} step={100}
            value={vbucksMax}
            onChange={e => { setVbucksMax(Number(e.target.value)); resetPage() }}
          />
          <div className="vbucks-range-labels">
            <span>100</span><span>13,500</span>
          </div>
        </div>
      )}

      {/* ── Result count ── */}
      <p className="result-count">
        {filtered.length.toLocaleString()} {activeTypeLabel.toLowerCase()}
        {calcOpen && vbucksMax < 13500 && (
          <span className="vb-chip">
            ≤ {vbucksMax.toLocaleString()} V-Bucks
            <button className="chip-clear" onClick={() => { setVbucksMax(13500); setCalcOpen(false) }}>✕</button>
          </span>
        )}
      </p>

      {/* ── Skin Grid ── */}
      <div className="grid">
        {visible.map(skin => (
          <SkinCard
            key={skin.id} skin={skin} currency={currency} rates={rates}
            onClick={setSelectedSkin}
            isWishlisted={wishlist.has(skin.id)}
            onWishlistToggle={toggleWishlist}
          />
        ))}
      </div>

      {visible.length < filtered.length && (
        <div className="load-more">
          <button className="btn-more" onClick={() => setPage(p => p + 1)}>
            Load more ({(filtered.length - visible.length).toLocaleString()} remaining)
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {selectedSkin && (
        <SkinModal
          skin={selectedSkin}
          allSkins={processedSkins}
          currency={currency}
          rates={rates}
          onClose={() => setSelectedSkin(null)}
          onSelect={setSelectedSkin}
          isWishlisted={wishlist.has(selectedSkin.id)}
          onWishlistToggle={() => toggleWishlist(selectedSkin.id)}
          showToast={showToast}
        />
      )}
      {showChart && (
        <RarityChart skins={processedSkins} onClose={() => setShowChart(false)} />
      )}

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
