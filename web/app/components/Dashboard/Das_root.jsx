import React from "react";
import Immutable from "immutable";
import DashboardList from "./DashboardList";
import { RecentTransactions } from "../Account/RecentTransactions";
import Translate from "react-translate-component";
import MarketCard from "./MarketCard";
import utils from "common/utils";
import { Apis } from "bitsharesjs-ws";
import LoadingIndicator from "../LoadingIndicator";

class Das_root extends React.Component {

    constructor() {
        super();
        let marketsByChain = {
            "4018d784":[
                ["OPEN.BTC", "BTS", false],
                ["OPEN.BTC", "OPEN.ETH"],
                ["OPEN.BTC", "OPEN.STEEM"],
                ["USD", "EDEV"],
                ["USD", "REALITY"],
                ["OPEN.BTC", "ICOO"],
                ["BTS", "OBITS"],
                ["BTS", "BTSR"],
                ["USD", "APPX.WARRANT"],
                ["CNY", "YOYOW"],
                ["USD", "ZENGOLD"],
                ["USD", "OPEN.ETP"],
                ["BTS", "USD"],
                ["BTS", "EUR"],
                ["BTS", "CNY"],
                ["USD", "OBITS.WARRANT"]
            ],
            "39f5e2ed": [
                ["TEST", "PEG.FAKEUSD"],
                ["TEST", "BTWTY"]
            ]
        };
        let chainID = Apis.instance().chain_id;
        if (chainID) chainID = chainID.substr(0, 8);

        this.state = {
            featuredMarkets: marketsByChain[chainID] || marketsByChain["4018d784"],
            newAssets: []
        };

    }

    componentDidMount() {
        //window.addEventListener("resize", this._setDimensions, {capture: false, passive: true});
    }

    shouldComponentUpdate(nextProps, nextState) {
        console.log('@>',nextProps.lowVolumeMarkets)
        return (
            !utils.are_equal_shallow(nextState.featuredMarkets, this.state.featuredMarkets) ||
            !utils.are_equal_shallow(nextProps.lowVolumeMarkets, this.props.lowVolumeMarkets) ||
            !utils.are_equal_shallow(nextState.newAssets, this.state.newAssets) ||
            // nextProps.marketStats !== this.props.marketStats ||
            nextProps.accountsReady !== this.props.accountsReady 
        );
    }

    render() {

        let { accountsReady, traderMode } = this.props;
        let { featuredMarkets, newAssets} = this.state;
        console.log('@>',this.props)

        console.log('@>',this.props.lowVolumeMarkets)

        if (!accountsReady) {
            return <LoadingIndicator />;
        }

        let validMarkets = 0;

        let markets = featuredMarkets
        // .sort(this._sortMarketsByVolume)
        .map(pair => {
            let isLowVolume = this.props.lowVolumeMarkets.get(pair[1] + "_" + pair[0]) || this.props.lowVolumeMarkets.get(pair[0] + "_" + pair[1]);
            if (!isLowVolume) validMarkets++;
            let className = "";

            return (
                <MarketCard
                    key={pair[0] + "_" + pair[1]}
                    marketId={pair[1] + "_" + pair[0]}
                    new={newAssets.indexOf(pair[1]) !== -1}
                    className={className}
                    quote={pair[0]}
                    base={pair[1]}
                    invert={pair[2]}
                    isLowVolume={isLowVolume}
                    hide={validMarkets > 16}
                />
            );
        }).filter(a => !!a);

        /*
                                    <div className="button create-account" onClick={() => {this.props.router.push("create-account");}}>
                                        <Translate content="account.create_new" />
                                    </div>
        */

        return (
            <div ref="wrapper" className="grid-block page-layout vertical">
                <div ref="container" className="grid-container" style={{padding: "25px 10px 0 10px"}}>
                    <div className="block-content-header" style={{marginBottom: 15}}>
                    <Translate content="exchange.featured"/>
                    </div>
                    <div className="grid-block small-up-1 medium-up-3 large-up-4 no-overflow fm-outer-container">
                        {markets}
                    </div>

                </div>
            </div>
        );
    }
}

export default Das_root;
