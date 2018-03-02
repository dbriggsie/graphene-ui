import React from "react";
import {Link} from "react-router/es";
import { connect } from "alt-react";
import ActionSheet from "react-foundation-apps/src/action-sheet";
import AccountActions from "actions/AccountActions";
import AccountStore from "stores/AccountStore";
import SettingsStore from "stores/SettingsStore";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Icon from "../Icon/Icon";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import WalletDb from "stores/WalletDb";
import WalletUnlockStore from "stores/WalletUnlockStore";
import WalletUnlockActions from "actions/WalletUnlockActions";
import WalletManagerStore from "stores/WalletManagerStore";
import cnames from "classnames";
import TotalBalanceValue from "../Utility/TotalBalanceValue";
import ReactTooltip from "react-tooltip";
import { Apis } from "bitsharesjs-ws";
import notify from "actions/NotificationActions";
import IntlActions from "actions/IntlActions";
import AccountImage from "../Account/AccountImage";
import SettingsActions from "actions/SettingsActions";
import BaseModal from "components/Modal/BaseModal";
import Transfer from "../Transfer/Transfer";

import {ChainStore} from "bitsharesjs/es";

const logo = "/app/assets/logo.png";
const OPENLEDGER_IDS = ["1.2.96393", "1.2.369892", "1.2.96397", "1.2.100614"];
const TRANSFER_MODAL_ID = "header_transfer_modal";

const FlagImage = ({flag, width = 20, height = 20}) => {
    return <img height={height} width={width} src={"/app/assets/language-dropdown/img/" + flag.toUpperCase() + ".png"} />;
};

class Header extends React.Component {

    static contextTypes = {
        location: React.PropTypes.object.isRequired,
        router: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super();
        this.state = {
            active: context.location.pathname,
            showVoting: false
        };
        this._checkVoting = this._checkVoting.bind(this);
        ChainStore.subscribe(this._checkVoting);
        this.unlisten = null;

    }

    componentWillMount() {
        this.unlisten = this.context.router.listen((newState, err) => {
            if (!err) {
                if (this.unlisten && this.state.active !== newState.pathname) {
                    this.setState({
                        active: newState.pathname
                    });
                }
            }
        });
    }

    /* NOTE: is needed for Simple Mode. */
    componentWillReceiveProps(nextProps) {
        if (nextProps.traderMode && !this.props.traderMode) {
            this.context.router.push("/dashboard");
        }else if(!nextProps.traderMode && this.props.traderMode){
            this.context.router.push("/dashboard");
        }
    }

    componentDidMount() {
        setTimeout(() => {
            ReactTooltip.rebuild();
        }, 1250);
        ZfApi.subscribe("fast-voting-message", (name, msg) => {
            if (msg === "done") {
                this._setVoting(false);
            }
        });
    }

