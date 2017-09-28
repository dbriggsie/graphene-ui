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
import FormattedAsset from "../Utility/FormattedAsset";
import {ChainStore, FetchChainObjects} from "bitsharesjs/es";
import {LimitOrderCreate, Price, Asset} from "common/MarketClasses";
import OrderBook from "../Exchange/OrderBook";
import utils from "common/utils";
import counterpart from "counterpart";
import Icon from "../Icon/Icon";
import ReactTooltip from "react-tooltip";
import { connect } from "alt-react";

// These are the preferred assets chosen by default if the the user either
// doesn't have a balance in the currently selected asset anymore, or if he
// tries to buy BTS and has BTS selected for example
const preferredAssets = [
    "1.3.861", // OPEN.BTC
    "1.3.121", // bitUSD
    "1.3.0", // BTS
    "1.3.113" // bitCNY
];

class SimpleTradeContent extends React.Component {

    constructor(props) {
        super(props);
        /*
        * The terminology used assumes "buy" modal, so the assets in the
        * dropdown and list are base assets (for sale it's the opposite)
        */
        let activeAssetId =this._getNewActiveAssetId(props);


        this.state = {
            //activeAssetId:(this.props.action=="sell" ? this.props.sellAssetId : this.props.receiveAssetId), //not need
            priceValue: "",
            price: null,
            saleValue: "",
            receiveValue: "",
            activeAssetId,
            to_receive: this._getToReceive(props, {activeAssetId}),
            for_sale: this._getForSale(props, {activeAssetId}),
            showOrders: false
        };

        // this.state.price = new Price({
        //     base: this.state.for_sale,
        //     quote: this.state.to_receive
        // });

        this._subToMarket = this._subToMarket.bind(this);
    }

    componentDidMount() {
        this._checkSubAndBalance();
    }

    componentWillReceiveProps(np) {
        if (this.props.open && !np.open) this._unSubMarket();
        if (!this.props.open && np.open) {
            this._unSubMarket(this.props).then(() => {
                this._subToMarket(np);
            });
        };

        this._getCurrentPrice(np);

        if (np.asset !== this.props.asset) {
            this.setState(this._getNewAssetPropChange(np), () => {
                this._checkSubAndBalance(np);
            });
        }
    }

    componentDidUpdate() {
        ReactTooltip.rebuild();
    }

    componentWillUnmount() {
        this._unSubMarket();
    }

    _getCurrentPrice(props = this.props) {
        let {lowestAsk, highestBid} = props;
        if (!lowestAsk || !highestBid) return this.setState({
            price: null,
            priceValue: ""
        });

        const isBuy = props.action === "buy";
        const current = isBuy ? lowestAsk.clone() : highestBid.clone();
        const currentValue = isBuy ? lowestAsk._samebase_real : highestBid._not_samebase_real;



        if (!this.state.price || (this.state.price && this.state.price.isValid && !this.state.price.isValid())) {
            this.setState({
                price: current,
                priceValue: ''
            }, () => {
                this._updateToReceive() || this._updateForSale();
            });
        }
    }

    _getNewAssetPropChange(props = this.props, state = this.state) {
        let newState = {};
        const isBuy = props.action === "buy";
        newState[(isBuy ? "to_receive" : "for_sale")] = isBuy ?
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

        const currentPrice = price && price.isValid && price.isValid() ? price.toReal() : null;

        newState.price = new Price({
            base: isBuy ? newState.for_sale : this.state.for_sale,
            quote: isBuy ? this.state.to_receive : newState.to_receive,
            real: currentPrice
        });

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
        let newBaseId = props.assets.length ? props.assets[0].get("asset_type") :
            props.marketAssets.length ? props.marketAssets[0].get("id") : "1.3.0";
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
        if (index === -1) {
            this._unSubMarket().then(() => {
                let newActiveAssetId = this._getNewActiveAssetId(props);
                let newState = {};
                let isBuy = props.action === "buy";
                const currentAsset = isBuy ? "for_sale" : "to_receive";
                if (newActiveAssetId !== state[currentAsset].asset_id) {
                    newState = this._getNewAssetStateChange(newActiveAssetId);
                }
                newState.activeAssetId = newActiveAssetId;

                this._setAssetSetting(newState.activeAssetId);

                this.setState(newState, () => {
                    this._subToMarket(props);
                });
            });
        }
        this._unSubMarket().then(() => {
            this._subToMarket(props);
        });
    }

