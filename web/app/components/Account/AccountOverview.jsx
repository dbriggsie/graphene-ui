import React from "react";
import Immutable from "immutable";
import Translate from "react-translate-component";
import BalanceComponent from "../Utility/BalanceComponent";
import TotalBalanceValue from "../Utility/TotalBalanceValue";
import SettleModal from "../Modal/SettleModal";
import {BalanceValueComponent} from "../Utility/EquivalentValueComponent";
import {Market24HourChangeComponent} from "../Utility/MarketChangeComponent";
import AssetName from "../Utility/AssetName";
import MarginPositions from "./MarginPositions";
import { RecentTransactions } from "./RecentTransactions";
import Proposals from "components/Account/Proposals";
import {ChainStore} from "bitsharesjs/es";
import SettingsActions from "actions/SettingsActions";
import assetUtils from "common/asset_utils";
import counterpart from "counterpart";
import Icon from "../Icon/Icon";
import {Link} from "react-router/es";
import ChainTypes from "../Utility/ChainTypes";
import EquivalentPrice from "../Utility/EquivalentPrice";
import BindToChainState from "../Utility/BindToChainState";
import LinkToAssetById from "../Utility/LinkToAssetById";
import utils from "common/utils";
import BorrowModal from "../Modal/BorrowModal";
import ReactTooltip from "react-tooltip";
import SimpleDepositWithdraw from "../Dashboard/SimpleDepositWithdraw";
import WithdrawModalBlocktrades from "../DepositWithdraw/blocktrades/WithdrawModalBlocktrades";
import SimpleDepositBlocktradesBridge from "../Dashboard/SimpleDepositBlocktradesBridge";
import BaseModal from "components/Modal/BaseModal";
import { Apis } from "bitsharesjs-ws";
import GatewayActions from "actions/GatewayActions";
import {Tabs, Tab} from "../Utility/Tabs";
import AccountOrders from "./AccountOrders";
import cnames from "classnames";
import TranslateWithLinks from "../Utility/TranslateWithLinks";
import { checkMarginStatus } from "common/accountHelper";
import tableHeightHelper from "common/tableHeightHelper";
import { blockTradesAPIs } from "api/apiConfig";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import SettingsStore from "stores/SettingsStore";
import AssetImage from "../Utility/AssetImage";
import AccountStore from "stores/AccountStore";

const WITHDRAW_MODAL_ID = "simple_withdraw_modal";

const EXCEPTIONAL_DEPOSIT_ASSETS = [
    "OPEN.USD",
    "OPEN.EUR"
]

const DEFAULT_FILTERS = {
    favorites: []
}

class AccountOverview extends React.Component {

    static propTypes = {
        balanceAssets: ChainTypes.ChainAssetsList,
        core_asset: ChainTypes.ChainAsset.isRequired
    };

    static defaultProps = {
        core_asset: "1.3.0"
    }

    constructor(props) {
        super();
        this.state = {
            sortKey: props.viewSettings.get("portfolioSort", "priceValue"),
            sortDirection: props.viewSettings.get("portfolioSortDirection", true), // alphabetical A -> B, numbers high to low
            settleAsset: "1.3.0",
            depositAsset: null,
            withdrawAsset: null,
            bridgeAsset: null,
            filter: "",
            showOnlyFavorites: window.localStorage.getItem("account.filters.onlyFavorites") === "true",
            favorites: window.localStorage.getItem("account.filters.favorites")
            && window.localStorage.getItem("account.filters.favorites").split(",")
            || DEFAULT_FILTERS.favorites,
            hideZeroBalances: window.localStorage.getItem("account.filters.hideZero") ? window.localStorage.getItem("account.filters.hideZero") === "true" : true
        };

        this.tableHeightMountInterval = tableHeightHelper.tableHeightMountInterval.bind(this);
        this.adjustHeightOnChangeTab = tableHeightHelper.adjustHeightOnChangeTab.bind(this);
        this._favotiteClicked = this._favotiteClicked.bind(this);
        this.priceRefs = {};
        this.valueRefs = {};
        this.changeRefs = {};
        for (let key in this.sortFunctions) {
            this.sortFunctions[key] = this.sortFunctions[key].bind(this);
        }
    }

