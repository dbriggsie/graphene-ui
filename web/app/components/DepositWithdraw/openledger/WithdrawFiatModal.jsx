import React from "react"
import Trigger from "react-foundation-apps/src/trigger"
import Translate from "react-translate-component"
import ChainTypes from "components/Utility/ChainTypes"
import BindToChainState from "components/Utility/BindToChainState"
import utils from "common/utils"
import BalanceComponent from "components/Utility/BalanceComponent"
import counterpart from "counterpart"
import AmountSelector from "components/Utility/AmountSelector"
import AccountActions from "actions/AccountActions"
import { validateAddress, WithdrawAddresses } from "common/blockTradesMethods"
import { ChainStore } from "bitsharesjs/es"
import Modal from "react-foundation-apps/src/modal"
import { checkFeeStatusAsync, checkBalance } from "common/trxHelper"
import { Asset } from "common/MarketClasses"
import { debounce } from "lodash"
import ZfApi from "react-foundation-apps/src/utils/foundation-api"
import Icon from "components/Icon/Icon"
import LoadingIndicator from "components/LoadingIndicator"
import moment from "moment"
import AssetImage from "components/Utility/AssetImage";
import SettingsStore from "stores/SettingsStore";

const SERVER_URL = `${SERVER_ADMIN_URL}/api/v1`
const BTS_ASSET_ID = "1.3.0"
const CNY_ASSET_ID = "1.3.113"
const UNLOCK_MODAL_ID = "unlock_wallet_modal2"
const TRANSACTION_EVENT_ID = "transaction-action"

