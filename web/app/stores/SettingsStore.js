import alt from "alt-instance";
import SettingsActions from "actions/SettingsActions";
import IntlActions from "actions/IntlActions";
import Immutable from "immutable";
import {merge} from "lodash";
import ls from "common/localStorage";
import { Apis } from "bitsharesjs-ws";
import { settingsAPIs } from "api/apiConfig";

const CORE_ASSET = "BTS"; // Setting this to BTS to prevent loading issues when used with BTS chain which is the most usual case currently

const STORAGE_KEY = "__graphene__";
let ss = new ls(STORAGE_KEY);

let marketsList = [  
   "APPX.WARRANT",
   "BLOCKPAY",
   "BROWNIE.PTS",
   "BTS",
   "BTWTY",
   "CNY",
   "CVCOIN",
   "EUR",
   "EDEV",
   "USD",
   "BTSR",
   "ICOO",
   "OBITS",
   "OCASH",
   "FUNC",
   "OPEN.ARDR",
   "OBITS.WARRANT",
   "OPEN.BTC",
   "OPEN.CNY",
   "OPEN.DASH",
   "OPEN.DCT",
   "OPEN.DGD",
   "OPEN.DOGE",
   "OPEN.BKS",
   "OPEN.ETH",
   "OPEN.EUR",
   "OPEN.ETP",
   "OPEN.EURT",
   "OPEN.GAME",
   "OPEN.GRC",
   "OPEN.HEAT",
   "OPEN.INCNT",
   "OPEN.LISK",
   "OPEN.LTC",
   "OPEN.MAID",
   "OPEN.MKR",
   "OPEN.MUSEOL",
   "OPEN.NXC",
   "OPEN.OMNI",
   "OPEN.STEEM",
   "OPEN.USD",
   "OPEN.USDT",
   "OPEN.WAVES",
   "OCASH",
   "SHAREBITS",
   "SOLCERT",
   "HEMPSWEET",
   "OPEN.SBD",
   "OPEN.NSR",
   "OPEN.NBT",
   "QORA",
   "OPEN.EXCL",
   "REALITY",
   "YOYOW",
   "ZENGOLD"
];

let topMarkets = {
    markets_4018d784: marketsList,
    markets_39f5e2ed: [ // TESTNET
        "PEG.FAKEUSD", "BTWTY"
    ]
};

let dashboard_assets = {
    "4018d784": [
        ["OPEN.BTC", "CVCOIN"],
        ["OPEN.BTC", "OPEN.ETH"],
        ["OPEN.BTC", "OPEN.STEEM"],
        ["USD", "EDEV"],
        ["USD", "REALITY"],
        ["OPEN.BTC", "ICOO"],
        ["BTS", "OBITS"],
        ["BTS", "BTSR"],
        ["USD", "APPX.WARRANT"],
        ["CNY", "YOYOW"],
        ["OPEN.BTC", "OPEN.MUSEOL"],
        ["USD", "OPEN.ETP"],
        ["BTS", "USD"],
        ["BTS", "EUR"],
        ["BTS", "CNY"],
        ["USD", "OBITS.WARRANT"]
    ],
    "39f5e2ed": [
        ["TEST", "PEG.FAKEUSD"],
        ["TEST", "BTWTY"]
    ]
};

function checkBit(bit) {
    if (bit == "BITUSD" || bit == "BITEUR" || bit == "BITCNY" || bit == "BITGOLD" || bit == "BITBTC") {
        return true;
    }
}

let lang = "en";

if (SET == "EU1") {
    lang = "en";
} else if (SET == "CN") {
    lang = "cn";
} else {
    lang = "en";
}


