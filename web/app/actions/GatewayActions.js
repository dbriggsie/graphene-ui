import alt from "alt-instance";
import { fetchCoins, getBackedCoins, getActiveWallets } from "common/blockTradesMethods";

class GatewayActions {

    fetchCoins({backer, url} = {}) {
        return (dispatch) => {
            Promise.all([
                fetchCoins(url),
                getActiveWallets(url)
            ]).then(result => {
                let [coins, wallets] = result;
                dispatch({
                    coins: coins,
                    backedCoins: getBackedCoins({allCoins: coins, backer: backer}),
                    backer
                });
            });
        };
    }
}

export default alt.createActions(GatewayActions);
