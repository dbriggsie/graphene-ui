import React, {Component} from "react";
import {RouteHandler, Link} from "react-router";
import connectToStores from "alt/utils/connectToStores";
import WalletManagerStore from "stores/WalletManagerStore";
import BalanceClaimActive from "components/Wallet/BalanceClaimActive";
import Translate from "react-translate-component";
import WalletCreate from "./WalletCreate";


export default function RestoreBrainkeyComponent(){
    return (
        <div className="grid-container">
                <div className="grid-content">
                    <div className="content-block center-content">
                        <div className="page-header">
                            <h1><Translate content="account.welcome" /></h1>                            
                        </div>
                        <div className="content-block">
                           <WalletCreate restoreBrainkey={true} />
                        </div>
                    </div>
                </div>
            </div>
        );
}

