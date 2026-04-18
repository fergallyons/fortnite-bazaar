import { useState, useEffect, useMemo, useCallback } from 'react'
import './App.css'
import SkinModal from './components/SkinModal'
import NewsSection from './components/NewsSection'
import {
  getSkinPrice, getRarityColor, convertVBucks, formatCurrency,
  CURRENCIES, detectCurrency, FALLBACK_RATES,
} from './utils'

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const RARITIES = ['All', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common']
const PAGE_SIZE = 60

function SkinCard({ skin, currency, rates, onClick }) {
  const color = getRarityColor(skin)
  const label = skin.series?.displayValue || skin.rarity?.displayValue || ''
  const imageUrl = skin.images?.icon || skin.images?.smallIcon
  const localPrice = convertVBucks(skin.price, currency, rates)

  return (
    <div className="skin-card" style={{ '--rc': color }} onClick={() => onClick(skin)}>
      {skin.inShop && <span className="badge">In Shop</span>}
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
  const [skins, setSkins] = useState([])
  const [shopPriceMap, setShopPriceMap] = useState({})
  const [news, setNews] = useState([])
  const [rates, setRates] = useState({ USD: 1 })
  const [currency, setCurrency] = useState(detectCurrency)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState('All')
  const [seriesFilter, setSeriesFilter] = useState('All')
  const [sort, setSort] = useState('name')
  const [inShopOnly, setInShopOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedSkin, setSelectedSkin] = useState(null)
  const [showNews, setShowNews] = useState(false)

  useEffect(() => {
    const load = async () => {
      // Cosmetics is the only required API — everything else degrades gracefully
      const [cosData, shopData, newsData, ratesData] = await Promise.all([
        safeFetch('https://fortnite-api.com/v2/cosmetics/br?language=en'),
        safeFetch('https://fortnite-api.com/v2/shop/br/combined?language=en'),
        safeFetch('https://fortnite-api.com/v2/news/br?language=en'),
        safeFetch('https://open.er-api.com/v6/latest/USD'),
      ])

      if (!cosData) {
        setError('Could not reach the Fortnite API. Check your connection and try again.')
        setLoading(false)
        return
      }

      setSkins((cosData.data || []).filter(i => i.type?.value === 'outfit'))

      if (shopData) {
        const priceMap = {}
        for (const entry of shopData.data?.entries || []) {
          const price = entry.finalPrice || entry.regularPrice
          for (const item of entry.items || []) {
            if (item.id) priceMap[item.id] = price
          }
        }
        setShopPriceMap(priceMap)
      }

      if (newsData) {
        const motds = newsData.data?.motds || newsData.data?.messages || []
        setNews(motds.filter(m => !m.hidden))
      }

      // open.er-api.com uses `rates`, frankfurter used `rates` too — fall back to hardcoded if missing
      const liveRates = ratesData?.rates
      setRates(liveRates ? { USD: 1, ...liveRates } : FALLBACK_RATES)

      setLoading(false)
    }
    load()
  }, [])

  const processedSkins = useMemo(
    () => skins.map(s => ({ ...s, ...getSkinPrice(s, shopPriceMap) })),
    [skins, shopPriceMap],
  )

  const seriesList = useMemo(() => {
    const set = new Set()
    skins.forEach(s => { if (s.series?.displayValue) set.add(s.series.displayValue) })
    return ['All', ...Array.from(set).sort()]
  }, [skins])

  const shopSkins = useMemo(
    () => processedSkins.filter(s => s.inShop),
    [processedSkins],
  )

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
    if (inShopOnly)
      r = r.filter(s => s.inShop)

    return [...r].sort((a, b) => {
      if (sort === 'price-asc') return (a.price || 0) - (b.price || 0)
      if (sort === 'price-desc') return (b.price || 0) - (a.price || 0)
      if (sort === 'newest') {
        const ac = parseInt(a.introduction?.chapter || '1')
        const bc = parseInt(b.introduction?.chapter || '1')
        if (bc !== ac) return bc - ac
        return parseInt(b.introduction?.season || '0') - parseInt(a.introduction?.season || '0')
      }
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [processedSkins, search, rarityFilter, seriesFilter, sort, inShopOnly])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const resetPage = useCallback(() => setPage(1), [])

  if (loading) return (
    <div className="full-center">
      <div className="spinner" />
      <p>Loading Cameron's Fortnite Bazaar…</p>
    </div>
  )

  if (error) return (
    <div className="full-center">
      <p className="err">{error}</p>
      <button className="btn-reload" onClick={() => window.location.reload()}>Retry</button>
    </div>
  )

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>Cameron's Fortnite Bazaar</h1>
          <select
            className="currency-select"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            title="Change currency"
          >
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <p className="header-sub">
          {skins.length.toLocaleString()} outfits ·{' '}
          <button className="link-btn" onClick={() => setShowNews(v => !v)}>
            {showNews ? 'hide' : 'show'} news
          </button>
          {shopSkins.length > 0 && ` · ${shopSkins.length} in shop today`}
        </p>
      </header>

      {showNews && <NewsSection items={news} />}

      {shopSkins.length > 0 && (
        <section className="shop-section">
          <h2 className="section-title">
            <span className="section-dot" />
            Today's Shop
          </h2>
          <div className="shop-strip">
            {shopSkins.map(skin => (
              <div key={skin.id} className="shop-strip-item">
                <SkinCard skin={skin} currency={currency} rates={rates} onClick={setSelectedSkin} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="controls">
        <input
          className="search"
          type="search"
          placeholder="Search skins…"
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage() }}
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
          </select>
          <button
            className={`btn-shop${inShopOnly ? ' active' : ''}`}
            onClick={() => { setInShopOnly(v => !v); resetPage() }}
          >
            In Shop
          </button>
        </div>
      </div>

      <p className="result-count">{filtered.length.toLocaleString()} skins</p>

      <div className="grid">
        {visible.map(skin => (
          <SkinCard
            key={skin.id}
            skin={skin}
            currency={currency}
            rates={rates}
            onClick={setSelectedSkin}
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

      {selectedSkin && (
        <SkinModal
          skin={selectedSkin}
          allSkins={processedSkins}
          currency={currency}
          rates={rates}
          onClose={() => setSelectedSkin(null)}
          onSelect={setSelectedSkin}
        />
      )}
    </div>
  )
}
