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
