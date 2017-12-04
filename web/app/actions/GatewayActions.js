import alt from "alt-instance";
import { fetchCoins, fetchBridgeCoins, getBackedCoins, getActiveWallets } from "common/blockTradesMethods";
import {blockTradesAPIs} from "api/apiConfig";

let inProgress = {};

const GATEWAY_TIMEOUT = 10000;

const onGatewayTimeout = (dispatch, gateway)=>{
    dispatch({down: gateway});
};

class GatewayActions {

       fetchCoins({backer = "OPEN", url = undefined} = {}) {
            if (!inProgress["fetchCoins_" + backer]) {
                inProgress["fetchCoins_" + backer] = true;
                return (dispatch) => {
                    let fetchCoinsTimeout = setTimeout(onGatewayTimeout.bind(null, dispatch, backer), GATEWAY_TIMEOUT);

                    Promise.all([
                        fetchCoins(url),
                        fetchBridgeCoins(blockTradesAPIs.BASE_OL + blockTradesAPIs.COINS_LIST),
                        getActiveWallets(blockTradesAPIs.BASE_OL + blockTradesAPIs.ACTIVE_WALLETS)
                    ]).then(result => {
                        clearTimeout(fetchCoinsTimeout);

                        delete inProgress["fetchCoins_" + backer];
                        let [coins, tradingPairs, wallets] = result;

                        let backedCoins = getBackedCoins({allCoins: coins, tradingPairs: tradingPairs, backer: backer}).filter(a => { return wallets.indexOf(a.walletType) !== -1 })

                       backedCoins.forEach(a => {
                            a.isAvailable = wallets.indexOf(a.walletType) !== -1;
                        });

                        dispatch({
                            coins,
                            backedCoins,
                            backer
                        });
                    });
                };
            } else {
                return {};
            }
        }


    fetchBridgeCoins(url = undefined) {
        if (!inProgress["fetchBridgeCoins"]) {
            inProgress["fetchBridgeCoins"] = true;
            return (dispatch) => {
                Promise.all([
                    fetchCoins(url),
                    fetchBridgeCoins(blockTradesAPIs.BASE),
                    getActiveWallets(url)
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
