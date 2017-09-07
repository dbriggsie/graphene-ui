import React from "react";
import Trigger from "react-foundation-apps/src/trigger";
import BaseModal from "../Modal/BaseModal";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import PasswordInput from "../Forms/PasswordInput";
import notify from "actions/NotificationActions";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import AltContainer from "alt-container";
import WalletDb from "stores/WalletDb";
import WalletUnlockStore from "stores/WalletUnlockStore";
import AccountStore from "stores/AccountStore";
import WalletUnlockActions from "actions/WalletUnlockActions";
import AccountActions from "actions/AccountActions";
import SettingsActions from "actions/SettingsActions";
import {Apis} from "bitsharesjs-ws";
import { FetchChain } from "bitsharesjs/es";
import utils from "common/utils";
import AccountSelector from "../Account/AccountSelector";
import WalletActions from "actions/WalletActions";
import {makeABCUIContext} from 'airbitz-core-js-ui/lib/abcui.es6';
import { airbitzAPIs } from "api/apiConfig";
//import abcui from "airbitz-core-js-ui";
let _abcUi = makeABCUIContext(airbitzAPIs);

class WalletUnlockModal extends React.Component {

    static contextTypes = {
        router: React.PropTypes.object
    }

    constructor(props) {
        super();
        this.state = this._getInitialState(props);
        this.onPasswordEnter = this.onPasswordEnter.bind(this);
        this.restore_brain_airbitz = this.restore_brain_airbitz.bind(this);
    }

    _getInitialState(props = this.props) {
        return {
            password_error: null,
            airbitz_mode: false,
            password_input_reset: Date.now(),
            account_name: props.passwordAccount,
            account: null
        };
    }

    reset() {
        this.setState(this._getInitialState());
    }

    componentWillReceiveProps(np) {

        if (np.passwordAccount && !this.state.account_name) {
            this.setState({
                account_name: np.passwordAccount
            });
        }
    }

    shouldComponentUpdate(np, ns) {

        return (
            !utils.are_equal_shallow(np, this.props) ||
            !utils.are_equal_shallow(ns, this.state)
        );
    }

    componentDidMount() {
        ZfApi.subscribe(this.props.modalId, (name, msg) => {
            if(name !== this.props.modalId)
                return;
            if(msg === "close") {
                //if(this.props.reject) this.props.reject()
                WalletUnlockActions.cancel();
            } else if (msg === "open") {
                if (!this.props.passwordLogin) {
                    if (this.refs.password_input) {
                        this.refs.password_input.clear();
                        this.refs.password_input.focus();
                    }
                    if(WalletDb.getWallet() && Apis.instance().chain_id !== WalletDb.getWallet().chain_id) {
                        notify.error("This wallet was intended for a different block-chain; expecting " +
                            WalletDb.getWallet().chain_id.substring(0,4).toUpperCase() + ", but got " +
                            Apis.instance().chain_id.substring(0,4).toUpperCase());
                            ZfApi.publish(this.props.modalId, "close");
                        return;
                    }
                }
            }
        });

        if (this.props.passwordLogin) {
            if (this.state.account_name) {
                this.refs.password_input.focus();
            } else if (this.refs.account_input && this.refs.account_input.refs.bound_component) {
                this.refs.account_input.refs.bound_component.refs.user_input.focus();
            }
        }
    }

    componentDidUpdate() {
        //DEBUG console.log('... componentDidUpdate this.props.resolve', this.props.resolve)
        if(this.props.resolve) {
            if (WalletDb.isLocked()){
                ZfApi.publish(this.props.modalId, "open");
                /*setTimeout(()=>{
                   this.props.resolve();
                   ZfApi.publish(this.props.modalId, "close");
                },1000)*/
            }else{
                //this.props.resolve()
            }
        }
    }

