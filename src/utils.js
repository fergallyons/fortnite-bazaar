export const VBUCK_TO_USD = 7.99 / 1000

// Used when the live exchange rate API is unavailable
export const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, AUD: 1.55, CAD: 1.37,
  JPY: 149, KRW: 1330, BRL: 4.97, MXN: 17.1, INR: 83.1,
  SGD: 1.34, CHF: 0.89, NZD: 1.63, NOK: 10.6, SEK: 10.4,
  DKK: 6.88, PLN: 3.99, TRY: 30.5, ZAR: 18.8,
}

export const RARITY_PRICES = {
  common: 800, uncommon: 1200, rare: 1500,
  epic: 2000, legendary: 2000, mythic: 2800,
}

export const SERIES_PRICES = {
  'marvel series': 1500, 'dc series': 1500, 'icon series': 1500,
  'gaming legends series': 2000, 'dark series': 1500,
  'frozen series': 1500, 'lava series': 1500, 'slurp series': 1200,
  'shadow series': 1500, 'star wars series': 2000,
}

export const RARITY_COLORS = {
  common: '#bebebe', uncommon: '#69bb45', rare: '#49b9e9',
  epic: '#b44eed', legendary: '#f5a623', mythic: '#ffe533',
  'marvel series': '#ed1d24', 'dc series': '#0078f0',
  'icon series': '#1db954', 'gaming legends series': '#ff6b00',
  'dark series': '#7b2fff', 'frozen series': '#a8d8ea',
  'lava series': '#ff4500', 'slurp series': '#00c2c7',
  'star wars series': '#ffe81f', 'shadow series': '#9b9b9b',
}

export function getSkinPrice(skin, shopPriceMap) {
  const shopPrice = shopPriceMap[skin.id]
  if (shopPrice) return { price: shopPrice, inShop: true }
  const series = skin.series?.value?.toLowerCase()
  if (series && SERIES_PRICES[series]) return { price: SERIES_PRICES[series], inShop: false }
  const rarity = skin.rarity?.value?.toLowerCase()
  return { price: RARITY_PRICES[rarity] || 800, inShop: false }
}

export function getRarityColor(skin) {
  const series = skin.series?.value?.toLowerCase()
  if (series && RARITY_COLORS[series]) return RARITY_COLORS[series]
  return RARITY_COLORS[skin.rarity?.value?.toLowerCase()] || '#bebebe'
}

export function convertVBucks(vbucks, currency, rates) {
  if (!rates || !vbucks) return null
  const usd = vbucks * VBUCK_TO_USD
  const rate = rates[currency] || 1
  return usd * rate
}

export function formatCurrency(amount, currency) {
  if (amount == null) return ''
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount)
}

export const COSMETIC_TYPES = [
  { value: 'outfit',    label: 'Outfits' },
  { value: 'backbling', label: 'Back Bling' },
  { value: 'pickaxe',   label: 'Pickaxes' },
  { value: 'glider',    label: 'Gliders' },
  { value: 'emote',     label: 'Emotes' },
]

export const CURRENCIES = [
  'USD','EUR','GBP','AUD','CAD','JPY','KRW','BRL',
  'MXN','INR','SGD','CHF','NZD','NOK','SEK','DKK','PLN','TRY','ZAR',
]

export const LOCALE_CURRENCY = {
  'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD',
  'en-IE': 'EUR', 'en-NZ': 'NZD', 'en-SG': 'SGD', 'en-ZA': 'ZAR',
  'de': 'EUR', 'fr': 'EUR', 'es': 'EUR', 'it': 'EUR', 'nl': 'EUR',
  'pt-BR': 'BRL', 'ja': 'JPY', 'ko': 'KRW', 'tr': 'TRY', 'pl': 'PLN',
  'sv': 'SEK', 'no': 'NOK', 'da': 'DKK', 'fi': 'EUR', 'el': 'EUR', 'ga': 'EUR',
}

export function detectCurrency() {
  const lang = navigator.language || 'en-US'
  return LOCALE_CURRENCY[lang] || LOCALE_CURRENCY[lang.split('-')[0]] || 'USD'
}
