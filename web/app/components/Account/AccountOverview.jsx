import React from "react";
import AccountStore from "stores/AccountStore";
import AssetStore from "stores/AssetStore";
import SettingsStore from "stores/SettingsStore";

import AltContainer from "alt-container";
import Dashboard from "../Dashboard/Dashboard";
import SimpleDashboard from "../Dashboard/SimpleDashboard";
import Immutable from "immutable";

class Content extends React.Component {

    render() {
        return <SimpleDashboard className="simpe_overview" {...this.props} />;
    }
}

class AccountOverview extends React.Component {
    render() {

        return (
            <AltContainer
                stores={[AccountStore, SettingsStore]}
                inject={{
                /** bind to chain state will use this to trigger updates to the dashboard */
                // resolvedLinkedAccounts: () => {
                    //console.log( "Linked Accounts: ", AccountStore.getState().linkedAccounts,  AccountStore.getState().linkedAccounts.toJS() );
                    // return Immutable.List(AccountStore.getState().linkedAccounts);
                // },
                /** the dashboard only really needs the list of accounts */
                    linkedAccounts: () => {
                        return AccountStore.getState().linkedAccounts;
                    },
                    myIgnoredAccounts: () => {
                        return AccountStore.getState().myIgnoredAccounts;
                    },
                    currentAccount: () => {
                        return AccountStore.getState().currentAccount;
                    },
                    viewSettings: () => {
                        return SettingsStore.getState().viewSettings;
                    },
                    preferredUnit: () => {
                        return SettingsStore.getState().settings.get("unit", "1.3.0");
                    },
                    traderMode: () => {
                        return SettingsStore.getState().settings.get("traderMode");
                    },
                    defaultAssets: () => {
                        return SettingsStore.getState().topMarkets;
                    }
                }}>
                    <Content {...this.props} />
            </AltContainer>
        );
    }
}

export default AccountOverview;
