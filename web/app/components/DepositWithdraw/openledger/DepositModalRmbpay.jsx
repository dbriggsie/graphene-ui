import React from "react";
import Trigger from "react-foundation-apps/src/trigger";
import Translate from "react-translate-component";
import ChainTypes from "components/Utility/ChainTypes";
import BindToChainState from "components/Utility/BindToChainState";
import utils from "common/utils";
import BalanceComponent from "components/Utility/BalanceComponent";
import counterpart from "counterpart";
import AmountSelector from "components/Utility/AmountSelector";
import AccountActions from "actions/AccountActions";
import { validateAddress, WithdrawAddresses } from "common/blockTradesMethods";
import { ChainStore } from "bitsharesjs/es";
import Modal from "react-foundation-apps/src/modal";
import { checkFeeStatusAsync, checkBalance } from "common/trxHelper";
import { Asset } from "common/MarketClasses";
import { debounce } from "lodash";
import SettingsActions from "actions/SettingsActions";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import DepositRmbpayQr from "./DepositRmbpayQr";
import LoadingIndicator from "components/LoadingIndicator";

let qrCode = '/app/assets/getCode.png';
const serverUrl = "https://test-cny.openledger.info/api/v1";

class DepositModalRmbpay extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired,
        issuer: ChainTypes.ChainAccount.isRequired,
        asset: ChainTypes.ChainAsset.isRequired,
        output_coin_name: React.PropTypes.string.isRequired,
        output_coin_symbol: React.PropTypes.string.isRequired,
        output_coin_type: React.PropTypes.string.isRequired,
        url: React.PropTypes.string,
        output_wallet_type: React.PropTypes.string,
        amount_to_withdraw: React.PropTypes.string,
        balance: ChainTypes.ChainObject
    };

    constructor(props) {
        super(props);

        this.state = {
            withdraw_address: "",
            withdraw_address_check_in_progress: true,
            withdraw_address_is_valid: null,
            options_is_valid: false,
            confirmation_is_valid: false,
            userServiceId: '',
            memo: "",
            withdraw_address_first: true,
            from_account: props.account,
            fee_asset_id: "1.3.0",
            feeStatus: {},
            qrLoaded: false,
            tokenAmount: 0,
            loading: true,
            depositData: {
                list_service: [{
                    name: "Alipay",
                    link_qr_code: ""
                }],
                fees: {
                    fee_share_dep: 0.0,
                    fee_min_val_dep: 0
                }
            },
            fee: 0.00
        };
        this._validateDepositAmount = this._validateDepositAmount.bind(this);
        this._checkInputEmpty = this._checkInputEmpty.bind(this);
        this.onDepositAmountChange = this.onDepositAmountChange.bind(this);
    }

    componentWillUnmount() {
        this.unMounted = true;
    }

    componentWillReceiveProps(np) {
        if (np.account !== this.state.from_account
            && np.account !== this.props.account) {
            this.setState({
                from_account: np.account,
                feeStatus: {},
                fee_asset_id: "1.3.0"
            });
        }
    }

    componentDidMount() {
        ZfApi.subscribe(this.props.modal_id, (name, msg) => {
            if (msg === "close") {
                this._resetState();
            }
        });
    }

    _validateFloat(value) {
        return /^(\s*|[1-9][0-9]*\.?[0-9]*)$/.test(value);
    }

    _validateInteger(value) {
        return /^(\s*|[1-9][0-9]*)$/.test(value);
    }

    onDepositAmountChange({ amount }) {
        if (amount !== undefined) {
            if (!this._validateFloat(amount) || amount.length > 15) {
                return
            }
            const fees = this.state.depositData.fees || {
                fee_share_dep: 0,
                fee_min_val_dep: 0
            }
            let fee = amount * fees.fee_share_dep / 100
            fee = fees.fee_min_val_dep > fee ? fees.fee_min_val_dep : fee
            fee = parseFloat(fee)
            let amountWithFee = amount > fee ? parseFloat(amount) - fee : 0

            this.setState({
                depositAmount: amount,
                depositEmpty: false,
                tokenAmount: amountWithFee,
                fee: parseFloat(fee).toFixed(2)
            }, () => {
                this._validateDepositAmount()
                this._validateDepositEmpty()
            })
        }
    }

    onWithdrawAddressChanged(e) {
        let value = e.target.value;
        if (value != undefined && value.length > 50) {
            return false;
        }
        this.setState({
            invalidAddressMessage: false,
            userServiceId: value
        }, this._validateServiceEmpty)
    }

    _validateDepositAmount() {
        const depositAmount = this.refs.amountDeposit.props.amount;
        const { fee } = this.state;

        const depositValid = !depositAmount || parseFloat(depositAmount) > parseFloat(fee);
        this.setState({
            depositAmountError: !depositValid
        });
        return depositValid;
    }

    _validateDepositEmpty() {
        const depositAmount = this.refs.amountDeposit.props.amount;
        this.setState({
            depositEmpty: !depositAmount
        });
    }

    _validateServiceEmpty() {
        const inputService = this.refs.paymentId.value;
        const statusInputSevice = inputService.length == 0 || inputService == undefined;

        this.setState({
            invalidAddressMessage: statusInputSevice
        });
    }

    _checkInputEmpty() {
        this._validateDepositEmpty();
        this._validateServiceEmpty();
    }

    onSubmit() {
        let promise = new Promise((resolve, reject) => {
            resolve(this._checkInputEmpty());
        });

        promise.then(response => {
            if ((!this.state.depositEmpty) && (!this.state.invalidAddressMessage) && (!this.state.depositAmountError)) {
                this._sendDeposit();
            }
        })
    }

    fetchDepositData() {
        fetch(serverUrl, { //TODO: change URL
            method: 'POST',
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                operation_name: "deposit",
                action: "get_data",
                data: {
                    currency_name_id: "bitcoin",//TODO: change currency
                    account_ol: this.props.account.get("name")
                }
            })
        }).then(
            response => {
                if (response.status !== 200) {
                    throw "Request failed";
                }
                response.json().then((data) => {
                    if (data.error === "true") {
                        throw "Request failed";
                    }
                    this.setState({
                        depositData: data
                    });
                    this._handleRmbPay(false);
                });
            }).catch(() => {
            this._handleRmbPay(true);
        });
    }

    _handleRmbPay(isError) {
        this.setState({
            serverError: isError,
            loading: false
        });
    }

    _sendDeposit() {
        this.setState({
            loading: true
        });
        const fees = this.state.depositData.fees;
        const service = this.state.depositData.list_service
            && this.state.depositData.list_service[0] || {};
        fetch(serverUrl, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                operation_name: "deposit",
                action: "add",
                data: {
                    dep_amount: this.state.depositAmount,
                    dep_fee: this.state.fee,
                    dep_receive_amount_from_user: this.state.tokenAmount,
                    account_ol: this.props.account.get("name"),
                    currency_name_id: "bitcoin", //TODO: change
                    services_id: service.id,
                    user_service_id: this.state.userServiceId,
                    fees: {
                        "fee_share_dep": fees && fees.fee_share_dep,
                        "fee_min_val_dep": fees && fees.fee_min_val_dep
                    }
                }
            })
        }).then(
            response => {
                if (response.status !== 200) {
                    throw "Request failed";
                }
                response.json().then((data) => {
                    if (response.status !== 200 || data.error === "true") {
                        throw "Request failed";
                    }
                    this.setState({
                        showQr: true
                    });
                    this._handleRmbPay(false);
                });
            }).catch(() => {
            this._handleRmbPay(true);
        });
    }

    onClose() {
        ZfApi.publish(this.props.modal_id, "close");
        this._resetState();
    }

    _resetState() {
        this.setState({
            depositAmount: undefined,
            userServiceId: "",
            invalidAddressMessage: false,
            depositEmpty: false,
            depositAmountError: false,
            tokenAmount: 0,
            showQr: false,
            qrLoaded: false,
            serverError: false,
            loading: true,
            fee: 0.00
        });
    }

    _renderDepositeForm() {
        let { userServiceId, memo } = this.state;
        let balance = null;
        let options = null;
        let tabIndex = 1;

        const disableSubmit =
            this.state.error ||
            this.state.depositAmountError ||
            !this.state.depositAmount;
        const paymentService = this.state.depositData.list_service
            && this.state.depositData.list_service[0]
            || {};
        const fees = this.state.depositData.fees;
        const minFee = fees && fees.fee_min_val_dep;

        return (
            <div>
                <div className="content-block">
                    <div className="left-label">Amount to Deposit</div>
                    <AmountSelector
                        amount={this.state.depositAmount}
                        asset={this.props.asset.get("id")}
                        assets={[this.props.asset.get("id")]}
                        placeholder=""
                        onChange={this.onDepositAmountChange}
                        display_balance={balance}
                        checkText={true}
                        ref="amountDeposit"
                    />
                    {!this.state.depositEmpty ? <Translate component="div"
                                                           className={!this.state.depositAmountError ? "mt_2 mb_5 color-gray fz_14" : "mt_2 mb_5 color-danger fz_14"}
                                                           content="gateway.rmbpay.deposit_min_amount"
                                                           fee={minFee}
                    /> : null}
                    {this.state.depositEmpty ? <p className="has-error no-margin" style={{ paddingTop: 10 }}><Translate content="gateway.rmbpay.error_emty" />
                    </p> : null}
                </div>

                {/* Fee selection */}
                <div className="content-block ">
                    <div className="gate_fee left-label"><Translate component="span" content="gateway.transwiser.fee_deposit" /></div>
                    <div className=" gate_fee text-right color_white">
                        {this.state.fee}
                    </div>
                </div>


                <div>
                    <label className="left-label">
                        <Translate component="span" content="gateway.rmbpay.tokens_receive" />
                    </label>
                    <div className="content-block input-wrapper">
                        <input type="text" disabled value={this.state.tokenAmount.toFixed(2)} />
                        <div className="form-label select floating-dropdown color_white">
                            <div className="dropdown-wrapper inactive">
                                <div>RMBPAY</div>
                            </div>
                        </div>
                    </div>
                </div>


                {/*Payment service ID*/}
                <div className="content-block">
                    <label className="left-label">
                        <Translate component="span" content="gateway.pay_service" />
                        ({paymentService.name})
                    </label>
                    <div className="blocktrades-select-dropdown">
                        <div className="inline-label">
                            <input type="text"
                                   value={userServiceId}
                                   tabIndex="4"
                                   onChange={this.onWithdrawAddressChanged.bind(this)}
                                   ref="paymentId"
                                   autoComplete="off"
                            />
                        </div>
                    </div>

                    {this.state.invalidAddressMessage ? <p className="has-error no-margin" style={{ paddingTop: 10 }}><Translate content="gateway.rmbpay.error_emty" />
                    </p> : null}
                </div>

                {/* Request Deposit/Cancel buttons */}
                <div className="button-group float-right">
                    <div onClick={this.onSubmit.bind(this)} className="button" >
                        <Translate content="gateway.rmbpay.btn_request_deposit" />
                    </div>
                    <div className="button" onClick={this.onClose.bind(this)} ><Translate content="account.perm.cancel" /></div>
                </div>
            </div>);
    }

    _renderQR() {
        const logoAliPay = '/app/assets/logoAlipay.png';
        const service = this.state.depositData.list_service
            && this.state.depositData.list_service[0];
        return (
            <DepositRmbpayQr
                coinName={this.props.output_coin_name}
                depositAmount={this.state.depositAmount}
                qrCodeLink={service && service.link_qr_code}
                modal_id={this.props.modal_id}
            />
        )
    }

    render() {
        const disable = this.state.loading || this.state.serverError;
        return (
            <div>
                <form className="grid-block vertical full-width-content form-deposit-withdraw-rmbpay" >
                    <div className="grid-container">
                        <div className="content-block">
                            <h3><Translate content="gateway.deposit_coin" coin={this.props.output_coin_name} symbol={this.props.output_coin_symbol} /></h3>
                        </div>
                        {disable && <div className="center-content content-block">
                            {this.state.serverError ?
                                <Translate className="has-error" content="gateway.service_unavailable" /> : <LoadingIndicator />
                            }
                        </div>}
                        <div className={disable ? "disabled-form" : ""}>
                            {this.state.showQr ? this._renderQR() : this._renderDepositeForm()}
                        </div>

                    </div>
                </form>
            </div>
        );
    }
};

export default BindToChainState(DepositModalRmbpay, { keep_updating: true });
