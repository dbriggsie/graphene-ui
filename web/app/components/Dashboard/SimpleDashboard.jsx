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
import WalletDb from "stores/WalletDb";
import AccountStore from "stores/AccountStore";

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
        // Check for wallet and account, if not present redirect to create-account
        if (!!WalletDb.getWallet() || !this.props.linkedAccounts.size) {
            this.props.history.push("/create-account");
        }
        accountUtils.getFinalFeeAsset(this.props.account, "transfer");
    }

    componentDidMount() {
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
        let {width, height, showIgnored} = this.state;

        let names = linkedAccounts.toArray().sort();

        let accountCount = linkedAccounts.size + myIgnoredAccounts.size;

        return (
            <div ref="wrapper" className="grid-block page-layout vertical">
                <div ref="container" className="grid-container" style={{padding: "25px 10px 0 10px"}}>
                    <DashboardAssetList
                        preferredUnit={this.props.preferredUnit}
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
