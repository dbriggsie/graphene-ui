import React from "react";
import {Tabs, Tab} from "../Utility/Tabs";
import WalletUnlockContainer from "../Wallet/WalletUnlock";
import { BackupRestore } from "../Wallet/Backup";
import AirBitzWalletUnlock from "../Wallet/AirBitzWalletUnlock";


export default class Login extends React.Component {
    render() {
        return (
            <div className="panel login grid-block align-center">
                <div className="grid-block shrink vertical">
                    <div className="grid-content shrink text-center">
                    <Tabs
                        tabsClass="bordered-header no-padding horiz-tabs login-tabs"
                        setting="whitelistTab"
                        contentClass="shrink small-vertical medium-horizontal tab-content" >
                            <Tab title="account.login.account">
                                <WalletUnlockContainer  />
                            </Tab>
                            <Tab title="account.login.wallet"> 
                                <BackupRestore />
                            </Tab>
                            <Tab title="account.login.airBitz">
                                <AirBitzWalletUnlock  />
                            </Tab>
                        </Tabs>
                    </div>
                </div>
            </div>
        );
    }
}
