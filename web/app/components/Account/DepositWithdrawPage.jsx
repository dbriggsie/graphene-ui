import React from "react";
import { connect } from "alt-react";
import accountUtils from "common/account_utils";
import Translate from "react-translate-component";
import BindToChainState from "../Utility/BindToChainState";
import { blockTradesAPIs } from "api/apiConfig";
import GatewayStore from "stores/GatewayStore";
import DepositModalRmbpay from "../DepositWithdraw/openledger/DepositModalRmbpay";
import WithdrawModalRmbpay from "../DepositWithdraw/openledger/WithdrawModalRmbpay";
import Immutable from "immutable";
import BalanceComponent from "../Utility/BalanceComponent";
import TotalBalanceValue from "../Utility/TotalBalanceValue";
import {BalanceValueComponent} from "../Utility/EquivalentValueComponent";
import {ChainStore} from "bitsharesjs/es";
import SettingsActions from "actions/SettingsActions";
import assetUtils from "common/asset_utils";
import counterpart from "counterpart";
import Icon from "../Icon/Icon";
import ChainTypes from "../Utility/ChainTypes";
import LinkToAssetById from "../Utility/LinkToAssetById";
import utils from "common/utils";
import SimpleDepositWithdraw from "../Dashboard/SimpleDepositWithdraw";
import WithdrawModalBlocktrades from "../DepositWithdraw/blocktrades/WithdrawModalBlocktrades";
import BaseModal from "components/Modal/BaseModal";
import cnames from "classnames";
import TranslateWithLinks from "../Utility/TranslateWithLinks";
import { checkMarginStatus } from "common/accountHelper";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import SettingsStore from "stores/SettingsStore";
import AssetImage from "../Utility/AssetImage";
import AccountStore from "stores/AccountStore";
import { Apis } from "bitsharesjs-ws";
import GatewayActions from "actions/GatewayActions";


const RMBPAY_ASSET_ID = "1.3.2562";

const WITHDRAW_MODAL_ID = "dw_simple_withdraw_modal";
const TRANSFER_MODAL_ID = "transfer_modal";

const EXCEPTIONAL_DEPOSIT_ASSETS = [
    "OPEN.USD",
    "OPEN.EUR"
];

const MANDATORY_CURRENCY = {
    rmbpay: "RMBPAY"
};

const FIAT_ASSETS = [
    "USD",
    "EUR",
    "RMBPAY"
];

const DEFAULT_FILTERS = {
    favorites: []
};

