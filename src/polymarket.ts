import { getBlankExchange, getExchangeSymbol } from "./exchange";
import { round, percentage } from "./utils";

import { ClobClient } from '@polymarket/clob-client';

// Configuration
const HOST = 'https://clob.polymarket.com'; // Polymarket CLOB API endpoint

// Initialize ClobClient without authentication
const client = new ClobClient(HOST);

type PredictionConfig = {
  platform: string
  conditions: PredictionCondition[]
}

type PredictionCondition = {
  name: string
  conditionID: string
  type: string
  strike: number
  asset: string
  amplifier: number
  betAmount: number
}

// for price_up type, we only care about No side because it offers the best risk/reward
async function calculateBetPriceUp(asset: string, strike: number, noPrice: number, amplifier: number, betAmount: number) {
  const exchange = await getBlankExchange("hyperliquid")
  const symbol = await getExchangeSymbol(exchange, asset, "perpetual")
  const ticker = await exchange.fetchTicker(symbol!)
  const underlyingPrice = Number(ticker.last, 0)


  const priceDiff = strike - underlyingPrice

  const numOfShares = betAmount / noPrice
  const maxProfit = numOfShares - betAmount

  // this hedge make sure that once price hit strike, we break even. If amplifier applied, we expect to net profit
  // hedgeAmount * (strike - underlyingPrice) = betAmount * amplifier
  const hedgeAmount = betAmount / priceDiff * amplifier

  // this is in case price goes against us (goes down in 'price_up' type setup).
  // we expect profit from bet side to cover the loss from hedge side.
  // hedgeAmount * (breakevenPrice - underlyingPrice) + maxProfit = 0
  const breakevenPrice = - maxProfit / hedgeAmount + underlyingPrice

  // this is the profit/loss at strike price. if amplifier applied, we expect to net profit
  const pnlAtStrike = hedgeAmount * priceDiff - betAmount

  return {
      side: "no",
      askPrice: noPrice,
      numOfShares,
      maxProfit,
      hedgeAmount,
      breakevenPrice,
      pnlAtStrike,
      range: `${percentage(strike / underlyingPrice - 1, 2)} | ${percentage(breakevenPrice / underlyingPrice - 1, 2)}`
  }
}

async function calculateBet(condition: PredictionCondition) {
  const { conditionID, type, strike, asset, amplifier, betAmount } = condition

  if (type === "price_up") {
    const market = await client.getMarket(conditionID)
    const noPrice = market.tokens[1].price
    return await calculateBetPriceUp(asset, strike, noPrice, amplifier, betAmount)
  }

  return {
    side: "unknown",
    askPrice: 0,
    numOfShares: 0,
    maxProfit: 0,
    hedgeAmount: 0,
    breakevenPrice: 0,
    pnlAtStrike: 0,
    range: ""
  }
}

(async () => {
  while (true) {
    try {
      const configs = [
        {
          platform: "polymarket",
          conditions: [
            {
              name: "Solana to $240 before 2026",
              conditionID: "0xbaca1fc480ef849872e8537a48d5e43938e217bbc2f5b2882de80a05611185c5",
              type: "price_up",
              strike: 240,
              asset: "SOL",
              amplifier: 1.5,
              betAmount: 100
            },
            {
              name: "Solana to $260 before 2026",
              conditionID: "0x6ef0c13571ac6178adbaf231b22efe80ad6f2071f37efa5c041484edd8599e72",
              type: "price_up",
              strike: 260,
              asset: "SOL",
              amplifier: 1.5,
              betAmount: 100
            }
          ]
        }
      ]

      const rows: any[] = []

      for (const config of configs) {
        for (const condition of config.conditions) {
          const result = await calculateBet(condition)

        const row = {
          underlying: condition.asset,
          strike: condition.strike,
          betAmount: condition.betAmount,
          amplifier: condition.amplifier,
          type: condition.type,
          side: result.side,
          askPrice: result.askPrice,
          numOfShares: round(result.numOfShares, 2),
          maxProfit: round(result.maxProfit, 2),
          hedgeAmount: round(result.hedgeAmount, 2),
          breakevenPrice: round(result.breakevenPrice, 2),
          pnlAtStrike: round(result.pnlAtStrike, 2),
          range: result.range
        }

        rows.push(row)
        }
      }

      console.clear()
      console.table(rows)
    } catch (error) {
      console.error(error)
    }

    await new Promise(resolve => setTimeout(resolve, 10000))
  }
})();