class SettingsStore {
    constructor() {
        this.exportPublicMethods({init: this.init.bind(this), getSetting: this.getSetting.bind(this)});

        this.bindListeners({
            onChangeSetting: SettingsActions.changeSetting,
            onChangeViewSetting: SettingsActions.changeViewSetting,
            onChangeMarketDirection: SettingsActions.changeMarketDirection,
            onAddStarMarket: SettingsActions.addStarMarket,
            onRemoveStarMarket: SettingsActions.removeStarMarket,
            onAddStarAccount: SettingsActions.addStarAccount,
            onRemoveStarAccount: SettingsActions.removeStarAccount,
            onAddWS: SettingsActions.addWS,
            onRemoveWS: SettingsActions.removeWS,
            onHideAsset: SettingsActions.hideAsset,
            onClearSettings: SettingsActions.clearSettings,
            onSwitchLocale: IntlActions.switchLocale,
            onSetUserMarket: SettingsActions.setUserMarket,
            onUpdateLatencies: SettingsActions.updateLatencies
        });

        this.initDone = false;
        this.defaultSettings = Immutable.Map({
            locale: lang,
            apiServer: settingsAPIs.DEFAULT_WS_NODE,
            faucet_address: settingsAPIs.DEFAULT_FAUCET,
            unit: CORE_ASSET,
            showSettles: false,
            showAssetPercent: false,
            walletLockTimeout: 60 * 10,
            themes: "olDarkTheme",
            disableChat: false,
            traderMode: false
        });

        // If you want a default value to be translated, add the translation to settings in locale-xx.js
        // and use an object {translate: key} in the defaults array
        let apiServer = settingsAPIs.WS_NODE_LIST;

        let defaults = {
            locale: [
                "en",
                "cn",
                "fr",
                "ko",
                "de",
                "es",
                "tr",
                "ru"
            ],
            apiServer: [],
            unit: [
                CORE_ASSET,
                "USD",
                "CNY",
                "BTC",
                "EUR",
                "GBP"
            ],
            showSettles: [
                {translate: "yes"},
                {translate: "no"}
            ],
            showAssetPercent: [
                {translate: "yes"},
                {translate: "no"}
            ],
            disableChat: [
                {translate: "yes"},
                {translate: "no"}
            ],
            themes: [
                "darkTheme",
                "lightTheme",
                "olDarkTheme"
            ],
            passwordLogin: [
                {translate: "yes"},
                {translate: "no"}
            ]
            // confirmMarketOrder: [
            //     {translate: "confirm_yes"},
            //     {translate: "confirm_no"}
            // ]
        };

        this.settings = Immutable.Map(merge(this.defaultSettings.toJS(), ss.get("settings_v3")));

        let savedDefaults = ss.get("defaults_v1", {});
        this.defaults = merge({}, defaults, savedDefaults);

        (savedDefaults.apiServer || []).forEach(api => {
            let hasApi = false;
            if (typeof api === "string") {
                api = {url: api, location: null};
            }
            this.defaults.apiServer.forEach(server => {
                if (server.url === api.url) {
                    hasApi = true;
                }
            });

            if (!hasApi) {
                this.defaults.apiServer.push(api);
            }
        });

        if (!savedDefaults || (savedDefaults && (!savedDefaults.apiServer || !savedDefaults.apiServer.length))) {
            for (let i = apiServer.length - 1; i >= 0; i--) {
                let hasApi = false;
                this.defaults.apiServer.forEach(api => {
                    if (api.url === apiServer[i].url) {
                        hasApi = true;
                    }
                });
                if (!hasApi) {
                    this.defaults.apiServer.unshift(apiServer[i]);
                }
            }
        }

        this.viewSettings = Immutable.Map(ss.get("viewSettings_v1"));

        this.marketDirections = Immutable.Map(ss.get("marketDirections"));

        this.hiddenAssets = Immutable.List(ss.get("hiddenAssets", []));

        this.apiLatencies = ss.get("apiLatencies", {});
    }

    init() {
        return new Promise((resolve) => {
            if (this.initDone) resolve();
            this.starredKey = this._getChainKey("markets");
            this.marketsKey = this._getChainKey("userMarkets");
            // Default markets setup

            let bases = {
                markets_4018d784: [ // BTS MAIN NET
                    "OPEN.BTC", "USD", CORE_ASSET, "OBITS"
                ],
                markets_39f5e2ed: [ // TESTNET
                    "TEST"
                ]
            };

            let coreAssets = {markets_4018d784: "BTS", markets_39f5e2ed: "TEST"};
            let coreAsset = coreAssets[this.starredKey] || "BTS";
            this.defaults.unit[0] = coreAsset;

            let chainBases = bases[this.starredKey] || bases.markets_4018d784;
            this.preferredBases = Immutable.List(chainBases);

            function addMarkets(target, base, markets) {
                markets.filter(a => {
                    return a !== base;
                }).forEach(market => {
                    target.push([`${market}_${base}`, {"quote": market,"base": base}]);
                });
            }

            let defaultMarkets = [];
            let chainMarkets = topMarkets[this.starredKey] || [];
            this.preferredBases.forEach(base => {
                addMarkets(defaultMarkets, base, chainMarkets);
            });

            this.defaultMarkets = Immutable.Map(defaultMarkets);
            this.starredMarkets = Immutable.Map(ss.get(this.starredKey, []));
            this.userMarkets = Immutable.Map(ss.get(this.marketsKey, {}));
            this.starredAccounts = Immutable.Map(ss.get(this._getChainKey("starredAccounts")));
            this.topMarkets = marketsList;

            this.initDone = true;
            resolve();
        });
    }