    _setActiveAsset(id) {
        if (id !== this.state.activeAssetId) {
            this._unSubMarket().then(() => {
                this._setAssetSetting(id);
                let newState = this._getNewAssetStateChange(id);
                newState.activeAssetId = id;
                this.setState(newState, () => {
                    this._subToMarket(this.props, this.state);
                });
            });
        }
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

        this.setState({
            priceValue: ''
        })
        // this._setAssetSetting(e.target.value);
        // this.setState({
        //     activeAssetId: e.target.value
        // },  () => {
        //     this._subToMarket(this.props, this.state);
        // });
    }

    _subToMarket(props = this.props, state = this.state) {
        let {assets, action} = props;
        let {activeAssetId} = state;
        const isBuy = action === "buy";

        if (this.props.asset && activeAssetId) {
            Promise.all([
                FetchChainObjects(ChainStore.getAsset, [props.asset]),
                FetchChainObjects(ChainStore.getAsset, [activeAssetId])
            ]).then(assets => {
                let [quoteAsset, baseAsset] = assets;
                MarketsActions.subscribeMarket.defer(isBuy ? baseAsset[0] : quoteAsset[0], isBuy ? quoteAsset[0] : baseAsset[0]);
            });
        } else {
            console.log("did not subscribe", this.props.asset, activeAssetId);
        }
    }

    _unSubMarket(props = this.props, state = this.state) {
        let {activeAssetId} = state;
        if (!activeAssetId || !props.asset) {
            return;
        }
        const isBuy = props.action === "buy";
        return new Promise((resolve, reject) => {
            Promise.all([
                FetchChainObjects(ChainStore.getAsset, [props.asset]),
                FetchChainObjects(ChainStore.getAsset, [activeAssetId])
            ]).then(assets => {
                let [quoteAsset, baseAsset] = assets;
                let baseID = baseAsset[0].get("id");
                let quoteID = quoteAsset[0].get("id");
                MarketsActions.unSubscribeMarket(isBuy ? quoteID : baseID, isBuy ? baseID : quoteID).then(() => {
                    resolve();
                });
            }).catch(err => {
                reject(err);
            });
        });

    }

    _getFee() {
        return this.refs.feeAsset.getFee();
    }

    _updatePrice(p = null) {
        console.log(p);
        let updated = false;

        let priceVal = this.props.action === "buy" ? p._samebase_real : p._not_samebase_real;
        console.log(priceVal);

        if (p) {
            this.setState({
                price : p
            });
            this._updateToReceive() || this._updateForSale();
            updated = true;
        } else if (this.state.for_sale.hasAmount() && this.state.to_receive.hasAmount()) {
            this.state.price = new Price({
                base: this.state.for_sale,
                quote: this.state.to_receive
            });
            updated = true;
        }



        if (updated) {
            this.state.priceValue = priceVal;
            this.forceUpdate();
        };
        return updated;
    }

    _updateToReceive(r = null) {

        let updated = false;
        if (r) {
            this.state.to_receive.setAmount({sats: r});
            this._updateForSale() || this._updatePrice();
            updated = true;
        } else if (this.state.price && this.state.price.isValid && this.state.price.isValid() && this.state.for_sale.hasAmount()) {
            this.state.to_receive = this.state.for_sale.times(this.state.price);
            updated = true;
        }
        if (updated) {
            this.state.receiveValue = this.state.to_receive.getAmount({real: true});
            this.forceUpdate();
        }
        return updated;
    }

    _updateForSale(f = null) {
        let updated = false;
        if (f) {
            this.state.for_sale.setAmount({sats: f});
            this._updateToReceive() || this._updatePrice();
            updated = true;
        } else if (this.state.price && this.state.price.isValid && this.state.price.isValid() && this.state.to_receive.hasAmount()) {
            this.state.for_sale = this.state.to_receive.times(this.state.price);
            updated = true;
        }
        if (updated) {
            this.state.saleValue = this.state.for_sale.getAmount({real: true});
            this.forceUpdate();
        }
        return updated;
    }

