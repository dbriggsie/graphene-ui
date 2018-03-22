import React from "react";
import {ChainStore} from "bitsharesjs/es";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import Immutable from "immutable";
import FormattedAsset from "../Utility/FormattedAsset";
import AssetName from "../Utility/AssetName";
import AssetImage from "../Utility/AssetImage";
import SettingsActions from "actions/SettingsActions";
import Icon from "../Icon/Icon";
import utils from "common/utils";
import SimpleTrade from "./SimpleTrade";
import SimpleTransfer from "./SimpleTransfer";
import SimpleDepositWithdraw from "./SimpleDepositWithdraw";
import {EquivalentValueComponent} from "../Utility/EquivalentValueComponent";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import { fetchCoins,getBackedCoins } from "common/blockTradesMethods";
import ReactTooltip from "react-tooltip";
import MarketCard from "./MarketCard";
import SettingsStore from "stores/SettingsStore";
import { settingsAPIs } from "api/apiConfig";
import {Link} from "react-router";
import GatewayStore from "stores/GatewayStore";

class DashboardAssetList extends React.Component {

    static propTypes = {
        balances: ChainTypes.ChainObjectsList,
        assets: ChainTypes.ChainAssetsList,
        balanceAssets: ChainTypes.ChainAssetsList
    };

    constructor() {
        super();

        this.state = {
            coreAsset: ChainStore.getAsset("1.3.0"),
            filter: "",
            activeSellAsset: null,
            activeBuyAsset: null,
            transferAsset: null,
            depositAsset: null,
            withdrawAsset: null,
            blockTradesStatus: 0
        };
    }

    shouldComponentUpdate(np, ns) {
        let balancesChanged = false;
        np.balances.forEach((a, i) => {
            if (!Immutable.is(a, this.props.balances[i])) {
                balancesChanged = true;
            }
        });

        let assetsChanged = false;
        np.assets.forEach((a, i) => {
            if (!Immutable.is(a, this.props.assets[i])) {
                assetsChanged = true;
            }
        });

        let balanceAssetsChanged = false;
        np.balanceAssets.forEach((a, i) => {
            if (!Immutable.is(a, this.props.balanceAssets[i])) {
                balanceAssetsChanged = true;
            }
        });

        return (
            np.openLedgerBackedCoins.length||
            np.account !== this.props.account ||
            balancesChanged ||
            assetsChanged ||
            balanceAssetsChanged ||
            np.showZeroBalances !== this.props.showZeroBalances ||
            !utils.are_equal_shallow(ns, this.state) ||
            !utils.are_equal_shallow(np.pinnedAssets, this.props.pinnedAssets)
        );
    }

    componentDidUpdate() {
        ReactTooltip.rebuild();
    }

    _getBalance(asset_id) {
        let currentBalance = this.props.balances.find(a => {
            return (a ? a.get("asset_type") === asset_id : false);
        });

        return (!currentBalance || currentBalance.get("balance") === 0) ? null : {amount: currentBalance.get("balance"), asset_id: asset_id};
    }

    _hasOtherBalance(asset_id) {
        return !!this.props.balances.find(a => {
            return (a ? a.get("asset_type") !== asset_id : false);
        });
    }

    _isPinned(asset) {
        return this.props.pinnedAssets.has(asset);
    }

    _getSeparator(render) {
        return render ? <span> | </span> : null;
    }