    componentWillUnmount() {
        if (this.unlisten) {
            this.unlisten();
            this.unlisten = null;
        }
        ZfApi.unsubscribe("fast-voting-message");
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.linkedAccounts !== this.props.linkedAccounts ||
            nextProps.traderMode !== this.props.traderMode || // NOTE: is needed for Simple Mode.
            nextProps.currentAccount !== this.props.currentAccount ||
            nextProps.passwordLogin !== this.props.passwordLogin ||
            nextProps.locked !== this.props.locked ||
            nextProps.current_wallet !== this.props.current_wallet ||
            nextProps.lastMarket !== this.props.lastMarket ||
            nextProps.starredAccounts !== this.props.starredAccounts ||
            nextProps.currentLocale !== this.props.currentLocale ||
            nextProps.currentUnit !== this.props.currentUnit ||
            nextState.active !== this.state.active ||
            nextState.showVoting !== this.state.showVoting
        );
    }

    _triggerMenu(e) {
        e.preventDefault();
        ZfApi.publish("mobile-menu", "toggle");
    }

    _toggleLock(e) {
        e.preventDefault();
        let airbitzkey = document.querySelector(".airbitzkey");
        if(airbitzkey){
            airbitzkey.setAttribute("show_switch_airbitzkey","true");
        }

        if (WalletDb.isLocked()) {
            WalletUnlockActions.unlock().then(() => {
                AccountActions.tryToSetCurrentAccount();
            });
        } else {
            WalletUnlockActions.lock();
        }
    }

    _onNavigate(route, e) {
        e.preventDefault();
        this.context.router.push(route);
    }

    _onGoBack(e) {
        e.preventDefault();
        window.history.back();
    }

    _onGoForward(e) {
        e.preventDefault();
        window.history.forward();
    }

    _accountClickHandler(account_name, e) {
        e.preventDefault();
        ZfApi.publish("account_drop_down", "close");
        if (this.context.location.pathname.indexOf("/account/") !== -1) {
            let currentPath = this.context.location.pathname.split("/");
            currentPath[2] = account_name;
            this.context.router.push(currentPath.join("/"));
        }
        if (account_name !== this.props.currentAccount) {
            AccountActions.setCurrentAccount.defer(account_name);
            notify.addNotification({
                message: counterpart.translate("header.account_notify", {account: account_name}),
                level: "success",
                autoDismiss: 3
            });
        }
        // this.onClickUser(account_name, e);
    }

    _checkVoting() {
        const accountName = this.props.currentAccount;
        const account = ChainStore.getAccount(accountName);
        if (account) {
            ChainStore.unsubscribe(this._checkVoting);
            const options = account.get("options");
            const proxyAccount = options && options.get("voting_account");
            this._setVoting(OPENLEDGER_IDS.indexOf(proxyAccount) === -1);
        }
    }

    _setVoting(show) {
        this.setState({
            showVoting: show
        });
    }

    go_with_airbitz(){
        if(!this.props.currentAccount){
            localStorage.setItem("airbitz_backup_option","true")
        }
        console.log('@>airbitz_backup_option header',localStorage.getItem("airbitz_backup_option"))
    }

    onChangeUnit( unit, e){
        e.preventDefault();
        SettingsActions.changeSetting({setting: 'unit', value: unit});
    }

    _showTransferModal(e){
        e.preventDefault();
        ZfApi.publish(TRANSFER_MODAL_ID, "open");
    }

    render() {
        let {active} = this.state;
        let {linkedAccounts, currentAccount, starredAccounts, traderMode, passwordLogin, units, currentUnit} = this.props;
        let locked_tip = counterpart.translate("header.locked_tip");
        let unlocked_tip = counterpart.translate("header.unlocked_tip");
        let tradingAccounts = AccountStore.getMyAccounts();

        if (starredAccounts.size) {

            for (let i = tradingAccounts.length - 1; i >= 0; i--) {
                if (!starredAccounts.has(tradingAccounts[i])) {
                    tradingAccounts.splice(i, 1);
                }
            };
            starredAccounts.forEach(account => {
                if (tradingAccounts.indexOf(account.name) === -1) {
                    tradingAccounts.push(account.name);
                }
            });
        }
        let myAccounts = AccountStore.getMyAccounts();


        let myAccountCount = myAccounts.length;
        let walletBalance = myAccounts.length && this.props.currentAccount ? (

            <div className="grp-menu-item header-balance cursor-pointer">
                <ActionSheet>
                    <ActionSheet.Button title="">
                        <a className="arrow-change-currency"><TotalBalanceValue.AccountWrapper label="exchange.balance" accounts={[this.props.currentAccount]} inHeader={true}/></a>
                    </ActionSheet.Button>
                    <ActionSheet.Content>
                        <ul className="no-first-element-top-border ">
                            {units.map((item, ind)=>{
                                return <li key={ind}>
                                    <a className={item == currentUnit ? 'active' : null} href onClick={this.onChangeUnit.bind(this, item)}>
                                        {item}
                                    </a>
                                </li>
                            })}
                        </ul>
                    </ActionSheet.Content>
                </ActionSheet>
            </div>) : null;

        let dashboard = (
            <a
                style={{padding:"0.25rem 0.5rem"}}
                className={cnames({active: active === "/" || active.indexOf("dashboard") !== -1})}
                onClick={this._onNavigate.bind(this, "/dashboard")}
            >
                <img style={{margin:0,height: 30}} src={logo} />
            </a>
        );

        let createAccountLink = myAccountCount === 0 ? (
            <ActionSheet.Button title="" setActiveState={this.go_with_airbitz.bind(this)}>
                <a className="button create-account" onClick={this._onNavigate.bind(this, "/create-account")} style={{ border: "none"}} >
                    <Icon className="icon-14px" name="user"/> <Translate content="header.create_account" />
                </a>
            </ActionSheet.Button>
        ) : null;

        //@#>
        let login_with_password = myAccountCount === 0 ? (
            <div className="grp-menu-item overflow-visible account-drop-down">
                <Link className="button create-account"
                      to="/login"
                      style={{border: "none"}} >
                    <Icon className="icon-14px" name="key"/> <Translate content="header.login" />
                </Link>
            </div>
        ) : null;

        let lock_unlock = (
            <div className="grp-menu-item" >
                { this.props.locked ?
                    <a href onClick={this._toggleLock.bind(this)} data-class="unlock-tooltip" data-offset="{'left': 50}" data-tip={locked_tip} data-place="bottom" data-html><Icon className="icon-14px" name="locked"/></a>
                    : <a href onClick={this._toggleLock.bind(this)} data-class="unlock-tooltip" data-offset="{'left': 50}" data-tip={unlocked_tip} data-place="bottom" data-html><Icon className="icon-14px" name="unlocked"/></a> }
            </div>
        )

        let tradeLink = this.props.lastMarket ?
            <Link to={`/market/${this.props.lastMarket}`}   className={cnames({active: active.indexOf("market/") !== -1})} ><Translate component="span" content="header.exchange" /></Link>:
            <Link to="/market/USD_BTS"  className={cnames({active: active.indexOf("market/") !== -1})} ><Translate component="span" content="header.exchange" /></Link>;

        let hasOrders = linkedAccounts.reduce((final, a) => {
            let account = ChainStore.getAccount(a);
            return final || (account && account.get("orders") && account.get("orders").size > 0);
        }, false);

        // Account selector: Only active inside the exchange
        let accountsDropDown = null, account_display_name, accountsList;
        if (currentAccount) {
            account_display_name = currentAccount.length > 20 ? `${currentAccount.slice(0, 20)}..` : currentAccount;
            if (tradingAccounts.indexOf(currentAccount) < 0) {
                tradingAccounts.push(currentAccount);
            }
            if (tradingAccounts.length >= 1) {
                accountsList = tradingAccounts
                    .sort()
                    .map((name, index) => {
                        return (
                            <li className={name === account_display_name ? "current-account" : ""} key={name}>
                                <a href onClick={this._accountClickHandler.bind(this, name)}>
                                    <div className="table-cell"><AccountImage style={{position: "relative", top: 5}} size={{height: 20, width: 20}} account={name}/></div>
                                    <div className="table-cell" style={{paddingLeft: 10}}><span>{name}</span></div>
                                </a>
                            </li>
                        );
                    });
            }
        }

        accountsDropDown = createAccountLink ?
            createAccountLink :
            tradingAccounts.length === 1 ?
                (<ActionSheet.Button title="" setActiveState={() => {}}>
                    <a onClick={this._accountClickHandler.bind(this, account_display_name)} style={{cursor: "default", border: "none"}} className="button">
                        <div className="table-cell"><AccountImage style={{display: "inline-block"}} size={{height: 20, width: 20}} account={account_display_name}/></div>
                        <div className="table-cell" style={{paddingLeft: 5, verticalAlign: "middle"}}><div className="inline-block"><span className="lower-case">{account_display_name}</span></div></div>
                    </a>
                </ActionSheet.Button>) :

                (<ActionSheet>
                    <ActionSheet.Button title="">
                        <a style={{ border: "none"}} className="button">
                            <div className="table-cell"><AccountImage style={{display: "inline-block"}} size={{height: 20, width: 20}} account={account_display_name}/></div>
                            <div className="table-cell" style={{paddingLeft: 5, verticalAlign: "middle"}}><div className="inline-block"><span className="lower-case">{account_display_name}</span></div></div>
                        </a>
                    </ActionSheet.Button>
                    {tradingAccounts.length > 1 ?
                        <ActionSheet.Content>
                            <ul className="no-first-element-top-border">
                                {accountsList}
                            </ul>
                        </ActionSheet.Content> : null}
                </ActionSheet>);

        let settingsDropdown = <ActionSheet>
            <ActionSheet.Button title="">
                <a style={{border: "none"}} className="button">
                    <Icon className="icon-14px" name="cog"/>
                </a>
            </ActionSheet.Button>
            <ActionSheet.Content>
                <ul className="no-first-element-top-border">
                    <li>
                        <a href onClick={this._onNavigate.bind(this, "/settings")}>
                            <span><Translate content="header.settings" /></span>
                        </a>
                    </li>
                    <li>
                        <a href onClick={this._onNavigate.bind(this, "/explorer")}>
                            <span><Translate content="header.explorer" /></span>
                        </a>
                    </li>
                    <li>
                        <a href onClick={this._onNavigate.bind(this, "/help")}>
                            <span><Translate content="header.help" /></span>
                        </a>
                    </li>
                </ul>
            </ActionSheet.Content>
        </ActionSheet>;

        const enableDepositWithdraw = Apis.instance().chain_id.substr(0, 8) === "4018d784";

        return (
            <div>
                <div className="header menu-group primary">
                    <div className="show-for-small-only">
                        <ul className="primary menu-bar title">
                            <li><a href onClick={this._triggerMenu}><Icon className="icon-32px" name="menu"/></a></li>
                        </ul>
                    </div>
                    {__ELECTRON__ ? <div className="grid-block show-for-medium shrink electron-navigation">
                        <ul className="menu-bar">
                            <li>
                                <div style={{marginLeft: "1rem", height: "3rem"}}>
                                    <div style={{marginTop: "0.5rem"}} onClick={this._onGoBack.bind(this)} className="button outline small">{"<"}</div>
                                </div>
                            </li>
                            <li>
                                <div style={{height: "3rem", marginLeft: "0.5rem", marginRight: "0.75rem"}}>
                                    <div style={{marginTop: "0.5rem"}} onClick={this._onGoForward.bind(this)} className="button outline small">></div>
                                </div>
                            </li>
                        </ul>
                    </div> : null}
                    <div className="grid-block show-for-medium">
                        <ul className="menu-bar">
                            <li>{dashboard}</li>
                            {/* {(!traderMode && hasOrders) ? <li><Link to="/my-orders" activeClassName="active"><Translate content="exchange.my_orders"/></Link></li> : null}*/}
                            {/* {(traderMode && this.state.showVoting) ? <li><Link to={`/fast-voting`} className={cnames({active: active.indexOf("fast-voting") !== -1})}><Translate content="account.fast_voting.vote" /></Link></li> : null} */}
                            {(!currentAccount || !traderMode) ? null : <li><Link to={`/account/${currentAccount}/overview`} className={cnames({active: active.indexOf("account/") !== -1})}><Translate content="header.account" /></Link></li>}
                            {(!currentAccount || !traderMode) ? null : <li><a onClick={this._showTransferModal.bind(this)}><Translate component="span" content="transaction.trxTypes.transfer" /></a></li>}
                            {!traderMode ? null : <li>{tradeLink}</li>}
                            {(traderMode && currentAccount && myAccounts.indexOf(currentAccount) !== -1) ? <li><Link to={"/deposit-withdraw/"} activeClassName="active"><Translate content="account.deposit_withdraw"/></Link></li> : null}
                        </ul>
                    </div>
                    <div className="grid-block show-for-medium shrink">
                        <div className="grp-menu-items-group header-right-menu">

                            {!myAccountCount || !walletBalance ? null : walletBalance}


                            {myAccountCount !== 0 ? null :<div className="grp-menu-item overflow-visible" >
                                {settingsDropdown}
                            </div>}

                            <div className="grp-menu-item overflow-visible account-drop-down">
                                {accountsDropDown}
                            </div>

                            {login_with_password}

                            {!myAccountCount ? null : <div className="grp-menu-item overflow-visible" >
                                {settingsDropdown}
                            </div>}

                            {!myAccountCount ? null : lock_unlock}
                        </div>
                    </div>
                </div>

                <div className="blocktrades-gateway">
                    <BaseModal id={TRANSFER_MODAL_ID} overlay={true} className="withdraw_modal">
                        <div className="grid-block vertical">
                            <Transfer isModal={true} id={TRANSFER_MODAL_ID} />
                        </div>
                    </BaseModal>
                </div>
            </div>

        );
    }
}

export default connect(Header, {
    listenTo() {
        return [AccountStore, WalletUnlockStore, WalletManagerStore, SettingsStore];
    },
    getProps() {
        const chainID = Apis.instance().chain_id;
        return {
            linkedAccounts: AccountStore.getState().linkedAccounts,
            currentAccount: AccountStore.getState().currentAccount || AccountStore.getState().passwordAccount,
            locked: WalletUnlockStore.getState().locked,
            current_wallet: WalletManagerStore.getState().current_wallet,
            lastMarket: SettingsStore.getState().viewSettings.get(`lastMarket${chainID ? ("_" + chainID.substr(0, 8)) : ""}`),
            starredAccounts: SettingsStore.getState().starredAccounts,
            passwordLogin: SettingsStore.getState().settings.get("passwordLogin"),
            currentLocale: SettingsStore.getState().settings.get("locale"),
            locales: SettingsStore.getState().defaults.locale,
            currentUnit: SettingsStore.getState().settings.get("unit"),
            units: SettingsStore.getState().defaults.unit,
            traderMode: true //SettingsStore.getState().settings.get("traderMode"), // temporary force trader mode true
        };
    }
});