    _onInputPrice(e) {
        this.state.price = new Price({
                base: this.state.for_sale,
                quote: this.state.to_receive,
                real: parseFloat(e.target.value)
            });


        this._updateToReceive() || this._updateForSale();

        this.setState({
            priceValue: e.target.value
        });
    }

    _onInputSell(e) {
        this.state.for_sale.setAmount({real: parseFloat(e.target.value)});
        this._updateToReceive() || this._updatePrice();

        this.setState({
            saleValue: e.target.value
        });
    }

    _onInputReceive(e) {
        this.state.to_receive.setAmount({real: parseFloat(e.target.value)});
        this._updateForSale() || this._updatePrice();

        this.setState({
            receiveValue: e.target.value
        });
    }

    onSubmit(e) {
        e.preventDefault();
        let order = new LimitOrderCreate({
            for_sale: this.state.for_sale,
            to_receive: this.state.to_receive,
            seller: this.props.seller
        });

        console.log("order:", order);
        MarketsActions.createLimitOrder2(order).then(() => {
            console.log("order succeess");
        }).catch(e => {
            console.log("order failed:", e);
        });
    }

    onToggleOrders() {
        this.setState({
            showOrders: !this.state.showOrders
        });
    }

    _renderCurrentBalance() {
        const isBuy = this.props.action === "buy";

        let currentBalance = isBuy ? this.props.assets.find(a => a.get("asset_type") === this.state.activeAssetId) : this.props.currentBalance;
        let currentAsset = ChainStore.getAsset(currentBalance.get("asset_type"));
        const {replacedName:assetName} = utils.replaceName(currentAsset.get("symbol"), true);

        console.log("isBuy", isBuy, this.state.activeAssetId);
        let asset = new Asset({
            asset_id: currentBalance.get("asset_type"),
            precision: currentAsset.get("precision"),
            amount: currentBalance.get("balance")
        });

        // TEMP //
        // asset = new Asset({
        //     asset_id: this.props.asset.get("id"),
        //     precision: this.props.asset.get("precision"),
        //     amount: 65654645
        // });

        const applyBalanceButton = (
            <button
                data-place="right" data-tip={counterpart.translate("tooltip.trade_full")}
                className="button"
                style={{border: "2px solid black", borderLeft: "none"}}
                onClick={this._updateForSale.bind(this, !currentBalance ? 0 : parseInt(currentBalance.get("balance"), 10))}
            >
                <Icon name="clippy" />
            </button>
        );

        return (
            <div className="SimpleTrade__withdraw-row" style={{color: "black", fontSize: "1rem"}}>
                <label style={{color: "black", fontSize: "1rem"}}>
                    {counterpart.translate("gateway.balance_asset", {asset: assetName})}:
                    <span className="inline-label">
                        <input
                            disabled
                            style={{color: "black", border: "2px solid black", padding: 10, width: "100%"}}
                            value={!asset ? 0 : asset.getAmount({real: true})}
                        />
                        {applyBalanceButton}
                    </span>
                </label>
            </div>
        );
    }