class WithdrawFiatModal extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired,
        issuer_account: ChainTypes.ChainAccount.isRequired,
        asset: ChainTypes.ChainAsset.isRequired,
        outputCoin: ChainTypes.ChainAsset.isRequired,
        url: React.PropTypes.string,
        output_wallet_type: React.PropTypes.string,
        amount_to_withdraw: React.PropTypes.string,
        balance: ChainTypes.ChainObject
    }

    constructor(props) {
        super(props)

        this.state = {
            withdraw_address_is_valid: null,
            options_is_valid: false,
            confirmation_is_valid: false,
            empty_withdraw_value: false,
            empty_withdraw_value_receive: false,
            from_account: props.account,
            fee_asset_id: props.asset.get("id"),
            feeStatus: {},
            isWithdrawAction: true,

            tokenAmount: 0,
            fee_rmbpay_withdraw: 0.02,
            fees: {
                fee_min_val_withd: 0,
                fee_share_withd: 0
            },
            gateFee: 0.00,
            loading: true,
            balanceError: false,

            takenFromAmount: false,
            amountError: false,

            formErrors: {}
        };
        this._refsListVesna = ["bankName", "bicCode", "transitNumber", "bankAddr", "beneficiarNumber", "beneficiarName"]

        this._checkBalance = this._checkBalance.bind(this)
        this._updateFee = debounce(this._updateFee.bind(this), 250)

        this._transactionListener = this._transactionListener.bind(this)
        this._modalListener = this._modalListener.bind(this)
    }

    _transactionListener(name, msg) {
        if (msg === "cancel" || msg === "close") {
            this.setState({
                loading: false
            })
        }
    }

    componentWillMount() {
        this._updateFee()
        this._checkFeeStatus()
    }

    componentWillUnmount() {
        this.unMounted = true
    }

    componentWillReceiveProps(np) {
        if (np.account !== this.state.from_account && np.account !== this.props.account || np.asset.get("id") !== this.props.asset.get("id")) {
            this.setState({
                from_account: np.account,
                feeStatus: {},
                fee_asset_id: np.asset.get("id"),
                feeAmount: new Asset({ amount: 0 })
            }, () => {
                this._updateFee()
                this._checkFeeStatus()
            })
        }
    }

    fetchWithdrawData() {
        this._checkBalance();
        fetch(SERVER_URL + "/withdrawal/get_data", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                currency_name_id: this.props.asset.get("symbol"),
                account_ol: this.props.account.get("name"),
                account_id: this.props.account.get("id")
            })
        }).then(
            response => {
                if (response.status !== 200) {
                    throw "Request failed";
                }
                response.json().then((data) => {
                    if (data.success !== "true") {
                        throw "Request failed";
                    }
                    this.setState({
                        fees: data.fees,
                        service: data.list_service && data.list_service[0]
                    }, this._checkBalance);
                    this._handleRmbPayResponse(false);
                });
            }).catch(() => {
                this._handleRmbPayResponse(true);
            });
    }

    _sendWithdrawAudit() {
        const fees = this.state.fees;
        const data = {
            withd_amount: this.state.isWithdrawAction ? this.state.withdrawAmount : this.state.quantity,
            withd_fee: this.state.gateFee,
            withd_receive_amount_to_user: this.state.isWithdrawAction ? this.state.tokenAmount : this.state.receiveAmount,
            account_ol: this.props.account.get("name"),
            account_id: this.props.account.get("id"),
            currency_name_id: this.props.asset.get("symbol"),
            services_id: this.state.service && this.state.service.id,
            user_service_id: this.state.userServiceId,
            fees: {
                fee_share_withd: this.state.fees.fee_share_withd,
                fee_min_val_withd: this.state.fees.fee_min_val_withd
            }
        }
        if (this._isFiatVesna()) {
            data.bank_name = this.state.bankName
            data.swift_code = this.state.bicCode
            data.routing_transit_number = this.state.transitNumber
            data.bank_address = this.state.bankAddr
            data.beneficiary_account_number = this.state.beneficiarNumber
            data.beneficiary_name = this.state.beneficiarName
        }
        this.setState({
            loading: true
        });
        fetch(SERVER_URL + "/withdrawal/add", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data)
        }).then(
            response => {
                if (response.status !== 200) {
                    throw "Request failed";
                }
                response.json().then((data) => {
                    if (data.success !== "true") {
                        throw "Request failed";
                    }
                    this._handleRmbPayResponse(false);
                });
            }).catch(() => {
                this._handleRmbPayResponse(true);
            });
    }

    _handleRmbPayResponse(isError) {
        this.setState({
            serverError: isError,
            loading: false
        });
    }

    _updateFee(state = this.state) {
        let { fee_asset_id, from_account } = state
        const { fee_asset_types } = this._getAvailableAssets(state)

        if (fee_asset_types.length === 1 && fee_asset_types[0] !== fee_asset_id) {
            fee_asset_id = fee_asset_types[0]
        }

        if (!from_account) return null
        checkFeeStatusAsync({
            accountID: from_account.get("id"),
            feeID: fee_asset_id,
            options: ["price_per_kbyte"]
        })
            .then(({ fee, hasBalance, hasPoolBalance }) => {
                if (this.unMounted) {
                    return
                }
                this.setState({
                    feeAmount: fee,
                    hasBalance,
                    hasPoolBalance,
                    error: (!hasBalance || !hasPoolBalance)
                }, () => {
                    this._checkBalance()
                    Promise.resolve(this._updateQuantity(this.refs.amountWithdraw.props.amount)).then(() => {
                        const amountWithFee = this._calculateAmountWithFee(this.state.gateFee)
                        this.setState({
                            tokenAmount: this._round(amountWithFee, 2)
                        }, () => {
                            this.refs.amountWithdraw.props.amount && this._validateAmount()
                        })
                    })
                })
            })
    }

    _checkFeeStatus(state = this.state) {
        let account = state.from_account
        if (!account) return

        const { fee_asset_types: assets } = this._getAvailableAssets(state)
        // const assets = ["1.3.0", this.props.asset.get("id")]
        let feeStatus = {}
        let p = []
        assets.forEach(a => {
            p.push(checkFeeStatusAsync({
                accountID: account.get("id"),
                feeID: a,
                options: ["price_per_kbyte"]
            }))
        })
        Promise.all(p).then(status => {
            assets.forEach((a, idx) => {
                feeStatus[a] = status[idx]
            })
            if (!utils.are_equal_shallow(state.feeStatus, feeStatus)) {
                this.setState({
                    feeStatus
                })
            }
            this._checkBalance()
        }).catch(err => {
            console.error(err)
        })
    }

    _validateFloat(value, fixed) {
        return new RegExp(`^((\\s*|[1-9][0-9]*\\.?[0-9]{0,${fixed}})|(0|(0\\.)[0-9]{0,${fixed}}))$`).test(value)
    }

    _validateAlfanumeric(value) {
        return new RegExp(`^([a-zA-Z0-9]+)$`).test(value)
    }

    _validateAlfanumericWithSpecial(value) {
        return new RegExp(`^([a-zA-Z0-9.,&* -#№]+)$`).test(value);
    }

    _validateNumeric(value) {
        return new RegExp(`^([0-9]+)$`).test(value)
    }

    _validateInput(value, validationRule) {
        let validationResult = true;
        switch (validationRule) {
            case "numeric":
                validationResult = this._validateNumeric(value);
                break;
            case "alphanumeric":
                validationResult = this._validateAlfanumeric(value);
                break;
            case "alphanumericSpecial": 
                validationResult = this._validateAlfanumericWithSpecial(value);
            default: break;
        }
        return validationResult;
    }

    onInputChange(e, maxLength) {
        const name = e.target.name;
        const value = e.target.value;
        const validationRule = e.target.dataset.validation;
        if (value && !this._validateInput(value, validationRule)) {
            return;
        }
        const newValue = {};
        newValue[name] = value || "";
        this.setState(newValue, () => {
            this._validateEmptyInput(name)
        });
    }

    _validateEmptyInput(name) {
        const value = this.state[name];
        const errors = this.state.formErrors;
        errors[name] = !value;
        this.setState({
            formErrors: errors
        });
    }

    _getBalance() {
        const precision = utils.get_asset_precision(this.props.asset.get("precision"))
        const balance = this.props.balance ? this.props.balance.get("balance") : 0
        return balance / precision
    }

    _getAmountErrorMessage() {
        const amount = this.state.withdrawAmount
        if (!amount) {
            return {
                message: `gateway.rmbpay.error_emty`
            }
        }
        const balance = this._getBalance();
        if (amount > balance) {
            return {
                message: `gateway.rmbpay.error_min_value`,
                value: balance
            }
        }
        if (amount < +this.state.fees.fee_min_val_withd + 1) {
            return {
                message: `gateway.rmbpay.error_max_value`,
                value: +this.state.fees.fee_min_val_withd + 1
            }
        }
        return false
    }

    _getBlockchainFee() {
        return this.state.feeAmount ? this.state.feeAmount.getAmount({ real: true }) : 0
    }

    _getReceiveAmountErrorMessage() {
        const amount = this.state.receiveAmount
        if (!amount) {
            return {
                message: `gateway.rmbpay.error_emty`
            }
        }
        const balance = this._getBalance()
        const blockChainFee = this._getBlockchainFee()
        const maxValue = this._calculateMaxAmount()
        if (amount > maxValue) {
            return {
                message: `gateway.rmbpay.error_max_receive`,
                value: maxValue
            }
        }
        if (amount < 1) {
            return {
                message: `gateway.rmbpay.error_min_receive`,
                value: 1
            }
        }
        return false
    }


    onWithdrawAmountChange({ amount }) {
        if (this._validateAmounInput(amount, 4)) {
            const amountDigital = amount
            const gateFee = this._calculateGateFee(amountDigital)
            Promise.resolve(this._updateQuantity(amountDigital)).then(() =>
                this.setState({
                    gateFee: gateFee,
                    withdrawAmount: amount,
                    tokenAmount: this._round(this._calculateAmountWithFee(gateFee), 2)
                }, () => this._validateAmount()))
        }
    }

    onReceiveAmountChange({ amount }) {
        if (this._validateAmounInput(amount, 2)) {
            const amountDigital = amount
            const gateFee = this._calculateGateFee(amountDigital)
            Promise.resolve(this._updateQuantity(amountDigital)).then(() =>
                this.setState({
                    gateFee: gateFee,
                    receiveAmount: amount
                  }, () => this._validateAmount()))
        }
    }

    _updateQuantity(amount) {
        const blockChainFee = this._getBlockchainFee()
        let quantity = +amount || 0
        let takenFromAmount = false
        if (this.state.isWithdrawAction) {
            if (this._isFeeSameAsset()) {
                takenFromAmount = +amount + blockChainFee - this._getBalance() > 0
                if (takenFromAmount) {
                    quantity = this._getBalance() - blockChainFee
                }
            }

        } else {
            quantity += this._calculateGateFee(amount)
        }
        return this.setState({
            takenFromAmount: takenFromAmount,
            quantity: this._round(quantity, 4)
        })
    }

    _calculateGateFee(amount, fromFullBalance) {
        const fromTotalNumber = fromFullBalance || this.state.isWithdrawAction
        const fees = this.state.fees || {
            fee_share_withd: 0,
            fee_min_val_withd: 0
        }
        const minFee = +fees.fee_min_val_withd
        const procFee = +fees.fee_share_withd
        const amountWithBlockFee = +amount + (this._isFeeSameAsset() ? this._getBlockchainFee() : 0)
        let gateFee = fromTotalNumber ? amount * procFee : procFee * amountWithBlockFee / (1 - procFee)
        gateFee = gateFee > +minFee ? gateFee : minFee

        return this._round(gateFee, 4)
    }

    _calculateAmountWithFee(gateFee) {
        const { quantity } = this.state
        return +quantity <= gateFee
            ? 0
            : +quantity - gateFee
    }

    _validateAmounInput(amount, fixed) {
        return !(amount === undefined || !this._validateFloat(amount, fixed) || amount.length > 15)
    }

    _checkBalance() {
        //const blockChainFee = this.state.feeAmount ? +this.state.feeAmount.getAmount({ real: true }) : 0;
        const minFee = this.state.fees.fee_min_val_withd
        const balance = this._getBalance()

        if (balance < minFee + 1) {
            this.setState({
                balanceError: true
            })
        }
    }

    _validateVesna() {
        let refsListVesna = this._refsListVesna
        let inputsVesna = this.state.lengthInputVesna

        refsListVesna.forEach((el) => {
            this._validateEmptyInput(el)
        })
    }

    _isFiatVesna() {
        return this.props.asset.get("symbol") == "VESNA.USD" ? true : false
    }

    onSubmit() {
        Promise.all([
            this._validateServiceEmpty(),
            this._validateAmount(),
            this._isFiatVesna() ? this._validateVesna() : true
        ]).then(
            () => {
                const formErrors = this._refsListVesna.some((el) => {
                    return this.state.formErrors[el]
                })
                if (!this.state.amountError && !this.state.invalidAddressMessage && !formErrors) {
                    const quantity = this.state.quantity;
                    const precision = utils.get_asset_precision(this.props.asset.get("precision"));
                    AccountActions.transfer(
                        this.props.account.get("id"),
                        this.props.issuer_account.get("id"),
                        this._fixFloatPrecision(quantity * precision),
                        this.props.asset.get("id"),
                        null,
                        null,
                        this.state.fee_asset_id
                    ).then(() => {
                        this._sendWithdrawAudit()
                        ZfApi.publish(this.props.modalId, "close")
                    }).catch((error) => {
                        console.log(error)
                        ZfApi.publish(this.props.modalId, "close")
                    })
                    this.setState({
                        loading: true
                    })
                }
            });
    }

    onClose() {
        ZfApi.publish(this.props.modalId, "close");
    }

    _resetState() {
        this.setState({
            loading: true,
            balanceError: false,
            isWithdrawAction: true
        })
        this._resetForm()
        if (this._isFiatVesna()) {
            this._clearFormVesna()
        }
    }

    _resetForm() {
        this.setState({
            withdrawAmount: undefined,
            receiveAmount: undefined,
            userServiceId: "",
            invalidAddressMessage: false,
            quantity: 0,
            tokenAmount: 0,
            gateFee: 0.00,
            takenFromAmount: false,
            amountError: false
        })
    }

    onAccountBalance() {
        const { feeAmount } = this.state
        if (Object.keys(this.props.account.get("balances").toJS()).includes(this.props.asset.get("id"))) {
            let total = new Asset({
                amount: this.props.balance ? this.props.balance.get("balance") : 0,
                asset_id: this.props.asset.get("id"),
                precision: this.props.asset.get("precision")
            })

            if (this.state.isWithdrawAction) {
                this.onWithdrawAmountChange({
                    amount: total.getAmount({ real: true })
                })
            }
            else {
                this.onReceiveAmountChange({
                    amount: total.getAmount({ real: true })
                })
            }
        }
    }

    onFeeChanged({ asset }) {
        this.setState({
            fee_asset_id: asset.get("id")
        }, this._updateFee)
    }

    _getAvailableAssets(state = this.state) {
        const { from_account, feeStatus } = state

        function hasFeePoolBalance(id) {
            if (feeStatus[id] === undefined) return true
            return feeStatus[id] && feeStatus[id].hasPoolBalance
        }

        function hasBalance(id) {
            if (feeStatus[id] === undefined) return true
            return feeStatus[id] && feeStatus[id].hasBalance
        }

        let fee_asset_types = []
        if (!(from_account && from_account.get("balances"))) {
            return { fee_asset_types }
        }
        let account_balances = state.from_account.get("balances").toJS()
        fee_asset_types = Object.keys(account_balances).sort(utils.sortID)
        for (let key in account_balances) {
            let asset = ChainStore.getObject(key)
            let balanceObject = ChainStore.getObject(account_balances[key])
            const balance = balanceObject.get("balance")

            if (balanceObject && balance === 0) {
                if (fee_asset_types.indexOf(key) !== -1) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1)
                }
            }

            if (asset) {
                // Remove any assets that do not have valid core exchange rates
                if (asset.get("id") !== BTS_ASSET_ID && !utils.isValidPrice(asset.getIn(["options", "core_exchange_rate"]))) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1)
                }
            }
        }

        fee_asset_types = fee_asset_types.filter(a => {
            return hasBalance(a)
        })

        return { fee_asset_types }
    }

    // -----------------------------------

    onWithdrawAddressChanged(e) {
        let value = e.target.value
        if (value != undefined && value.length > 50) {
            return false
        }
        this.setState({
            invalidAddressMessage: false,
            userServiceId: value
        }, this._validateServiceEmpty)
    }

    _clearFormVesna() {
        let refsListVesna = this._refsListVesna
        const newState = {
            formErrors: {}
        }

        refsListVesna.forEach((el) => {
            newState[el] = ""
        })
        this.setState(newState)
    }

    _validateAmount() {
        const amountError = this.state.isWithdrawAction ? this._getAmountErrorMessage() : this._getReceiveAmountErrorMessage()
        if (amountError) {
            this.setState({
                takenFromAmount: false,
                tokenAmount: 0,
                gateFee: 0,
                quantity: 0
            })
        }
        return this.setState({
            amountError: amountError
        })
    }

    _modalListener(name, msg) {
        if (msg === "close") {
            this._resetState()
        }
    }

    componentDidMount() {
        ZfApi.subscribe(this.props.modalId, this._modalListener)
        ZfApi.subscribe(TRANSACTION_EVENT_ID, this._transactionListener)
        ZfApi.subscribe(UNLOCK_MODAL_ID, this._transactionListener)
    }

    changeActionTab(type) {
        this._resetForm();
        this.setState({
            isWithdrawAction: type
        })
    }

    _validateServiceEmpty() {
        if (this.refs.paymentId) {
            const inputService = this.refs.paymentId.value
            const statusInputSevice = inputService.length == 0 || inputService == undefined;

            return this.setState({
                invalidAddressMessage: statusInputSevice
            })
        }
    }

    _round(value, fixed) {
        value = this._fixFloatPrecision(value)
        fixed = fixed || 0
        fixed = Math.pow(10, fixed)
        return (Math.floor(this._fixFloatPrecision(value * fixed)) / fixed) || 0
    }

    _fixFloatPrecision(value) {
        const rounded = value.toFixed(4)
        if (Math.abs(rounded - value) < 0.00001) {
            value = rounded
        }
        return +value
    }

    _isFeeSameAsset() {
        return this.state.fee_asset_id === this.props.asset.get("id");
    }

    _calculateMaxAmount() {
        const balance = this._getBalance()
        const gateFee = this._calculateGateFee(balance, true)
        let amount = balance - gateFee
        if (this._isFeeSameAsset()) {
            amount -= this._getBlockchainFee()
        }
        if (amount < 0) {
            amount = 0
        }
        return this._round(amount, 2)
    }

    _calculateRecieveTokens() {
        let amount = this.state.quantity
        if (amount) {
            amount += (this._isFeeSameAsset() ? this._getBlockchainFee() : 0)
        }
        return this._round(amount, 4)
    }

    render() {

        let { userServiceId } = this.state
        let { outputCoin, asset } = this.props
        const gateFee = this.state.gateFee

        const showLocation = ["RMBPAY"].indexOf(asset.get("symbol")) > -1

        const minFee = this._round(+this.state.fees.fee_min_val_withd + 1, 2)

        let isWithdrawAction = this.state.isWithdrawAction

        let balance = null

        let account_balances = this.props.account.get("balances").toJS()

        let asset_types = Object.keys(account_balances)

        //let withdrawModalId = this.getWithdrawModalId();
        let options = null

        let services = [{ name: "Alipay" }]

        if (this.state.options_is_valid) {
            options =
                <div className={!storedAddress.length ? "blocktrades-disabled-options" : "blocktrades-options"}>
                    {storedAddress.map(function (name, index) {
                        return <a key={index} onClick={this.onSelectChanged.bind(this, index)}>{name}</a>;
                    }, this)}
                </div>
        }

        let tabIndex = 1

        // Estimate fee VARIABLES
        let { fee_asset_types } = this._getAvailableAssets()

        if (asset_types.length > 0) {
            let current_asset_id = this.props.asset.get("id")
            if (current_asset_id) {
                let current = account_balances[current_asset_id]

                balance = (
                    <span style={{ borderBottom: "#A09F9F 1px dotted" }} className="set-cursor" onClick={this.onAccountBalance.bind(this)}>
                        <Translate component="span" content="transfer.available" />&nbsp;&nbsp;
                        {current ? <BalanceComponent balance={account_balances[current_asset_id]} /> : 0}
                    </span>
                )
            } else
                balance = "No funds"
        } else {
            balance = "No funds"
        }
        const disableSubmit =
            this.state.error ||
            this.state.balanceError ||
            !this.state.withdrawAmount

        const disableForm = this.state.loading || this.state.serverError || this.state.balanceError

        const maxValue = this._calculateMaxAmount()

        const assetId = this.state.isWithdrawAction ? this.props.asset.get("id") : this.props.outputCoin.get("id")
        const assetName = this.state.isWithdrawAction ? this.props.asset.get("symbol") : this.props.outputCoin.get("symbol")

        return (
            <div>
                <form className="grid-block vertical full-width-content form-deposit-withdraw-rmbpay">
                    <div className="grid-container">
                        <div className="modal-filled-header">
                            <Translate component="h3" content="gateway.withdraw"></Translate>
                        </div>
                        <div className="modal-body">
                            <div className="text-center asset-header">
                                <h4><AssetImage assetName={this.props.asset.get("symbol")} style={{ width: "28px", marginRight: "5px" }} />{asset.get("symbol")}</h4>
                            </div>
                            {(this.state.balanceError || this.state.serverError) &&
                                <div className="content-block left-label">
                                    {this.state.balanceError && <Translate component="div" className="mt_5 mb_5 color-danger" unsafe content="gateway.rmbpay.not_enaught_balance" />}
                                    {this.state.serverError && <Translate component="div" unsafe className="mt_5 mb_5 color-danger" content="gateway.service_unavailable" />}
                                </div>
                            }
                            {/* {this.state.loading} */}
                            <div className={disableForm ? "disabled-form" : null}>
                                {this.state.loading && <LoadingIndicator />}
                                <div style={{ paddingBottom: 10 }}>
                                    <div className="mb_6" onClick={() => this.changeActionTab(true)}>
                                        <input type="radio" id="withdraw-radio" checked={isWithdrawAction} name="radio-group" className="point-radio" />
                                        <label htmlFor="withdraw-radio">
                                            <Translate unsafe content="gateway.rmbpay.withdrawal_modal.withdraw_amount" assetName={asset.get("symbol")} />
                                        </label>
                                    </div>
                                    <div className="mb_6" onClick={() => this.changeActionTab(false)}>
                                        <input type="radio" id="receive-radio" checked={!isWithdrawAction} name="radio-group" className="point-radio" />
                                        <label htmlFor="receive-radio">
                                            <Translate unsafe content="gateway.rmbpay.withdrawal_modal.receive_amount" assetName={outputCoin.get("symbol")} />
                                        </label>
                                    </div>
                                </div>

                                {/* Withdraw amount */}

                                <div >
                                    <div className="mb-1-5">
                                        <AmountSelector label={isWithdrawAction ? "gateway.rmbpay.withdrawal_modal.amount_withdraw" : "gateway.rmbpay.withdrawal_modal.amount_receive"}
                                            amount={isWithdrawAction ? this.state.withdrawAmount : this.state.receiveAmount}
                                            asset={assetId}
                                            assets={[assetId]}
                                            placeholder=""
                                            onChange={isWithdrawAction ? this.onWithdrawAmountChange.bind(this) : this.onReceiveAmountChange.bind(this)}
                                            ref="amountWithdraw"
                                            display_balance={this.state.isWithdrawAction && balance}
                                        />
                                        {!this.state.amountError && (
                                            this.state.isWithdrawAction ? <Translate component="div" className="mt_2 mb_5 help-text fz_13" content="gateway.rmbpay.error_max_value" val={+minFee} assetName={assetName} />
                                                : <Translate component="div" className="mt_2 mb_5 help-text fz_13" content="gateway.rmbpay.error_max_receive" val={+maxValue} assetName={assetName} />
                                        )}
                                        {this.state.amountError && <Translate component="div" className="mt_2 mb_5 color-danger fz_13 " content={this.state.amountError.message} val={+this.state.amountError.value} assetName={assetName} />}
                                    </div>

                                    <div className="block-inline">
                                        {/* Fee Blockchain selection */}
                                        {this.state.feeAmount ? <div className="mb-1-5 medium-6" >
                                            <label className="left-label">
                                                <Translate content="gateway.rmbpay.withdrawal_modal.fee_blockchain" />

                                                <span data-html={true} data-tip={this.state.isWithdrawAction ? ((this.state.takenFromAmount
                                                    ? counterpart.translate("tooltip.withdraw_take_from_amount")
                                                    : "")
                                                    + counterpart.translate("tooltip.withdraw_blockchain_fee")) : counterpart.translate("tooltip.receive_blockchain_fee")} className="inline-block tooltip" style={{ paddingLeft: "7px" }}>
                                                    <Icon className="icon-14px" name={this.state.takenFromAmount ? "info-warn" : "info"} />
                                                </span>
                                            </label>
                                            <AmountSelector
                                                label={null}
                                                disabled={true}
                                                amount={this.state.feeAmount.getAmount({ real: true })}
                                                onChange={this.onFeeChanged.bind(this)}
                                                asset={this.state.fee_asset_id}
                                                assets={fee_asset_types}
                                                tabIndex={tabIndex++}
                                                startListCurrency={asset.get("symbol")}
                                                scrollLength={5}
                                            />
                                            {(!this.state.hasBalance && !this.state.balanceError) ? <Translate component="div" className="mt_2 mb_5 color-danger fz_13" content="transfer.errors.noFeeBalance" /> : null}
                                            {!this.state.hasPoolBalance ? <Translate component="div" className="mt_2 mb_5 color-danger fz_13" content="transfer.errors.noPoolBalance" /> : null}
                                        </div> : null}

                                        {/* Gate fee withdrawal*/}

                                        <div className="mb-1-5 right-selector medium-6">
                                            <label className="left-label">
                                                <Translate content="gateway.rmbpay.withdrawal_modal.fee_withdraw" />
                                                <span data-tip={counterpart.translate("tooltip.withdraw_fee")} className="inline-block tooltip" style={{ paddingLeft: "7px" }}>
                                                    <Icon className="icon-14px" name="info" />
                                                </span>
                                            </label>
                                            <div className="inline-label input-wrapper">
                                                <input type="text" disabled value={gateFee} />

                                                <div className="form-label select floating-dropdown">
                                                    <div className="dropdown-wrapper inactive">
                                                        <div>{this.props.asset.get("symbol")}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>


                                        <div className="mb-1-5 medium-6 left-label">
                                            <Translate content={isWithdrawAction ? "gateway.rmbpay.withdrawal_modal.amount_receive" : "gateway.rmbpay.withdrawal_modal.amount_withdraw"} />
                                        </div>
                                        <div className="mb-1-5 medium-6 text-right light-text">
                                            {isWithdrawAction ? `${this.state.tokenAmount} ${outputCoin.get("symbol")}` : `${this._calculateRecieveTokens()} ${asset.get("symbol")}`}
                                        </div>
                                    </div>


                                    {(() => {
                                        switch (asset.get("symbol")) {
                                            case "RMBPAY":
                                                return (
                                                    <div className="medium-12">
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
                                                                    autoComplete="off" />
                                                            </div>
                                                            {<Translate component="div"
                                                                className={"mt_2 mb_5 color-danger fz_13 " + (!this.state.invalidAddressMessage && "hidden")}
                                                                content="gateway.rmbpay.error_emty" />}
                                                        </div>
                                                    </div>)
                                                break;

                                            case "VESNA.USD":
                                                return (<div className="row validForm">
                                                    <div className="medium-12">
                                                        <label className="left-label">
                                                            <Translate component="span" content="gateway.usd_vesna.bankName" />
                                                        </label>
                                                        <div className="blocktrades-select-dropdown">
                                                            <div className="inline-label">
                                                                <input type="text"
                                                                    value={this.state.bankName || ""}
                                                                    tabIndex="4"
                                                                    onChange={this.onInputChange.bind(this)}
                                                                    name="bankName"
                                                                    data-validation="alphanumericSpecial"
                                                                    autoComplete="off"
                                                                    maxLength={200} />
                                                            </div>
                                                            {<Translate component="div"
                                                                className={"mt_2 mb_5 color-danger fz_13 validEmpty" + (!this.state.formErrors.bankName ? " hidden" : "")}
                                                                content="gateway.rmbpay.error_emty" />}
                                                        </div>
                                                    </div>
                                                    <div className="block-inline">
                                                        <div className="medium-6">
                                                            <label className="left-label">
                                                                <Translate component="span" content="gateway.usd_vesna.bankCode" />
                                                            </label>
                                                            <div className="blocktrades-select-dropdown">
                                                                <div className="inline-label">
                                                                    <input type="text"
                                                                        value={this.state.bicCode || ""}
                                                                        tabIndex="4"
                                                                        onChange={this.onInputChange.bind(this)}
                                                                        data-validation="alphanumeric"
                                                                        autoComplete="off"
                                                                        name="bicCode"
                                                                        maxLength={11} />
                                                                </div>
                                                                {<Translate component="div"
                                                                    className={"mt_2 mb_5 color-danger fz_13" + (!this.state.formErrors.bicCode ? " hidden" : "")}
                                                                    content="gateway.rmbpay.error_emty" />}
                                                            </div>
                                                        </div>
                                                        <div className="medium-6">
                                                            <label className="left-label">
                                                                <Translate component="span" content="gateway.usd_vesna.transitNumber" />
                                                            </label>
                                                            <div className="blocktrades-select-dropdown">
                                                                <div className="inline-label">
                                                                    <input type="text"
                                                                        value={this.state.transitNumber || ""}
                                                                        tabIndex="4"
                                                                        onChange={this.onInputChange.bind(this)}
                                                                        data-validation="numeric"
                                                                        name="transitNumber"
                                                                        autoComplete="off"
                                                                        maxLength={9} />
                                                                </div>
                                                                {<Translate component="div"
                                                                    className={"mt_2 mb_5 color-danger fz_13" + (!this.state.formErrors.transitNumber ? " hidden" : "")}
                                                                    content="gateway.rmbpay.error_emty" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="medium-12">
                                                        <label className="left-label">
                                                            <Translate component="span" content="gateway.usd_vesna.bankAddress" />
                                                        </label>
                                                        <div className="blocktrades-select-dropdown">
                                                            <div className="inline-label">
                                                                <input type="text"
                                                                    value={this.state.bankAddr || ""}
                                                                    tabIndex="4"
                                                                    onChange={this.onInputChange.bind(this)}
                                                                    data-validation="alphanumericSpecial"
                                                                    name="bankAddr"
                                                                    autoComplete="off"
                                                                    maxLength={250} />
                                                            </div>
                                                            {<Translate component="div"
                                                                className={"mt_2 mb_5 color-danger fz_13" + (!this.state.formErrors.bankAddr ? " hidden" : "")}
                                                                content="gateway.rmbpay.error_emty" />}
                                                        </div>
                                                    </div>
                                                    <div className="block-inline">
                                                        <div className="medium-6">
                                                            <label className="left-label">
                                                                <Translate component="span" content="gateway.usd_vesna.beneficiaryAccount" />
                                                            </label>
                                                            <div className="blocktrades-select-dropdown">
                                                                <div className="inline-label">
                                                                    <input type="text"
                                                                        value={this.state.beneficiarNumber || ""}
                                                                        tabIndex="4"
                                                                        onChange={this.onInputChange.bind(this)}
                                                                        name="beneficiarNumber"
                                                                        data-validation="alphanumeric"
                                                                        autoComplete="off"
                                                                        maxLength={34} />
                                                                </div>
                                                                {<Translate component="div"
                                                                    className={"mt_2 mb_5 color-danger fz_13" + (!this.state.formErrors.beneficiarNumber ? " hidden" : "")}
                                                                    content="gateway.rmbpay.error_emty" />}
                                                            </div>
                                                        </div>
                                                        <div className="medium-6">
                                                            <label className="left-label">
                                                                <Translate component="span" content="gateway.usd_vesna.beneficiaryName" />
                                                            </label>
                                                            <div className="blocktrades-select-dropdown">
                                                                <div className="inline-label">
                                                                    <input type="text"
                                                                        value={this.state.beneficiarName || ""}
                                                                        tabIndex="4"
                                                                        onChange={this.onInputChange.bind(this)}
                                                                        data-validation="alphanumericSpecial"
                                                                        name="beneficiarName"
                                                                        autoComplete="off"
                                                                        maxLength={200} />
                                                                </div>
                                                                {<Translate component="div"
                                                                    className={"mt_2 mb_5 color-danger fz_13" + (!this.state.formErrors.beneficiarName ? " hidden" : "")}
                                                                    content="gateway.rmbpay.error_emty" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>)
                                            default:
                                                break;
                                        }
                                    })()}

                                </div>
                            </div>

                            {/* Withdraw/Cancel buttons */}
                            {showLocation && <div className="mt_6 help-text content-block">
                                {`${moment().utc().add(8, "h").format("YYYY-MM-DD HH-mm")} (UTC+8)`}
                            </div>}
                            <div className="buttons-block-center">
                                <div onClick={this.onSubmit.bind(this)} className={"button " + (disableForm && "disabled")}>
                                    <Translate content="modal.withdraw.submit" />
                                </div>
                                <div className="button cancel" onClick={this.onClose.bind(this)}><Translate content="account.perm.cancel" /></div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        )
    }
}

export default BindToChainState(WithdrawFiatModal, { keep_updating: true })