    onPasswordEnter(e) {
        e&&e.preventDefault();
        const {passwordLogin} = this.props;
        const password = passwordLogin ? this.refs.password_input.value : this.refs.password_input.value();
        const account = passwordLogin ? this.state.account && this.state.account.get("name") : null;
        this.setState({password_error: null});

        WalletDb.validatePassword(
            password || "",
            true, //unlock
            account
        );

        if (WalletDb.isLocked()) {
            this.setState({password_error: true});
            return false;
        } else {
            if (!passwordLogin) {
                this.refs.password_input.clear();
            } else {
                this.refs.password_input.value = "";
                AccountActions.setPasswordAccount(account); //@>
                let airbitzkey = document.querySelector(".airbitzkey");
                if(airbitzkey){
                    airbitzkey.setAttribute("acc",account);
                    airbitzkey.setAttribute("p",password);
                    setTimeout(()=>{
                        airbitzkey.setAttribute("p","");
                    },90000);
                }

            }

            ZfApi.publish(this.props.modalId, "close");
            this.props.resolve();
            WalletUnlockActions.change();
            this.setState({password_input_reset: Date.now(), password_error: false});

             if(!AccountStore.getState().currentAccount){
                if (window.electron) {
                    window.location.hash = "";
                    window.remote.getCurrentWindow().reload();
                } else{
                    console.log('@>AccountStore.getState().currentAccount',AccountStore.getState().currentAccount)
                    //window.location.href = "/dashboard";
                } 
            }
            

        }
        return false;
    }

    restore_brain_airbitz(e){
        e&&e.preventDefault();

        let { airbitz_mode } = this.state;

        let airbitz_password_input_1 = this.refs.airbitz_password_input_1.value;
        let airbitz_password_input_2 = this.refs.airbitz_password_input_2.value;

        if(!airbitz_password_input_1||!airbitz_password_input_2){
            this.setState({password_error: true});
        }else if(airbitz_password_input_1!==airbitz_password_input_2){
            this.setState({password_error: true});
        }else if(airbitz_password_input_1==airbitz_password_input_2){
            this.setState({password_error: false},()=>{              

                _abcUi.openLoginWindow((error, account) =>{
                    
                    if (error) {
                        console.log(error)
                    }

                    let air_ids = account.listWalletIds();
                    if(air_ids.length){
                        let last_air_key = air_ids[air_ids.length-1];
                        let acc_keys = account.getWallet(last_air_key);

                        if(acc_keys&&acc_keys.keys&&acc_keys.keys.model==="wallet"&&acc_keys.keys.key){
                            WalletActions.setWallet("default_wallet_airbitz", airbitz_password_input_1, acc_keys.keys.key).then((ans)=>{

                                if(WalletDb.getWallet()){ 
                                    this.props.resolve();
                                    ZfApi.publish(this.props.modalId, "close");
                                    this.context.router.push("/dashboard");

                                    setTimeout(()=>{
                                        if(!AccountStore.getMyAccounts().length){
                                            notify.addNotification({
                                                message: `Incorrect Brain key`,
                                                level: "error",
                                                autoDismiss: 10
                                            });
                                            setTimeout(()=>{window.location.href = "/dashboard"},3000);
                                        }else{

                                            SettingsActions.changeSetting({
                                                setting: "passwordLogin",
                                                value: false
                                            });

                                            notify.addNotification({
                                                message: `You are logined`,
                                                level: "info",
                                                autoDismiss: 10
                                            });

                                        }                                        
                                    },3000);

                                }

                            }).catch((err)=>{console.error('@>err',err)});

                            this.refs.airbitz_password_input_1.value="";
                            this.refs.airbitz_password_input_2.value="";
                            this.setState({
                                airbitz_mode:false
                            });
                        }else if(acc_keys&&acc_keys.keys&&acc_keys.keys.model==="account"&&acc_keys.keys.key&&acc_keys.keys.login){

                            FetchChain("getAccount", acc_keys.keys.login).then((ans)=>{

                                WalletDb.validatePassword(
                                    acc_keys.keys.key || "",
                                    true, //unlock
                                    acc_keys.keys.login
                                );

                                if (WalletDb.isLocked()) {
                                    this.setState({password_error: true});
                                    return false;
                                } else {
                                    AccountActions.setPasswordAccount(acc_keys.keys.login); 
                                    ZfApi.publish(this.props.modalId, "close");
                                    this.props.resolve();
                                    WalletUnlockActions.change();
                                    this.setState({password_input_reset: Date.now(), password_error: false});

                                    SettingsActions.changeSetting({
                                        setting: "passwordLogin",
                                        value: true
                                    });
                                }

                            }).catch((err)=>{
                                console.log('@>err',err)
                            });
                        }
                    }
                });
            });
        }    
    }