    _renderRow(assetName) {
     
        let isPinned = this._isPinned(assetName);
        let asset = ChainStore.getAsset(assetName);

        if (!asset) {
            return null;
        }

        let balance = this._getBalance(asset.get("id"));

        if (!isPinned && (!this.props.showZeroBalances && !this.state.filter.length) && (!balance || (balance && balance.amount === 0))) {
            return null;
        }

        const hasBalance = !(!balance || balance.amount === 0);
        const canBuy = this._hasOtherBalance(asset.get("id"));
        const canDepositWithdraw = !!this.props.openLedgerBackedCoins.find(a => a.symbol === asset.get("symbol"));
        const canWithdraw = canDepositWithdraw && hasBalance;
        let fiatModal;

        SettingsStore.fiatAssets.map((e)=>{
            if(e.symbol === assetName && this.props.openLedgerBackedFiatCoins.deposit ){
                let canFiatDep = ~this.props.openLedgerBackedFiatCoins.deposit.indexOf(e.backingCoinType)?'canFiatDep':'';
                let canFiatWith = ~this.props.openLedgerBackedFiatCoins.withdraw.indexOf(e.backingCoinType)?'canFiatWith':'';
                fiatModal=canFiatDep+' '+canFiatWith;
            }
        });

        return (
            <tr key={assetName}>
                <td className="column-hide-small"><AssetImage assetName={assetName} style={{maxWidth: 25}}/></td>
                <td className="simple-td-name" ><AssetName popover asset={assetName} name={assetName}/></td>
                <td style={{textAlign: "right"}}>{balance ? <FormattedAsset hide_asset amount={balance.amount} asset={balance.asset_id} /> : null}</td>
                <td className="column-hide-small" style={{textAlign: "right"}}>{balance ? <EquivalentValueComponent  fromAsset={balance.asset_id} fullPrecision={true} amount={balance.amount} toAsset={this.props.preferredUnit}/> : null}</td>
                <td style={{textAlign: "center"}}>
                    {hasBalance && this.props.isMyAccount? <Link to={`/transfer?asset=${asset.get("id")}`}><Translate content="transaction.trxTypes.transfer" /></Link> : null}
                    {canDepositWithdraw && this.props.isMyAccount? (
                        <span>
                            {this._getSeparator(hasBalance)}
                            <a className={fiatModal ? "disabled" : ""} onClick={!fiatModal ? this._showDepositWithdraw.bind(this, "deposit_modal", assetName, fiatModal) : null}>
                               <Translate content="gateway.deposit" />
                            </a>
                        </span>
                    ) : null}
                    {canDepositWithdraw && this.props.isMyAccount? (
                        <span>
                            {this._getSeparator(canDepositWithdraw || hasBalance)}
                            <a className={!canWithdraw ? "disabled" : ""} onClick={canWithdraw ? this._showDepositWithdraw.bind(this, "withdraw_modal", assetName, fiatModal) : () => {}}>
                                <Translate content="modal.withdraw.submit" />
                            </a>
                        </span>
                    ) : null}
                </td>

                <td className="simpe_buy_sell" style={{textAlign: "center"}} >
                    <a data-place="top" data-tip={!canBuy ? counterpart.translate("tooltip.cant_buy") : null} className={!canBuy ? "disabled" : ""} onClick={canBuy ? this._showModal.bind(this, "buy_modal", assetName) : null}><Translate content="exchange.buy" /></a>
                    {this._getSeparator(true)}
                    <a className={!hasBalance ? "disabled" : ""} onClick={!hasBalance ? null : this._showModal.bind(this, "sell_modal", assetName)}><Translate content="exchange.sell" /></a>
                </td>
                <td className="column-hide-small" data-place="right" data-tip={isPinned ? counterpart.translate("tooltip.unpin") : counterpart.translate("tooltip.pin")} className={"clickable text-center pin-column"} onClick={this._togglePin.bind(this, assetName)}>
                    <span>
                        {isPinned ?
                            <Icon className="icon-14px fill-red" name="lnr-cross"/> :
                            <Icon className="icon-14px fill-red" name="thumb-tack"/>
                        }
                    </span>
                </td>
            </tr>
        );
    }

    _toggleZeroBalance() {
        SettingsActions.changeViewSetting({showZeroBalances: !this.props.showZeroBalances});
    }

    _togglePin(asset) {
        let {pinnedAssets} = this.props;
        if (pinnedAssets.has(asset)) {
            pinnedAssets = pinnedAssets.delete(asset);
        } else {
            pinnedAssets = pinnedAssets.set(asset, true);
        }
        SettingsActions.changeViewSetting({pinnedAssets});
    }