    sortFunctions = {
        alphabetic: function(a, b, force) {
            if (a.props.symbol > b.props.symbol) return this.state.sortDirection || force ? 1 : -1;
            if (a.props.symbol < b.props.symbol) return this.state.sortDirection || force ? -1 : 1;
            return 0;
        },
        priceValue: function(a, b) {
            let aRef = this.priceRefs[a.props.symbol];
            let bRef = this.priceRefs[b.props.symbol];
            if (!aRef && bRef) {
                return 1;
            } 
            if (aRef && !bRef) {
                return -1;
            }
            if (aRef && bRef) {
                let aPrice = aRef.getFinalPrice(true);
                let bPrice = bRef.getFinalPrice(true);
                if (!aPrice && bPrice) return 1;
                if (aPrice && !bPrice) return -1;
                if (!aPrice && !bPrice) return this.sortFunctions.alphabetic(a, b, true);
                return this.state.sortDirection ? aPrice - bPrice : bPrice - aPrice;
            }
        },
        totalValue: function(a, b) {
            let aRef = this.valueRefs[a.props.symbol];
            let bRef = this.valueRefs[b.props.symbol];
            if (!aRef && bRef) {
                return 1;
            }
            if (aRef && !bRef) {
                return -1;
            }
            if (aRef && bRef) {
                let aValue = aRef.getValue();
                let bValue = bRef.getValue();
                if (!aValue && bValue) return 1;
                if (aValue && !bValue) return -1;
                if (!aValue && !bValue) return this.sortFunctions.alphabetic(a, b, true);
                return !this.state.sortDirection ? aValue - bValue : bValue - aValue;
            }
        },
        changeValue: function(a, b) {
            let aRef = this.changeRefs[a.props.symbol];
            let bRef = this.changeRefs[b.props.symbol];
            if (aRef && bRef) {
                let aValue = aRef.getValue();
                let bValue = bRef.getValue();
                let aChange = parseFloat(aValue) != "NaN" ? parseFloat(aValue) : aValue;
                let bChange = parseFloat(bValue) != "NaN" ? parseFloat(bValue) : bValue;
                let direction = typeof this.state.sortDirection !== "undefined" ? this.state.sortDirection : true;

                return direction ? aChange - bChange : bChange - aChange;
            }
        }
    }

    componentWillMount() {
        this._checkMarginStatus();
    }

    _checkMarginStatus(props = this.props) {
        checkMarginStatus(props.account).then(status => {
            let globalMarginStatus = null;
            for (let asset in status) {
                globalMarginStatus = status[asset].statusClass || globalMarginStatus;
            };
            this.setState({globalMarginStatus});
        });
    }

    componentWillReceiveProps(np) {
        if (np.account !== this.props.account) {
            this._checkMarginStatus(np);
            this.priceRefs = {};
            this.valueRefs = {};
            this.changeRefs = {};
            setTimeout(this.forceUpdate.bind(this), 500);
        };
    }

    componentDidMount(){
        //this.tableHeightMountIntervalInstance = this.tableHeightMountInterval();
    }

