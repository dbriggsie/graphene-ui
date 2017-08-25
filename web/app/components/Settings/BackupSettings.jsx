import React from "react";
import {BackupCreate} from "../Wallet/Backup";
import BackupBrainkey from "../Wallet/BackupBrainkey";
import AccountStore from "stores/AccountStore";
import BackupBrainkeyAirbitz from "../Wallet/BackupBrainkeyAirbitz";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import WalletDb from "stores/WalletDb";
import WalletUnlockActions from "actions/WalletUnlockActions";

import {makeABCUIContext} from 'airbitz-core-js-ui/lib/abcui.es6';
import { airbitzAPIs } from "api/apiConfig";
let _abcUi = makeABCUIContext(airbitzAPIs);

export default class BackupSettings extends React.Component {

    constructor() {
        super();
        this.state = {
            restoreType: 0,
            types: ["backup", "brainkey","airbitz"]
        };
    }

    _changeType(e) {

        this.setState({
            restoreType: this.state.types.indexOf(e.target.value)
        });
    }

    create_backup_for_airbitz(){
        

         


        if (WalletDb.isLocked()) {
            WalletUnlockActions.unlock().then(() => {
                let pass_acc = AccountStore.getState();
                console.log('@>account 1',pass_acc);
            });
        } else {
            //WalletUnlockActions.lock();
            let pass_acc = AccountStore.getState();
            console.log('@>account 1',pass_acc);
        }

         /*if(pass_acc&&pass_acc.accountsLoaded&&pass_acc.currentAccount&&pass_acc.passwordAccount){

            _abcUi.openLoginWindow(function(error, account) {
                
                if (error) {
                    console.log(error)
                }

                let air_ids = account.listWalletIds();

                console.log('@>account.passwordAccount',pass_acc.passwordAccount)

                account.createWallet(airbitzAPIs.walletType, { 
                    key:pass_acc.passwordAccount,
                    model:"account",
                    login:pass_acc.currentAccount 
                }, function(err, id) {
                    if (error) {
                        console.log(error)
                    } else {
                        console.log('@>', account.getWallet(id))
                    }
                });
            });

         }else{
            console.log('@>err')
         }*/

    }

    render() {
        console.log('@>this.props.passwordLogin',this.props.passwordLogin)
        if (this.props.passwordLogin) {
            return (
                <div>
                    <p><Translate content="settings.backupcreate_airbitz_account_text" /></p>
                    <button className="button" onClick={this.create_backup_for_airbitz}><Translate content="settings.backupcreate_airbitz_account" /></button>
                </div>
            );
        }

        let {types, restoreType} = this.state;
        let options = types.map(type => {
            return <option key={type} value={type}>{counterpart.translate(`settings.backupcreate_${type}`)} </option>;
        });

        let content;

        switch (types[restoreType]) {
        case "backup":
            content = <BackupCreate />;
            break;

        case "brainkey":
            content = <BackupBrainkey />;
            break;
        case "airbitz":
            content = <BackupBrainkeyAirbitz />;
            break;
        default:
            break;
        }

        return (
            <div>
                <select
                    onChange={this._changeType.bind(this)}
                    className="bts-select"
                    value={types[restoreType]}
                >
                    {options}
                </select>

                {content}
            </div>
        );
    }
};
