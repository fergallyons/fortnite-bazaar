import { useState, useEffect, useMemo, useCallback } from 'react'
import './App.css'

const RARITY_PRICES = {
  common: 800,
  uncommon: 1200,
  rare: 1500,
  epic: 2000,
  legendary: 2000,
  mythic: 2800,
}

const SERIES_PRICES = {
  'marvel series': 1500,
  'dc series': 1500,
  'icon series': 1500,
  'gaming legends series': 2000,
  'dark series': 1500,
  'frozen series': 1500,
  'lava series': 1500,
  'slurp series': 1200,
  'shadow series': 1500,
  'star wars series': 2000,
}

const RARITY_COLORS = {
  common: '#bebebe',
  uncommon: '#69bb45',
  rare: '#49b9e9',
  epic: '#b44eed',
  legendary: '#f5a623',
  mythic: '#ffe533',
  'marvel series': '#ed1d24',
  'dc series': '#0078f0',
  'icon series': '#1db954',
  'gaming legends series': '#ff6b00',
  'dark series': '#7b2fff',
  'frozen series': '#a8d8ea',
  'lava series': '#ff4500',
  'slurp series': '#00c2c7',
  'star wars series': '#ffe81f',
  'shadow series': '#9b9b9b',
}

const RARITIES = ['All', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common']
const PAGE_SIZE = 60

function getSkinData(skin, shopPrices) {
  const entry = shopPrices[skin.id]
  if (entry) return { price: entry.finalPrice, inShop: true }
  const series = skin.series?.value?.toLowerCase()
  if (series && SERIES_PRICES[series]) return { price: SERIES_PRICES[series], inShop: false }
  const rarity = skin.rarity?.value?.toLowerCase()
  return { price: RARITY_PRICES[rarity] || 800, inShop: false }
}

function getRarityColor(skin) {
  const series = skin.series?.value?.toLowerCase()
  if (series && RARITY_COLORS[series]) return RARITY_COLORS[series]
  return RARITY_COLORS[skin.rarity?.value?.toLowerCase()] || '#bebebe'
}

function SkinCard({ skin, inShop, price }) {
  const color = getRarityColor(skin)
  const label = skin.series?.displayValue || skin.rarity?.displayValue || ''
  const imageUrl = skin.images?.icon || skin.images?.smallIcon

  return (
    <div className="skin-card" style={{ '--rc': color }}>
      {inShop && <span className="badge">In Shop</span>}
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
          {price?.toLocaleString()}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [skins, setSkins] = useState([])
  const [shopPrices, setShopPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [rarity, setRarity] = useState('All')
  const [sort, setSort] = useState('name')
  const [inShopOnly, setInShopOnly] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const load = async () => {
      try {
        const [cosRes, shopRes] = await Promise.all([
          fetch('https://fortnite-api.com/v2/cosmetics/br?language=en'),
          fetch('https://fortnite-api.com/v2/shop/br?language=en'),
        ])
        const [cosData, shopData] = await Promise.all([cosRes.json(), shopRes.json()])

        const outfits = (cosData.data || []).filter(i => i.type?.value === 'outfit')
        setSkins(outfits)

        const priceMap = {}
        for (const entry of shopData.data?.entries || []) {
          for (const item of entry.items || []) {
            if (item.type?.value === 'outfit') {
              priceMap[item.id] = entry
            }
          }
        }
        setShopPrices(priceMap)
      } catch {
        setError('Failed to load skins. Check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const processed = useMemo(() =>
    skins.map(s => ({ ...s, ...getSkinData(s, shopPrices) })),
    [skins, shopPrices]
  )

  const filtered = useMemo(() => {
    let result = processed

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(s => s.name?.toLowerCase().includes(q))
    }
    if (rarity !== 'All') {
      result = result.filter(s => s.rarity?.displayValue?.toLowerCase() === rarity.toLowerCase())
    }
    if (inShopOnly) {
      result = result.filter(s => s.inShop)
    }

    return [...result].sort((a, b) => {
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
  }, [processed, search, rarity, sort, inShopOnly])

  const resetPage = useCallback(() => setPage(1), [])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length
  const shopCount = Object.keys(shopPrices).length

  if (loading) return (
    <div className="full-center">
      <div className="spinner" />
      <p>Loading Fortnite skins…</p>
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
        <h1>Cameron's Fortnite Bazaar</h1>
        <p>{skins.length.toLocaleString()} outfits · {shopCount} in shop today</p>
      </header>

      <div className="controls">
        <input
          className="search"
          type="search"
          placeholder="Search skins…"
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage() }}
        />
        <div className="filter-row">
          <select value={rarity} onChange={e => { setRarity(e.target.value); resetPage() }}>
            {RARITIES.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="name">A – Z</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="newest">Newest First</option>
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
          <SkinCard key={skin.id} skin={skin} inShop={skin.inShop} price={skin.price} />
        ))}
      </div>

      {hasMore && (
        <div className="load-more">
          <button className="btn-more" onClick={() => setPage(p => p + 1)}>
            Load more ({filtered.length - visible.length} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