    componentWillUnmount(){
        // clearInterval(this.tableHeightMountIntervalInstance);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            !utils.are_equal_shallow(nextProps.balanceAssets, this.props.balanceAssets) ||
            !utils.are_equal_shallow(nextProps.backedCoins, this.props.backedCoins) ||
            !utils.are_equal_shallow(nextProps.balances, this.props.balances) ||
            nextProps.account !== this.props.account ||
            nextProps.settings !== this.props.settings ||
            nextProps.hiddenAssets !== this.props.hiddenAssets ||
            !utils.are_equal_shallow(nextState, this.state) ||
            this._filtersChanged(nextState)
        );
    }

    _filtersChanged(nextState) {
        return nextState.favorites !== this.state.favorites ||
            nextState.showOnlyFavorites !== this.state.showOnlyFavorites ||
            nextState.hideZeroBalances !== this.hideZeroBalances
    }

    _onSettleAsset(id, e) {
        e.preventDefault();
        this.setState({
            settleAsset: id
        });

        this.refs.settlement_modal.show();
    }

    _showDepositWithdraw(action, asset, fiatModal, e) {
        e.preventDefault();
        this.setState({
            [action === "bridge_modal" ? "bridgeAsset" : action === "deposit_modal" ? "depositAsset" : "withdrawAsset"]: asset,
            fiatModal
        }, () => {
            this.refs[action].show();
        });
    }

    _showWithdrawModal(asset, fiatModal, e) {
        e.preventDefault();
        this.setState({
            withdrawAsset: asset,
            fiatModal
        }, () => {
            ZfApi.publish(WITHDRAW_MODAL_ID, "open");
        });
    }

    _getSeparator(render) {
        return render ? <span>&nbsp;|&nbsp;</span> : null;
    }

    _onNavigate(route, e) {
        e.preventDefault();
        this.props.router.push(route);
    }


    _renderBorrow(asset, account) {
        let isBitAsset = asset && asset.has("bitasset_data_id");
        let modalRef = "cp_modal_" + asset.get("id");
        return {
            isBitAsset,
            borrowModal: !isBitAsset ? null : <BorrowModal
                ref={modalRef}
                quote_asset={asset.get("id")}
                backing_asset={asset.getIn(["bitasset", "options", "short_backing_asset"])}
                account={account}
            />,
            borrowLink: !isBitAsset ? null : <a onClick={() => { ReactTooltip.hide(); this.refs[modalRef].show(); }}><Icon name="dollar" className="icon-14px" /></a>
        };
    };

    _isFavorite(assetId) {
        const favorites = this.state.favorites;
        return favorites && favorites.indexOf(assetId) > -1;
    }

    _isSearch(assetId){
        const filter = this.state.filter;
        assetId = ChainStore.getAsset(assetId).get('symbol');
        return assetId.indexOf(filter) > -1;
    }

    _favotiteClicked(assetId) {
        const isFavorite = this._isFavorite(assetId);
        let favorites = this.state.favorites.slice(0);
        !isFavorite ? favorites.push(assetId) : favorites.splice(favorites.indexOf(assetId), 1);

        this.setState({
            favorites: favorites
        }, () => {
            window.localStorage.setItem("account.filters.favorites", favorites);
        });
    }

    _renderBalances(balanceList, visible) {
        const {core_asset} = this.props;
        let {settings, hiddenAssets, orders, account_name} = this.props;

        let currentAccount = AccountStore.getMyAccounts();

        let isCurrentAccount;
        
        currentAccount.forEach((el)=>{
            if(el ==  account_name) isCurrentAccount = true;
        })

        let preferredUnit = settings.get("unit") || core_asset.get("symbol");

        let showAssetPercent = settings.get("showAssetPercent", false);

        let balances = [];
        const emptyCell = "-";

        balanceList.forEach( (balance, ind) => {

            let balanceObject = ChainStore.getObject(balance);

            let asset, asset_type

            if (balanceObject.has("asset_type")) {
                asset_type = balanceObject.get("asset_type")
                asset = ChainStore.getObject(asset_type)
            } else {
                asset_type = balanceObject
                asset = asset_type
            }

            let directMarketLink, settleLink, transferLink;
            if (!asset) return null;

            const symbol = asset.get("symbol");
            const assetId = asset.get("id");
            const notCore = assetId !== "1.3.0";
            const notCorePrefUnit = preferredUnit !== core_asset.get("symbol");

            let {market} = assetUtils.parseDescription(asset.getIn(["options", "description"]));

            //   if (symbol.indexOf("OPEN.") !== -1 && !market) market = "USD";
            let preferredMarket = market ? market : preferredUnit;

            if (notCore && preferredMarket === symbol) preferredMarket = core_asset.get("symbol");

            /* Table content */
            directMarketLink = notCore ?
                <Link to={`/market/${symbol}_${preferredMarket}`}><Icon name="trade" className="icon-14px" /></Link> :
                notCorePrefUnit ? <Link to={`/market/${symbol}_${preferredUnit}`}><Icon name="trade" className="icon-14px" /></Link> :
                    emptyCell;
            transferLink = <Link to={`/transfer?asset=${assetId}`}><Icon name="transfer" className="icon-14px" /></Link>;

            let {isBitAsset, borrowModal, borrowLink} = this._renderBorrow(asset, this.props.account);

            /* Popover content */
            settleLink = <a href onClick={this._onSettleAsset.bind(this, assetId)}>
                <Icon name="settle" className="icon-14px" />
            </a>;

            const includeAsset = !hiddenAssets.includes(asset_type);
            const hasBalance = !!balanceObject.get("balance");
            const hasOnOrder = !!orders[asset_type];
            const canDepositWithdraw = !!this.props.backedCoins.get("OPEN", []).find(a => a.symbol === symbol);
            const canWithdraw = canDepositWithdraw && (hasBalance && balanceObject.get("balance") != 0);
            const canBuy = !!this.props.bridgeCoins.get(symbol);

            const starClass = this._isFavorite(assetId) ? "gold-star" : "grey-star";

            const isOpen = symbol.toLowerCase().indexOf("open") === 0
                && EXCEPTIONAL_DEPOSIT_ASSETS.indexOf(symbol) === -1;

            balances.push(
                <tr key={ind} symbol={symbol} style={{maxWidth: "100rem"}}>
                    <td className="favorite" onClick={() => {this._favotiteClicked(assetId)}}><Icon className={starClass} name="fi-star"/></td>
                    <td style={{
                        textAlign: "left",
                        paddingLeft: 10,
                        fontWeight: 'bold',
                        height: "30px"
                    }}>
                        <AssetImage style={{
                            height: "30px",
                            width: "30px" }} 
                            assetName={symbol} 
                            className="asset-image" 
                        />
                        <LinkToAssetById asset={assetId} />
                    </td>
                    <td style={{textAlign: "right"}}>
                        <BalanceComponent balance={balance} hide_asset hide_coin_name={true} />
                    </td>
                    <td style={{textAlign: "right"}} className="column-hide-small">
                        <EquivalentPrice
                            refCallback={(c) => {if (c && c.refs.bound_component) this.priceRefs[symbol] = c.refs.bound_component;}}
                            fromAsset={assetId}
                            hide_symbols
                        />
                    </td>
                    <td style={{textAlign: "right"}} className="column-hide-small">
                        <Market24HourChangeComponent
                            refCallback={(c) => { if (c && c.refs.bound_component) this.changeRefs[symbol] = c.refs.bound_component; }}
                            fromAsset={assetId}
                            toAsset={preferredUnit}
                            hide_symbols
                        />
                    </td>
                    <td style={{textAlign: "right"}} className="column-hide-small">
                        <BalanceValueComponent
                            balance={balance}
                            toAsset={preferredUnit}
                            hide_asset
                            refCallback={(c) => {if (c && c.refs.bound_component) this.valueRefs[symbol] = c.refs.bound_component;}}
                        />
                    </td>
                    {showAssetPercent ? <td style={{textAlign: "right"}}>
                        {hasBalance ? <BalanceComponent balance={balance} asPercentage={true} /> : null}
                    </td> : null}
                    <td>
                        {transferLink}
                    </td>
                    {/*    <td>
                        {canBuy && this.props.isMyAccount ?
                        <span>
                            <a onClick={this._showDepositWithdraw.bind(this, "bridge_modal", assetName, false)}>
                                <Icon name="dollar" className="icon-14px" />
                            </a>
                        </span> : emptyCell}
                    </td>*/}
                    <td>
                        <span>
                            {isOpen && isCurrentAccount ?
                                !canDepositWithdraw ?
                                    <span data-tip={counterpart.translate("gateway.under_mentainance")} className="inline-block tooltip">
                                        <Icon name="warning" />
                                    </span> :
                                    <a onClick={canDepositWithdraw ? this._showDepositWithdraw.bind(this, "deposit_modal", symbol, false) : () => { }}>
                                        <Icon name="deposit" className="icon-14px" />
                                    </a> : "-"}
                        </span>
                    </td>
                    <td>
                        <span>
                            {isOpen && isCurrentAccount ?
                                !canDepositWithdraw ?
                                    <span data-tip={counterpart.translate("gateway.under_mentainance")} className="inline-block tooltip">
                                        <Icon name="warning" />
                                    </span> :
                                    !canWithdraw ?
                                        <span data-tip={counterpart.translate("gateway.not_enough_funds")} className="inline-block tooltip">
                                        <Icon name="withdraw" className="icon-14px disabled" />
                                    </span> :
                                        <a onClick={this._showWithdrawModal.bind(this, symbol, false)}>
                                            <Icon name="withdraw" className="icon-14px" />
                                        </a>
                                : "-"}
                        </span>
                    </td>
                    <td>
                        {directMarketLink}
                    </td>
                    <td>
                        {isBitAsset ? <div className="inline-block" data-place="bottom" data-tip={counterpart.translate("tooltip.borrow", { asset: symbol })}>{borrowLink}{borrowModal}</div> : emptyCell}
                    </td>
                    <td>
                        {isBitAsset ? <div className="inline-block" data-place="bottom" data-tip={counterpart.translate("tooltip.settle", { asset: symbol })}>{settleLink}</div> : emptyCell}
                    </td>

                </tr>
            );
        });

        balances.sort(this.sortFunctions[this.state.sortKey]);
        return balances;
    }


    _toggleSortOrder(key) {
        if (this.state.sortKey === key) {
            SettingsActions.changeViewSetting({
                portfolioSortDirection: !this.state.sortDirection
            });
            this.setState({
                sortDirection: !this.state.sortDirection
            });
        } else {
            SettingsActions.changeViewSetting({
                portfolioSort: key
            });
            this.setState({
                sortKey: key
            });
        }
    }

    _onHideZeroChange() {
        const hide = !this.state.hideZeroBalances;
        this.setState({
            hideZeroBalances: hide
        }, () => {
            window.localStorage.setItem("account.filters.hideZero", hide);
        });
    }

    _onShowFavoritesChange() {
        const show = !this.state.showOnlyFavorites;
        this.setState({
            showOnlyFavorites: show
        }, () => {
            window.localStorage.setItem("account.filters.onlyFavorites", show);
        });
    }

    _getAllAssets() {
        const listAssets = SettingsStore.getState().topMarkets.map(item => {
            return ChainStore.getAsset(item);
        }).filter(e => e !== undefined);

        return listAssets;
    }

    _applyFilters(balancesIds, assetsIds) {
        // filters here
        const hideZeroBalances = this.state.hideZeroBalances;
        let balancesList = hideZeroBalances ? balancesIds : [...assetsIds, ...balancesIds];

        if(this.state.filter){
            balancesList = balancesList.filter((itemId) => {
                const chainObject = ChainStore.getObject(itemId);
                if (!chainObject) {
                    return;
                }
                const assetId = chainObject.get("symbol") ? itemId : chainObject.get("asset_type");
                return this._isSearch(assetId);
            });
        }

        if (this.state.showOnlyFavorites) {
            balancesList = balancesList.filter((itemId) => {
                const chainObject = ChainStore.getObject(itemId);
                if (!chainObject) {
                    return;
                }
                const assetId = chainObject.get("symbol") ? itemId : chainObject.get("asset_type");
                return this._isFavorite(assetId);
            });
        }

        return balancesList;
    }

    _getTotalAssetsList(assetsList, accountBalances) {
        const balancesIds = [ ...accountBalances.values() ];

        const assetsIds = assetsList.map((asset) => {
            return asset.get("id");
        }).filter((id)=> {
            return !accountBalances.has(id);
        });

        const resultList = this._applyFilters(balancesIds, assetsIds);

        return resultList;
    };

    _onSearch(e) {
        this.setState({
            filter: e.target.value.toUpperCase()
        });
    }

    render() {
        let {account, hiddenAssets, settings, orders} = this.props;

        if (!account) {
            return null;
        }

        let call_orders = [], collateral = {}, debt = {};

        if (account.toJS && account.has("call_orders")) call_orders = account.get("call_orders").toJS();
        let includedBalances;
        let accountBalances = account.get("balances");

        let includedBalancesList = Immutable.List();
        call_orders.forEach( (callID) => {
            let position = ChainStore.getObject(callID);
            if (position) {
                let collateralAsset = position.getIn(["call_price", "base", "asset_id"]);
                if (!collateral[collateralAsset]) {
                    collateral[collateralAsset] = parseInt(position.get("collateral"), 10);
                } else {
                    collateral[collateralAsset] += parseInt(position.get("collateral"), 10);
                }
                let debtAsset = position.getIn(["call_price", "quote", "asset_id"]);
                if (!debt[debtAsset]) {
                    debt[debtAsset] = parseInt(position.get("debt"), 10);
                } else {
                    debt[debtAsset] += parseInt(position.get("debt"), 10);
                }
            }
        });

        if (accountBalances) {
            // Filter out balance objects that have 0 balance or are not included in open orders
            accountBalances = accountBalances.filter((a, index) => {
                let balanceObject = ChainStore.getObject(a);
                return (balanceObject && (balanceObject.get("balance") || orders[index]))
            });

            // Separate balances into hidden and included
            accountBalances.forEach((a, asset_type) => {
                includedBalancesList = includedBalancesList.push(a);
            });

            const assetsList = this._getAllAssets();
            let sortedAssets = this._getTotalAssetsList(assetsList, accountBalances);

            let included = this._renderBalances(sortedAssets, true);
            includedBalances = included;

        }

        let totalBalanceList = includedBalancesList;

        let totalValue =
            <TotalBalanceValue
                noTip
                balances={totalBalanceList}
                openOrders={orders}
                debt={debt}
                collateral={collateral}
                hide_asset
            />;
        let portFolioValue =
            <TotalBalanceValue
                noTip
                balances={totalBalanceList}
                hide_asset
            />;
        let ordersValue =
            <TotalBalanceValue
                noTip
                balances={Immutable.List()}
                openOrders={orders}
                hide_asset
            />;
        let marginValue =
            <TotalBalanceValue
                noTip
                balances={Immutable.List()}
                debt={debt}
                collateral={collateral}
                hide_asset
            />;
        let debtValue =
            <TotalBalanceValue
                noTip
                balances={Immutable.List()}
                debt={debt}
                hide_asset
            />;
        let collateralValue =
            <TotalBalanceValue
                noTip
                balances={Immutable.List()}
                collateral={collateral}
                hide_asset
            />;

        const preferredUnit = settings.get("unit") || this.props.core_asset.get("symbol");
        const totalValueText = <TranslateWithLinks
            noLink
            string="account.total"
            keys={[
                {type: "asset", value: preferredUnit, arg: "asset"}
            ]}
        />;

        includedBalances.push(<tr key="portfolio" className="total-value"><td></td><td  style={{textAlign: "left", paddingLeft: 10}}>{totalValueText}</td><td colSpan="3"></td><td className="column-hide-small" style={{textAlign: "right"}}>{portFolioValue}</td><td colSpan="6"></td></tr>);

        let showAssetPercent = settings.get("showAssetPercent", false);

        // Find the current Openledger coins
        const currentDepositAsset = this.props.backedCoins.get("OPEN", []).find(c => {
            return c.symbol === this.state.depositAsset;
        }) || {};

        const withdrawAsset = this.props.backedCoins.get("OPEN", []).find(c => {
            return c.symbol === this.state.withdrawAsset;
        }) || {};
        const currentBridges = this.props.bridgeCoins.get(this.state.bridgeAsset) || null;

        const preferredAsset = ChainStore.getAsset(preferredUnit);
        let assetName = !!preferredAsset ? preferredAsset.get("symbol") : "";
        if (preferredAsset) {
            const {prefix, name} = utils.replaceName(assetName, !!preferredAsset.get("bitasset_data_id"));
            assetName = (prefix || "") + name;
        }
        const hiddenSubText = <span style={{visibility: "hidden"}}>H</span>;
        const assetObject = ChainStore.getAsset(withdrawAsset.symbol);
        const {showOnlyFavorites, hideZeroBalances} = this.state;

        return (
            <div className="grid-content app-tables" >
                <div className="content-block small-12">
                    <div className="generic-bordered-box">
                        <Tabs defaultActiveTab={0} segmented={false} setting="overviewTab" className="overview-tabs" tabsClass="account-overview no-padding bordered-header content-block" onChangeTab={this.adjustHeightOnChangeTab.bind(this)}>

                            {/* <Tab disabled className="total-value" title={<span>{counterpart.translate("account.eq_value")}&nbsp;<AssetName name={preferredUnit} noTip /></span>} subText={totalValue}>

                            </Tab> */}

                            <Tab title="account.portfolio" subText={portFolioValue}>
                                <div className="filter-account-balances" >
                                    <div className="filter-search-accaunt">
                                        <input onChange={this._onSearch.bind(this)} value={this.state.filter} style={{marginBottom: 0, }} type="text" placeholder={counterpart.translate("simple_trade.find_an")} />
                                        {this.state.filter.length ? <span className="clickable" style={{position: "absolute", top: 12, right: 10, color: "black"}} onClick={() => {this.setState({filter: ""});}}>

                                         <Icon className="icon-14px fill-red" name="lnr-cross"/>
                                    </span> : null}
                                    </div>
                                    <span className={cnames("button cursor-pointer", {"no-active": !showOnlyFavorites})} onClick={this._onShowFavoritesChange.bind(this)}>
                                                <Icon className={showOnlyFavorites ? "gold-star icon-filter-star" : "grey-star icon-filter-star"} name="fi-star"  />
                                                <label htmlFor="" style={{marginBottom: 0, cursor: 'pointer'}}><Translate content="account.filter_favorites" /></label>
                                        </span>

                                        <span className={cnames("filter-hidden-balance button", {"no-active": !hideZeroBalances})} onChange={this._onHideZeroChange.bind(this)} >
                                                <input id="inp-hide-balance" type="checkbox" defaultChecked={this.state.hideZeroBalances} />
                                                <label className="cursor-pointer" htmlFor="inp-hide-balance"><Translate  content="account.filter_hedden_balance" /></label>
                                         </span>
                                </div>

                                <table className="table dashboard-table">
                                    <thead>
                                    <tr>
                                        {/*<th><Translate component="span" content="modal.settle.submit" /></th>*/}
                                        <th><Icon class="gold-star" name="fi-star"/></th>
                                        <th style={{ textAlign: "left", paddingLeft: 10 }} className="clickable" onClick={this._toggleSortOrder.bind(this, "alphabetic")}><Translate component="span" content="account.asset" /></th>
                                        <th style={{ textAlign: "right" }}><Translate content="account.qty" /></th>
                                        <th onClick={this._toggleSortOrder.bind(this, "priceValue")} className="column-hide-small clickable" style={{ textAlign: "right" }}><Translate content="exchange.price" /> (<AssetName name={preferredUnit} />)</th>
                                        <th onClick={this._toggleSortOrder.bind(this, "changeValue")} className="column-hide-small clickable" style={{ textAlign: "right" }}><Translate content="account.hour_24_short" /></th>
                                        {/*<<th style={{textAlign: "right"}}><Translate component="span" content="account.bts_market" /></th>*/}
                                        <th onClick={this._toggleSortOrder.bind(this, "totalValue")} style={{ textAlign: "right" }} className="column-hide-small clickable">
                                            <TranslateWithLinks
                                                noLink
                                                string="account.eq_value_header"
                                                keys={[
                                                    {type: "asset", value: preferredUnit, arg: "asset"}
                                                ]}
                                            />
                                        </th>
                                        {showAssetPercent ? <th style={{textAlign: "right"}}><Translate component="span" content="account.percent" /></th> : null}
                                        <th><Translate content="header.payments" /></th>
                                        {/* <th><Translate content="exchange.buy" /></th>*/}
                                        <th><Translate content="modal.deposit.submit" /></th>
                                        <th><Translate content="modal.withdraw.submit" /></th>
                                        <th><Translate content="account.trade" /></th>
                                        <th><Translate content="exchange.borrow" /></th>
                                        <th><Translate content="account.settle" /></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {includedBalances}
                                    </tbody>
                                </table>
                            </Tab>

                            <Tab title="account.open_orders" subText={ordersValue}>
                                <AccountOrders {...this.props}>
                                    <tbody>
                                    <tr className="total-value">
                                        <td style={{textAlign: "center"}} colSpan="3">
                                            {totalValueText}
                                        </td>
                                        <td colSpan="3"></td>
                                        <td style={{textAlign: "center"}}>{ordersValue}</td>
                                        <td colSpan="1"></td>
                                        {this.props.isMyAccount ? <td></td> : null}
                                    </tr>
                                    </tbody>
                                </AccountOrders>
                            </Tab>

                            <Tab title="account.collaterals" subText={<span className={this.state.globalMarginStatus}>{marginValue}</span>}>
                                <div className="content-block">
                                    <div className="generic-bordered-box">
                                        <MarginPositions preferredUnit={preferredUnit} className="dashboard-table" callOrders={call_orders} account={account}>
                                            <tr className="total-value">
                                                <td>
                                                    {totalValueText}
                                                </td>
                                                <td>{debtValue}</td>
                                                <td>{collateralValue}</td>
                                                <td></td>
                                                <td>{marginValue}</td>
                                                <td colSpan="5"></td>
                                            </tr>
                                        </MarginPositions>
                                    </div>
                                </div>
                            </Tab>

                            {/* <Tab title="markets.title" subText={hiddenSubText}>

                            </Tab> */}

                            <Tab title="account.activity" subText={hiddenSubText}>
                                <RecentTransactions
                                    accountsList={Immutable.fromJS([account.get("id")])}
                                    compactView={false}
                                    showMore={true}
                                    fullHeight={true}
                                    limit={15}
                                    showFilters={true}
                                    dashboard
                                />
                            </Tab>

                            {account.get("proposals") && account.get("proposals").size ?
                                <Tab title="explorer.proposals.title" subText={account.get("proposals") ? account.get("proposals").size : 0}>

                                    <Proposals className="dashboard-table" account={account.get("id")}/>
                                </Tab> : null}
                        </Tabs>

                        <SettleModal ref="settlement_modal" asset={this.state.settleAsset} account={account.get("name")}/>
                    </div>
                </div>

                {/* Deposit Modal */}
                <SimpleDepositWithdraw
                    ref="deposit_modal"
                    action="deposit"
                    fiatModal={this.state.fiatModal}
                    account={this.props.account.get("name")}
                    sender={this.props.account.get("id")}
                    asset={this.state.depositAsset}
                    modalId="simple_deposit_modal"
                    balances={this.props.balances}
                    {...currentDepositAsset}
                    isDown={this.props.gatewayDown.get("OPEN")}
                />

                <BaseModal id={WITHDRAW_MODAL_ID} overlay={true} className="withdraw_modal">
                    <div className="grid-block vertical">
                        {withdrawAsset.name && <WithdrawModalBlocktrades
                            ref="withdraw_modal"
                            account={this.props.account.get("name")}
                            sender={this.props.account.get("id")}
                            issuer={withdrawAsset.intermediateAccount}
                            asset={withdrawAsset.symbol}
                            url={blockTradesAPIs.BASE_OL}
                            output_coin_name={withdrawAsset.name}
                            gateFee={withdrawAsset.gateFee}
                            output_coin_symbol={withdrawAsset.backingCoinType.toUpperCase()}
                            output_coin_type={withdrawAsset.backingCoinType.toLowerCase()}
                            output_wallet_type={withdrawAsset.walletType}
                            output_supports_memos={withdrawAsset.supportsMemos}
                            modal_id={WITHDRAW_MODAL_ID}
                            balance={this.props.account.get("balances").toJS()[assetObject.get("id")]}
                        />}
                    </div>
                </BaseModal>

                {/* Bridge modal */}
                <SimpleDepositBlocktradesBridge
                    ref="bridge_modal"
                    action="deposit"
                    account={this.props.account.get("name")}
                    sender={this.props.account.get("id")}
                    asset={this.state.bridgeAsset}
                    modalId="simple_bridge_modal"
                    balances={this.props.balances}
                    bridges={currentBridges}
                    isDown={this.props.gatewayDown.get("TRADE")}
                />
            </div>

        );
    }
}