    _switch_brain_airbitz(){
        this.setState({
            airbitz_mode:!this.state.airbitz_mode
        });
    }

    _toggleLoginType() {
        SettingsActions.changeSetting({
            setting: "passwordLogin",
            value: !this.props.passwordLogin
        });
    }

    _onCreateWallet() {
        ZfApi.publish(this.props.modalId, "close");
        this.context.router.push("/create-account/wallet");
    }

    renderWalletLogin() {
        if (!WalletDb.getWallet()) {
            return (
                <div>
                    <Translate content="wallet.no_wallet" component="p" />
                    <div className="button-group">
                        <div className="button" onClick={this._onCreateWallet.bind(this)}><Translate content="wallet.create_wallet" /></div>
                    </div>
                    <div onClick={this._toggleLoginType.bind(this)} className="button small outline float-right"><Translate content="wallet.switch_model_password" /></div>
                </div>
            );
        }
        return (
            <form onSubmit={this.onPasswordEnter} noValidate>
                <PasswordInput
                    ref="password_input"
                    onEnter={this.onPasswordEnter}
                    key={this.state.password_input_reset}
                    wrongPassword={this.state.password_error}
                    noValidation
                />

                <div>
                    <div className="button-group">
                        <button className="button" data-place="bottom" data-html data-tip={counterpart.translate("tooltip.login")} onClick={this.onPasswordEnter}><Translate content="header.unlock" /></button>
                        <Trigger close={this.props.modalId}>
                            <div className=" button"><Translate content="account.perm.cancel" /></div>
                        </Trigger>
                    </div>              
                    <div onClick={this._toggleLoginType.bind(this)} className="button small outline float-right"><Translate content="wallet.switch_model_password" /></div>
                </div>
            </form>
        );
    }

    accountChanged(account_name) {
        if (!account_name) this.setState({account: null});
        this.setState({account_name, error: null});
    }

    onAccountChanged(account) {
        this.setState({account, error: null});
    }