    _onSearch(e) {
        this.setState({
            filter: e.target.value.toUpperCase()
        });
    }

    _showModal(action, asset, e) {
        e.preventDefault();
        this.setState({
            [action === "buy_modal" ? "activeBuyAsset" : "activeSellAsset"]: asset
        }, () => {
            this.refs[action].show();
        });
    }

    _showTransfer(asset, e) {
        e.preventDefault();
        this.setState({
            transferAsset: asset
        }, () => {
            this.refs.transfer_modal.show();
        });
    }

    _showDepositWithdraw(action, asset, fiatModal, e) {
        e.preventDefault();
        this.setState({
            [action === "deposit_modal" ? "depositAsset" : "withdrawAsset"]: asset,
            fiatModal
        }, () => {
            this.refs[action].show();
        });
    }

    render() {
        let {activeBuyAsset, activeSellAsset, coreAsset} = this.state;
        let assets = this.props.assetNames;

        // Find the current buy and sell assets
        let currentBuyAsset, currentSellAsset;
        this.props.balanceAssets.forEach(a => {
            if (a && assets.indexOf(a.get("symbol")) === -1) {
                assets.push(a.get("symbol"));
            }

            if (a && a.get("symbol") === activeBuyAsset) {
                currentBuyAsset = a;
            }

            if (a && a.get("symbol") === activeSellAsset) {
                currentSellAsset = a;
            }
        });

        this.props.assets.forEach(a => {
            if (a && a.get("symbol") === activeBuyAsset) {
                currentBuyAsset = a;
            }

            if (a && a.get("symbol") === activeSellAsset) {
                currentSellAsset = a;
            }
        });

        // Create a map of balance asset ids for later filtering
        const balanceAssetIds = this.props.balances.map(b => {
            if (b && b.get("balance") > 0) return b.get("asset_type");
        }).filter(a => !!a);

        // Find the current Openledger coins
        const currentDepositAsset = this.props.backedCoins.get("OPEN", []).find(c => {
            return c.symbol === this.state.depositAsset;
        }) || {};
        const currentWithdrawAsset = this.props.backedCoins.get("OPEN", []).find(c => {
            return c.symbol === this.state.withdrawAsset;
        }) || {};
        // console.log("currentDepositAsset", currentDepositAsset, "openLedgerBackedCoins:", this.props.openLedgerBackedCoins);


        let sortedAssets = ((els)=>{

            let isPinnedArr = [];
            let isBalanceArr = [];
            let resultArray = [];
            let exceptPinnedResultArray = [];
            let unpinnedAndNoBalance = [];
            let assetKeys = {};
            let all_AssetKeys = {};

            let els_obj = els.map(e=>ChainStore.getAsset(e)).filter(e=>{
                if(e&&e.toJS){
                    all_AssetKeys[e.get('id')]=e.toJS();
                    return ~e.get('symbol').indexOf(this.state.filter);
                }
            });

            els_obj.map(e=>{
                this._isPinned(e.get('symbol'))?isPinnedArr.push(e.get('id')):1;
                assetKeys[e.get('id')] = e.toJS();
            });

            this.props.balances.sort((a,b)=>{

                let a_precision = assetKeys[a.get('asset_type')];
                let b_precision = assetKeys[b.get('asset_type')];

                let a_bal = parseInt(a.get("balance"))||0;
                let b_bal = parseInt(b.get("balance"))||0;

                if(a_precision && b_precision){
                    a_bal = a_bal / Math.pow(10,a_precision.precision);
                    b_bal = b_bal / Math.pow(10,b_precision.precision);
                }
               
                if(a_bal>b_bal){
                    return -1;
                }else if(a_bal<b_bal){
                    return 1;
                }else{
                    return 0;
                }
            }).map(e=>{
                e&&isBalanceArr.push(e.toJS());
            });
            
            isBalanceArr.map(e1=>{
                let isPinned = false;
                isPinnedArr.map((e2,index)=>{
                    if(e1.asset_type === e2){
                        resultArray.push(e1.asset_type);
                        isPinned = true;
                        isPinnedArr[index] = null;
                    }
                });
                !isPinned?exceptPinnedResultArray.push(e1.asset_type):1;
            });

            resultArray = resultArray.concat(exceptPinnedResultArray);
            resultArray = resultArray.concat(isPinnedArr.filter(e=>e));


            resultArray = resultArray.map(e=>{
                if(all_AssetKeys[e]){
                    return all_AssetKeys[e].symbol;
                }
                return e;
            });

            
            for(let i in assetKeys){
                let indexResEl = resultArray.indexOf(assetKeys[i].symbol);
                indexResEl===-1?resultArray.push(all_AssetKeys[i].symbol):1;
            }

            return resultArray;

        })(assets);

        return (
            <div className="blocktrades-gateway modal-with-header">
                <Translate content="settings.wallet" component="h3" style={{textAlign: 'center',fontSize:40, padding: '15px 0 0 0'}} />
                <Translate content="transfer.my_balance" component="h4"  />
                <div >
                    <input onChange={this._toggleZeroBalance.bind(this)} checked={!this.props.showZeroBalances && !this.state.filter.length} type="checkbox" />
                    <label className="SimpleTrade__hide-zero" onClick={this._toggleZeroBalance.bind(this)}><Translate content="simple_trade.hide_zero" /></label>

                    <div className="float-right">
                        <div style={{position: "relative", top: -13}}>
                            <input onChange={this._onSearch.bind(this)} value={this.state.filter} style={{marginBottom: 0, }} type="text" placeholder={counterpart.translate("simple_trade.find_an")} />
                            {this.state.filter.length ? <span className="clickable" style={{position: "absolute", top: 12, right: 10, color: "black"}} onClick={() => {this.setState({filter: ""});}}>
                            <Icon className="icon-14px fill-red" name="lnr-cross"/>
                        </span> : null}
                        </div>
                    </div>
                </div>

                <div className="grid-block" style={{maxHeight: 600, width: "100%"}}>
                    <table className="table responsive-text" style={{'overflowY': 'scroll'}} >
                        <thead>
                        <tr>
                            <th className="column-hide-small"></th>
                            <th><Translate content="account.asset" /></th>
                            <th data-place="top" data-tip={counterpart.translate("tooltip.current_balance")} style={{textAlign: "right"}}><Translate content="exchange.balance" /></th>
                            <th className="column-hide-small" data-place="top" data-tip={counterpart.translate("tooltip.equivalent_balance")} style={{textAlign: "right"}}><Translate content="exchange.value" /></th>
                            <th style={{textAlign: "center"}} data-place="top" data-tip={counterpart.translate("tooltip.transfer_actions")}>{this.props.isMyAccount?<Translate content="simple_trade.transfer_actions" />:null}</th>
                            <th className="simpe_buy_sell" style={{textAlign: "center"}} data-place="top" data-tip={counterpart.translate("tooltip.trade_actions")} ><Translate content="simple_trade.actions" /></th>
                            <th className="column-hide-small" data-place="top" data-tip={counterpart.translate("tooltip.pinning")} style={{textAlign: "center"}}><Translate content="simple_trade.pinned" /></th>
                        </tr>
                        </thead>
                        <tbody>
                        {sortedAssets.map(a => this._renderRow(a))}
                        </tbody>
                    </table>
                </div>

                {/* Buy/Sell modals */}

                <SimpleTrade
                    ref="buy_modal"
                    seller={this.props.account.get("id")}
                    action="buy"
                    asset={activeBuyAsset}
                    modalId="simple_buy_modal"
                    currentAsset={currentBuyAsset}
                    currentBalance={this.props.balances.find(b => b && (b.get("asset_type") === (currentBuyAsset ? currentBuyAsset.get("id") : null)))}
                    assets={this.props.balances.filter(b => b && (!!b.get("balance") && b.get("asset_type") !== (currentBuyAsset ? currentBuyAsset.get("id") : null)))}
                    balanceAssets={this.props.balanceAssets}
                />

                <SimpleTrade
                    ref="sell_modal"
                    seller={this.props.account.get("id")}
                    action="sell"
                    asset={activeSellAsset}
                    modalId="simple_sell_modal"
                    currentAsset={currentSellAsset}
                    currentBalance={this.props.balances.find(b => b && (b.get("asset_type") === (currentSellAsset ? currentSellAsset.get("id") : null)))}
                    assets={this.props.balances.filter(b => b && (!!b.get("balance") && b.get("asset_type") !== (currentSellAsset ? currentSellAsset.get("id") : null)))}
                    marketAssets={this.props.assets.filter(a => a && (balanceAssetIds.indexOf(a.get("id")) === -1))}
                    balanceAssets={this.props.balanceAssets}
                />

                {/* Transfer Modal */}
                <SimpleTransfer
                    ref="transfer_modal"
                    sender={this.props.account.get("id")}
                    asset={this.state.transferAsset}
                    modalId="simple_transfer_modal"
                    balances={this.props.balances}

                />

                {/* Deposit Modal */}
                <SimpleDepositWithdraw
                    ref="deposit_modal"
                    action="deposit"
                    fiatModal={this.state.fiatModal}
                    account={this.props.account.get('name')}
                    sender={this.props.account.get("id")}
                    asset={this.state.depositAsset}
                    modalId="simple_deposit_modal"
                    balances={this.props.balances}
                    {...currentDepositAsset}
                    isDown={false}
                />

                {/* Withdraw Modal */}
                <SimpleDepositWithdraw
                    ref="withdraw_modal"
                    action="withdraw"
                    fiatModal={this.state.fiatModal}
                    account={this.props.account.get('name')}
                    sender={this.props.account.get("id")}
                    asset={this.state.withdrawAsset}
                    modalId="simple_withdraw_modal"
                    balances={this.props.balances}
                    {...currentWithdrawAsset}
                    isDown={false}
                    supportsMemos={true}    
                />
            </div>
        );
    }
}
DashboardAssetList = BindToChainState(DashboardAssetList);


