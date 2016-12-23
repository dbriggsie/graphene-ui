import React from "react";
import {ChainStore} from "graphenejs-lib";
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
import EquivalentValueComponent from "../Utility/EquivalentValueComponent";

// import Ps from "perfect-scrollbar";

require("./DashboardAssetList.scss");

@BindToChainState()
class DashboardAssetList extends React.Component {

    static propTypes = {
        balances: ChainTypes.ChainObjectsList,
        assets: ChainTypes.ChainAssetsList,
        balanceAssets: ChainTypes.ChainAssetsList
    };

    constructor() {
        super();

        this.state = {
            filter: "",
            activeSellAsset: null,
            activeBuyAsset: null
        };
    }

    // componentDidMount() {
    //     let assets = ReactDOM.findDOMNode(this.refs.assetList);
    //     Ps.initialize(assets);
    // }

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
        np.assets.forEach((a, i) => {
            if (!Immutable.is(a, this.props.assets[i])) {
                balanceAssetsChanged = true;
            }
        });

        return (
            np.account !== this.props.account ||
            balancesChanged ||
            assetsChanged ||
            balanceAssetsChanged ||
            np.showZeroBalances !== this.props.showZeroBalances ||
            !utils.are_equal_shallow(ns, this.state) ||
            !utils.are_equal_shallow(np.pinnedAssets, this.props.pinnedAssets)
        );
    }

    _getBalance(asset_id) {
        let currentBalance = this.props.balances.find(a => {
            return (a ? a.get("asset_type") === asset_id : false);
        });

        return (!currentBalance || currentBalance.get("balance") === 0) ? null : {amount: currentBalance.get("balance"), asset_id: asset_id};
    }

    _isPinned(asset) {
        return this.props.pinnedAssets.has(asset);
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

        const sellDisabled = !balance || balance.amount === 0;

        return (
            <tr key={assetName}>
                <td><AssetImage assetName={assetName} style={{maxWidth: 25}}/></td>
                <td><AssetName popover asset={assetName} name={assetName}/></td>
                <td style={{textAlign: "right"}}>{balance ? <FormattedAsset hide_asset amount={balance.amount} asset={balance.asset_id} /> : "0"}</td>
                <td style={{textAlign: "right"}}>{balance ? <EquivalentValueComponent  fromAsset={balance.asset_id} fullPrecision={true} amount={balance.amount} toAsset={this.props.preferredUnit}/> : null}</td>

                <td><a>Deposit</a> | <a>Withdraw</a></td>
                <td>
                    <a onClick={this._showModal.bind(this, "buy_modal", assetName)}>Buy</a>
                    <span> | </span>
                    <a className={sellDisabled ? "disabled" : ""} onClick={sellDisabled ? null : this._showModal.bind(this, "sell_modal", assetName)}>Sell</a></td>
                <td className={"clickable text-center pin-column"} onClick={this._togglePin.bind(this, assetName)}>
                    <span>
                        {isPinned ?
                            <Icon className="icon-14px" name="lnr-cross"/> :
                            <Icon className="icon-14px" name="thumb-tack"/>
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
        console.log(action, asset);
        this.setState({
            [action === "buy_modal" ? "activeBuyAsset" : "activeSellAsset"]: asset
        }, () => {
            this.refs[action].show();
        });
    }

    render() {
        let {activeBuyAsset, activeSellAsset} = this.state;
        let assets = this.props.assetNames;

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

        const balanceAssetIds = this.props.balances.map(b => {
            if (b && b.get("balance") > 0) return b.get("asset_type");
        }).filter(a => !!a);

        return (
            <div>
                <h3>Wallet</h3>

                <div style={{paddingTop: 20}}>
                    <input onChange={this._toggleZeroBalance.bind(this)} checked={!this.props.showZeroBalances && !this.state.filter.length} type="checkbox" />
                    <label style={{position: "relative", top: -3}} onClick={this._toggleZeroBalance.bind(this)}>Hide 0 balances</label>

                    <div className="float-right">
                        <div style={{position: "relative", top: -13}}>
                        <input onChange={this._onSearch.bind(this)} value={this.state.filter} style={{marginBottom: 0, }} type="text" placeholder="Find an asset" />
                        {this.state.filter.length ? <span className="clickable" style={{position: "absolute", top: 12, right: 10, color: "black"}} onClick={() => {this.setState({filter: ""});}}>
                            <Icon className="icon-14px fill-red" name="lnr-cross"/>
                        </span> : null}
                        </div>
                    </div>
                </div>

                <div className="grid-block" style={{maxHeight: 600, overflow: "auto", width: "100%"}}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Asset</th>
                                <th style={{textAlign: "right"}}>Balance</th>
                                <th style={{textAlign: "right"}}>Value</th>
                                <th>Transfer actions</th>
                                <th>Trade actions</th>
                                <th style={{textAlign: "center"}}>Pinned</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.filter(a => a.indexOf(this.state.filter) !== -1).map(a => this._renderRow(a))}
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
            </div>
        );
    }
}

@BindToChainState()
export default class ListWrapper extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired
    };

    _getAssets() {
        return [
            'BROWNIE.PTS',
            'BTS',
            'BTSR',
            'GRIDCOIN',
            'ICOO',
            'OBITS',
            'OPEN.ARDR',
            'OPEN.BTC',
            'OPEN.DASH',
            'OPEN.DGD',
            'OPEN.DOGE',
            'OPEN.ETH',
            'OPEN.EUR',
            'OPEN.EURT',
            'OPEN.GAME',
            'OPEN.GRC',
            'OPEN.HEAT',
            'OPEN.LISK',
            'OPEN.LTC',
            'OPEN.MAID',
            'OPEN.MUSE',
            'OPEN.OMNI',
            'OPEN.MKR',
            'OPEN.INCNT',
            'OPEN.STEEM',
            'OPEN.USD',
            'OPEN.USDT',
            'OPEN.NXC',
            'PEERPLAYS',
            'SHAREBITS',
            'SOLCERT',
            'BTWTY'
        ]
    }

    render() {

        let balanceAssets = Immutable.List();
        let balances = this.props.account.get("balances").map((a, key) => {
            balanceAssets = balanceAssets.push(key);
            return a;
        }).toArray();

        let assets = this._getAssets();

        return (
            <DashboardAssetList
                balanceAssets={balanceAssets}
                balances={Immutable.List(balances)}
                assetNames={assets}
                assets={Immutable.List(assets)}
                {...this.props}
            />
        );
    }
}
