import React, {Component} from "react";
import {FormattedDate} from "react-intl";
import Translate from "react-translate-component";
import WalletActions from "actions/WalletActions";
import WalletDb from "stores/WalletDb";
import {hash} from "bitsharesjs/es";
import notify from "actions/NotificationActions";

import {makeABCUIContext} from 'airbitz-core-js-ui/lib/abcui.es6';
import { airbitzAPIs } from "api/apiConfig";
let _abcUi = makeABCUIContext(airbitzAPIs);

export default class BackupBrainkey extends Component {

    constructor() {
        super()
        this.state = this._getInitialState()
    }

    _getInitialState() {
        return {
            password: null,
            brainkey: null,
            invalid_password: false
        }
    }

    render() {
        var content;
        var brainkey_backup_date = WalletDb.getWallet().brainkey_backup_date;

        var brainkey_backup_time = brainkey_backup_date ?
            <div><Translate content="wallet.brainkey_backed_up" />: <FormattedDate value={brainkey_backup_date}/></div> :
            <Translate className="facolor-error" component="p" content="wallet.brainkey_not_backed_up" />

        if(this.state.verified) {
            var sha1 = hash.sha1(this.state.brainkey).toString('hex').substring(0,4)
            content = <div>
                <h3><Translate content="wallet.brainkey" /></h3>                
                <div className="card"><div className="card-content">
                    <p>{this.state.brainkey}</p></div></div>
                <br/>
                <pre className="no-overflow">sha1 hash of the brainkey: {sha1}</pre>
                <br/>
                {brainkey_backup_time}
            </div>
        }

        if(!content && this.state.brainkey) {
            var sha1 = hash.sha1(this.state.brainkey).toString('hex').substring(0,4)
            content = <span>
                <h3><Translate content="wallet.brainkey" /></h3>
                <div className="card"><div className="card-content">
                    <p>{this.state.brainkey}</p>
                    </div>
                </div>
                <div style={{padding: "10px 0"}}>
                    <pre className="no-overflow">sha1 hash of your brainkey: {sha1}</pre>
                </div>
                <hr/>
                <div style={{padding: "10px 0 20px 0"}}>
                    <Translate content="wallet.brainkey_airbitz_created" /><br/>
                </div>

            </span>
        }

        if(!content) {
            var valid = this.state.password && this.state.password !== ""
            content = <span>
                <Translate content="wallet.brainkey_airbitz_will_create" component="p" />
                <label><Translate content="wallet.enter_password" /></label>
                <form onSubmit={this.onSubmit.bind(this)} className="name-form" noValidate>
                    <input type="password" id="password" onChange={this.onPassword.bind(this)}/>
                    <p>
                        {this.state.invalid_password ?
                            <span className="error">Invalid password</span>:
                            <span><Translate content="wallet.pwd4brainkey" /></span>}
                    </p>
                    <div>{brainkey_backup_time}<br/></div>
                    <button className="button success"><Translate content="wallet.create_airbitz_wallet" /></button>
                </form>
            </span>
        }
        return <div className="grid-block vertical">
            <div className="grid-content no-overflow">
                {content}
            </div>
        </div>
    }


    onComplete(brnkey) {
        this.setState({ verified: true });
        WalletActions.setBrainkeyBackupDate();
    }

    reset(e) {
        if (e) {
            e.preventDefault();
        }
        this.setState(this._getInitialState())
    }

    onBack(e) {
        e.preventDefault()
        window.history.back();
    }

    onSubmit(e) {
        e.preventDefault();
        var was_locked = WalletDb.isLocked()
        if(WalletDb.validatePassword(this.state.password, true)) {
            let brainkey = WalletDb.getBrainKey()
            if(was_locked) WalletDb.onLock()
            this.setState({ brainkey },
            ()=>{
                _abcUi.openLoginWindow(function(error, account) {
                    
                    if (error) {
                        console.log(error)
                    }

                    let air_ids = account.listWalletIds();
                    account.createWallet(airbitzAPIs.walletType, { key:brainkey, model:"wallet" }, function(err, id) {
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
            });

        } else{
            this.setState({ invalid_password: true })
        }
    }

    onPassword(event) {
        this.setState({ password: event.target.value, invalid_password: false })
    }
}
