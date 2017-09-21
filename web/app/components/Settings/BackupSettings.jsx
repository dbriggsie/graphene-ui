import React from "react";
import {BackupCreate} from "../Wallet/Backup";
import BackupBrainkey from "../Wallet/BackupBrainkey";
import AccountStore from "stores/AccountStore";
import BackupBrainkeyAirbitz from "../Wallet/BackupBrainkeyAirbitz";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import WalletDb from "stores/WalletDb";
import WalletUnlockActions from "actions/WalletUnlockActions";
import notify from "actions/NotificationActions";
import { connect } from "alt-react";

import SettingsStore from "stores/SettingsStore";

import {makeABCUIContext} from 'airbitz-core-js-ui/lib/abcui.es6';
import { airbitzAPIs } from "api/apiConfig";
let _abcUi = makeABCUIContext(airbitzAPIs);

class BackupSettings extends React.Component {

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
        let airbitzkey = document.querySelector(".airbitzkey");
        if(airbitzkey){
            airbitzkey.setAttribute("show_switch_airbitzkey","false");
        }

        WalletUnlockActions.lock();
        WalletUnlockActions.unlock().then(() => {
            let pass_acc = AccountStore.getState();            
            if (airbitzkey) {
                pass_acc.passwordAccount = airbitzkey.getAttribute("p"); 
                pass_acc.passwordAccount = airbitzkey.getAttribute("acc");
            }

            if (pass_acc && pass_acc.accountsLoaded && pass_acc.passwordAccount && pass_acc.passwordAccount) {

                _abcUi.openLoginWindow(function(error, account) {

                    if (error) {
                        console.log(error)
                    }

                    let air_ids = account.listWalletIds();

                    console.log('@>account.passwordAccount', pass_acc.passwordAccount)

                    account.createWallet(airbitzAPIs.walletType, {
                        key: pass_acc.passwordAccount,
                        model: "account",
                        login: pass_acc.passwordAccount
                    }, function(err, id) {
                        if (error) {
                            console.log(error)
                        } else {
                            console.log('@>', account.getWallet(id));
                            notify.addNotification({
                                message: `Backup was created`,
                                level: "info",
                                autoDismiss: 10
                            });                            
                        }
                    });
                });

            } else {
                console.error('pass_acc err')
            }

        }).catch((err) => {
            console.error('WalletUnlockActions err ', err);
        });

    }

    render() {

        let { passwordLogin, passwordAccount, accountsLoaded } =  this.props;

        if (!accountsLoaded&&!passwordLogin) {
            return (
               <p><Translate content="settings.not_yet_have_account" /></p> 
            )
        }else if(passwordLogin&&passwordAccount){            
            return (
                <div>
                    <p><Translate content="settings.backupcreate_airbitz_account_text" /></p>
                    <button className="button airbitzkey" onClick={this.create_backup_for_airbitz}><Translate content="settings.backupcreate_airbitz_account" /></button>
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


BackupSettings = connect(BackupSettings, {
    listenTo() {
        return [SettingsStore,AccountStore];
    },
    getProps() {        
        return {
            passwordLogin:SettingsStore.getState().settings.get("passwordLogin"),
            passwordAccount:AccountStore.getState().passwordAccount,
            accountsLoaded:AccountStore.getState().accountsLoaded
        }
    }
});


export default BackupSettings;

