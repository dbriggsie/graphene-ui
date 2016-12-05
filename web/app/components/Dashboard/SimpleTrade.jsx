import React from "react";
import {PropTypes} from "react";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Modal from "react-foundation-apps/src/modal";
import Trigger from "react-foundation-apps/src/trigger";
import SettingsActions from "actions/SettingsActions";
import MarketsActions from "actions/MarketsActions";
import MarketsStore from "stores/MarketsStore";
import SettingsStore from "stores/SettingsStore";
import Translate from "react-translate-component";
import BalanceComponent from "../Utility/BalanceComponent";
import {ChainStore, FetchChainObjects} from "graphenejs-lib";
import connectToStores from "alt/utils/connectToStores";

// These are the preferred assets chosen by default if the the user either
// doesn't have a balance in the currently selected asset anymore, or if he
// tries to buy BTS and has BTS selected for example
const preferredAssets = [
    "1.3.861", // OPEN.BTC
    "1.3.121", // bitUSD
    "1.3.0" // BTS
];

@connectToStores
class SimpleTradeContent extends React.Component {

    static getStores() {
        return [MarketsStore, SettingsStore];
    };

    static getPropsFromStores() {
        return {
            lowVolumeMarkets: MarketsStore.getState().lowVolumeMarkets,
            activeBalanceId: SettingsStore.getState().viewSettings.get("activeBalanceId", preferredAssets[0])
        };
    };

    constructor(props) {
        super(props);

        this.state = {
            activeBalanceId: props.activeBalanceId
        };

        this._subToMarket = this._subToMarket.bind(this);
    }

    componentDidMount() {
        this._checkSubAndBalance();
    }

    componentWillReceiveProps(np) {
        if (np.asset !== this.props.asset) {
            this._checkSubAndBalance(np);
        }
    }

    componentWillUnmount() {
        this._unSubMarket();
    }

    _checkSubAndBalance(props = this.props) {
        const index = this._getAssetIndex(this.state.activeBalanceId, props);
        if (index === -1) {
            this._unSubMarket();

            let newBalanceId = props.balances[0].get("asset_type");
            for (var i = 0; i < preferredAssets.length; i++) {
                if (this._getAssetIndex(preferredAssets[i], props) >= 0) {
                    newBalanceId = preferredAssets[i];
                    break;
                }
            }
            this._setAssetSetting(newBalanceId);

            return this.setState({
                activeBalanceId: newBalanceId
            }, () => {
                this._subToMarket(props);
            });
        }
        this._subToMarket(props);
    }

    _setBalance(id) {
        this._setAssetSetting(id);
        this.setState({
            activeBalanceId: id
        }, () => {
            this._subToMarket(this.props, this.state);
        });
    }

    _getAssetIndex(id, props = this.props) {
        return props.balances.findIndex(a => {
            return a.get("asset_type") === id;
        });
    }

    _setAssetSetting(id) {
        SettingsActions.changeViewSetting("activeBalanceId", id);
    }

    _dropdownBalance(e) {
        this._setAssetSetting(e.target.value);
        this.setState({
            activeBalanceId: e.target.value
        },  () => {
            this._subToMarket(this.props, this.state);
        });
    }

    _subToMarket(props = this.props, state = this.state) {
        let {balances} = props;
        let {activeBalanceId} = state;

        if (this.props.asset && activeBalanceId) {
            Promise.all([
                FetchChainObjects(ChainStore.getAsset, [props.asset]),
                FetchChainObjects(ChainStore.getAsset, [activeBalanceId])
            ]).then(assets => {
                let [quoteAsset, baseAsset] = assets;
                MarketsActions.subscribeMarket.defer(baseAsset[0], quoteAsset[0]);
            });
        }
    }

    _unSubMarket(props = this.props, state = this.state) {
        let {activeBalanceId} = state;
        Promise.all([
            FetchChainObjects(ChainStore.getAsset, [props.asset]),
            FetchChainObjects(ChainStore.getAsset, [activeBalanceId])
        ]).then(assets => {
            let [quoteAsset, baseAsset] = assets;
            MarketsActions.unSubscribeMarket(quoteAsset[0].get("id"), baseAsset[0].get("id"));
        });
    }

