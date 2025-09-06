import ccxt, { Exchange, pro } from 'ccxt';

const cachedExchanges = new Map<string, Exchange>()
export async function getBlankExchange(exchangeName: string) {
  const cachedKey = exchangeName
  if (cachedExchanges.has(cachedKey)) {
    return cachedExchanges.get(cachedKey)!
  }

  if (exchangeName == 'hyperliquid') {
    const exchange = new pro.hyperliquid({
      "options": {
        "enableRateLimit": true
      }
    })

    cachedExchanges.set(cachedKey, exchange)
    return exchange
  } else if (exchangeName == 'paradex') {
    const exchange = new ccxt.paradex()
    cachedExchanges.set(cachedKey, exchange)
    return exchange
  }

  throw new Error(`Unsupported exchange: ${exchangeName}`)
}