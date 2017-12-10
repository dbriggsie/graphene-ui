import React from "react";
import ReactDOM from "react-dom";
import Immutable from "immutable";
import {RecentTransactions} from "../Account/RecentTransactions";
import Translate from "react-translate-component";
import ps from "perfect-scrollbar";
import AssetName from "../Utility/AssetName";
import assetUtils from "common/asset_utils";
import DashboardAssetList from "./DashboardAssetList";
import WalletDb from "stores/WalletDb";
import AccountStore from "stores/AccountStore";

import GatewayStore from "stores/GatewayStore";
import { connect } from "alt-react";
import BindToChainState from "../Utility/BindToChainState";

class SimpleDashboard extends React.Component {

    render() {
        let {linkedAccounts, myIgnoredAccounts, currentAccount, isMyAccount} = this.props;

        let accountCount = linkedAccounts.size + myIgnoredAccounts.size + (this.props.passwordAccount ? 1 : 0);

        typeof isMyAccount !== 'boolean' ? isMyAccount=true : 1;
        

        return (
            <div ref="wrapper" className={"grid-block page-layout vertical "+this.props.className} >
                <div ref="container" className="grid-container" style={{padding: "25px 10px 0 10px"}}>
                    <DashboardAssetList
                        backedCoins={this.props.backedCoins}
                        defaultAssets={this.props.defaultAssets}
                        preferredUnit={this.props.preferredUnit}
                        isMyAccount={isMyAccount}
                        account={this.props.account_name||currentAccount}
                        showZeroBalances={this.props.viewSettings.get("showZeroBalances", true)}
                        pinnedAssets={Immutable.Map(this.props.viewSettings.get("pinnedAssets", {}))}
                    />

                    {accountCount ? <RecentTransactions
                        style={{marginBottom: 20, marginTop: 20}}
                        accountsList={Immutable.List([this.props.account_name||currentAccount])}
                        limit={10}
                        compactView={false}
                        fullHeight={true}
                        showFilters={true}
                    /> : null}

                </div>
            </div>);
    }
}

SimpleDashboard = BindToChainState(SimpleDashboard, {keep_updating: true, show_loader: true});

class SimpleDashboardWrapper extends React.Component {
    render () {
        return <SimpleDashboard {...this.props} />;
    }
}

export default connect(SimpleDashboardWrapper, {
    listenTo() {
        return [ GatewayStore];
    },
    getProps() {
        return {
            //linkedAccounts: AccountStore.getState().linkedAccounts,
            //searchAccounts: AccountStore.getState().searchAccounts,
           // settings: SettingsStore.getState().settings,
           // hiddenAssets: SettingsStore.getState().hiddenAssets,
           // wallet_locked: WalletUnlockStore.getState().locked,
            //myAccounts:  AccountStore.getState().myAccounts,
            //viewSettings: SettingsStore.getState().viewSettings,
            backedCoins: GatewayStore.getState().backedCoins,
           // bridgeCoins: GatewayStore.getState().bridgeCoins,
            //gatewayDown: GatewayStore.getState().down
        };
    }
});
