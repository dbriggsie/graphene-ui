import alt from "alt-instance";
import { fetchCoins, fetchBridgeCoins, getBackedCoins, getActiveWallets } from "common/blockTradesMethods";
import { blockTradesAPIs } from "api/apiConfig";

let inProgress = {};  

class GatewayActions {

    fetchCoins({ backer, url } = {}) {
        return (dispatch) => {
            Promise.all([
                fetchCoins(url),
                getActiveWallets(blockTradesAPIs.BASE_OL + blockTradesAPIs.ACTIVE_WALLETS)
            ]).then(result => {
                let [coins, wallets] = result;
                                   // coins = test;
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
    "coinType": "open.nbt",
    "walletName": "BitShares 2.0",
    "name": "OpenLedger NuBits",
    "symbol": "OPEN.NBT",
    "walletSymbol": "OPEN.NBT",
    "walletType": "bitshares2",
    "transactionFee": "0.",
    "precision": "100000000.",
    "backingCoinType": "nbt",
    "supportsOutputMemos": true,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null
  },
    {
    "coinType": "nbt",
    "walletName": "NuBits",
    "name": "NuBits",
    "symbol": "NBT",
    "walletSymbol": "NBT",
    "walletType": "nubits",
    "transactionFee": "0.01",
    "precision": "100000000.",
    "backingCoinType": null,
    "supportsOutputMemos": false,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null
  },
  {
    "coinType": "nsr",
    "walletName": "NuShares",
    "name": "NuShares",
    "symbol": "NSR",
    "walletSymbol": "NSR",
    "walletType": "nushares",
    "transactionFee": "1.",
    "precision": "100000000.",
    "backingCoinType": null,
    "supportsOutputMemos": false,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null
  }, 
  {
    "coinType": "etp",
    "walletName": "BitShares 2.0",
    "name": "Metaverse Entropy",
    "symbol": "ETP",
    "walletSymbol": "ETP",
    "walletType": "bitshares2",
    "transactionFee": "0",
    "precision": "100000000",
    "backingCoinType": null,    
    "supportsOutputMemos": false,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null
  },
    {
    "coinType": "open.nsr",
    "walletName": "BitShares 2.0",
    "name": "OpenLedger NuShares (deprecated)",
    "symbol": "OPEN.NSR",
    "walletSymbol": "OPEN.NSR",
    "walletType": "bitshares2",
    "transactionFee": "0.",
    "precision": "100000000.",
    "backingCoinType": "nsr",
    "supportsOutputMemos": true,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null
  },
    {
    "coinType": "etp",
    "walletName": "BitShares 2.0",
    "name": "Metaverse Entropy",
    "symbol": "ETP",
    "walletSymbol": "ETP",
    "walletType": "etp", //bitshares2
    "transactionFee": "0",
    "precision": "100000000",
    "backingCoinType": null,    
    "supportsOutputMemos": false,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null
  },
  {
    "coinType": "open.etp",
    "walletName": "BitShares 2.0",
    "name": "OpenLedger Metaverse Entropy",
    "symbol": "OPEN.ETP",
    "walletSymbol": "OPEN.ETP",
    "walletType": "bitshares2",
    "transactionFee": "0",
    "precision": "100000000",
    "backingCoinType": "etp",
    "supportsOutputMemos": 1,
    "restricted": false,
    "authorized": null,
    "notAuthorizedReasons": null
  }
];