    render() {

        let {modalId, asset, assets, lowVolumeMarkets, action, lowestAsk, highestBid, currentBalance} = this.props;

        let {activeAssetId, for_sale, to_receive, price} = this.state;
        const isBuy = action === "buy";
        // console.log("price:",price, price.toReal(), price.base.asset_id, price.quote.asset_id, "for_sale:", for_sale.getAmount({}), for_sale.asset_id, "to_receive:", to_receive.getAmount({}), to_receive.asset_id);
        let assetOptions = [];
        let forSaleBalance = isBuy && currentBalance ? currentBalance.toJS() : {balance: 0, asset_type: isBuy ? this.props.currentAsset.get("id") : activeAssetId};
        let receiveBalance = !isBuy && currentBalance ? currentBalance.toJS() : {balance: 0, asset_type: isBuy ? activeAssetId : this.props.currentAsset.get("id")};

        if (!isBuy) {
            assets = assets.concat(this.props.marketAssets);
        }
        let assetSelections = assets
        .sort((a, b) => {
            let assetA = ChainStore.getAsset(a.has("asset_type") ? a.get("asset_type") : a.get("id"));
            let assetB = ChainStore.getAsset(b.has("asset_type") ? b.get("asset_type") : b.get("id"));
            if (!assetA || !assetB) return -1;
            const symbolA = assetA.get("symbol");
            const symbolB = assetB.get("symbol");
            let balanceA = a.has("asset_type") ? a : null;
            let balanceB = b.has("asset_type") ? b : null;
            if (balanceA && balanceA.get("balance") || balanceB && balanceB.get("balance")) {
                if (balanceA && !balanceB) return -1;
                if (balanceB && !balanceA) return 1;
                return symbolA > symbolB ? 1 : symbolA < symbolB ? -1 : 0;
            } else {
                return symbolA > symbolB ? 1 : symbolA < symbolB ? -1 : 0;
            }
        })
        .map(b => {
            if (b.get("asset_type") === forSaleBalance.asset_type) {
                forSaleBalance = b.toJS();
            }
            if (b.get("asset_type") === receiveBalance.asset_type) {
                receiveBalance = b.toJS();
            }
            if (b.get("symbol")) {
                assetOptions.push({id: b.get("id"), asset: b});
                return (
                    <div
                        key={b.get("id")}
                        onClick={this._setActiveAsset.bind(this, b.get("id"))}
                        className={"balance-row" + (b.get("id") === activeAssetId ? " active": "")}
                    >
                        <FormattedAsset hide_amount asset={b.get("id")} />
                    </div>
                );
            }

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

        let obj_for_duplicate = {};

        const {replacedName:activeAssetName} = utils.replaceName(activeAsset.get("symbol"), true);
        const {replacedName:assetName} = utils.replaceName(asset, true);

        const marketID = isBuy ?
            this.props.currentAsset.get("id") + "_" + activeAsset.get("id") :
            activeAsset.get("id") + "_" + this.props.currentAsset.get("id");

        const isLowVolume = this.props.lowVolumeMarkets.get(marketID, false);

        const fsBalance = <div data-tip={counterpart.translate("tooltip.apply_balance")} onClick={this._updateToReceive.bind(this, parseInt(forSaleBalance.balance, 10))} style={{borderBottom: "#A09F9F 1px dotted", cursor: "pointer"}} className="float-right">
            <FormattedAsset amount={forSaleBalance.balance} asset={forSaleBalance.asset_type} />
        </div>;

        const rBalance = <div data-tip={counterpart.translate("tooltip.apply_balance")} onClick={this._updateForSale.bind(this, parseInt(receiveBalance.balance, 10))} style={{borderBottom: "#A09F9F 1px dotted", cursor: "pointer"}} className="float-right">
            <FormattedAsset amount={receiveBalance.balance} asset={receiveBalance.asset_type} />
        </div>;

        const spendSellText = isBuy ? <Translate content="simple_trade.spend" /> : <Translate content="exchange.sell" />;
        const receiveText = <Translate content="simple_trade.will_receive" />;

        const assetSelector = <div>
            <div className="SimpleTrade__help-text">
                {isBuy ? rBalance : fsBalance}
            </div>
            <label style={{width: "100%"}}>
                {isBuy ? spendSellText : receiveText}:
                <span className="inline-label">
                    <input type="text" value={this.state[isBuy ? "saleValue" : "receiveValue"]} onChange={this[isBuy ? "_onInputSell" : "_onInputReceive"].bind(this)}/>
                    <span data-place="bottom" data-tip={counterpart.translate("tooltip.asset_dropdown")} className="form-label" style={{border: "none", paddingLeft: 0, paddingRight: 0}}>
                        <select onChange={this._dropdownBalance.bind(this)} value={activeAssetId} style={{textTransform: "uppercase", minWidth: "10rem", color: "inherit", fontWeight: "normal", fontSize: "inherit", backgroundColor: "#eee", border: "none", margin: 0, paddingTop: 3, paddingBottom: 3}}>
                            {assetOptions
                                .filter(a => a && a.asset)
                                .map((b, index) => {
                                    if(obj_for_duplicate[b.id]){
                                        return null;
                                    }else{
                                        obj_for_duplicate[b.id]=true;
                                    }
                                    let name = b.asset.get("symbol");
                                    return <option key={name} value={b.id}><AssetName name={name} /></option>;
                                })}
                        </select>
                    </span>
                </span>
            </label>
            <div className="SimpleTrade__help-text">
                <Translate content={isBuy ? "simple_trade.max_spend" : "simple_trade.to_buy"} />
            </div>
        </div>;

        const receiveAsset = <div>
            <div className="SimpleTrade__help-text">
                {isBuy ? fsBalance : rBalance}
            </div>
            <label style={{width: "100%"}}>
                {isBuy ? receiveText : spendSellText}:
                <span className="inline-label">
                    <input type="text" value={this.state[isBuy ? "receiveValue" : "saleValue"]} onChange={this[isBuy ? "_onInputReceive" : "_onInputSell"].bind(this)} />
                    <span className="form-label" style={{minWidth: "10rem"}}><AssetName name={asset} /></span>
                </span>
            </label>
            <div className="SimpleTrade__help-text">
                <Translate content={isBuy ? "simple_trade.to_buy" : "simple_trade.max_spend"} />
            </div>
        </div>;

        return (
            <div className="SimpleTrade__modal">
                <div className="Modal__header">
                    {isBuy ?
                        <h3><Translate content="simple_trade.buy_with" buy={assetName} /></h3> :
                        <h3><Translate content="simple_trade.sell_for" sell={assetName} for={activeAssetName} /></h3>
                    }

                    {/* {this._renderCurrentBalance()} */}

                </div>
                <div className="Modal__divider"></div>

                <div className="grid-block vertical no-overflow" style={{zIndex: 1002, paddingLeft: "2rem", paddingRight: "2rem"}}>

                    <form style={{paddingTop: 10}} onSubmit={this.onSubmit.bind(this)}>

                        {/* PRICE */}
                        <div className="SimpleTrade__withdraw-row">
                            <div>
                                <div className="SimpleTrade__help-text">
                                    <div data-tip={counterpart.translate("tooltip.apply_price")} onClick={this._updatePrice.bind(this, isBuy ? lowestAsk : highestBid )} style={{borderBottom: "#A09F9F 1px dotted", cursor: "pointer"}} className="float-right">
                                        <span>{isBuy ? lowestAsk && lowestAsk._samebase_real : highestBid && highestBid._not_samebase_real} {isBuy ? activeAssetName : assetName}</span>
                                    </div>
                                </div>
                                <label style={{width: "100%"}}>
                                    <Translate content="exchange.price" />:
                                    <span className="inline-label">
                                        <input type="text" value={this.state.priceValue} onChange={this._onInputPrice.bind(this)}/>
                                        <span className="form-label" style={{minWidth: "10rem"}}><AssetName name={isBuy ? activeAsset.get("symbol") : asset} /></span>
                                    </span>
                                </label>
                                <div className="SimpleTrade__help-text">
                                    <Translate content="simple_trade.price_one" asset={isBuy ? assetName : activeAssetName} />
                                </div>
                            </div>
                        </div>

                        {/* SPEND */}
                        <div className="SimpleTrade__withdraw-row">
                            {isBuy ? assetSelector : receiveAsset}
                        </div>

                        {/* TOTAL */}
                        <div className="SimpleTrade__withdraw-row">
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>

                            </div>
                            {isBuy ? receiveAsset : assetSelector}
                        </div>

                        <div className="SimpleTrade__withdraw-row" style={{paddingTop: 20, paddingBottom: 20, fontWeight: "bold"}}>

                                <span><Translate content="simple_trade.summary" />: &nbsp;</span>
                                {for_sale.getAmount({real: true})} <AssetName name={isBuy ? activeAsset.get("symbol") : asset} /> => {to_receive.getAmount({real: true})} <AssetName name={isBuy ? asset : activeAsset.get("symbol")} />
                                <span>  (</span>
                                <Translate style={{textTransform: "lowercase"}} content="transfer.fee" />
                                <span>: </span>
                                <FormattedFee
                                    ref="feeAsset"
                                    asset={activeAssetId}
                                    opType="limit_order_create"
                                    balances={assets}
                                />)

                        </div>

                        {isLowVolume ? <div className="SimpleTrade__withdraw-row error"><Translate content="simple_trade.volume_warning" /></div> : null}

                        <div className="SimpleTrade__withdraw-row button-group">
                        {/*
                            some trouble with this part
                            <div className="button" onClick={this.onToggleOrders.bind(this)} ><Translate content="simple_trade.show_market" /></div>
                        */}
                            <div className="button" onClick={this.onSubmit.bind(this)} type="submit" ><Translate content="simple_trade.place_order" /></div>


                        </div>
                    </form>
                </div>
                {this.state.showOrders ? <div className="Modal__divider"></div> : null}
                {this.state.showOrders ?
                <div style={{padding: 0}}>
                    <OrderBook
                        simpleTrade
                        latest={1.2323}
                        changeClass=""
                        orders={this.props.orders}
                        calls={this.props.calls}
                        invertedCalls={false}
                        combinedBids={this.props.bids}
                        combinedAsks={this.props.asks}
                        base={isBuy ? activeAsset : this.props.currentAsset}
                        quote={isBuy ? this.props.currentAsset : activeAsset}
                        onClick={() => {}}
                        horizontal={true}
                        moveOrderBook={null}
                        flipOrderBook={false}
                        marketReady
                        wrapperClass="order-1"

                        highestBid={highestBid}
                        lowestAsk={lowestAsk}

                        //baseSymbol={baseSymbol}
                        //quoteSymbol={quoteSymbol}
                    />
                </div> : null}
            </div>
        );
    }
}

/*
                latest={latestPrice}
                changeClass={changeClass}
                orders={marketLimitOrders}
                calls={marketCallOrders}
                invertedCalls={invertedCalls}
                combinedBids={combinedBids}
                combinedAsks={combinedAsks}
                highestBid={highestBid}
                lowestAsk={lowestAsk}
                totalBids={totals.bid}
                totalAsks={totals.ask}
                base={base}
                quote={quote}
                baseSymbol={baseSymbol}
                quoteSymbol={quoteSymbol}
                onClick={this._orderbookClick.bind(this)}
                horizontal={!leftOrderBook}
                moveOrderBook={this._moveOrderBook.bind(this)}
                flipOrderBook={this.props.viewSettings.get("flipOrderBook")}
                marketReady={marketReady}
                wrapperClass={`order-${buySellTop ? 3 : 1} xlarge-order-${buySellTop ? 4 : 1}`}


*/

SimpleTradeContent = connect(SimpleTradeContent, {
    listenTo() {
        return [MarketsStore, SettingsStore];
    },
    getProps() {
        return {
            orders: MarketsStore.getState().activeMarketLimits,
            bids: MarketsStore.getState().marketData.combinedBids,
            asks: MarketsStore.getState().marketData.combinedAsks,
            lowVolumeMarkets: MarketsStore.getState().lowVolumeMarkets,
            highestBid: MarketsStore.getState().marketData.highestBid.sellPrice(),
            lowestAsk: MarketsStore.getState().marketData.lowestAsk.sellPrice(),
            receiveAssetId: SettingsStore.getState().viewSettings.get(["receiveAssetId"], preferredAssets[0]),
            sellAssetId: SettingsStore.getState().viewSettings.get(["sellAssetId"], preferredAssets[0])
        };
    }
});

export default class SimpleTradeModal extends React.Component {
    constructor() {
        super();

        this.state = {open: false};
    }

    show() {
        this.setState({open: true}, () => {
            ZfApi.publish(this.props.modalId, "open");
        });
    }

    onClose() {
        this.setState({open: false});
    }

    render() {
        return (
            <Modal onClose={this.onClose.bind(this)} id={this.props.modalId} overlay={true} className="test">
                <Trigger close={this.props.modalId}>
                    <a href="#" className="close-button">&times;</a>
                </Trigger>
                {this.props.currentAsset && this.state.open ? <SimpleTradeContent ref={"modal_content"} {...this.props} open={this.state.open} /> : null}
            </Modal>
        );
    }
}
