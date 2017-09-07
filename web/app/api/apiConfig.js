function server_set(type) {
    //"urls" "apiServer" "faucet_address"

    if (type == "urls") {
        if (SET == "EU1") {
            return [
                { url: "wss://bitshares.openledger.info/ws", location: "Nuremberg, Germany" },
                { url: "wss://eu.openledger.info/ws", location: "Berlin, Germany" },
                { url: "wss://openledger.hk/ws", location: "Hong Kong" },
                { url: "wss://node.testnet.bitshares.eu/ws", location: "Public Testnet Server (Frankfurt, Germany)" }
            ];
        } else if (SET == "CN") {
            return [
                { url: "wss://openledger.hk/ws", location: "Hong Kong" },
                { url: "wss://bitshares.openledger.info/ws", location: "Nuremberg, Germany" },
                { url: "wss://eu.openledger.info/ws", location: "Berlin, Germany" },
                { url: "wss://node.testnet.bitshares.eu/ws", location: "Public Testnet Server (Frankfurt, Germany)" }
            ];
        } else {
            return [
                { url: "wss://bitshares.openledger.info/ws", location: "Nuremberg, Germany" },
                { url: "wss://eu.openledger.info/ws", location: "Berlin, Germany" },
                { url: "wss://openledger.hk/ws", location: "Hong Kong" },
                { url: "wss://node.testnet.bitshares.eu/ws", location: "Public Testnet Server (Frankfurt, Germany)" }
            ];
        }
    }


    if (type == "apiServer") {
        if (SET == "EU1") {
            return "wss://bitshares.openledger.info/ws";
        } else if (SET == "CN") {
            return "wss://openledger.hk/ws";
        } else {
            return "wss://bitshares.openledger.info/ws";
        }
    }

    if (type == "faucet_address") {
        if (SET == "EU1") {
            return "https://openledger.io"; // https://faucet.testnet.bitshares.eu
        } else if (SET == "CN") {
            return "https://openledger.hk";
        } else {
            return "https://openledger.io";
        }
    }

}


export const blockTradesAPIs = {
    BASE: "https://api.blocktrades.us/v2",
    // BASE_OL: "https://api.blocktrades.us/ol/v2",
    BASE_OL: "https://ol-api1.openledger.info/api/v0/ol/support",
    COINS_LIST: "/coins",
    ACTIVE_WALLETS: "/active-wallets",
    TRADING_PAIRS: "/trading-pairs",
    DEPOSIT_LIMIT: "/deposit-limits",
    ESTIMATE_OUTPUT: "/estimate-output-amount"
};

export const settingsAPIs = {
    DEFAULT_WS_NODE: server_set("apiServer"),
    WS_NODE_LIST: server_set("urls"),
    DEFAULT_FAUCET: server_set("faucet_address"),
    RPC_URL: "https://openledger.info/api/",
    OPENLEDGER_FACET_REGISTR: "https://openledger.info/v/"
};

export const airbitzAPIs = {
    apiKey: '16778e725f182af208990a71cbec917a0d16d572',
    walletType: 'wallet:repo:openledger',
    appId: 'openledger.application',
    bundlePath: 'abcui',
    vendorName: 'OpenLedger',
    vendorImageUrl: 'https://openledger.io/app/assets/logo.png',
};

//http://192.168.0.183:8009/api/v0/ol/support       local
//https://openledger.info/coins/api/v0/ol/support   server

//http://148.251.31.237:6006/api/v0/ol/support     
//https://openledger.info/coins/

// BASE_OL: "https://openledger.info/coins/api/v0/ol/support",