import React from "react";
import { connect } from "alt-react";
import accountUtils from "common/account_utils";
import utils from "common/utils";
import Translate from "react-translate-component";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import TranswiserDepositWithdraw from "../DepositWithdraw/transwiser/TranswiserDepositWithdraw";
import BlockTradesGateway from "../DepositWithdraw/BlockTradesGateway";
import OpenLedgerFiatDepositWithdrawal from "../DepositWithdraw/openledger/OpenLedgerFiatDepositWithdrawal";
import OpenLedgerFiatTransactionHistory from "../DepositWithdraw/openledger/OpenLedgerFiatTransactionHistory";
import BlockTradesBridgeDepositRequest from "../DepositWithdraw/blocktrades/BlockTradesBridgeDepositRequest";
import HelpContent from "../Utility/HelpContent";
import AccountStore from "stores/AccountStore";
import { ChainStore } from "bitsharesjs/es"
import SettingsStore from "stores/SettingsStore";
import SettingsActions from "actions/SettingsActions";
import { Apis } from "bitsharesjs-ws";
import { settingsAPIs, blockTradesAPIs } from "api/apiConfig";
import BitKapital from "../DepositWithdraw/BitKapital";
import GatewayStore from "stores/GatewayStore";
import GatewayActions from "actions/GatewayActions";
import AccountImage from "../Account/AccountImage";
import BaseModal from "../Modal/BaseModal";
import DepositModalRmbpay from "../DepositWithdraw/openledger/DepositModalRmbpay";
import WithdrawModalRmbpay from "../DepositWithdraw/openledger/WithdrawModalRmbpay";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";

const RMBPAY_ASSET_ID = "1.3.2562";
const SERVER_URL = `${SERVER_ADMIN_URL}/api/v1`;

