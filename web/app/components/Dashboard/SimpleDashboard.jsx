import React from "react";
import ReactDOM from "react-dom";
import Immutable from "immutable";
import RecentTransactions from "../Account/RecentTransactions";
import Translate from "react-translate-component";
import ps from "perfect-scrollbar";
import AssetName from "../Utility/AssetName";
import assetUtils from "common/asset_utils";
import DashboardAssetList from "./DashboardAssetList";
import accountUtils from "common/account_utils";

class SimpleDashboard extends React.Component {


    constructor() {
        super();
        this.state = {
            width: null,
            height: null,
            openLedgerCoins: [],
            openLedgerBackedCoins: []
        };

        this._setDimensions = this._setDimensions.bind(this);
    }

    componentWillMount() {
        accountUtils.getFinalFeeAsset(this.props.account, "transfer");

        fetch("https://blocktrades.us/ol/api/v2/coins").then(reply => reply.json().then(result => {
            this.setState({
                openLedgerCoins: result
            });
            this.setState({
                openLedgerBackedCoins: this.getOpenledgerBackedCoins(result)
            });
        })).catch(err => {
            console.log("error fetching openledger list of coins", err);
        });
    }

    componentDidMount() {
        // let c = ReactDOM.findDOMNode(this.refs.container);
        // ps.initialize(c);

        this._setDimensions();

        window.addEventListener("resize", this._setDimensions, false);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.linkedAccounts !== this.props.linkedAccounts ||
            nextProps.currentAccount !== this.props.currentAccount ||
            nextProps.viewSettings !== this.props.viewSettings ||
            nextState.width !== this.state.width ||
            nextState.height !== this.state.height ||
            nextState.openLedgerCoins.length !== this.state.openLedgerCoins.length ||
            nextState.openLedgerBackedCoins.length !== this.state.openLedgerBackedCoins.length
        );
    }

    getOpenledgerBackedCoins(allOpenledgerCoins) {
        let coins_by_type = {};
        allOpenledgerCoins.forEach(coin_type => coins_by_type[coin_type.coinType] = coin_type);
        let openLedgerBackedCoins = [];
        allOpenledgerCoins.forEach(coin_type => {
            if (coin_type.walletSymbol.startsWith("OPEN.") && coin_type.backingCoinType)
            {
                openLedgerBackedCoins.push({
                    name: coins_by_type[coin_type.backingCoinType].name,
                    walletType: coins_by_type[coin_type.backingCoinType].walletType,
                    backingCoinType: coins_by_type[coin_type.backingCoinType].walletSymbol,
                    symbol: coin_type.walletSymbol,
                    supportsMemos: coins_by_type[coin_type.backingCoinType].supportsOutputMemos
                });
            }});
        return openLedgerBackedCoins;
    }

    // componentDidUpdate() {
    //     let c = ReactDOM.findDOMNode(this.refs.container);
    //     ps.update(c);
    // }

    componentWillUnmount() {
        window.removeEventListener("resize", this._setDimensions, false);
    }

    _setDimensions() {
        let width = window.innerWidth;
        let height = this.refs.wrapper.offsetHeight;

        if (width !== this.state.width || height !== this.state.height) {
            this.setState({width, height});
        }
    }

    render() {
        let {linkedAccounts, myIgnoredAccounts, currentAccount} = this.props;
        let {width, height, showIgnored, openLedgerCoins} = this.state;

        let names = linkedAccounts.toArray().sort();

        let accountCount = linkedAccounts.size + myIgnoredAccounts.size;

        return (
            <div ref="wrapper" className="grid-block page-layout vertical">
                <div ref="container" className="grid-container" style={{padding: "25px 10px 0 10px"}}>
                    <DashboardAssetList
                        account={currentAccount}
                        showZeroBalances={this.props.viewSettings.get("showZeroBalances")}
                        pinnedAssets={Immutable.Map(this.props.viewSettings.get("pinnedAssets", {}))}
                    />

                    {accountCount ? <RecentTransactions
                        style={{marginBottom: 20, marginTop: 20}}
                        accountsList={Immutable.List([currentAccount])}
                        limit={10}
                        compactView={false}
                        fullHeight={true}
                        showFilters={true}
                    /> : null}

                </div>
            </div>);
    }
}

export default SimpleDashboard;
