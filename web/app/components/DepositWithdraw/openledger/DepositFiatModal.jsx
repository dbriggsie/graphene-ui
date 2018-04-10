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
import DepositFiatDone from "./DepositFiatDone";
import LoadingIndicator from "components/LoadingIndicator";
import moment from "moment";
import { EquivalentValueComponent } from "components/Utility/EquivalentValueComponent";
import FiatApi from "api/FiatApi";
import AssetImage from "components/Utility/AssetImage";

const DEFAULT_DEP_DATA = {
    fees: {
        fee_share_dep: 0.0,
        fee_min_val_dep: 0
    }
};

class DepositFiatModal extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired,
        asset: ChainTypes.ChainAsset.isRequired,
        inputCoin: React.PropTypes.string.isRequired,
        outputCoinName: React.PropTypes.string.isRequired,
        balance: ChainTypes.ChainObject
    };

    static defaultProps = {
        outputCoinName: "CNY",
        inputCoin: "RMBPAY"
    };

    constructor(props) {
        super(props);

        this.state = {
            requestsCounter: 0,
            userServiceId: "",
            memo: "",
            from_account: props.account,
            fee_asset_id: "1.3.0",
            feeStatus: {},
            qrLoaded: false,
            tokenAmount: 0,
            loading: true,
            depositData: DEFAULT_DEP_DATA,
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
        return /^((\s*|[1-9][0-9]*\.?[0-9]{0,2})|(0|(0\.)[0-9]{0,2}))$/.test(value);
    }

    _validateInteger(value) {
        return /^(\s*|[1-9][0-9]*)$/.test(value);
    }

    onDepositAmountChange({ amount }) {
        if (amount !== undefined) {
            if (!this._validateFloat(amount) || amount.length > 15) {
                return
            }
            const fees = this.state.fees || {
                fee_share_dep: 0,
                fee_min_val_dep: 0
            }
            let fee = amount * fees.fee_share_dep
            fee = fees.fee_min_val_dep > fee ? fees.fee_min_val_dep : fee
            fee = this._round(parseFloat(fee), 2)
            let amountWithFee = amount > fee ? parseFloat(amount) - fee : 0

            this.setState({
                depositAmount: amount,
                depositEmpty: false,
                tokenAmount: this._round(amountWithFee, 4),
                fee: parseFloat(fee)
            }, () => {
                this._validateDepositAmount()
                this._validateDepositEmpty()
            })
        }
    }

    _round(value, fixed) {
        value = this._fixFloatPrecision(value)
        fixed = fixed || 0
        fixed = Math.pow(10, fixed)
        return Math.floor(this._fixFloatPrecision(value * fixed)) / fixed
    }

    _fixFloatPrecision(value) {
        const rounded = value.toFixed(4)
        if (Math.abs(rounded - value) < 0.00001) {
            value = rounded
        }
        return +value
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

        const depositValid = !depositAmount || parseFloat(depositAmount) >= parseFloat(+fee + 1);
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

    _validateCaptchaEmpty() {
        const captchaText = this.refs.captchaInput.value;
        const emptyCaptchaError = captchaText.length == 0 || captchaText == undefined;

        this.setState({
            emptyCaptchaError: emptyCaptchaError
        });
    }

    _checkInputEmpty() {
        this._validateDepositEmpty();
        this.state.paymentService && this._validateServiceEmpty();
        this.state.captchaUrl && this._validateCaptchaEmpty();
    }

    onOpen() {
        this._fetchDepositData();
    }

    onSubmit() {
        let promise = new Promise((resolve, reject) => {
            resolve(this._checkInputEmpty());
        });

        promise.then(response => {
            if (!this.state.depositEmpty
                && !this.state.invalidAddressMessage
                && !this.state.depositAmountError
                && !this.state.emptyCaptchaError) {
                this._sendDeposit();
            }
        })
    }

    _fetchDepositData() {
        FiatApi.getDepositData({
            //temporary for testing
            currencyName: this._getCurrencyName(this.props.inputCoin),
            accountName: this.props.account.get("name"),
            accountId: this.props.account.get("id")
        }).then((data) => {
            this.setState({ ...data });
            this._handleResponse(false);
        }).catch((error) => {
            this._handleResponse(true);
        });
    }

    _handleResponse(isError) {
        this.setState({
            serverError: isError,
            loading: false
        });
    }

    _getCurrencyName(name) {
        return name.indexOf("OPEN") > -1 ? name.substring(5, name.length) : name;
    }

    _sendDeposit() {
        this.setState({
            loading: true
        });
        const fees = this.state.fees;
        const service = this.state.paymentService;

        FiatApi.addDeposit({
            captcha: this.refs.captchaInput ? this.refs.captchaInput.value : 0,
            token: this.state.token,
            depositAmount: this.state.depositAmount,
            fee: this.state.fee,
            tokenAmount: this.state.tokenAmount,
            accountName: this.props.account.get("name"),
            accountId: this.props.account.get("id"),
            currencyName: this._getCurrencyName(this.props.inputCoin),
            serviceId: service && service.id,
            fees: fees,
            userServiceId: this.state.userServiceId
        }).then((data) => {
            this.setState({ ...data });
            this._handleResponse(false);
        }).catch((error) => {
            this._handleResponse(true);
        });
    }

    onClose() {
        ZfApi.publish(this.props.modal_id, "close");
        this._resetState();
    }

    _resetState() {
        this.setState({
            unlockTime: null,
            depositAmount: undefined,
            userServiceId: "",
            invalidAddressMessage: false,
            depositData: DEFAULT_DEP_DATA,
            emptyCaptchaError: false,
            depositEmpty: false,
            depositAmountError: false,
            tokenAmount: 0,
            depositDone: false,
            qrLoaded: false,
            serverError: false,
            maxRequestsError: false,
            wrongCaptchaError: false,
            loading: true,
            fee: 0.00,
            paymentService: null
        });
        if (this.refs.captchaInput) {
            this.refs.captchaInput.value = "";
        }
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
        const fees = this.state.fees;
        const minAmount = fees && +fees.fee_min_val_dep + 1;
        const captchaUrl = this.state.captchaUrl;

        const precision = utils.get_asset_precision(this.props.asset.get("precision"));

        const isRmbpay = this.props.inputCoin === "RMBPAY";
        return (
            <div>
                <div className="text-center asset-header">
                    <h4><AssetImage assetName={this.props.inputCoin} style={{ width: "28px" }} /> {this.props.inputCoin}</h4>
                </div>
                <div className={this._isDisabled() ? "disabled-form" : ""}>

                    {this.state.loading && <LoadingIndicator />}
                    <div className="content-block">
                        <Translate component="div"
                            className="left-label"
                            content="gateway.rmbpay.amount_to_deposit"
                        />
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
                            className={!this.state.depositAmountError ? "mt_2 mb_5 help-text fz_13" : "mt_2 mb_5 color-danger fz_13"}
                            content="gateway.rmbpay.deposit_min_amount"
                            fee={minAmount}
                            assetName={this.props.outputCoinName}
                        /> : null}
                        {this.state.depositEmpty && <Translate component="div" className="mt_2 mb_5 color-danger fz_13" content="gateway.rmbpay.error_emty" />}
                    </div>

                    {/* Fee selection */}

                    <div className="content-block ">
                        <div className="gate_fee left-label">
                            <Translate component="span" content="gateway.transwiser.fee_deposit" />
                        </div>
                        <div className="gate_fee text-right">
                            {this.state.fee} {this.props.outputCoinName}
                        </div>
                    </div>

                    <div>
                        <div className="gate_fee left-label">
                            <Translate component="span" content="gateway.rmbpay.tokens_receive" />
                        </div>
                        <div className="gate_fee text-right light-text">
                            {this.state.tokenAmount} {this.props.inputCoin}
                        </div>
                        {
                            <div className={"text-right help-text mb_6" + (isRmbpay ? "" : " hidden")}>
                                ≈ <EquivalentValueComponent
                                    fullPrecision={true}
                                    fromAsset="1.3.113"
                                    toAsset="1.3.861"
                                    amount={this.state.tokenAmount * precision}
                                    hide_asset={true}
                                /> BTC
                            </div>
                        }
                    </div>


                    {/*Payment service ID*/}
                    {this.state.paymentService && <div>
                        <label className="left-label">
                            <Translate component="span" content="gateway.pay_service_alipay" />
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
                        {<Translate component="div" className={"mt_2 mb_5 color-danger fz_13 " + (!this.state.invalidAddressMessage && "hidden")} content="gateway.rmbpay.error_emty" />}
                    </div>}

                    {/*Captcha*/}

                    {captchaUrl &&
                        <div>
                            <div className="mb_6">
                                <img className="rounded" src={captchaUrl} alt="OL" />
                            </div>
                            <div className="blocktrades-select-dropdown">
                                <div className="inline-label">
                                    <input
                                        type="text"
                                        name="captcha"
                                        ref="captchaInput"
                                        onChange={this._validateCaptchaEmpty.bind(this)}
                                    />
                                </div>
                            </div>
                            {!(this.state.emptyCaptchaError || this.state.wrongCaptchaError) && <Translate component="div"
                                className="mt_2 mb_5 help-text fz_13"
                                content="gateway.rmbpay.captcha_label"
                            />}
                            {this.state.emptyCaptchaError && !this.state.wrongCaptchaError && <Translate component="div"
                                className="mt_2 mb_5 color-danger fz_13 "
                                content="gateway.rmbpay.error_emty"
                            />}
                            {this.state.wrongCaptchaError && <Translate component="div"
                                className="mt_2 mb_5 color-danger fz_13"
                                content="gateway.rmbpay.wrong_captcha_error"
                            />}
                        </div>
                    }
                </div>

                {/* Request Deposit/Cancel buttons */}

                <div className="mt_6 help-text content-block">
                    {isRmbpay && `${moment().utc().add(8, "h").format("YYYY-MM-DD HH-mm")} (UTC+8)`}
                </div>
                <div className="buttons-block-center">
                    <div onClick={this.onSubmit.bind(this)} className={"button " + (this._isDisabled() ? "disabled" : "")} >
                        <Translate content="gateway.rmbpay.btn_request_deposit" />
                    </div>
                    <div className="button cancel" onClick={this.onClose.bind(this)} >
                        <Translate content="account.perm.cancel" />
                    </div>
                </div>
            </div>);
    }

    _renderDepositDone() {
        return (
            <DepositFiatDone
                coinName={this.props.outputCoinName}
                depositAmount={this.state.depositAmount}
                qrCodeLink={this.state.qrUrl}
                modalId={this.props.modal_id}
                linkInvoice={this.state.link_invoice}
                email={this.state.email}
            />
        )
    }

    _isDisabled() {
        return this.state.loading || this.state.serverError || this.state.unlockTime;
    }

    render() {
        const unlockTime = moment(this.state.unlockTime).format("YYYY-MM-DD HH-mm");
        return (
            <div>
                <form className="grid-block vertical full-width-content form-deposit-withdraw-rmbpay" >
                    <div className="grid-container">
                        <div className="modal-filled-header">
                            <h3><Translate content="gateway.deposit" /></h3>
                        </div>
                        <div className="modal-body">
                            {this._isDisabled() &&
                                this.state.serverError ? <div className="center-content content-block"> <Translate className="has-error" content="gateway.service_unavailable" /></div> :
                                (this.state.unlockTime && <div className="center-content content-block"><Translate className="has-error" unsafe content="gateway.rmbpay.max_requests_error"
                                    date={unlockTime}
                                /></div>)
                            }
                            <div>
                                {this.state.depositDone ? this._renderDepositDone() : this._renderDepositeForm()}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        );
    }
};

export default BindToChainState(DepositFiatModal, { keep_updating: true });