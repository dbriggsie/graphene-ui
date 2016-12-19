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
import AssetName from "../Utility/AssetName";
import FormattedFee from "../Utility/FormattedFee";
import BalanceComponent from "../Utility/BalanceComponent";
import {ChainStore, FetchChainObjects} from "graphenejs-lib";
import connectToStores from "alt/utils/connectToStores";
import {LimitOrder, Price, Asset} from "common/orderClasses";

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

    static getPropsFromStores(props) {
        let isBuy = props.action === "buy";
        return {
            lowVolumeMarkets: MarketsStore.getState().lowVolumeMarkets,
            activeAssetId: SettingsStore.getState().viewSettings.get([isBuy ? "receiveAssetId" : "sellAssetId"], preferredAssets[0])
        };
    };

    constructor(props) {
        super(props);

        /*
        * The terminology used assumes "buy" modal, so the assets in the
        * dropdown and list are base assets (for sale it's the opposite)
        */
        let activeAssetId =this._getNewActiveAssetId(props);
        this.state = {
            priceValue: "",
            saleValue: "",
            receiveValue: "",
            activeAssetId,
            to_receive: this._getToReceive(props, {activeAssetId}),
            for_sale: this._getForSale(props, {activeAssetId})
        };

        this.state.price = new Price({
            base: this.state.for_sale,
            quote: this.state.to_receive
        })

        this._subToMarket = this._subToMarket.bind(this);
    }

    componentDidMount() {
        this._checkSubAndBalance();
    }

    componentWillReceiveProps(np) {
        if (np.asset !== this.props.asset) {
            this.setState(this._getNewAssetPropChange(np), () => {
                this._checkSubAndBalance(np);
            });
        }
    }

    componentWillUnmount() {
        this._unSubMarket();
    }

    _getNewAssetPropChange(props = this.props, state = this.state) {
        let newState = {};
        const buy = props.action === "buy";
        newState[(buy ? "to_receive" : "for_sale")] = buy ?
            this._getToReceive(props, state) : this._getForSale(props, state);

        return newState;
    }

    _getNewAssetStateChange(newActiveAssetId, props = this.props, state = this.state) {
        let {price} = state;
        const isBuy = props.action === "buy";
        const currentAsset = isBuy ? "for_sale" : "to_receive";
        const oldAmount = state[currentAsset].getAmount({real: true});
        const asset = ChainStore.getAsset(newActiveAssetId);
        let newState = {};
        newState[currentAsset] = new Asset({
            asset_id: asset.get("id"),
            precision: asset.get("precision"),
            real: oldAmount
        });

        const currentPrice = price.isValid() ? price.toReal() : null;

        console.log("for_sale:", isBuy ? newState.for_sale.asset_id : this.state.for_sale.asset_id, "to_receive:", isBuy ? this.state.to_receive.asset_id : newState.to_receive.asset_id);
        newState.price = new Price({
            base: isBuy ? newState.for_sale : this.state.for_sale,
            quote: isBuy ? this.state.to_receive : newState.to_receive,
            real: currentPrice
        });

        console.log("state change:", newState);

        return newState;
    }

    _getToReceive(props = this.props, state = this.state) {
        let isBuy = props.action === "buy";

        let activeAsset = ChainStore.getAsset(state.activeAssetId);
        let to_receive = isBuy ? new Asset({
            asset_id: props.currentAsset.get("id"),
            precision: props.currentAsset.get("precision")
        }) : new Asset({
            asset_id: state.activeAssetId,
            precision: activeAsset ? activeAsset.get("precision") : 5
        });

        return to_receive;
    }

    _getForSale(props = this.props, state = this.state) {
        let isBuy = props.action === "buy";

        let activeAsset = ChainStore.getAsset(state.activeAssetId);
        let for_sale = isBuy ? new Asset({
            asset_id: state.activeAssetId,
            precision: activeAsset ? activeAsset.get("precision") : 5
        }) :
        new Asset({
            asset_id: props.currentAsset.get("id"),
            precision: props.currentAsset.get("precision")
        });

        return for_sale;
    }

    _getNewActiveAssetId(props) {
        let newBaseId = props.assets[0].get("asset_type");
        for (var i = 0; i < preferredAssets.length; i++) {
            if (this._getAssetIndex(preferredAssets[i], props) >= 0) {
                newBaseId = preferredAssets[i];
                break;
            }
        }
        return newBaseId;
    }

    _checkSubAndBalance(props = this.props, state = this.state) {
        const index = this._getAssetIndex(this.state.activeAssetId, props);
        console.log("_checkSubAndBalance:", index);
        if (index === -1) {
            this._unSubMarket();

            let newActiveAssetId = this._getNewActiveAssetId(props);
            let newState = {};
            let buy = props.action === "buy";
            const currentAsset = buy ? "for_sale" : "to_receive";
            console.log("newActiveAssetId:", newActiveAssetId);
            if (newActiveAssetId !== state[currentAsset].asset_id) {
                newState = this._getNewAssetStateChange(newActiveAssetId);
            }
            newState.activeAssetId = newActiveAssetId;

            this._setAssetSetting(newState.activeAssetId);

            return this.setState(newState, () => {
                this._subToMarket(props);
            });
        }
        this._subToMarket(props);
    }

    _setActiveAsset(id) {
        this._setAssetSetting(id);
        let newState = this._getNewAssetStateChange(id);
        newState.activeAssetId = id;
        this.setState(newState, () => {
            this._subToMarket(this.props, this.state);
        });
    }

    _getAssetIndex(id, props = this.props) {
        return props.assets.findIndex(a => {
            return a.get("asset_type") === id;
        });
    }

    _setAssetSetting(id) {
        const isBuy = this.props.action === "buy";
        SettingsActions.changeViewSetting({[isBuy ? "receiveAssetId" : "sellAssetId"]: id});
    }

    _dropdownBalance(e) {
        this._setActiveAsset(e.target.value);
        // this._setAssetSetting(e.target.value);
        // this.setState({
        //     activeAssetId: e.target.value
        // },  () => {
        //     this._subToMarket(this.props, this.state);
        // });
    }

    _subToMarket(props = this.props, state = this.state) {
        let {assets} = props;
        let {activeAssetId} = state;

        if (this.props.asset && activeAssetId) {
            Promise.all([
                FetchChainObjects(ChainStore.getAsset, [props.asset]),
                FetchChainObjects(ChainStore.getAsset, [activeAssetId])
            ]).then(assets => {
                let [quoteAsset, baseAsset] = assets;
                MarketsActions.subscribeMarket.defer(baseAsset[0], quoteAsset[0]);
            });
        }
    }

    _unSubMarket(props = this.props, state = this.state) {
        let {activeAssetId} = state;
        Promise.all([
            FetchChainObjects(ChainStore.getAsset, [props.asset]),
            FetchChainObjects(ChainStore.getAsset, [activeAssetId])
        ]).then(assets => {
            let [quoteAsset, baseAsset] = assets;
            MarketsActions.unSubscribeMarket(quoteAsset[0].get("id"), baseAsset[0].get("id"));
        });
    }

    _getFee() {
        return this.refs.feeAsset.getFee();
    }

    _onInputPrice(e) {
        this.state.price = new Price({
            base: this.state.for_sale,
            quote: this.state.to_receive,
            real: parseFloat(e.target.value)
        });

        if (this.state.price.isValid() && this.state.for_sale.hasAmount()) {
            this.state.to_receive = this.state.for_sale.times(this.state.price);
            this.state.receiveValue = this.state.to_receive.getAmount({real: true});
        } else if (this.state.price.isValid() && this.state.to_receive.hasAmount()) {
            this.state.for_sale = this.state.to_receive.times(this.state.price);
            this.state.saleValue = this.state.for_sale.getAmount({real: true});
        }

        this.setState({
            priceValue: e.target.value
        });
    }

    _onInputSell(e) {
        this.state.for_sale.setAmount({real: parseFloat(e.target.value)});
        if (this.state.price.isValid() && this.state.for_sale.hasAmount()) {
            this.state.to_receive = this.state.for_sale.times(this.state.price);
            this.state.receiveValue = this.state.to_receive.getAmount({real: true});
        } else if (this.state.for_sale.hasAmount() && this.state.to_receive.hasAmount()) {
            this.state.price = new Price({
                base: this.state.for_sale,
                quote: this.state.to_receive
            });
            this.state.priceValue = this.state.price.toReal();
        }
        this.setState({
            saleValue: e.target.value
        });
    }

    _onInputReceive(e) {
        this.state.to_receive.setAmount({real: parseFloat(e.target.value)});
        if (this.state.price.isValid() && this.state.to_receive.hasAmount()) {
            this.state.for_sale = this.state.to_receive.times(this.state.price);
            this.state.saleValue = this.state.for_sale.getAmount({real: true});
        } else if (this.state.for_sale.hasAmount() && this.state.to_receive.hasAmount()) {
            this.state.price = new Price({
                base: this.state.for_sale,
                quote: this.state.to_receive
            });
            this.state.priceValue = this.state.price.toReal();
        }
        this.setState({
            receiveValue: e.target.value
        });
    }

    onSubmit(e) {
        e.preventDefault();
        let order = new LimitOrder({
            for_sale: this.state.for_sale,
            to_receive: this.state.to_receive,
            seller: this.props.seller
        });

        console.log("order:", order);
        MarketsActions.createLimitOrder2(order.toObject()).then(() => {
            console.log("order succeess");
        }).catch(e => {
            console.log("order failed:", e);
        });
    }

    render() {
        let {modalId, asset, assets, lowVolumeMarkets, action} = this.props;
        let {activeAssetId, for_sale, to_receive, price} = this.state;
        const isBuy = action === "buy";
        console.log("price:", price.toReal(), price, "for_sale:", for_sale.getAmount({}), for_sale.asset_id, "to_receive:", to_receive.getAmount({}), to_receive.asset_id);
        let assetOptions = [];
        let assetSelections = assets.map(b => {
            assetOptions.push({id: b.get("asset_type"), asset: ChainStore.getAsset(b.get("asset_type"))});
            return (
                <div
                    key={b.get("asset_type")}
                    onClick={this._setActiveAsset.bind(this, b.get("asset_type"))}
                    className={"balance-row" + (b.get("asset_type") === activeAssetId ? " active": "")}
                >
                    <BalanceComponent balance={b.get("id")} />
                </div>
            );
        });

        let activeAsset = ChainStore.getAsset(activeAssetId);

        if (!activeAsset) {
            return null;
        }

        const isLowVolume = this.props.lowVolumeMarkets.get(this.props.currentAsset.get("id") + "_" + activeAsset.get("id"), false);

        const assetSelector = <div style={{display: "table-cell", float: "right", width: "70%"}}>
            <label style={{width: "100%", margin: 0}}>
                <span className="inline-label" style={{margin: 0}}>
                    <input type="text" value={this.state[isBuy ? "saleValue" : "receiveValue"]} onChange={this[isBuy ? "_onInputSell" : "_onInputReceive"].bind(this)}/>
                    <span className="form-label" style={{border: "none", paddingLeft: 0, paddingRight: 0}}>
                        <select onChange={this._dropdownBalance.bind(this)} value={activeAssetId} style={{textTransform: "uppercase", minWidth: "10rem", color: "inherit", fontWeight: "normal", fontSize: "inherit", backgroundColor: "#eee", border: "none", margin: 0, paddingTop: 4, paddingBottom: 4}}>
                            {assetOptions
                                .filter(a => a && a.asset)
                                .map((b, index) => {
                                    let name = b.asset.get("symbol");
                                    return <option key={name} value={b.id}><AssetName name={name} /></option>;
                                })}
                        </select>
                    </span>
                </span>
            </label>
            <div className="SimpleTrade__help-text">Enter the maximum amount you want to spend</div>
        </div>;

        const receiveAsset = <div style={{display: "table-cell", float: "right", width: "70%"}}>
            <label style={{width: "100%", margin: 0}}>
                <span className="inline-label" style={{margin: 0}}>
                    <input type="text" value={this.state[isBuy ? "receiveValue" : "saleValue"]} onChange={this[isBuy ? "_onInputReceive" : "_onInputSell"].bind(this)} />
                    <span className="form-label" style={{minWidth: "10rem"}}><AssetName name={asset} /></span>
                </span>
            </label>
            <div className="SimpleTrade__help-text">Enter the amount you wish to buy</div>
        </div>;

        return (
            <div>
                <div style={{padding: "20px 2rem", backgroundColor: "#545454"}}>
                    {isBuy ?
                        <h3>Buy <AssetName name={asset} /> with <AssetName name={activeAsset.get("symbol")} /></h3> :
                        <h3>Sell <AssetName name={asset} /> for <AssetName name={activeAsset.get("symbol")} /></h3>
                    }

                    <div style={{paddingBottom: 10}}>
                        {isBuy ? "Current balances" : "Asset to receive"}:
                    </div>
                    <div style={{overflowY: "auto", maxHeight: 188, padding: "0 10px", border: "1px solid black"}}>
                        {assetSelections}
                    </div>
                </div>

                <div className="grid-block vertical no-overflow" style={{zIndex: 1002, paddingLeft: "2rem", paddingRight: "2rem"}}>

                    <div style={{margin: "0 -2rem", borderBottom: "2px solid #020202"}}></div>

                    <form style={{paddingTop: 20}} onSubmit={this.onSubmit.bind(this)}>

                        {/* PRICE */}
                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>Price:</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                <label style={{width: "100%", margin: 0}}>
                                    <span className="inline-label" style={{margin: 0}}>
                                        <input type="text" value={this.state.priceValue} onChange={this._onInputPrice.bind(this)}/>
                                        <span className="form-label" style={{minWidth: "10rem"}}><AssetName name={isBuy ? activeAsset.get("symbol") : asset} /></span>
                                    </span>
                                </label>
                                <div className="SimpleTrade__help-text">Enter your desired price for 1 <AssetName name={isBuy ? asset : activeAsset.get("symbol")} /></div>
                            </div>
                        </div>

                        {/* SPEND */}
                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>{isBuy ? "Spend" : "Sell"}:</div>
                            {isBuy ? assetSelector : receiveAsset}
                        </div>

                        {/* TOTAL */}
                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>You will receive:</div>
                            {isBuy ? receiveAsset : assetSelector}
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left"}}><Translate content="transfer.fee" /></div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                <FormattedFee
                                    ref="feeAsset"
                                    asset={activeAssetId}
                                    opType="limit_order_create"
                                    balances={assets}
                                />
                            </div>
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left"}}>Summary</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                {for_sale.getAmount({real: true})} <AssetName name={asset} /> => {to_receive.getAmount({real: true})} <AssetName name={activeAsset.get("symbol")} />
                            </div>
                        </div>

                        {isLowVolume ? <div style={{paddingTop: 20, paddingBottom: 20}} className="error">Warning: This is a low volume market</div> : null}

                        <div className="button-group">
                            <div className="button">Show market orders</div>
                            <div className="button" onClick={this.onSubmit.bind(this)} type="submit">Place my order</div>
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
        console.log("currentAsset:", this.props.currentAsset);
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