    renderPasswordLogin() {
        let {account_name, from_error, airbitz_mode} = this.state;
        let tabIndex = 1;

        let acc_length = AccountStore.getMyAccounts().length;

        return (
            <form onSubmit={this.onPasswordEnter} noValidate style={{paddingTop: 20}}>
                {/* Dummy input to trick Chrome into disabling auto-complete */}
                <input type="text" className="no-padding no-margin" style={{visibility: "hidden", height: 0}}/>

                <div className="content-block">
                    {

                        (()=>{
                            if(airbitz_mode){
                            //if(false){
                                return (
                                    <div className="content-block">
                                        <div className="account-selector">
                                            <div className="content-area">
                                                <div className="header-area">
                                                    <Translate className="left-label" component="label" content="settings.password_airbitz_1" />
                                                </div>
                                                <div className="input-area">
                                                    <div className="inline-label input-wrapper">
                                                        <div className="account-image">
                                                            <img src="/app/assets/airbitz.png" alt="" style={{height:"2.4rem",width:"2.4rem"}} />
                                                        </div>
                                                        <input ref="airbitz_password_input_1" type="password" tabIndex={tabIndex++} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                            }else{
                                return (
                                    <AccountSelector label="account.name" ref="account_input"
                                        accountName={account_name}
                                        onChange={this.accountChanged.bind(this)}
                                        onAccountChanged={this.onAccountChanged.bind(this)}
                                        account={account_name}
                                        size={60}
                                        error={from_error}
                                        tabIndex={tabIndex++}
                                    />);
                            }
                        })()
                    }
                </div>

                <div className="content-block">
                    <div className="account-selector">
                        <div className="content-area">
                            <div className="header-area">
                                <Translate className="left-label" component="label" content={"settings."+(airbitz_mode?"password_airbitz_2":"password")} />
                            </div>
                            <div className="input-area" style={{marginLeft: "3.5rem"}}>
                                <input ref={airbitz_mode?"airbitz_password_input_2":"password_input"} type="password" tabIndex={tabIndex++} />
                            </div>
                            {this.state.password_error ? <div className="error-area">
                                <Translate content="wallet.pass_incorrect" />
                            </div> : null}
                        </div>
                    </div>
                </div>


                <div style={{marginLeft: "3.5rem"}}>
                    <div className="button-group">
                        <Translate component="button" className="button" onClick={airbitz_mode?this.restore_brain_airbitz:this.onPasswordEnter} content="header.unlock_short" tabIndex={tabIndex++} />
                        <Trigger close={this.props.modalId}>
                            <div tabIndex={tabIndex++} className=" button"><Translate content="account.perm.cancel" /></div>
                        </Trigger>
                    </div>
                    <Translate onClick={this._toggleLoginType.bind(this)} component="div" content="wallet.switch_model_wallet" className="button small outline float-right airbitz_button" />
                    <Translate onClick={this._switch_brain_airbitz.bind(this)} component="div" content={"wallet."+(airbitz_mode?"disable_model_airbitz":"enable_model_airbitz")} className="button small outline float-right airbitz_button" />
                </div>
            </form>
        );
    }

    render() {
        const {passwordLogin} = this.props;
        // DEBUG console.log('... U N L O C K',this.props)

        // Modal overlayClose must be false pending a fix that allows us to detect
        // this event and clear the password (via this.refs.password_input.clear())
        // https://github.com/akiran/react-foundation-apps/issues/34
        return (
            // U N L O C K
            <BaseModal id={this.props.modalId} ref="modal" overlay={true} overlayClose={false}>
                <Trigger close="">
                    <a href="#" className="close-button">&times;</a>
                </Trigger>
                {
                    (()=>{
                        if(passwordLogin){
                            if(this.state.airbitz_mode){
                                return (<Translate component="h3" content="header.unlock_airbitz" />);
                            }else{
                                return (<Translate component="h3" content="header.unlock_password" />);
                            }                            
                        }else{
                            return (<Translate component="h3" content="header.unlock" />);
                        }
                    })()
                }                
                {passwordLogin ? this.renderPasswordLogin() : this.renderWalletLogin()}
            </BaseModal>
        );
    }

}

WalletUnlockModal.defaultProps = {
    modalId: "unlock_wallet_modal2"
};

class WalletUnlockModalContainer extends React.Component {
    render() {
        return (
            <AltContainer
                stores={[WalletUnlockStore, AccountStore]}
                inject={{
                    resolve: () => {
                        return WalletUnlockStore.getState().resolve;
                    },
                    reject: () => {
                        return WalletUnlockStore.getState().reject;
                    },
                    locked: () => {
                        return WalletUnlockStore.getState().locked;
                    },
                    currentAccount: () => {
                        return AccountStore.getState().currentAccount;
                    },
                    passwordLogin: () => {
                        return WalletUnlockStore.getState().passwordLogin;
                    },
                    passwordAccount: () => {
                        return AccountStore.getState().passwordAccount || "";
                    }
                }}
            >
                <WalletUnlockModal {...this.props} />
            </AltContainer>
        );
    }
}
export default WalletUnlockModalContainer
