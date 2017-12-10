import React from "react";
import { PropTypes } from "react";
import { Link } from "react-router";
import Translate from "react-translate-component";
import { OrderRow, TableHeader } from "../Exchange/MyOpenOrders";
import market_utils from "common/market_utils";
import counterpart from "counterpart";
import MarketsActions from "actions/MarketsActions";
import SettingsActions from "actions/SettingsActions";
import LoadingIndicator from "../LoadingIndicator";
import { ChainStore } from "bitsharesjs/es";
import MarketLink from "../Utility/MarketLink";
import AccountStore from "stores/AccountStore";
import SettingsStore from "stores/SettingsStore";
import { connect } from "alt-react";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import {RecentTransactions} from "./RecentTransactions";
import Immutable from "immutable";
import FormattedAsset from "../Utility/FormattedAsset";
import ConfirmCancelModal from "../Exchange/ConfirmCancelModal";

class MyOrders extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired
    };

    constructor() {
        super();

        this.forceUpdate = this.forceUpdate.bind(this);
        this.state = {
            filterId: null
        };
    }

    componentDidMount() {
        ChainStore.subscribe(this.forceUpdate);
    }

    componentWillUnmount() {
        ChainStore.unsubscribe(this.forceUpdate);
    }


    _show_order_cancel(orderID, e) {
        this.refs.cancel.show(orderID);
    }

    _cancelLimitOrder(e,{orderID,fee_asset_choosen}) {
        e&&e.preventDefault();
       
        MarketsActions.cancelLimitOrder(
            this.props.account.get("id"),
            orderID, // order id to cancel
            fee_asset_choosen
        );

        this.refs.cancel.close();
    }

    _onToggleBids() {
        SettingsActions.changeViewSetting({ myOrdersBuys: !this.props.myOrdersBuys });
    }

    _setAssetFilter(e) {
        this.setState({
            filterId: e.target.value === "null" ? null : e.target.value
        });
    }

    render() {   

        let { account, myOrdersBuys } = this.props;
        let { filterId } = this.state;
        let cancel = counterpart.translate("account.perm.cancel");
        let markets = {};

        let marketOrders = {};


        if (!account.get("orders")) {
            return null;
        }

        let marketIDs = [];
        account.get("orders").forEach(orderID => {
            let order = ChainStore.getObject(orderID).toJS();
            let base = ChainStore.getAsset(order.sell_price.base.asset_id);
            let quote = ChainStore.getAsset(order.sell_price.quote.asset_id);
            if (base && quote) {
                let baseID = parseInt(order.sell_price.base.asset_id.split(".")[2], 10);
                let quoteID = parseInt(order.sell_price.quote.asset_id.split(".")[2], 10);

                if (marketIDs.indexOf(quoteID) === -1) {
                    marketIDs.push(quoteID);
                }

                if (marketIDs.indexOf(baseID) === -1) {
                    marketIDs.push(baseID);
                }

                let marketID = quoteID > baseID ? `${quote.get("symbol")}_${base.get("symbol")}` : `${base.get("symbol")}_${quote.get("symbol")}`;

                if (!markets[marketID]) {
                    if (quoteID > baseID) {
                        markets[marketID] = {
                            base: { id: base.get("id"), symbol: base.get("symbol"), precision: base.get("precision") },
                            quote: { id: quote.get("id"), symbol: quote.get("symbol"), precision: quote.get("precision") }
                        };
                    } else {
                        markets[marketID] = {
                            base: { id: quote.get("id"), symbol: quote.get("symbol"), precision: quote.get("precision") },
                            quote: { id: base.get("id"), symbol: base.get("symbol"), precision: base.get("precision") }
                        };
                    }
                }

                let marketBase = ChainStore.getAsset(markets[marketID].base.id);
                let marketQuote = ChainStore.getAsset(markets[marketID].quote.id);

                if (!marketOrders[marketID]) {
                    marketOrders[marketID] = [];
                }

                let { price } = market_utils.parseOrder(order, marketBase, marketQuote);

                let isAskOrder = market_utils.isAsk(order, marketBase);

                let includeMarket = !filterId || (filterId && (quoteID == filterId.split(".")[2] || baseID == filterId.split(".")[2]));

                if (((myOrdersBuys && !isAskOrder) || (!myOrdersBuys && isAskOrder)) && includeMarket) {
                    marketOrders[marketID].push(
                        <OrderRow
                            ref={markets[marketID].base.symbol}
                            key={order.id}
                            order={order}
                            base={marketBase}
                            quote={marketQuote}
                            cancel_text={cancel}
                            showSymbols={false}
                            invert={true}
                            onCancel={this._show_order_cancel.bind(this,order.id)}
                            price={price.full}
                        />
                    );
                }
            }
        });



        let tables = [];

        let marketIndex = 0;
        for (let market in marketOrders) {
            if (marketOrders[market].length) {
                tables.push(
                    <div key={market} style={marketIndex > 0 ? {paddingTop: "1rem"} : {}}>
                    <h5 style={{paddingLeft: 20, marginBottom: 5}}>
                        <MarketLink quote={markets[market].quote.id} base={markets[market].base.id} />
                    </h5>
                    <div className="exchange-bordered">
                            <table className="table table-striped text-right ">
                                <TableHeader baseSymbol={markets[market].base.symbol} quoteSymbol={markets[market].quote.symbol}/>
                                <tbody>
                                    {marketOrders[market].sort((a, b) => {
                                        return a.props.price - b.props.price;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
                marketIndex++;
            }
        }

        return (
            <div className="grid-container " style={{minWidth: "50rem", paddingBottom: 15, paddingTop: 40}}>
                <ConfirmCancelModal
                    ref="cancel"
                    type="cancel"
                    onCancel={this._cancelLimitOrder.bind(this)}
                />
                <div className="text-center">
                    <Translate content="header.my_orders" component="h3" />

                    <div style={{paddingTop: 20}}>
                        <span className={"buy-text" + (!myOrdersBuys ? " inactive" : "")} style={{paddingRight: 15}}><Translate content="exchange.buy" /></span>
                        <div onClick={this._onToggleBids.bind(this)} className="switch orders-switch" style={{marginBottom: 0, top: 9}}>
                            <input type="checkbox" checked={!myOrdersBuys}/>
                            <label />
                        </div>
                        <span className={"sell-text" + (myOrdersBuys ? " inactive" : "")} style={{paddingLeft: 15}}><Translate content="exchange.sell" /></span>
                    </div>

                    <div style={{paddingTop: 20, maxWidth: "15rem"}}>
                        <select className="bts-select" onChange={this._setAssetFilter.bind(this)}>
                            <option value={"null"}><Translate content="simple_trade.show_all" /></option>
                            {marketIDs.map(a => {return <option key={a} value={"1.3." + a}><FormattedAsset amount={0} asset={"1.3." + a} hide_amount /></option>;})}
                        </select>
                    </div>
                </div>
                {!tables.length ? <p><Translate content="account.no_orders" /></p> : null}
                {tables}

                <RecentTransactions
                    style={{marginBottom: 20, marginTop: 20}}
                    accountsList={Immutable.List([account.get("id")])}
                    limit={10}
                    compactView={false}
                    fullHeight={true}
                    customFilter={this.state.filterId ? {
                        fields: ["asset_id"],
                        values: {
                            asset_id: this.state.filterId
                        }
                    } : null}
                    filter={["limit_order_create", "fill_order"]}
                />
            </div>
        );
    }
}
MyOrders = BindToChainState(MyOrders);

class MyOrdersWrapper extends React.Component {
    render() {
        return <MyOrders account={this.props.currentAccount} myOrdersBuys={this.props.myOrdersBuys}/>;
    }
}

export default connect(MyOrdersWrapper, {
    getProps() {
        return {
            settings: SettingsStore.getState().settings,
            myAccounts: AccountStore.getState().myAccounts,
            viewSettings: SettingsStore.getState().viewSettings,
            currentAccount: AccountStore.getState().currentAccount,
            myOrdersBuys: SettingsStore.getState().viewSettings.get("myOrdersBuys", true)
        };
    },

    listenTo() {
        return [AccountStore, SettingsStore];
    }

});
