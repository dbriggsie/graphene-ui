import React from "react";
import ReactDOM from "react-dom";
import Immutable from "immutable";
import RecentTransactions from "../Account/RecentTransactions";
import Translate from "react-translate-component";
import ps from "perfect-scrollbar";
import AssetName from "../Utility/AssetName";
import assetUtils from "common/asset_utils";
import DashboardAssetList from "./DashboardAssetList";

class SimpleDashboard extends React.Component {


    constructor() {
        super();
        this.state = {
            width: null,
            height: null,
            showIgnored: false
        };

        this._setDimensions = this._setDimensions.bind(this);
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
            nextProps.ignoredAccounts !== this.props.ignoredAccounts ||
            nextProps.viewSettings !== this.props.viewSettings ||
            nextState.width !== this.state.width ||
            nextState.height !== this.state.height ||
            nextState.showIgnored !== this.state.showIgnored
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

    _onToggleIgnored() {
        this.setState({
            showIgnored: !this.state.showIgnored
        });
    }

    render() {
        let {linkedAccounts, myIgnoredAccounts, currentAccount} = this.props;
        let {width, height, showIgnored} = this.state;

        let names = linkedAccounts.toArray().sort();
        let ignored = myIgnoredAccounts.toArray().sort();

        let accountCount = linkedAccounts.size + myIgnoredAccounts.size;

        let featuredMarkets = [
            ["OPEN.BTC", "BTS", false],
            ["OPEN.BTC", "OPEN.ETH"],
            ["OPEN.BTC", "OPEN.STEEM"],
            ["OPEN.BTC", "OPEN.DGD"],
            ["OPEN.BTC", "BLOCKPAY"],
            ["OPEN.BTC", "ICOO"],
            ["BTS", "OBITS"],
            ["BTS", "BTSR"],
            ["BTS", "PEERPLAYS"],
            ["OPEN.BTC", "OPEN.GAME"],
            ["OPEN.BTC", "OPEN.INCNT"],
            ["OPEN.BTC", "OPEN.NXC"],
            ["BTS", "USD"],
            ["BTS", "CNY"],
            ["BTS", "EUR"],
            ["BTS", "GOLD"]
            // ["BTS", "SILVER"]
        ];

        let newAssets = [
            "OPEN.USDT",
            "OPEN.EURT"
        ];

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