class AccountDepositWithdraw extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired,
        contained: React.PropTypes.bool
    };

    static defaultProps = {
        contained: false
    };

    constructor(props) {
        super();
        this.state = {
            olService: props.viewSettings.get("olService", "gateway"),
            btService: props.viewSettings.get("btService", "bridge"),
            metaService: props.viewSettings.get("metaService", "bridge"),
            activeService: props.viewSettings.get("activeService", 0),
            showRMBpay: false,
            rmbPay: {
                list_service: [{
                    name: "Alipay",
                    link_qr_code: ""
                }],
                fees: {
                    fee_share_dep: 0.0,
                    fee_min_val_dep: 0
                }
            }
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.account !== this.props.account ||
            !utils.are_equal_shallow(nextProps.blockTradesBackedCoins, this.props.blockTradesBackedCoins) ||
            !utils.are_equal_shallow(nextProps.openLedgerBackedCoins, this.props.openLedgerBackedCoins) ||
            nextState.olService !== this.state.olService ||
            nextState.btService !== this.state.btService ||
            nextState.metaService !== this.state.metaService ||
            nextState.activeService !== this.state.activeService ||
            nextState.showRMBpay !== this.state.showRMBpay
        );
    }

    componentWillMount() {
        accountUtils.getFinalFeeAsset(this.props.account, "transfer");
    }

    toggleOLService(service) {
        this.setState({
            olService: service
        });

        SettingsActions.changeViewSetting({
            olService: service
        });
    }

    toggleBTService(service) {
        this.setState({
            btService: service
        });

        SettingsActions.changeViewSetting({
            btService: service
        });
    }

    toggleMetaService(service) {
        this.setState({
            metaService: service
        });

        SettingsActions.changeViewSetting({
            metaService: service
        });
    }

    onSetService(e) {
        //let index = this.state.services.indexOf(e.target.value);
        this.setState({
            activeService: parseInt(e.target.value)
        });

        SettingsActions.changeViewSetting({
            activeService: parseInt(e.target.value)
        });
    }

    componentDidMount() {
        this._getAvailableServices();
    }

    _showDepositWithdraw(action, asset, fiatModal, e) {
        e.preventDefault();
        this.setState({
            [action === "bridge_modal" ? "bridgeAsset" : action === "deposit_modal" ? "depositAsset" : "withdrawAsset"]: asset,
            fiatModal
        }, () => {
            this.refs[action].show();
        });
    }

    _getRmbpayBalance() {
        const account = this.props.account
        const rmbpayBalance = account && account.get("balances").toJS()[RMBPAY_ASSET_ID]
        const balanceObject = rmbpayBalance ? ChainStore.getObject(rmbpayBalance) : 0
        const rmbPayAsset = ChainStore.getAsset("RMBPAY")
        const precision = rmbPayAsset ? utils.get_asset_precision(rmbPayAsset) : 1
        return balanceObject ? balanceObject.get("balance") / precision : 0
    }

    _getAvailableServices() {
        fetch(SERVER_URL, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ operation_name: "transfer_service" })
        }).then(
            response => {
                if (response.status !== 200) {
                    throw "Request failed";
                }
                response.json().then((data) => {
                    if (data.success !== "true") {
                        throw "Request failed";
                    }
                    const availableServices = data.list_transfer_service;
                    if (availableServices.length > 0) {
                        const rmbPayService = availableServices.find((service) => {
                            return service.name === "RMBpay"
                        });
                        if (rmbPayService && rmbPayService.is_active == 1) {
                            this.setState({
                                showRMBpay: true
                            });
                        }
                    }
                });
            }).catch(() => {
                console.log("Server failed.");
            });
    }

    _addRMBPayService(){
        // const services = this.state.servicesList;
        const rmbpayBalance = this._getRmbpayBalance();
        const rbmbPay  = {
            name: "RMBpay",
            template: (
                <div>
                    <div>
                        <p>
                            <Translate content="gateway.rmbpay.info" />
                        </p>
                        <p>
                            <Translate content="gateway.rmbpay.balance" /> {rmbpayBalance} RMBPAY
                        </p>
                    </div>
                    <div className="grid-block vertical medium-horizontal no-margin no-padding">

                        <div className="medium-5">
                            <p>
                                <Translate content="gateway.rmbpay.deposit_info" />
                            </p>
                            <button className="button success" style={{ fontSize: "1.3rem" }} onClick={this.onDeposit.bind(this)}>
                                <Translate content="gateway.deposit" />
                            </button>
                        </div>
                        <div className="medium-5 medium-offset-2">
                            <p>
                                <Translate content="gateway.rmbpay.withdrawal_info" />
                            </p>
                            <button className="button success" style={{ fontSize: "1.3rem" }} onClick={this.onWithdraw.bind(this)}><Translate content="gateway.withdraw" /></button>
                        </div>
                    </div>

                </div>
            )
        };

        return rbmbPay;
    }

    // {"success":"true","error":"false","list_transfer_service":[{"id":1,"name":"RMBpay","is_active":"0"}]}
    renderServices(blockTradesGatewayCoins, openLedgerGatewayCoins) {
        //let services = ["Openledger (OPEN.X)", "BlockTrades (TRADE.X)", "Transwiser", "BitKapital"];
        let serList = [];
        let { account } = this.props;
        let { olService, btService } = this.state;

        serList.push({
            name: "Openledger (OPEN.X)",
            template: (
                <div className="content-block">
                    {/* <div className="float-right">
                            <a href="https://www.ccedk.com/" target="__blank" rel="noopener noreferrer"><Translate content="gateway.website" /></a>
                        </div> */}
                    <div className="service-selector">
                        <ul className="button-group segmented no-margin">
                            <li onClick={this.toggleOLService.bind(this, "gateway")} className={olService === "gateway" ? "is-active" : ""}><a><Translate content="gateway.gateway" /></a></li>
                            <li onClick={this.toggleOLService.bind(this, "fiat")} className={olService === "fiat" ? "is-active" : ""}><a>Fiat</a></li>
                        </ul>
                    </div>

                    {olService === "gateway" && openLedgerGatewayCoins.length ?
                        <BlockTradesGateway
                            account={account}
                            coins={openLedgerGatewayCoins}
                            provider="openledger"
                        /> : null}

                    {olService === "fiat" ?
                        <div>
                            <div style={{ paddingBottom: 15 }}><Translate component="h5" content="gateway.fiat_text" unsafe /></div>

                            <OpenLedgerFiatDepositWithdrawal
                                rpc_url={settingsAPIs.RPC_URL}
                                account={account}
                                issuer_account="openledger-fiat" />
                            <OpenLedgerFiatTransactionHistory
                                rpc_url={settingsAPIs.RPC_URL}
                                account={account} />
                        </div> : null}
                </div>
            )
        });

        serList.push({
            name: "BlockTrades (TRADE.X)",
            template: (
                <div>
                    <div className="content-block">
                        {/* <div className="float-right"><a href="https://blocktrades.us" target="__blank" rel="noopener noreferrer"><Translate content="gateway.website" /></a></div> */}

                        <div className="service-selector">
                            <ul className="button-group segmented no-margin">
                                <li onClick={this.toggleBTService.bind(this, "bridge")} className={btService === "bridge" ? "is-active" : ""}><a><Translate content="gateway.bridge" /></a></li>
                                <li onClick={this.toggleBTService.bind(this, "gateway")} className={btService === "gateway" ? "is-active" : ""}><a><Translate content="gateway.gateway" /></a></li>
                            </ul>
                        </div>

                        {btService === "bridge" ?
                            <BlockTradesBridgeDepositRequest
                                gateway="blocktrades"
                                issuer_account="blocktrades"
                                account={account}
                                initial_deposit_input_coin_type="btc"
                                initial_deposit_output_coin_type="bts"
                                initial_deposit_estimated_input_amount="1.0"
                                initial_withdraw_input_coin_type="bts"
                                initial_withdraw_output_coin_type="btc"
                                initial_withdraw_estimated_input_amount="100000"
                                initial_conversion_input_coin_type="bts"
                                initial_conversion_output_coin_type="bitbtc"
                                initial_conversion_estimated_input_amount="1000"
                            /> : null}

                        {btService === "gateway" ?
                            <div>
                                <h4 className="txtlabel cancel">This cryptocurrency gateway is shutting down as it is rarely if ever used</h4>
                                <p>Openledger's gateway continues to operate, and it offers more coins and a far more liquid trading environment. Note that we will be continuing the operation of our cryptocurrency bridge for quickly buying and selling cryptocurrency, since it is actively used by the Bitshares community.</p>

                                <p>We'll be shutting down this gateway in stages. In the first stage, which has just begun, we've disabled deposits to the gateway. Inevitably, someone may still use one of their old deposit addresses, in which case we'll manually refund them when you contact us. <b>We request that if you hold any TRADE assets, you perform a withdrawal of those assets during this stage.</b></p>

                                <p>Eventually, we will also disable withdrawals as well, but we will leave in place a 1-1 market order on OPEN.BTC_TRADE.BTC for a while after that to allow users to exchange any remaining TRADE.BTC for OPEN.BTC. We will place similar orders for any other TRADE assets that remain outstanding after withdrawals are disabled.</p>
                            </div> : null}
                    </div>
                    <div className="content-block">
                    </div>
                </div>)
        });
        

            /*   serList.push({
                       name: "Transwiser",
                       template: (
                           <div>
                               <div className="float-right"><a href="http://www.transwiser.com" rel="noopener noreferrer" target="_blank"><Translate content="gateway.website" /></a></div>
                               <table className="table">
                                   <thead>
                                   <tr>
                                       <th><Translate content="gateway.symbol" /></th>
                                       <th><Translate content="gateway.deposit_to" /></th>
                                       <th><Translate content="gateway.balance" /></th>
                                       <th><Translate content="gateway.withdraw" /></th>
                                   </tr>
                                   </thead>
                                   <tbody>
                                   {/!* <TranswiserDepositWithdraw
                                       issuerAccount="transwiser-wallet"
                                       account={account.get("name")}
                                       receiveAsset="TCNY" /> *!/}
                                   <TranswiserDepositWithdraw
                                       issuerAccount="transwiser-wallet"
                                       account={account.get("name")}
                                       receiveAsset="CNY" />
                                   {/!*
                                   <TranswiserDepositWithdraw
                                       issuerAccount="transwiser-wallet"
                                       account={this.props.account.get("name")}
                                       receiveAsset="BOTSCNY" />
                                   *!/}
                                   </tbody>
                               </table>
                           </div>
                       )
                   });*/

        /* serList.push({
             name: "BitKapital",
             template: (<BitKapital viewSettings={this.props.viewSettings} account={account}/>)
         });*/

        return serList;
    }

    getWithdrawModalId() {
        return "withdraw_asset_openledger-dex_CNY";
    }

    getDepositModalId() {
        return "deposit_asset_openledger-dex_CNY";
    }

    onDeposit() {
        this.depositModalRmbpay.refs.bound_component.onOpen();
        ZfApi.publish(this.getDepositModalId(), "open");
    }

    onWithdraw() {
        this.withdrawModalRmbpay.refs.bound_component.fetchWithdrawData();
        ZfApi.publish(this.getWithdrawModalId(), "open");
    }

    render() {
        let { account } = this.props;
        let { activeService } = this.state;

        let withdraw_modal_id = this.getWithdrawModalId();
        let deposit_modal_id = this.getDepositModalId();

        let blockTradesGatewayCoins = this.props.blockTradesBackedCoins.filter(coin => {
            if (coin.backingCoinType.toLowerCase() === "muse") {
                return false;
            }
            return coin.symbol.toUpperCase().indexOf("TRADE") !== -1;
        })
            .map(coin => {
                return coin;
            })
            .sort((a, b) => {
                if (a.symbol < b.symbol)
                    return -1;
                if (a.symbol > b.symbol)
                    return 1;
                return 0;
            });

        let openLedgerGatewayCoins = this.props.openLedgerBackedCoins.map(coin => {
            return coin;
        })
            .sort((a, b) => {
                if (a.symbol < b.symbol)
                    return -1;
                if (a.symbol > b.symbol)
                    return 1;
                return 0;
            });

        let services = this.renderServices(blockTradesGatewayCoins, openLedgerGatewayCoins);

        if (this.state.showRMBpay) {
            services.push(this._addRMBPayService());
        }

        let options = services.map((services_obj, index) => {
            return <option key={index} value={index}>{services_obj.name}</option>;
        });
        let currentDepositAsset = {};
        return (
            <div className={this.props.contained ? "grid-content" : "grid-container"}>
                <div className={this.props.contained ? "" : "grid-content"} style={{ paddingTop: "2rem" }}>

                    <Translate content="gateway.title" component="h2" />
                    <div className="grid-block vertical medium-horizontal no-margin no-padding">
                        <div className="medium-6 show-for-medium">
                            <HelpContent path="components/DepositWithdraw" section="deposit-short" />
                        </div>
                        <div className="medium-5 medium-offset-1">
                            <HelpContent account={account.get("name")} path="components/DepositWithdraw" section="receive" />
                        </div>
                    </div>
                    <div>
                        <div className="grid-block vertical medium-horizontal no-margin no-padding">
                            <div className="medium-6 small-order-2 medium-order-1">
                                <Translate component="label" className="left-label" content="gateway.service" />
                                <select onChange={this.onSetService.bind(this)} className="bts-select" value={activeService} >
                                    {options}
                                </select>
                            </div>
                            <div className="medium-5 medium-offset-1 small-order-1 medium-order-2" style={{ paddingBottom: 20 }}>
                                <Translate component="label" className="left-label" content="gateway.your_account" />
                                <div className="inline-label">
                                    <AccountImage
                                        size={{ height: 40, width: 40 }}
                                        account={account.get("name")} custom_image={null}
                                    />
                                    <input type="text"
                                        value={account.get("name")}
                                        placeholder={null}
                                        disabled
                                        onChange={() => { }}
                                        onKeyDown={() => { }}
                                        tabIndex={1}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid-content no-padding" style={{ paddingTop: 15 }}>
                        {activeService && services[activeService] ? services[activeService].template : services[0].template}
                    </div>
                </div>

                <BaseModal id={deposit_modal_id} overlay={true} maxWidth="500px">
                    <div className="grid-block vertical">

                        <DepositModalRmbpay
                            account={this.props.account.get("name")}
                            asset="CNY"
                            output_coin_name="CNY"
                            output_coin_symbol="CNY"
                            output_coin_type="cny"
                            modal_id={deposit_modal_id}
                            ref={modal => { this.depositModalRmbpay = modal; }}
                        /* balance={{'id': 100}}*/
                        />
                    </div>
                </BaseModal>

                <BaseModal id={withdraw_modal_id} overlay={true} maxWidth="500px">
                    <div className="grid-block vertical">
                        <WithdrawModalRmbpay
                            account={this.props.account.get("name")}
                            issuer_account="rmbpay-wallet"
                            asset="RMBPAY"
                            output_coin_name="RMBPAY"
                            output_coin_symbol="RMBPAY"
                            output_coin_type="RMBPAY"
                            modal_id={withdraw_modal_id}
                            balance={this.props.account.get("balances").toJS()[RMBPAY_ASSET_ID]}
                            ref={modal => { this.withdrawModalRmbpay = modal; }}
                        />
                    </div>
                </BaseModal>


            </div>



        );
    }
};
AccountDepositWithdraw = BindToChainState(AccountDepositWithdraw);

class DepositStoreWrapper extends React.Component {

    componentWillMount() {
        if (Apis.instance().chain_id.substr(0, 8) === "4018d784") { // Only fetch this when on BTS main net
            GatewayActions.fetchCoins.defer({ backer: "OPEN", url: blockTradesAPIs.BASE_OL + blockTradesAPIs.COINS_LIST }); // Openledger
            GatewayActions.fetchCoins.defer({ backer: "TRADE", url: blockTradesAPIs.BASE + blockTradesAPIs.COINS_LIST }); // Blocktrades
        }
    }

    render() {
        return <AccountDepositWithdraw {...this.props} />;
    }
}

export default connect(DepositStoreWrapper, {
    listenTo() {
        return [AccountStore, SettingsStore, GatewayStore];
    },
    getProps() {
        return {
            account: AccountStore.getState().currentAccount || AccountStore.getState().passwordAccount,
            viewSettings: SettingsStore.getState().viewSettings,
            openLedgerBackedCoins: GatewayStore.getState().backedCoins.get("OPEN", []),
            blockTradesBackedCoins: GatewayStore.getState().backedCoins.get("TRADE", [])
        };
    }
});