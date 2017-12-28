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

const SERVER_URL = "https://test-cny.openledger.info/api/v1"
const RMBPAY_ASSET_ID = "1.3.2562"
const BTS_ASSET_ID = "1.3.0"
const CNY_ASSET_ID = "1.3.113"
class WithdrawModalRmbpay extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired,
        issuer_account: ChainTypes.ChainAccount.isRequired,
        asset: ChainTypes.ChainAsset.isRequired,
        output_coin_name: React.PropTypes.string.isRequired,
        output_coin_symbol: React.PropTypes.string.isRequired,
        output_coin_type: React.PropTypes.string.isRequired,
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
            fee_asset_id: RMBPAY_ASSET_ID,
            feeStatus: {},
            isWithdrawAction: true,

            tokenAmount: 0,

            withdrawTokenAmount: 0,
            fee_rmbpay_withdraw: 0.02,
            fees: {
                fee_min_val_dep: 0,
                fee_share_dep: 0
            },
            gateFee: 0.00,
            loading: true,
            balanceError: false,

            takenFromAmount: false,
            amountError: false
        };

        this._checkBalance = this._checkBalance.bind(this)
        this._updateFee = debounce(this._updateFee.bind(this), 250)

    }

    componentWillMount() {
        this._updateFee()
        this._checkFeeStatus()
    }

    componentWillUnmount() {
        this.unMounted = true
    }

    componentWillReceiveProps(np) {
        if (np.account !== this.state.from_account && np.account !== this.props.account) {
            this.setState({
                from_account: np.account,
                feeStatus: {},
                fee_asset_id: RMBPAY_ASSET_ID,
                feeAmount: new Asset({ amount: 0 })
            }, () => {
                this._updateFee()
                this._checkFeeStatus()
            })
        }
    }

    fetchWithdrawData() {
        this._checkBalance();
        fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                operation_name: "withdrawal",
                action: "get_data",
                data: {
                    currency_name_id: "RMBPAY",
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
                        fees: data.fees,
                        service: data.list_service && data.list_service[0]
                    });
                    this._handleRmbPayResponse(false);
                });
            }).catch(() => {

            this._handleRmbPayResponse(true);
        });
    }

    _sendWithdrawAudit() {
        const fees = this.state.fees;
        this.setState({
            loading: true
        });
        fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                operation_name: "withdrawal",
                action: "add",
                data: {
                    withd_amount: this.state.isWithdrawAction ? this.state.withdrawAmount : this.state.withdrawTokenAmount,
                    withd_fee: this.state.gateFee,
                    withd_receive_amount_to_user: this.state.isWithdrawAction ? this.state.tokenAmount : this.state.receiveAmount,
                    account_ol: this.props.account.get("name"),
                    currency_name_id: "RMBPAY",
                    services_id: this.state.service.id,
                    user_service_id: this.state.userServiceId,
                    fees: {
                        fee_share_dep: this.state.fees.fee_share_dep,
                        fee_min_val_dep: this.state.fees.fee_min_val_dep
                    }
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
                    const amountWithFee = this._calculateAmountWithFee(this.state.gateFee)
                    Promise.resolve(this._updateQuantity(this.refs.amountWithdraw.props.amount)).then(() => {
                        this.setState({
                            tokenAmount: this._round(amountWithFee, 2)
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
        if (amount < +this.state.fees.fee_min_val_dep + 1) {
            return {
                message: `gateway.rmbpay.error_max_value`,
                value: +this.state.fees.fee_min_val_dep + 1
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
        const maxValue = this._round(balance - blockChainFee - this.state.fees.fee_min_val_dep, 2)
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
                    receiveAmount: amount,
                    withdrawTokenAmount: this._round(this._calculateAmountWithFee(gateFee), 2)
                }, () => this._validateAmount()))
        }
    }

    _updateQuantity(amount) {
        const blockChainFee = this._getBlockchainFee()
        let quantity = +amount || 0
        let takenFromAmount = false
        if (this.state.isWithdrawAction) {
            if (this.state.fee_asset_id === RMBPAY_ASSET_ID) {
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

    _calculateGateFee(amount) {
        const fees = this.state.fees || {
            fee_share_dep: 0,
            fee_min_val_dep: 0
        }
        const minFee = +fees.fee_min_val_dep
        const procFee = +fees.fee_share_dep
        let gateFee = this.state.isWithdrawAction ? amount * procFee : procFee * amount / (1 - procFee)
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
        if (amount === undefined || !this._validateFloat(amount, fixed) || amount.length > 15) {
            return false
        }
        return true
    }

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

    _checkBalance() {
        //const blockChainFee = this.state.feeAmount ? +this.state.feeAmount.getAmount({ real: true }) : 0;
        const minFee = this.state.fees.fee_min_val_dep
        const balance = this._getBalance()
        if (balance < minFee + 1) {
            this.setState({
                balanceError: true
            })
        }
    }

    onSubmit() {

        Promise.all([
            this._validateServiceEmpty(),
            this._validateAmount()
        ]).then(
            () => {
                if (!this.state.amountError && !this.state.invalidAddressMessage) {
                    const quantity = this.state.quantity;
                    const precision = utils.get_asset_precision(this.props.asset.get("precision"));
                    AccountActions.transfer(
                        this.props.account.get("id"),
                        this.props.issuer_account.get("id"),
                        quantity * precision,
                        this.props.asset.get("id"),
                        null,
                        null,
                        this.state.fee_asset_id
                    ).then(() => {
                        this._sendWithdrawAudit()
                    }).catch(() => {
                    })
                }

            })
    }

    onClose() {
        ZfApi.publish(this.props.modal_id, "close")
        this._resetState()
    }

    _resetState() {
        this.setState({
            loading: true,
            balanceError: false,
            isWithdrawAction: true
        })
        this._resetForm()
    }

    _resetForm() {
        this.setState({
            withdrawAmount: undefined,
            receiveAmount: undefined,
            userServiceId: "",
            invalidAddressMessage: false,

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
                amount: this.props.balance.get("balance"),
                asset_id: this.props.asset.get("id"),
                precision: this.props.asset.get("precision")
            })


            if (this.state.isWithdrawAction) {
                this.onWithdrawAmountChange({ amount: total.getAmount({ real: true }) })
            }
            else {
                this.onReceiveAmountChange({ amount: total.getAmount({ real: true }) })
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


    _validateAmount() {
        const amountError = this.state.isWithdrawAction ? this._getAmountErrorMessage() : this._getReceiveAmountErrorMessage()
        if (amountError) {
            this.setState({
                takenFromAmount: false,
                tokenAmount: 0,
                gateFee: 0,
                withdrawTokenAmount: 0,
                quantity: 0
            })
        }
        return this.setState({
            amountError: amountError
        })
    }

    componentDidMount() {
        ZfApi.subscribe(this.props.modal_id, (name, msg) => {
            if (msg === "close") {
                this._resetState();
            }
        });
    }

    changeActionTab(type) {
        this.setState({
            isWithdrawAction: type
        })
        this._resetForm()
    }

    _validateServiceEmpty() {
        const inputService = this.refs.paymentId.value
        const statusInputSevice = inputService.length == 0 || inputService == undefined;

        return this.setState({
            invalidAddressMessage: statusInputSevice
        })
    }

    _round(value, fixed) {
        const rounded = value.toFixed(4)
        if (Math.abs(rounded - value) < 0.00001) {
            value = rounded
        }
        fixed = fixed || 0
        fixed = Math.pow(10, fixed)
        return Math.floor(value * fixed) / fixed
    }

    render() {
        let { userServiceId } = this.state
        let { output_coin_symbol, output_coin_name } = this.props
        const gateFee = this.state.gateFee

        const minFee = this._round(+this.state.fees.fee_min_val_dep + 1, 2)

        let isWithdrawAction = this.state.isWithdrawAction

        let balance = null

        let account_balances = this.props.account.get("balances").toJS()

        let asset_types = Object.keys(account_balances)

        //let withdrawModalId = this.getWithdrawModalId();
        let options = null


        let services = [{ name: 'Alipay' }]

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

        const maxValue = this._round(this._getBalance() - this._getBlockchainFee() - this.state.fees.fee_min_val_dep, 2)

        const assetId = this.state.isWithdrawAction ? this.props.asset.get("id") : CNY_ASSET_ID

        return (
            <div>
                <form className="grid-block vertical full-width-content form-deposit-withdraw-rmbpay">
                    <div className="grid-container">
                        <div className="content-block">
                            <h3><Translate content="gateway.rmbpay.withdraw" coin={output_coin_name} symbol={output_coin_symbol} /></h3>
                        </div>
                        {this.state.loading && <LoadingIndicator />}
                        {this.state.balanceError && <Translate component="div" className="mt_5 mb_5 color-danger" content="gateway.rmbpay.not_enaught_balance" />}
                        {this.state.serverError && <Translate component="div" unsafe className="mt_5 mb_5 color-danger" content="gateway.rmbpay.server_unavailable" />}
                        {/* {this.state.loading} */}
                        <div className={disableForm ? "disabled-form" : null}>
                            <div style={{ paddingBottom: 15 }}>
                                <ul className="button-group btn-row segmented tabs-withdraw">

                                    <li className={isWithdrawAction ? "is-active" : ""}><a onClick={this.changeActionTab.bind(this, true)}>I want to Withdraw the amount of RMBPAY</a></li>
                                    <li className={!isWithdrawAction ? "is-active" : ""}><a onClick={this.changeActionTab.bind(this, false)}>I want to Receive the amount of CNY</a></li>
                                </ul>
                            </div>

                            {/* Withdraw amount */}

                            <div >
                                <div className="content-block">

                                    <AmountSelector label={isWithdrawAction ? "modal.deposit.withdraw" : "gateway.rmbpay.withdraw_receive"}
                                                    amount={isWithdrawAction ? this.state.withdrawAmount : this.state.receiveAmount}
                                                    asset={assetId}
                                                    assets={[assetId]}
                                                    placeholder=""
                                                    onChange={isWithdrawAction ? this.onWithdrawAmountChange.bind(this) : this.onReceiveAmountChange.bind(this)}
                                                    ref="amountWithdraw"
                                                    display_balance={this.state.isWithdrawAction && balance}
                                    />
                                    {!this.state.amountError && (
                                        this.state.isWithdrawAction ? <Translate component="div" className="mt_2 mb_5 color-dark-gray fz_14" content="gateway.rmbpay.error_max_value" val={minFee} />
                                            : <Translate component="div" className="mt_2 mb_5 color-dark-gray fz_14" content="gateway.rmbpay.error_max_receive" val={maxValue} />
                                    )}
                                    {this.state.amountError && <Translate component="div" className="mt_2 mb_5 color-danger fz_14 " content={this.state.amountError.message} val={this.state.amountError.value} />}
                                </div>

                                {/* Fee Blockchain selection */}
                                {this.state.feeAmount ? <div className="content-block gate_fee rmbpay" style={{ paddingRight: 5 }}>
                                    <label className="left-label">
                                        <Translate content="gateway.rmbpay.withdrawalModal.fee_blockchain" />

                                        <span data-html={true} data-tip={this.state.isWithdrawAction ? ((this.state.takenFromAmount
                                            ? counterpart.translate("tooltip.withdraw_take_from_amount")
                                            : "")
                                            + counterpart.translate("tooltip.withdraw_blockchain_fee")) : counterpart.translate("tooltip.receive_blockchain_fee")} className="inline-block tooltip" style={{ paddingLeft: '7px' }}>
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
                                        startListCurrency="RMBPAY"
                                    />
                                    {!this.state.hasBalance ? <Translate component="div" className="mt_2 mb_5 color-danger fz_14" content="transfer.errors.noFeeBalance" /> : null}
                                    {!this.state.hasPoolBalance ? <Translate component="div" className="mt_2 mb_5 color-danger fz_14" content="transfer.errors.noPoolBalance" /> : null}
                                </div> : null}

                                {/* Gate fee withdrawal*/}

                                <div className="content-block right-selector gate_fee" style={{ paddingLeft: 5 }}>
                                    <label className="left-label">
                                        <Translate content="gateway.rmbpay.withdrawalModal.fee_withdraw" />
                                        <span data-tip={counterpart.translate("tooltip.withdraw_fee")} className="inline-block tooltip" style={{ paddingLeft: '7px' }}>
                                            <Icon className="icon-14px" name="info" />
                                        </span>
                                    </label>
                                    <div className="inline-label input-wrapper">
                                        <input type="text" disabled value={gateFee} />

                                        <div className="form-label select floating-dropdown">
                                            <div className="dropdown-wrapper inactive">
                                                <div>{this.props.output_coin_symbol}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="content-block gate_fee left-label" style={{ marginBottom: '2.6rem' }}>
                                        <Translate content={isWithdrawAction ? "gateway.rmbpay.withdrawalModal.amount_receive" : "gateway.rmbpay.withdrawalModal.amount_withdraw"} />
                                    </div>
                                    <div className="content-block gate_fee text-right color_white">
                                        {isWithdrawAction ? this.state.tokenAmount + " CNY" : this.state.quantity + " RMBPAY"}
                                    </div>
                                </div>
                                <div className="medium-12">
                                    <label className="left-label">
                                        <Translate component="span" content="gateway.pay_service_withdraw" />
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
                                        {<Translate component="div" className={"mt_2 mb_5 color-danger fz_14 " + (!this.state.invalidAddressMessage && "hidden")} content="gateway.rmbpay.error_emty" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Withdraw/Cancel buttons */}
                        <div className="float-right">
                            <div onClick={this.onSubmit.bind(this)} className={"button " + (disableForm && "disabled")}>
                                <Translate content="modal.withdraw.submit" />
                            </div>
                            <div className="button" onClick={this.onClose.bind(this)}><Translate content="account.perm.cancel" /></div>
                        </div>
                    </div>
                </form>
            </div>
        )
    }
}

export default BindToChainState(WithdrawModalRmbpay, { keep_updating: true })