class AccountDepositWithdraw extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired,
        balances: ChainTypes.ChainAccount.isRequired
    };

    static defaultProps = {
        core_asset: "1.3.0"
    };

    constructor(props) {
        super();
        this.state = {
            sortKey: props.viewSettings.get("portfolioSort", "balanceValue"),
            sortDirection: props.viewSettings.get("portfolioSortDirection", true), // alphabetical A -> B, numbers high to low
            showRMBpay: false,
            withdrawAsset: null,
            depositAsset: null,
            rmbPay: {
                list_service: [{
                    name: "Alipay",
                    link_qr_code: ""
                }],
                fees: {
                    fee_share_dep: 0.0,
                    fee_min_val_dep: 0
                }
            },
            filter: "",
            showOnlyFavorites: window.localStorage.getItem("depositWithdraw.filters.onlyFavorites") === "true",
            favorites: window.localStorage.getItem("depositWithdraw.filters.favorites")
            && window.localStorage.getItem("depositWithdraw.filters.favorites").split(",")
            || DEFAULT_FILTERS.favorites,
            hideZeroBalances: window.localStorage.getItem("depositWithdraw.filters.hideZero") === "true",
            showFiat: window.localStorage.getItem("depositWithdraw.filters.showFiat") === "true",
            fiatCurrency: FIAT_ASSETS,
            currentAsset: null
        };

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
        balanceValue: function(a, b) {
            const aBalance = a.props.balance;
            const bBalance = b.props.balance;
            if (!aBalance && bBalance) {
                return 1;
            }
            if (aBalance && !bBalance) {
                return -1;
            }
            return this.state.sortDirection ? aBalance - bBalance : bBalance - aBalance;
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
                return this.state.sortDirection ? aValue - bValue : bValue - aValue;
            }
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            !utils.are_equal_shallow(nextProps.backedCoins, this.props.backedCoins) ||
            !utils.are_equal_shallow(nextProps.balances, this.props.balances) ||
            nextProps.account !== this.props.account ||
            nextProps.settings !== this.props.settings ||
            nextState.showRMBpay !== this.state.showRMBpay ||
            !utils.are_equal_shallow(nextState, this.state) ||
            this._filtersChanged(nextState)
        );
    }

    _filtersChanged(nextState) {
        return nextState.favorites !== this.state.favorites ||
            nextState.showOnlyFavorites !== this.state.showOnlyFavorites ||
            nextState.hideZeroBalances !== this.hideZeroBalances ||
            nextState.showFiat !== this.showFiat
    }

    componentWillMount() {
        accountUtils.getFinalFeeAsset(this.props.account, "transfer");
    }

    componentDidMount() {

    }

    componentWillReceiveProps(np) {
        if (np.account !== this.props.account) {
            this.priceRefs = {};
            this.valueRefs = {};
            this.changeRefs = {};
            setTimeout(this.forceUpdate.bind(this), 500);
        };
    }


    _getRmbpayBalance() {
        const account = this.props.account
        const rmbpayBalance = account && account.get("balances").toJS()[RMBPAY_ASSET_ID]
        const balanceObject = rmbpayBalance ? ChainStore.getObject(rmbpayBalance) : 0
        const rmbPayAsset = ChainStore.getAsset("RMBPAY")
        const precision = rmbPayAsset ? utils.get_asset_precision(rmbPayAsset) : 1
        return balanceObject ? balanceObject.get("balance") / precision : 0
    }


    getWithdrawModalId() {
        return "withdraw_asset_openledger-dex_CNY";
    }

    getDepositModalId() {
        return "deposit_asset_openledger-dex_CNY";
    }

    onDeposit() {
        this.depositModalRmbpay.refs.bound_component.onOpen();
        ZfApi.publish(this.getDepositModalId(), "open");
    }

    onWithdraw() {
        this.withdrawModalRmbpay.refs.bound_component.fetchWithdrawData();
        ZfApi.publish(this.getWithdrawModalId(), "open");
    }

    _isFavorite(assetId) {
        const favorites = this.state.favorites;
        return favorites && favorites.indexOf(assetId) > -1;
    }

    _isFiat(assetId) {
        const fiats = this.state.fiatCurrency;

        let assetSymbol = ChainStore.getObject(assetId);
        if(assetSymbol){
            assetSymbol = assetSymbol.get('symbol');
            return fiats && fiats.indexOf(assetSymbol) > -1 || fiats.indexOf(assetSymbol.substr(5)) > -1;
        }
        return false;
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
            window.localStorage.setItem("depositWithdraw.filters.favorites", favorites);
        });
    }

    _showDepositWithdraw(action, asset, fiatModal, e) {
        e.preventDefault();
        this.setState({
            depositAsset : asset,
            fiatModal: fiatModal
        }, () => {
            this.refs[action].show();
        });
    }

    _showWithdrawModal(asset, fiatModal, e) {
        e.preventDefault();
        this.setState({
            withdrawAsset: asset,
            fiatModal: fiatModal
        }, () => {
            ZfApi.publish(WITHDRAW_MODAL_ID, "open");
        });
    }

    _canDeposit(name) {
        return SettingsStore.RESTRICT_DEPOSIT.indexOf(name) === -1;
    }

    _renderBalances(balanceList, visible) {

        const {core_asset} = this.props;
        let {settings, hiddenAssets, orders} = this.props;

        let currentAccount = AccountStore.getMyAccounts();

        let isCurrentAccount;

        let preferredUnit = settings.get("unit") || core_asset.get("symbol");

        currentAccount.forEach((el)=>{
            if(el ==  this.props.account.get('name')) isCurrentAccount = true;
        });

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

            let {market} = assetUtils.parseDescription(asset.getIn(["options", "description"]));

            const hasBalance = !!balanceObject.get("balance");
            // const hasOnOrder = !!orders[asset_type];
            let canDepositWithdraw = !!this.props.backedCoins.get("OPEN", []).find(a => a.symbol === symbol);
            if(symbol == MANDATORY_CURRENCY.rmbpay) canDepositWithdraw = true;

            const canWithdraw = canDepositWithdraw && (hasBalance && balanceObject.get("balance") != 0);
            const canBuy = !!this.props.bridgeCoins.get(symbol);

            const starClass = this._isFavorite(assetId) ? "gold-star" : "grey-star";

            const precision = utils.get_asset_precision(asset.get("precision"));
            const balanceAmount = hasBalance && balanceObject.get("balance");
            const balancePrecised = balanceAmount / precision;


            balances.push(
                <tr key={ind} symbol={symbol} balance={balancePrecised} style={{maxWidth: "100rem"}}>
                    <td className="favorite" onClick={() => {this._favotiteClicked(assetId)}}><Icon className={starClass} name="fi-star"/></td>
                    <td style={{
                        textAlign: "left",
                        paddingLeft: 10,
                        fontWeight: 'bold'
                    }}>
                        <AssetImage style={{
                            height: "25px",
                            width: "25px" }}
                                    assetName={symbol}
                                    className="asset-image"
                        />
                        <LinkToAssetById asset={assetId} />
                    </td>
                    <td style={{textAlign: "right"}}>
                        <BalanceComponent balance={balance} hide_asset hide_coin_name={true}/>
                    </td>
                    <td style={{textAlign: "center"}} className="column-hide-small">
                        <BalanceValueComponent
                            balance={balance}
                            toAsset={preferredUnit}
                            hide_asset
                            refCallback={(c) => {if (c && c.refs.bound_component) this.valueRefs[symbol] = c.refs.bound_component;}}
                        />
                    </td>
                    <td>
                         <span>
                                {isCurrentAccount && this._canDeposit(symbol) ?
                                    !canDepositWithdraw ?
                                        <span data-tip={counterpart.translate("gateway.under_maintenance")} className="inline-block tooltip">
                                            <Icon name="warning" />
                                        </span> :
                                        <a onClick={canDepositWithdraw ? symbol !== MANDATORY_CURRENCY.rmbpay ? this._showDepositWithdraw.bind(this, "deposit_modal", symbol, false) : this.onDeposit.bind(this) : () => {}}>
                                            {symbol !== MANDATORY_CURRENCY.rmbpay ? <Icon name="deposit" className="icon-14px" /> : <span data-tip={counterpart.translate("gateway.rmbpay.deposit_info")}><Icon name="deposit" className="icon-14px" /></span>}
                                        </a>
                                    : "-"}
                         </span>
                    </td>
                    <td>
                            <span>
                                {isCurrentAccount ?
                                    !canDepositWithdraw ?
                                        <span data-tip={counterpart.translate("gateway.under_maintenance")} className="inline-block tooltip">
                                            <Icon name="warning" />
                                        </span> :
                                        !canWithdraw ?
                                            <span data-tip={counterpart.translate("gateway.not_enough_funds")} className="inline-block tooltip">
                                            <Icon name="withdraw" className="icon-14px disabled" />
                                        </span> :
                                            <a onClick={symbol !== MANDATORY_CURRENCY.rmbpay ? this._showWithdrawModal.bind(this, symbol, false) : this.onWithdraw.bind(this)}>
                                                {symbol !== MANDATORY_CURRENCY.rmbpay ? <Icon name="deposit" className="icon-14px" /> : <span data-tip={counterpart.translate("gateway.rmbpay.withdrawal_info")}><Icon name="deposit" className="icon-14px" /></span>}
                                            </a>
                                    : "-"}
                            </span>
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
            window.localStorage.setItem("depositWithdraw.filters.hideZero", hide);
        });
    }

    _showFiat() {
        const hide = !this.state.showFiat;
        this.setState({
            showFiat: hide
        }, () => {
            window.localStorage.setItem("depositWithdraw.filters.showFiat", hide);
        });
    }

    _onShowFavoritesChange() {
        const show = !this.state.showOnlyFavorites;
        this.setState({
            showOnlyFavorites: show
        }, () => {
            window.localStorage.setItem("depositWithdraw.filters.onlyFavorites", show);
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
        let balancesList = [];

        if (this.state.filter) {
            balancesList = [...assetsIds, ...balancesIds];
            balancesList = this._applyFilter(balancesList, this._isSearch.bind(this))
        } else {
            balancesList = hideZeroBalances ? balancesIds : [...assetsIds, ...balancesIds];
            if (this.state.showOnlyFavorites) {
                balancesList = this._applyFilter(balancesList, this._isFavorite.bind(this))
            }
            // Show Fiat
            if (this.state.showFiat) {
                balancesList = this._applyFilter(balancesList, this._isFiat.bind(this))
            }
        }
        return balancesList;
    }

    _applyFilter(balancesList, filterFunction) {
        return balancesList.filter((itemId) => {
            const chainObject = ChainStore.getObject(itemId);
            if (!chainObject) {
                return;
            }
            let assetId = chainObject.get("symbol") ? itemId : chainObject.get("asset_type");
            return filterFunction(assetId);
        });
    }

    _filterOpenAsset(assetList){
        let filterAsset = [];
        assetList.forEach((item)=>{
            const chainObject = ChainStore.getObject(item);
            if (!chainObject) {
                return;
            }

            let assetSymbol = chainObject.get("symbol")

            if(!assetSymbol){
                assetSymbol = chainObject.get("asset_type");
                let assetObj = ChainStore.getObject(assetSymbol);
                assetSymbol = assetObj && assetObj.get("symbol");
            }

            if( assetSymbol && assetSymbol.toLowerCase().indexOf("open") == 0 ||
                assetSymbol == MANDATORY_CURRENCY.rmbpay ||
                SettingsStore.EXCEPTIONAL_NOT_OPEN_ASSETS.indexOf(assetSymbol) > -1){
                filterAsset.push(item)
            }
        });

        return filterAsset;
    }

    _getTotalAssetsList(assetsList, accountBalances) {
        const balancesIds = [ ...accountBalances.values() ];

        const assetsIds = assetsList.map((asset) => {
            return asset.get("id");
        }).filter((id)=> {
            return !accountBalances.has(id);
        });

        let resultList = this._applyFilters(balancesIds, assetsIds);

        let openList = this._filterOpenAsset(resultList);

        return openList;
    };

    _onSearch(e) {
        this.setState({
            filter: e.target.value.toUpperCase()
        });
    }

    _setArrowClass(key) {
        return this.state.sortKey === key ? (this.state.sortDirection ? "arrow-up" : "arrow-down") : "";
    }

    render() {
        let { account, settings } = this.props;

        let withdraw_modal_id = this.getWithdrawModalId();
        let deposit_modal_id = this.getDepositModalId();

        let includedBalances;

        let accountBalances = account.get("balances");

        let includedBalancesList = Immutable.List();

        if (accountBalances) {
            // Separate balances into hidden and included
            accountBalances.forEach((a, asset_type) => {
                includedBalancesList = includedBalancesList.push(a);
            });

            const assetsList = this._getAllAssets();

            let sortedAssets = this._getTotalAssetsList(assetsList, accountBalances);

            includedBalances = this._renderBalances(sortedAssets, true);

        }

        const preferredUnit = settings.get("unit") || this.props.core_asset.get("symbol");

        let totalBalanceList = includedBalancesList;

        let portFolioValue =
            <TotalBalanceValue
                noTip
                balances={totalBalanceList}
                hide_asset
            />;

        const totalValueText = <TranslateWithLinks
            noLink
            string="account.total"
            keys={[
                {type: "asset", value: preferredUnit, arg: "asset"}
            ]}
        />;

        includedBalances.push(<tr key="portfolio" className="total-value"><td></td><td  style={{textAlign: "left", paddingLeft: 10}}>{totalValueText}</td><td></td><td className="column-hide-small" style={{textAlign: "center"}}>{portFolioValue}</td><td colSpan="6"></td></tr>);

        const currentDepositAsset = this.props.backedCoins.get("OPEN", []).find(c => {
            return c.symbol === this.state.depositAsset;
        }) || {};

        const withdrawAsset = this.props.backedCoins.get("OPEN", []).find(c => {
            return c.symbol === this.state.withdrawAsset;
        }) || {};

        const assetObject = ChainStore.getAsset(withdrawAsset.symbol);

        const {showOnlyFavorites, hideZeroBalances, showFiat} = this.state;



        return (

            <div className="grid-content page-layout modal-with-header">
                <div className="grid-container main-content page-dep-with">

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

                        <button className={cnames("filter-hidden-balance button", {"no-active": !hideZeroBalances})} onClick={this._onHideZeroChange.bind(this)} >
                            <span className="arrow-hidden-balance"><Icon class="checkmark" name="checkmark"/></span>
                            <Translate  content="account.filter_hedden_balance" />
                        </button>

                        <button className={cnames("filter-hidden-balance button", {"no-active": !showFiat})} onClick={this._showFiat.bind(this)} >
                            <span className="arrow-hidden-balance"><Icon class="checkmark" name="checkmark"/></span>
                            <Translate  content="account.filter_show_fiat" />
                        </button>
                    </div>

                    <table className="table dashboard-table">
                        <thead>
                        <tr>
                            <th><Icon class="gold-star" name="fi-star"/></th>
                            <th
                                onClick={this._toggleSortOrder.bind(this, "alphabetic")}
                                style={{ textAlign: "left", paddingLeft: 10, width: '24%' }}
                                className="clickable"
                            >
                                <Translate component="span" content="account.asset"
                                           className={this._setArrowClass("alphabetic")}
                                />
                            </th>
                            <th
                                onClick={this._toggleSortOrder.bind(this, "balanceValue")}
                                style={{ textAlign: "center", width: '14%' }}
                                className="clickable"
                            >
                                <Translate content="account.qty"
                                           className={this._setArrowClass("balanceValue")}
                                />
                            </th>
                            <th
                                onClick={this._toggleSortOrder.bind(this, "totalValue")}
                                style={{ textAlign: "center", width: '26%' }}
                                className="column-hide-small clickable"
                            >
                                <span className={this._setArrowClass("totalValue")}>
                                    <Translate
                                        content="account.eq_value_header"
                                        asset={preferredUnit}
                                    />
                                </ span>
                            </th>
                            <th style={{ width: '16%' }}><Translate content="modal.deposit.submit" /></th>
                            <th style={{ width: '16%' }}><Translate content="modal.withdraw.submit" /></th>
                        </tr>
                        </thead>
                        <tbody>
                        {includedBalances}
                        </tbody>
                    </table>

                </div>

                {/* Deposit Modal */}
                <SimpleDepositWithdraw
                    ref="deposit_modal"
                    action="deposit"
                    fiatModal={this.state.fiatModal} //
                    account={this.props.account.get("name")}
                    sender={this.props.account.get("id")}
                    asset={this.state.depositAsset}
                    modalId="simple_deposit_modal"
                    {...currentDepositAsset}
                    isDown={this.props.gatewayDown.get("OPEN")} //
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

                <BaseModal id={deposit_modal_id} overlay={true} maxWidth="500px">
                    <div className="grid-block vertical">
                    
                        <DepositModalRmbpay
                            account={this.props.account}
                            asset="CNY"
                            output_coin_name="CNY"
                            output_coin_symbol="CNY"
                            output_coin_type="cny"
                            modal_id={deposit_modal_id}
                            ref={modal => { this.depositModalRmbpay = modal; }}
                        />
                    </div>
                </BaseModal>

                <BaseModal id={withdraw_modal_id} overlay={true} maxWidth="500px">
                    <div className="grid-block vertical">
                        <WithdrawModalRmbpay
                            account={this.props.account}
                            issuer_account="rmbpay-wallet"
                            asset="RMBPAY"
                            output_coin_name="RMBPAY"
                            output_coin_symbol="RMBPAY"
                            output_coin_type="RMBPAY"
                            modal_id={withdraw_modal_id}
                            balance={this.props.account.get("balances").toJS()[RMBPAY_ASSET_ID]}
                            ref={modal => { this.withdrawModalRmbpay = modal; }}
                        />
                    </div>
                </BaseModal>

            </div>

        );
    }
};

AccountDepositWithdraw = BindToChainState(AccountDepositWithdraw);

class DepositStoreWrapper extends React.Component {

    componentWillMount() {
        if (Apis.instance().chain_id.substr(0, 8) === "4018d784") { // Only fetch this when on BTS main net
            GatewayActions.fetchCoins();
            GatewayActions.fetchBridgeCoins();
        }
    }

    render() {
        return <AccountDepositWithdraw {...this.props}/>;
    }
}

export default connect(DepositStoreWrapper, {
    listenTo() {
        return [AccountStore, SettingsStore, GatewayStore];
    },
    getProps() {
        return {
            account: AccountStore.getState().currentAccount || AccountStore.getState().passwordAccount,
            balances: AccountStore.getState().currentAccount || AccountStore.getState().passwordAccount,
            viewSettings: SettingsStore.getState().viewSettings,
            backedCoins: GatewayStore.getState().backedCoins,
            bridgeCoins: GatewayStore.getState().bridgeCoins,
            gatewayDown: GatewayStore.getState().down,
            settings: SettingsStore.getState().settings
        };
    }
});