    getSetting(setting) {
        return this.settings.get(setting);
    }

    onChangeSetting(payload) {
        this.settings = this.settings.set(
            payload.setting,
            payload.value
        );

        ss.set("settings_v3", this.settings.toJS());
        if (payload.setting === "walletLockTimeout") {
            ss.set("lockTimeout", payload.value);
        }
    }

    onChangeViewSetting(payload) {
        for (let key in payload) {
            this.viewSettings = this.viewSettings.set(key, payload[key]);
        }

        ss.set("viewSettings_v1", this.viewSettings.toJS());
    }

    onChangeMarketDirection(payload) {
        for (let key in payload) {
            this.marketDirections = this.marketDirections.set(key, payload[key]);
        }

        ss.set("marketDirections", this.marketDirections.toJS());
    }

    onHideAsset(payload) {
        if (payload.id) {
            if (!payload.status) {
                this.hiddenAssets = this.hiddenAssets.delete(this.hiddenAssets.indexOf(payload.id));
            } else {
                this.hiddenAssets = this.hiddenAssets.push(payload.id);
            }
        }

        ss.set("hiddenAssets", this.hiddenAssets.toJS());
    }

    onAddStarMarket(market) {
        let marketID = market.quote + "_" + market.base;
        if (!this.starredMarkets.has(marketID)) {
            this.starredMarkets = this.starredMarkets.set(marketID, {quote: market.quote, base: market.base});

            ss.set(this.starredKey, this.starredMarkets.toJS());
        } else {
            return false;
        }
    }

    onSetUserMarket(payload) {
        let marketID = payload.quote + "_" + payload.base;
        if (payload.value) {
            this.userMarkets = this.userMarkets.set(marketID, {quote: payload.quote, base: payload.base});
        } else {
            this.userMarkets = this.userMarkets.delete(marketID);
        }
        ss.set(this.marketsKey, this.userMarkets.toJS());
    }

    onRemoveStarMarket(market) {
        let marketID = market.quote + "_" + market.base;

        this.starredMarkets = this.starredMarkets.delete(marketID);

        ss.set(this.starredKey, this.starredMarkets.toJS());
    }

    onAddStarAccount(account) {
        if (!this.starredAccounts.has(account)) {
            this.starredAccounts = this.starredAccounts.set(account, {name: account});

            ss.set(this._getChainKey("starredAccounts"), this.starredAccounts.toJS());
        } else {
            return false;
        }
    }

    onRemoveStarAccount(account) {

        this.starredAccounts = this.starredAccounts.delete(account);

        ss.set(this._getChainKey("starredAccounts"), this.starredAccounts.toJS());
    }

    onAddWS(ws) {
        if (typeof ws === "string") {
            ws = {url: ws, location: null};
        }
        this.defaults.apiServer.push(ws);
        ss.set("defaults_v1", this.defaults);
    }

    onRemoveWS(index) {
        if (index !== 0) { // Prevent removing the default apiServer
            this.defaults.apiServer.splice(index, 1);
            ss.set("defaults_v1", this.defaults);
        }
    }

    onClearSettings(resolve) {
        ss.remove("settings_v3");
        this.settings = this.defaultSettings;

        ss.set("settings_v3", this.settings.toJS());

        if (resolve) {
            resolve();
        }
    }

    onSwitchLocale({locale}) {
        this.onChangeSetting({setting: "locale", value: locale});
    }

    _getChainKey(key) {
        const chainId = Apis.instance().chain_id;
        return key + (chainId ? `_${chainId.substr(0, 8)}` : "");
    }

    onUpdateLatencies(latencies) {
        this.apiLatencies = latencies;
    }
}

let set_obj = alt.createStore(SettingsStore, "SettingsStore");

set_obj.fiatAssets = [{
    backingCoinType: "USD",
    name: "Dollar",
    supportsMemos: false,
    symbol: "OPEN.USD",
    walletType: "openledger-fiat"
}, {
    backingCoinType: "EUR",
    name: "Euro",
    supportsMemos: false,
    symbol: "OPEN.EUR",
    walletType: "openledger-fiat"
}, {
    backingCoinType: "CNY",
    name: "Dollar",
    supportsMemos: false,
    symbol: "OPEN.CNY",
    walletType: "openledger-fiat"
}];

set_obj.dashboard_assets = dashboard_assets;
set_obj.lang = lang;
set_obj.checkBit = checkBit;
set_obj.marketsList = marketsList;
set_obj.marketsOpenList = marketsList.filter(e => {
    return e.indexOf("OPEN.") === 0;
}).map(e => e.split("OPEN.").join(""));

export default set_obj;
