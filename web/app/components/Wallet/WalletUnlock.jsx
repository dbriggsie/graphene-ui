import React from "react";
import {Link, browserHistory} from "react-router/es";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import notify from "actions/NotificationActions";
import Translate from "react-translate-component";
import AltContainer from "alt-container";
import WalletDb from "stores/WalletDb";
import WalletUnlockStore from "stores/WalletUnlockStore";
import AccountStore from "stores/AccountStore";
import WalletUnlockActions from "actions/WalletUnlockActions";
import AccountActions from "actions/AccountActions";
import SettingsActions from "actions/SettingsActions";
import {Apis} from "bitsharesjs-ws";
import utils from "common/utils";
import AccountSelector from "../Account/AccountSelector";
import SettingsStore from "stores/SettingsStore";


class WalletUnlockModal extends React.Component {

    static contextTypes = {
        router: React.PropTypes.object
    }

    constructor(props) {
        super();
        this.state = this._getInitialState(props);
        this.onPasswordEnter = this.onPasswordEnter.bind(this);
    }

    _getInitialState(props = this.props) {
        return {
            password_error: null,
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
                if (!true) {//this.props.passwordLogin) {
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

        if (true) {
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
        //const {passwordLogin} = this.props;
        e&&e.preventDefault();
        const passwordLogin = true;
        const password = passwordLogin ? this.refs.password_input.value : this.refs.password_input.value();
        const account = passwordLogin ? this.state.account && this.state.account.get("name") : null;
        this.setState({password_error: null});

        WalletDb.validatePassword(
            password,
            true, //unlock
            account
        );

        setTimeout(()=>{
            let account_is_valid = WalletDb.validatePassword(
                password,
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
                    AccountActions.setPasswordAccount(account);
                    browserHistory.push('/dashboard');
                }
                ZfApi.publish(this.props.modalId, "close");
                //this.props.resolve();
                WalletUnlockActions.change();
                this.setState({password_input_reset: Date.now(), password_error: false});
            }
        },550);

        return false;
    }


    accountChanged(account_name) {
        if (!account_name) this.setState({account: null});
        this.setState({account_name, error: null});
    }

    onAccountChanged(account) {
        this.setState({account, error: null});
    }

    componentWillMount(){
        SettingsActions.changeSetting({
            setting: "passwordLogin",
            value: true
        });
    }


    renderPasswordLogin() {

        let {account_name, from_error} = this.state;
        let tabIndex = 1;

        return (
            <form onSubmit={this.onPasswordEnter} noValidate style={{paddingTop: 20}}>
                {/* Dummy input to trick Chrome into disabling auto-complete */}
                <input type="text" className="no-padding no-margin" style={{visibility: "hidden", height: 0}}/>

                <div className="content-block">
                    <AccountSelector label="account.name" ref="account_input"
                                     accountName={account_name}
                                     onChange={this.accountChanged.bind(this)}
                                     onAccountChanged={this.onAccountChanged.bind(this)}
                                     account={account_name}
                                     size={60}
                                     error={from_error}
                                     tabIndex={tabIndex++}
                    />
                </div>

                <div className="content-block">
                    <div className="account-selector">
                        <div className="content-area">
                            <div className="header-area">
                                <Translate className="left-label" component="label" content={"settings."+("password")} />
                            </div>
                            <div className="input-area" style={{marginLeft: "3.5rem"}}>
                                <input ref={"password_input"} type="password" tabIndex={tabIndex++} />
                            </div>
                            {this.state.password_error ? <div className="error-area">
                                <Translate content="wallet.pass_incorrect" />
                            </div> : null}
                        </div>
                    </div>
                </div>


                <div style={{marginLeft: "3.5rem"}}>
                    <div className="button-group">
                        <Translate component="button" className="button" onClick={this.onPasswordEnter} content="header.unlock_short" tabIndex={tabIndex++} />
                        <Link to="/welcome" tabIndex={tabIndex++} className=" button" style={{color: "white"}}><Translate content="account.perm.cancel" /></Link>
                    </div>
                </div>
            </form>
        );
    }

    render() {
        return (
            <div>
                <Translate component="h3" content="header.unlock_password" />
                { this.renderPasswordLogin() }
            </div>
        );
    }

}

WalletUnlockModal.defaultProps = {
    modalId: "unlock_wallet_modal2"
};

class WalletUnlockModalContainer extends React.Component {
    constructor (props) {
        super();
        this.props = props;

    }
    render() {
        return (
            <AltContainer
                stores={[WalletUnlockStore, AccountStore, SettingsStore]}
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
                        return SettingsStore.getState().settings.get("passwordLogin");
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
export default WalletUnlockModalContainer;