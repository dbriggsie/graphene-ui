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
import {ChainStore} from "bitsharesjs/es"
import Modal from "react-foundation-apps/src/modal"
import { checkFeeStatusAsync, checkBalance } from "common/trxHelper"
import {Asset} from "common/MarketClasses"
import { debounce } from "lodash"
import ZfApi from "react-foundation-apps/src/utils/foundation-api"
import Icon from "components/Icon/Icon"


class WithdrawModalRmbpay extends React.Component {

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
    }

    constructor(props) {
        super(props)

        this.state = {
            withdrawAmount: 0,
            withdraw_address_is_valid: null,
            options_is_valid: false,
            confirmation_is_valid: false,
            empty_withdraw_value: false,
            empty_withdraw_value_receive: false,
            from_account: props.account,
            fee_asset_id: "1.3.2562",
            feeStatus: {},
            action: true,

            invalidAddressMessage: false,
            tokenAmount: 0,
            withdrawAmount_receive: 0,
            tokenAmountReceive: 0,
            fee_rmbpay_withdraw: 0.02,
            notEnaughtBalance: false
        }

        this._checkBalance = this._checkBalance.bind(this)
        this._updateFee = debounce(this._updateFee.bind(this), 150)

    }

    _getCurrentBalance(props = this.props) {
        console.log(props)
        return props.balance;
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
                fee_asset_id: "1.3.0",
                feeAmount: new Asset({amount: 0})
            }, () => {this._updateFee(); this._checkFeeStatus()})
        }
    }

    _updateFee(state = this.state) {
        let { fee_asset_id, from_account } = state
        const { fee_asset_types } = this._getAvailableAssets(state)

        if ( fee_asset_types.length === 1 && fee_asset_types[0] !== fee_asset_id) {
            fee_asset_id = fee_asset_types[0]
        }

        if (!from_account) return null
        checkFeeStatusAsync({
            accountID: from_account.get("id"),
            feeID: fee_asset_id,
            options: ["price_per_kbyte"]
        })
            .then(({fee, hasBalance, hasPoolBalance}) => {
                if (this.unMounted) return
                this.setState({
                    feeAmount: fee,
                    hasBalance,
                    hasPoolBalance,
                    error: (!hasBalance || !hasPoolBalance)
                }, this._checkBalance)
                this._checkSolvency()
            })
    }

    _checkFeeStatus(state = this.state) {
        let account = state.from_account
        if (!account) return

        const { fee_asset_types: assets } = this._getAvailableAssets(state)
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

    _validateFloat(value) {
        return /^(\s*|[1-9][0-9]*\.?[0-9]*)$/.test(value)
    }

    onWithdrawAmountChange( {amount} ) {
        if (amount !== undefined) {
            if (!this._validateFloat(amount) || amount.length > 15) {
                return
            }
            const fees = /*this.state.depositData.fees || */{
                fee_share_dep: 0,
                fee_min_val_dep: 0
            }
            let fee = amount * fees.fee_share_dep / 100
            fee = fees.fee_min_val_dep > fee ? fees.fee_min_val_dep : fee
            fee = parseFloat(fee)
            let amountWithFee = amount <= this.state.fee_rmbpay_withdraw + parseFloat(this.props.gateFee) ?  0 : (parseFloat(amount) - this.state.feeAmount.getAmount({real: true}) - parseFloat(this.props.gateFee)).toFixed(2)

            this.setState({
                withdrawAmount: amount,
                depositEmpty: false,
                tokenAmount: amountWithFee,
                fee: parseFloat(fee).toFixed(2)
            }, this._validateWithdrawAmount)
        }
    }

    onWithdrawAmountChangeReceive({amount}) {
        this.setState({
            withdrawAmount_receive: amount,
            tokenAmountReceive: amount <= this.state.fee_rmbpay_withdraw + parseFloat(this.props.gateFee) ?  0 : (parseFloat(amount) + this.state.feeAmount.getAmount({real: true}) + parseFloat(this.props.gateFee)).toFixed(2)
        }, this._checkBalance)
    }


    onWithdrawAddressChanged(e) {
        let value = e.target.value
        if (value != undefined && value.length > 50 ) {
            return false
        }
        this.setState({
            invalidAddressMessage: false,
            userServiceId: value
        })
    }

    _checkBalance() {
        const {feeAmount, withdrawAmount} = this.state
        const {asset, balance, gateFee} = this.props

       /* const hasBalance = checkBalance(withdrawAmount, asset, feeAmount, balance, gateFee)
        if (hasBalance === null) return
        this.state.action ? this.setState({balanceError: !hasBalance}) : this.setState({balanceError_receive: !hasBalance})
        return hasBalance*/
    }


    onSubmit() {

        this._validateServiceEmpty()
        this._validateWithdrawEmpty()

        if ( /*&& (this.state.withdraw_address && this.state.withdraw_address.length) &&*/ (this.state.withdrawAmount !== null)) {


            // ZfApi.publish("withdraw_asset_openledger-dex_CNY", "close")

        }
    }

    onClose() {
        ZfApi.publish(this.props.modal_id, "close")
        this._resetState()
    }

    _resetState() {
        this.setState({
            withdrawAmount: undefined,
            userServiceId: "",
            invalidAddressMessage: false,
            depositEmpty: false,
            depositAmountError: false,
            tokenAmount: 0,
            fee: 0.00
        })
    }

    onAccountBalance() {
        const { feeAmount } = this.state
        if (Object.keys(this.props.account.get("balances").toJS()).includes(this.props.asset.get("id")) ) {
            let total = new Asset({
                amount: this.props.balance.get("balance"),
                asset_id: this.props.asset.get("id"),
                precision: this.props.asset.get("precision")
            })

            if(this.state.action){
                this.onWithdrawAmountChange({amount: total.getAmount({real: true})})
            }
            else{
                this.onWithdrawAmountChangeReceive({amount: total.getAmount({real: true})})
            }
        }
    }

    setNestedRef(ref) {
        this.nestedRef = ref
    }

    onFeeChanged({asset}) {
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
            return {fee_asset_types}
        }
        let account_balances = state.from_account.get("balances").toJS()
        fee_asset_types = Object.keys(account_balances).sort(utils.sortID)
        for (let key in account_balances) {
            let asset = ChainStore.getObject(key)
            let balanceObject = ChainStore.getObject(account_balances[key])
            if (balanceObject && balanceObject.get("balance") === 0) {
                if (fee_asset_types.indexOf(key) !== -1) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1)
                }
            }

            if (asset) {
                // Remove any assets that do not have valid core exchange rates
                if (asset.get("id") !== "1.3.0" && !utils.isValidPrice(asset.getIn(["options", "core_exchange_rate"]))) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1)
                }
            }
        }

        fee_asset_types = fee_asset_types.filter(a => {
            return /*hasFeePoolBalance(a) &&*/ hasBalance(a)
        })

        return {fee_asset_types}
    }

    // ----------------Start valid-------------------


    _validateWithdrawAmount() {
        const withdrawAmount = this.refs.amountWithdraw.props.amount
        const { fee } = this.state

        const depositValid = !withdrawAmount || parseFloat(withdrawAmount) > parseFloat(fee)
        this.setState({
            depositAmountError: !depositValid
        })
        return depositValid
    }

    _validateWithdrawEmpty() {
        const {withdrawAmount} = this.state
        this.setState({
            depositEmpty: !withdrawAmount
        })
    }

    _validateServiceEmpty() {
        const {userServiceId} = this.state
        const statusInputSevice = userServiceId.length == 0 || userServiceId == undefined

        this.setState({
            invalidAddressMessage: statusInputSevice
        })
    }

    _checkInputEmpty() {
        this._validateWithdrawEmpty()
        this._validateServiceEmpty()
    }


    //-------End valid---------


    changeActionTab(type) {
        this.setState({
            action: type
        })
    }


    _checkSolvency(){
        let currentBalance = this.props.balance.get('balance') / 10000
        currentBalance < (this.state.feeAmount.getAmount({real: true}) + parseFloat(this.props.gateFee) + 1) ? this.setState({notEnaughtBalance : true}) : null
    }


    render() {
        let { userServiceId } = this.state
        let {gateFee, output_coin_symbol, output_coin_name} = this.props

        let action = this.state.action

        let balance = null

        let account_balances = this.props.account.get("balances").toJS()

        let asset_types = Object.keys(account_balances)

        //let withdrawModalId = this.getWithdrawModalId()
        let options = null


        let services = [{name: 'Alipay'}]

        if (this.state.options_is_valid) {
            options =
                <div className={!storedAddress.length ? "blocktrades-disabled-options" : "blocktrades-options"}>
                    {storedAddress.map(function(name, index){
                        return <a key={index} onClick={this.onSelectChanged.bind(this, index)}>{name}</a>
                    }, this)}
                </div>
        }


        let tabIndex = 1

       // const fees = this.state.depositData.fees
       // const minFee = fees && fees.fee_min_val_dep

        // Estimate fee VARIABLES
        let { fee_asset_types } = this._getAvailableAssets()

        if (asset_types.length > 0) {
            let current_asset_id = this.props.asset.get("id")
            if( current_asset_id ){
                let current = account_balances[current_asset_id]
               
                balance = (
                    <span style={{borderBottom: "#A09F9F 1px dotted"}}>
                        <Translate component="span" content="transfer.available"/>&nbsp;&nbsp;
                        <span className="set-cursor" onClick={this.onAccountBalance.bind(this)}>
                            {current ? <BalanceComponent balance={account_balances[current_asset_id]}/> : 0}
                        </span>
                    </span>
                )
            }else
                balance = "No funds"
        } else {
            balance = "No funds"
        }

        const disableSubmit =
            this.state.error ||
            this.state.balanceError ||
            !this.state.withdrawAmount

        return (
            <div>
                <form className="grid-block vertical full-width-content form-deposit-withdraw-rmbpay">
                    <div className="grid-container">
                        <div className="content-block">
                            <h3><Translate content="gateway.rmbpay.withdraw" coin={output_coin_name} symbol={output_coin_symbol} /></h3>
                        </div>

                        {this.state.notEnaughtBalance ? <p className="has-error no-margin" style={{paddingBottom: 10}}><Translate content="gateway.rmbpay.not_enaught_balance" /></p>: null}
                        <div className={this.state.notEnaughtBalance ? "disabled-form" : null}>
                            <div style={{paddingBottom: 15}}>
                                <ul className="button-group btn-row segmented tabs-withdraw">
                                    <li className={action ? "is-active" : ""}><a onClick={this.changeActionTab.bind(this,true )}>I want to Withdraw the amount of tokens</a></li>
                                    <li className={!action ? "is-active" : ""}><a onClick={this.changeActionTab.bind(this, false)}>I want to Receive the amount of CNY</a></li>
                                </ul>
                            </div>

                            {/* Withdraw amount */}

                                <div >
                                    <div className="content-block">
                                        <AmountSelector label={action ? "modal.deposit.withdraw" : "gateway.rmbpay.withdraw_receive"}
                                                        amount={action ? this.state.withdrawAmount : this.state.withdrawAmount_receive}
                                                        asset={this.props.asset.get("id")}
                                                        assets={[this.props.asset.get("id")]}
                                                        placeholder=""
                                                        onChange={action ? this.onWithdrawAmountChange.bind(this) : this.onWithdrawAmountChangeReceive.bind(this) }
                                                        display_balance={balance}
                                                        ref="amountWithdraw"
                                        />
                                        {!this.state.depositEmpty ? <Translate component="div"
                                                                               className={!this.state.depositAmountError ? "mt_5 mb_5 color-gray fz_14" : "mt_5 mb_5 color-danger fz_14"}
                                                                               content="gateway.rmbpay.deposit_min_amount"
                                                                                /*fee={minFee}*/
                                        /> : null}
                                        {this.state.depositEmpty ? <p className="has-error no-margin" style={{ paddingTop: 10 }}><Translate content="gateway.rmbpay.error_emty" />
                                        </p> : null}
                                    </div>



                                    {/* Fee Blockchain selection */}
                                    {this.state.feeAmount ? <div className="content-block gate_fee" style={{paddingRight: 5}}>
                                        <label className="left-label">
                                            <Translate content="gateway.rmbpay.withdrawalModal.fee_blockchain"/>
                                            <span data-tip={counterpart.translate("tooltip.withdraw_blockchain_fee")} className="inline-block tooltip" style={{paddingLeft: '7px'}}>
                                               <Icon className="icon-14px" name="info"/>
                                            </span>
                                        </label>
                                        <AmountSelector
                                            refCallback={this.setNestedRef.bind(this)}
                                            label={null}
                                            disabled={true}
                                            amount={this.state.feeAmount.getAmount({real: true})}
                                            onChange={this.onFeeChanged.bind(this)}
                                            asset={this.state.fee_asset_id}
                                            assets={fee_asset_types}
                                            tabIndex={tabIndex++}
                                        />
                                        {!this.state.hasBalance ? <p className="has-error no-margin" style={{paddingTop: 10}}><Translate content="transfer.errors.noFeeBalance" /></p> : null}
                                        {!this.state.hasPoolBalance ? <p className="has-error no-margin" style={{paddingTop: 10}}><Translate content="transfer.errors.noPoolBalance" /></p> : null}
                                    </div> : null}

                                    {/* Gate fee withdrawal*/}
                                    {this.props.gateFee ?
                                        (<div className="content-block right-selector gate_fee" style={{ paddingLeft: 5}}>
                                            <label className="left-label">
                                                <Translate content="gateway.rmbpay.withdrawalModal.fee_withdraw"/>
                                                <span data-tip={counterpart.translate("tooltip.withdraw_fee")} className="inline-block tooltip" style={{paddingLeft: '7px'}}>
                                               <Icon className="icon-14px" name="info"/>
                                            </span>
                                            </label>
                                            <div className="inline-label input-wrapper">
                                                <input type="text" disabled value={this.props.gateFee} />

                                                <div className="form-label select floating-dropdown">
                                                    <div className="dropdown-wrapper inactive">
                                                        <div>{this.props.output_coin_symbol}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>):null}

                                    <div>
                                        <div className="content-block gate_fee left-label" style={{marginBottom: '2.6rem'}}>
                                            <Translate content={action ? "gateway.rmbpay.withdrawalModal.amount_receive" : "gateway.rmbpay.withdrawalModal.amount_withdraw"} />
                                        </div>
                                        <div className="content-block gate_fee text-right color_white">
                                            {action ? this.state.tokenAmount + " CNY" : this.state.tokenAmountReceive + " Tokens"}
                                        </div>
                                    </div>
                                    <div className="content-block medium-12">
                                        <label className="left-label">
                                            <Translate component="span" content="gateway.pay_service_withdraw"/>
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
                                        </div>
                                        {this.state.invalidAddressMessage ? <p className="has-error no-margin" style={{ paddingTop: 10 }}><Translate content="gateway.rmbpay.error_emty" />
                                        </p> : null}
                                    </div>
                                </div>


                            {/* Withdraw/Cancel buttons */}
                            <div className="button-group float-right" >
                                <div onClick={this.onSubmit.bind(this)} className="button" style={{marginBottom: 0}}>
                                    <Translate content="modal.withdraw.submit" />
                                </div>
                                <div className="button"  onClick={this.onClose.bind(this)} style={{marginBottom: 0}}><Translate content="account.perm.cancel"  /></div>
                            </div>
                        </div>

                    </div>
                </form>



            </div>
        )
    }
}

export default BindToChainState(WithdrawModalRmbpay, {keep_updating:true})