    render() {
        let {modalId, asset, balances, lowVolumeMarkets} = this.props;
        let {activeBalanceId} = this.state;
        let balanceOptions = [];
        let balanceSelections = balances.map(b => {
            balanceOptions.push({id: b.get("asset_type"), asset: ChainStore.getAsset(b.get("asset_type"))});
            return (
                <div
                    key={b.get("asset_type")}
                    onClick={this._setBalance.bind(this, b.get("asset_type"))}
                    className={"balance-row" + (b.get("asset_type") === activeBalanceId ? " active": "")}
                >
                    <BalanceComponent balance={b.get("id")} />
                </div>
            );
        });

        let activeBalance = ChainStore.getAsset(activeBalanceId);

        if (!activeBalance) {
            return null;
        }

        const isLowVolume = this.props.lowVolumeMarkets.get(this.props.currentAsset.get("id") + "_" + activeBalance.get("id"), false);

        return (
            <div>
                <div style={{padding: "20px 2rem", backgroundColor: "#545454"}}>
                    <h3>Buy {asset} with {activeBalance.get("symbol")}</h3>
                    <div style={{paddingBottom: 10}}>Your Balances:</div>
                    <div style={{overflowY: "auto", maxHeight: 188, padding: "0 10px", border: "1px solid black"}}>
                        {balanceSelections}
                    </div>
                </div>

                <div className="grid-block vertical no-overflow" style={{zIndex: 1002, paddingLeft: "2rem", paddingRight: "2rem"}}>

                    <div style={{margin: "0 -2rem", borderBottom: "2px solid #020202"}}></div>

                    <form style={{paddingTop: 20}}>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>Amount</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                <label style={{width: "100%", margin: 0}}>
                                    <span className="inline-label" style={{margin: 0}}>
                                        <input type="text" />
                                        <span className="form-label" style={{minWidth: "10rem"}}>{asset}</span>
                                    </span>
                                </label>
                                <div className="SimpleTrade__help-text">Enter the amount you wish to buy</div>
                            </div>
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>Spend</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                <label style={{width: "100%", margin: 0}}>
                                    <span className="inline-label" style={{margin: 0}}>
                                        <input type="text" />
                                        <span className="form-label" style={{border: "none", paddingLeft: 0, paddingRight: 0}}>
                                            <select onChange={this._dropdownBalance.bind(this)} value={activeBalanceId} style={{minWidth: "10rem", color: "inherit", fontWeight: "normal", fontSize: "inherit", backgroundColor: "#eee", border: "none", margin: 0, paddingTop: 4, paddingBottom: 4}}>
                                                {balanceOptions
                                                    .filter(a => a && a.asset)
                                                    .map((b, index) => {
                                                        let name = b.asset.get("symbol");
                                                        return <option key={name} value={b.id}>{name}</option>;
                                                    })}
                                            </select>
                                        </span>
                                    </span>
                                </label>
                                <div className="SimpleTrade__help-text">Enter the maximum amount you want to spend</div>
                            </div>
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>Price</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                <label style={{width: "100%", margin: 0}}>
                                    <span className="inline-label" style={{margin: 0}}>
                                        <input type="text" />
                                        <span className="form-label" style={{minWidth: "10rem"}}>{activeBalance.get("symbol")}</span>
                                    </span>
                                </label>
                                <div className="SimpleTrade__help-text">Enter your desired price for 1 {asset}</div>
                            </div>
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left"}}><Translate content="transfer.fee" /></div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                0.147 BTS
                            </div>
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left"}}>Total</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                X {asset} => X other asset
                            </div>
                        </div>

                        {isLowVolume ? <div style={{paddingTop: 20, paddingBottom: 20}} className="error">Warning: This is a low volume market</div> : null}

                        <div className="button-group">
                            <div className="button">Show market orders</div>
                            <div className="button">Place my order</div>
                        </div>
                    </form>
                </div>
            </div>
        );
    }
}

export default class SimpleTradeModal extends React.Component {

    show() {
        ZfApi.publish(this.props.modalId, "open");
    }

    render() {
        return (
            <Modal id={this.props.modalId} overlay={true} className="test">
                <Trigger close={this.props.modalId}>
                    <a href="#" className="close-button">&times;</a>
                </Trigger>
                {this.props.currentAsset ? <SimpleTradeContent ref={"modal_content"} {...this.props} /> : null}
            </Modal>
        );
    }
}
