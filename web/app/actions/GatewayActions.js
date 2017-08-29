import alt from "alt-instance";
import { fetchCoins, fetchBridgeCoins, getBackedCoins, getActiveWallets } from "common/blockTradesMethods";
import { blockTradesAPIs } from "api/apiConfig";

let inProgress = {};  

class GatewayActions {

    fetchCoins({ backer, url } = {}) {


        return (dispatch) => {

            //console.log('@>backer',backer)
           // console.trace('@>url',url)
            Promise.all([
                fetchCoins(url),
                getActiveWallets(blockTradesAPIs.BASE_OL + blockTradesAPIs.ACTIVE_WALLETS)
            ]).then(result => {
                let [coins, wallets] = result;
                                    //coins = test;
                dispatch({
                    coins: coins,
                    backedCoins: getBackedCoins({ allCoins: coins, backer: backer }).filter(a => {
                        return wallets.indexOf(a.walletType) !== -1;
                    }),
                    backer
                });
            });
        };
    }

    fetchBridgeCoins(url = undefined) {
        if (!inProgress["fetchBridgeCoins"]) {
            inProgress["fetchBridgeCoins"] = true;
            return (dispatch) => {
                Promise.all([
                    fetchCoins(url),
                    fetchBridgeCoins(url),
                    getActiveWallets(blockTradesAPIs.BASE + blockTradesAPIs.ACTIVE_WALLETS)
                ]).then(result => {
                    delete inProgress["fetchBridgeCoins"];
                    let [coins, bridgeCoins, wallets] = result;
                    dispatch({
                        coins,
                        bridgeCoins,
                        wallets
                    });
                });
            };
        } else {
            return {};
        }
    }
}

export default alt.createActions(GatewayActions);

let test = [
  {
    "coinType": "open.ltc",
    "walletName": "BitShares 2.0",
    "name": "OpenLedger Litecoin",
    "symbol": "OPEN.LTC",
    "walletSymbol": "OPEN.LTC",
    "walletType": "bitshares2",
    "transactionFee": 0,
    "precision": 100000000,
    "backingCoinType": "ltc",
    "supportsOutputMemos": true,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null,
    "gateFee": 0.003,
    "intermediateAccount": "openledger-wallet"
  },
    {
    "coinType": "openltc",
    "walletName": "BitShares 2.0",
    "name": "OpenLedger Litecoin (dep.)",
    "symbol": "OPENLTC",
    "walletSymbol": "OPENLTC",
    "walletType": "bitshares2",
    "transactionFee": 0,
    "precision": 100000000,
    "backingCoinType": "ltc",
    "supportsOutputMemos": true,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null,
    "gateFee": 0.003,
    "intermediateAccount": "openledger-wallet"
  },
    {
    "coinType": "ltc",
    "walletName": "Litecoin",
    "name": "Litecoin",
    "symbol": "LTC",
    "walletSymbol": "LTC",
    "walletType": "litecoin",
    "transactionFee": 0.003,
    "precision": 100000000,
    "backingCoinType": null,
    "supportsOutputMemos": false,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null,
    "gateFee": 0.003,
    "intermediateAccount": "openledger-wallet"
  },
  {
    "coinType": "open.btc",
    "walletName": "BitShares 2.0",
    "name": "OpenLedger Bitcoin",
    "symbol": "OPEN.BTC",
    "walletSymbol": "OPEN.BTC",
    "walletType": "bitshares2",
    "transactionFee": 0,
    "precision": 100000000,
    "backingCoinType": "btc",
    "supportsOutputMemos": true,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null,
    "gateFee": 0.0003,
    "intermediateAccount": "openledger-wallet"
  },
  {
    "coinType": "openbtc",
    "walletName": "BitShares 2.0",
    "name": "OpenLedger Bitcoin (dep.)",
    "symbol": "OPENBTC",
    "walletSymbol": "OPENBTC",
    "walletType": "bitshares2",
    "transactionFee": 0,
    "precision": 100000000,
    "backingCoinType": "btc",
    "supportsOutputMemos": true,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null,
    "gateFee": "0.00030",
    "intermediateAccount": "openledger-wallet"
  },
    {
    "coinType": "btc",
    "walletName": "Bitcoin",
    "name": "Bitcoin",
    "symbol": "BTC",
    "walletSymbol": "BTC",
    "walletType": "bitcoin",
    "transactionFee": 0.0003,
    "precision": 100000000,
    "backingCoinType": null,
    "supportsOutputMemos": false,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null,
    "gateFee": 0.0003,
    "intermediateAccount": "openledger-wallet"
  }
];