AccountOverview = BindToChainState(AccountOverview);

class BalanceWrapper extends React.Component {

    static propTypes = {
        balances: ChainTypes.ChainObjectsList,
        orders: ChainTypes.ChainObjectsList
    };

    static defaultProps = {
        balances: Immutable.List(),
        orders: Immutable.List()
    };

    componentWillMount() {
        if (Apis.instance().chain_id.substr(0, 8) === "4018d784") { // Only fetch this when on BTS main net
            GatewayActions.fetchCoins();
            GatewayActions.fetchBridgeCoins();
        }
    }

    render() {
        let balanceAssets = this.props.balances.map(b => {
            return b && b.get("asset_type");
        }).filter(b => !!b);

        let ordersByAsset = this.props.orders.reduce((orders, o) => {
            let asset_id = o.getIn(["sell_price", "base", "asset_id"]);
            if (!orders[asset_id]) orders[asset_id] = 0;
            orders[asset_id] += parseInt(o.get("for_sale"), 10);
            return orders;
        }, {});

        for (let id in ordersByAsset) {
            if (balanceAssets.indexOf(id) === -1) {
                balanceAssets.push(id);
            }
        }

        return (
            <AccountOverview {...this.state} {...this.props} orders={ordersByAsset} balanceAssets={Immutable.List(balanceAssets)} />
        );
    };
}

export default BindToChainState(BalanceWrapper);