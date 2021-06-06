var fs = require("fs");
const persitedTopProfits = require("../../../temp/top-profits.json");

module.exports = class TrailingStopCalculator {
  constructor(logger) {
    this.logger = logger;
    this.topProfits = persitedTopProfits
    this.logger.error(`TOP PROFITS: ${JSON.stringify(this.topProfits)}`)
  }

  collectPositionProfit(exchange, ticker, position) {
    if (!ticker) {
      this.logger.error(`TrailingStopCalculator: no ticker found ${JSON.stringify([exchange.getName(), position.symbol])}`);
      return;
    }

    let profit;
    if (position.side === 'long') {
      if (ticker.bid < position.entry) {
        profit = (ticker.bid / position.entry - 1) * 100;
      }
    } else if (position.side === 'short') {
      if (ticker.ask > position.entry) {
        profit = (position.entry / ticker.ask - 1) * 100;
      }
    } else {
      throw new Error(`Invalid side`);
    }

    if (typeof profit === 'undefined' || profit < 0) {
      return profit;
    }
    this.logger.debug(`TrailingStopCalculator: currentProfit: ${profit}`);
    const exchangeSymbol = `${exchange.getName()}_${position.symbol}`;
    const topProfit = this.topProfits[exchangeSymbol] || 0;
    if (profit > topProfit) {
      this.logger.debug(`TrailingStopCalculator: new profit top reached: ${exchangeSymbol} - ${profit}`);

      this.topProfits[exchangeSymbol] = profit;
      // this.persitTopProfitsAsync();
    }
    return profit;
  }

  calculateStopProfitOffset(exchange, position, config) {
    const { target_percent, down_percent } = config;
    const exchangeSymbol = `${exchange.getName()}_${position.symbol}`;
    const topProfit = this.topProfits[exchangeSymbol] || 0;
    this.logger.debug(`TrailingStopCalculator: currentTopProfit: ${topProfit}`);
    if (topProfit < target_percent) {
      return;
    }
    return topProfit - down_percent;
  }

  cleanUpTopProfit(exchange, position) {
    const exchangeSymbol = `${exchange.getName()}_${position.symbol}`;
    delete this.topProfits[exchangeSymbol];
    this.persitTopProfitsAsync();
  }

  persitTopProfitsAsync() {
    this.logger.debug(`Start persit top-profits: ${JSON.stringify(this.topProfits)}`)
    fs.writeFile("./temp/top-profits.json", JSON.stringify(this.topProfits), "utf8", () => { });
  }
}