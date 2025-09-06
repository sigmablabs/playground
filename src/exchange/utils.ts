import { Exchange } from "ccxt";

const ASSET_MAPPING: Record<string, string> = {
  'BTC:spot:hyperliquid': 'UBTC',
  'ETH:spot:hyperliquid': 'UETH',
  'FARTCOIN:spot:hyperliquid': 'UFART',
  'PUMP:spot:hyperliquid': 'UPUMP',
};

export const resolveAsset = (asset: string, marketType: string, exchangeId: string): string => {
  return ASSET_MAPPING[`${asset}:${marketType}:${exchangeId}`] || asset;
};

export const resolveUnitAsset = (asset: string) : string => {
  return asset.replaceAll('UBTC', 'BTC').replaceAll('UETH', 'ETH').replaceAll('UFART', 'FARTCOIN').replace('UPUMP', 'PUMP')
}

export async function precision(exchange: Exchange, asset: string, marketType: string = 'perpetual'): Promise<{ amountPrecision: number, amountDecimals: number, pricePrecision: number, priceDecimals: number }> {
  const symbol = await getExchangeSymbol(exchange, asset, marketType)
  if (!symbol) {
    throw new Error(`No valid symbol found for ${asset}`);
  }

  const market = exchange.market(symbol);

  const amountPrecision = Number(market.precision.amount);
  const pricePrecision = Number(market.precision.price || 1);

  // Transform price into the required format
  const amountDecimals = Math.log10(1 / amountPrecision)
  const priceDecimals = Math.log10(1 / pricePrecision)

  return {
    amountPrecision: amountPrecision,
    amountDecimals: amountDecimals,
    pricePrecision: pricePrecision,
    priceDecimals: priceDecimals
  }
}

export async function getAssetDecimals(exchange: Exchange, asset: string, marketType: string = 'perpetual'): Promise<{ amountDecimals: number, priceDecimals: number }> {
  const assetPrecision = await precision(exchange, asset, marketType)
  return {
    amountDecimals: Math.log10(1 / assetPrecision.amountPrecision),
    priceDecimals: Math.log10(1 / assetPrecision.pricePrecision)
  }
}

export function getAssetFromSymbol(symbol: string) {
  if (symbol.includes('/')) {
    return symbol.split('/')[0]
  } else if (symbol.includes(':')) {
    return symbol.split(':')[0]
  } else {
    return symbol
  }
}

export async function getExchangeSymbol(exchange: Exchange, asset: string, marketType: string = 'perpetual'): Promise<string | null> {
  const resolvedAsset = resolveAsset(asset, marketType, exchange.id);

  try {
    if (!exchange.markets || Object.keys(exchange.markets).length == 0) {
      console.log('Loading markets for exchange', exchange.id);
      await exchange.loadMarkets();
    }

    // Common quote currencies by exchange
    const quoteMap: Record<string, string[]> = {
      'binanceusdm': ['USDT'],
      'hyperliquid': ['USDC'],
      'bybit': ['USDT'],
      'paradex': ['USDC'],
      // Add more exchanges as needed
    };

    const quotes = quoteMap[exchange.id] || ['USDT', 'USDC'];

    // Try each quote currency
    for (const quote of quotes) {
      let symbol = ''

      if (marketType === 'perpetual') {
        if (exchange.id == 'paradex') {
          symbol = `${resolvedAsset}/USD:${quote}`;
        } else {
          symbol = `${resolvedAsset}/${quote}:${quote}`;
        }
      } else if (marketType === 'spot') {
        symbol = `${resolvedAsset}/${quote}`;
      }

      if (exchange.markets[symbol]) {
        return symbol;
      }
    }

    console.log(`No matching symbol found for ${resolvedAsset} on ${exchange.id}`);
    return null;

  } catch (error) {
    console.error(`Failed to get symbol for ${resolvedAsset} on ${exchange.id}:`, error);
    return null;
  }
}