class ListWrapper extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired
    };

    constructor() {
        super();

        this.state = {
            openLedgerCoins: [],
            openLedgerBackedCoins: [],
            openLedgerBackedFiatCoins: []
        };
    }

    componentWillMount() {
        let openLedgerBackedCoins;
        let openLedgerBackedFiatCoins;

        let json_rpc_request = { "jsonrpc": "2.0", "id": 1, "method": "isValidatedForFiat", "params": {"bitsharesAccountName": this.props.account.get('name')}};

        fetchCoins()
            .then(result => {
                openLedgerBackedCoins = getBackedCoins({ allCoins: result, tradingPairs:[], backer: "OPEN" }).concat(SettingsStore.fiatAssets);
                return fetch(settingsAPIs.RPC_URL, {
                    method: 'POST',
                    headers: new Headers({
                        "Accept": "application/json",
                        "content-type": "application/x-www-form-urlencoded"
                    }),
                    body: 'rq=' + encodeURIComponent(JSON.stringify(json_rpc_request))
                });
            })
            .then(response => response.json())
            .then((json_response) => {
                if ('result' in json_response){
                    this.setState({
                        openLedgerBackedCoins,
                        openLedgerBackedFiatCoins: json_response.result
                    });
                }else{
                    this.setState({
                        openLedgerBackedCoins
                    });
                }
            })
            .catch((error) => {
                console.log(error);
            });
    }

    render() {
        let balanceAssets = Immutable.List();
        let balances = this.props.account.get("balances", []).map((a, key) => {
            balanceAssets = balanceAssets.push(key);
            return a;
        });
        if (balances && balances.toArray) balances = balances.toArray();


        // Get hard coded default assets
        let assets = this.props.defaultAssets;
        // Add Openledger backed assets

        return (
            <DashboardAssetList
                {...this.state}
                balanceAssets={balanceAssets}
                balances={Immutable.List(balances)}
                assetNames={assets}
                assets={Immutable.List(assets)}
                {...this.props}
            />
        );
    }
}
export default BindToChainState(ListWrapper);