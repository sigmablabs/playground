import moment from "moment";

export function round(num: number, decimals: number) {
  return Math.round(num * 10 ** decimals) / 10 ** decimals
}

export function percentage(num: number, precision: number) {
  return Math.round(num * 10 ** (2 + precision)) / 10 ** precision
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function humanNumber(num: number) {
  var i = num == 0 ? 0 : Math.floor(Math.log(num) / Math.log(1000));
  return +((num / Math.pow(1000, i)).toFixed(2)) * 1 + ' ' + ['', 'K', 'M', 'B', 'T', 'TT'][i];
}

export async function measure(func: Promise<any>) {
  var start = moment()
  let result = await func
  let latency = moment().diff(start)

  return { result, latency }
}

import readline from 'readline'
export function waitForQuery(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(`${query}\n`, ans => {
    rl.close();
    resolve(ans);
  }))
}