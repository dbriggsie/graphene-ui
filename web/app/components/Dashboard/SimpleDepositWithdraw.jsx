import React from "react";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import BaseModal from "../Modal/BaseModal";
import Translate from "react-translate-component";
import { Asset } from "common/MarketClasses";
import utils from "common/utils";
import BindToChainState from "../Utility/BindToChainState";
import ChainTypes from "../Utility/ChainTypes";
import AccountActions from "actions/AccountActions";
import ReactTooltip from "react-tooltip";
import counterpart from "counterpart";
import {requestDepositAddress, validateAddress, WithdrawAddresses} from "common/blockTradesMethods";
import BlockTradesDepositAddressCache from "common/BlockTradesDepositAddressCache";
import CopyButton from "../Utility/CopyButton";
import Icon from "../Icon/Icon";
import LoadingIndicator from "../LoadingIndicator";
import { settingsAPIs } from "api/apiConfig";
import { checkFeeStatusAsync, checkBalance } from "common/trxHelper";
import AssetName from "../Utility/AssetName";
import AccountStore from "stores/AccountStore";
import { ChainStore } from "bitsharesjs/es";
import { debounce } from "lodash";

import DepositFiatOpenLedger from "components/DepositWithdraw/openledger/DepositFiatOpenLedger";
import WithdrawFiatOpenLedger from "components/DepositWithdraw/openledger/WithdrawFiatOpenLedger";
import AmountSelector from "components/Utility/AmountSelector";

class DepositWithdrawContent extends React.Component {

    static propTypes = {
        sender: ChainTypes.ChainAccount.isRequired,
        asset: ChainTypes.ChainAsset.isRequired,
        coreAsset: ChainTypes.ChainAsset.isRequired,
        globalObject: ChainTypes.ChainAsset.isRequired
    };

    static defaultProps = {
        coreAsset: "1.3.0",
        globalObject: "2.0.0",
    }

    constructor(props) {
        super();
        this.state = {
            toAddress: WithdrawAddresses.getLast(props.walletType),
            withdrawValue:"",
            amountError: null,
            symbol:props.asset.get("symbol"),
            intermediateAccount: props.asset.get("intermediateAccount"),
            gateFee: props.asset.get("gateFee"),
            to_withdraw: new Asset({
                asset_id: props.asset.get("id"),
                precision: props.asset.get("precision")
            }),
            from_account: ChainStore.getAccount(AccountStore.getState().currentAccount),
            fee_asset_id: "1.3.0",
            feeStatus: {}
        };

        this._validateAddress(this.state.toAddress, props);

        this.deposit_address_cache = new BlockTradesDepositAddressCache();
        this.addDepositAddress = this.addDepositAddress.bind(this);
        this._checkFeeStatus = this._checkFeeStatus.bind(this);
        this._checkBalance = this._checkBalance.bind(this);
        this._getCurrentBalance = this._getCurrentBalance.bind(this);
        this._getFee = this._getFee.bind(this);
        this._updateFee = debounce(this._updateFee.bind(this), 250);
    }

    componentWillMount() {
        this._getDepositAddress();

        this._updateFee();
        this._checkFeeStatus();
    }

    componentWillReceiveProps(np) {
        if (np.asset && np.asset !== this.props.asset) {
            this.setState({
                to_withdraw: new Asset({
                    asset_id: np.asset.get("id"),
                    precision: np.asset.get("precision")
                }),
                gateFee: np.asset.get("gateFee"),
                intermediateAccount: np.asset.get("intermediateAccount"),
                symbol:np.asset.get("symbol"),
                memo: "",
                withdrawValue: "",
                receive_address: null,
                toAddress: WithdrawAddresses.getLast(np.walletType)
            }, this._getDepositAddress);
        }
    }

    _getDepositAddress() {
        if (!this.props.backingCoinType) return;
        let account_name = this.props.sender.get("name");
        let receive_address = this.deposit_address_cache.getCachedInputAddress(
            "openledger",
            account_name,
            this.props.backingCoinType.toLowerCase(),
            this.props.symbol.toLowerCase()
        );
        if (!receive_address) {
            requestDepositAddress(this._getDepositObject());
        } else {
            this.setState({
                receive_address
            });
        }
    }

    _getDepositObject() {
        return {
            inputCoinType: this.props.backingCoinType.toLowerCase(),
            outputCoinType: this.props.symbol.toLowerCase(),
            outputAddress: this.props.sender.get("name"),
            stateCallback: this.addDepositAddress
        };
    }

    addDepositAddress( receive_address ) {
        let account_name = this.props.sender.get("name");
        this.deposit_address_cache.cacheInputAddress(
            "openledger",
            account_name,
            this.props.backingCoinType.toLowerCase(),
            this.props.symbol.toLowerCase(),
            receive_address.address,
            receive_address.memo
        );
        this.setState({
            receive_address
        });
    }

    componentDidUpdate() {
        ReactTooltip.rebuild();
    }

    onSubmit(e) {
        e.preventDefault();
        if (this.state.to_withdraw.getAmount() === 0  ||
            this.state.toAddress.length == 0 ||
            !this.state.validAddress
        ) {
            return this.setState({
                amountError: "transfer.errors.pos"
            });
        }



        if (!this.props.intermediateAccount) return;

        AccountActions.transfer(
            this.props.sender.get("id"),
            this.props.intermediateAccount,
            this.state.to_withdraw.getAmount(),
            this.state.to_withdraw.asset_id,
            this.props.backingCoinType.toLowerCase() + ":" + this.state.toAddress + (this.state.memo ? ":" + new Buffer(this.state.memo, "utf-8") : ""),
            null,
            this.state.fee_asset_id
        );
    }

    setNestedRef(ref) {
        this.nestedRef = ref;
    }

    onFeeChanged({asset}) {

        this.setState({
            fee_asset_id: asset.get("id")
        }, this._updateFee);
    }

    _getAvailableAssets(state = this.state) {
        const { from_account } = state;
        let fee_asset_types = [];

        if (!(from_account && from_account.get("balances"))) {
            return {fee_asset_types};
        }
        let account_balances = state.from_account.get("balances").toJS();
        fee_asset_types = Object.keys(account_balances).sort(utils.sortID);
        for (let key in account_balances) {
            let asset = ChainStore.getObject(key);
            let balanceObject = ChainStore.getObject(account_balances[key]);
            if (balanceObject && balanceObject.get("balance") === 0) {
                if (fee_asset_types.indexOf(key) !== -1) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
                }
            }

            if (asset) {
                // Remove any assets that do not have valid core exchange rates
                if (asset.get("id") !== "1.3.0" && !utils.isValidPrice(asset.getIn(["options", "core_exchange_rate"]))) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
                }
            }
        }

        return {fee_asset_types};
    }

    _updateAmount() {

        const { feeAmount } = this.state;
        const currentBalance = this._getCurrentBalance();

        let total = new Asset({
            amount: currentBalance ? currentBalance.get("balance") : 0,
            asset_id: this.props.asset.get("id"),
            precision: this.props.asset.get("precision")
        });

        // Subtract the fee if it is using the same asset
        if(total.asset_id === this.state.fee_asset_id) {
            total.minus(feeAmount);
        }

        this.state.to_withdraw.setAmount({sats: total.getAmount()});
        this.setState({
            withdrawValue: total.getAmount({real: true}),
            amountError: null
        }, this._checkBalance);
    }

    _checkFeeStatus(account = this.props.sender) {
        if (!account) return;

        const assets = ["1.3.0", this.state.to_withdraw.asset_id];
        let feeStatus = {};
        let p = [];
        assets.forEach(a => {
            p.push(checkFeeStatusAsync({
                accountID: account.get("id"),
                feeID: a,
                options: ["price_per_kbyte"],
                data: {
                    type: "memo",
                    content: this.props.backingCoinType.toLowerCase() + ":" + this.state.toAddress + (this.state.memo ? ":" + this.state.memo : "")
                }
            }));
        });
        Promise.all(p).then(status => {
            assets.forEach((a, idx) => {
                feeStatus[a] = status[idx];
            });
            if (!utils.are_equal_shallow(this.state.feeStatus, feeStatus)) {
                this.setState({
                    feeStatus
                });
            }
            this._checkBalance();
        }).catch(err => {
            console.error(err);
        });
    }

    _updateFee(fee_asset_id = this.state.fee_asset_id) {
        if (!this.props.sender) return null;
        checkFeeStatusAsync({
            accountID: this.props.sender.get("id"),
            feeID: fee_asset_id,
            options: ["price_per_kbyte"],
            data: {
                type: "memo",
                content: this.props.backingCoinType.toLowerCase() + ":" + this.state.toAddress + (this.state.memo ? ":" + this.state.memo : "")
            }
        })
        .then(({fee, hasBalance, hasPoolBalance}) => {
            this.setState({
                feeAmount: fee,
                hasBalance,
                hasPoolBalance,
                error: (!hasBalance || !hasPoolBalance)
            }, this._checkFeeStatus);
        });
    }

    _getCurrentBalance() {
        return this.props.balances.find(b => {
            return b && b.get("asset_type") === this.props.asset.get("id");
        });
    }

    _checkBalance() {
        const {feeAmount, to_withdraw} = this.state;
        const {asset} = this.props;
        const balance = this._getCurrentBalance();

        const hasBalance = checkBalance(to_withdraw.getAmount({real: true}), asset, feeAmount, balance);
        if (hasBalance === null) return;
        this.setState({balanceError: !hasBalance});
        return hasBalance;
    }

    _getFee() {
        const defaultFee = {getAmount: function() {return 0;}, asset_id: this.state.fee_asset_id};

        if (!this.state.feeStatus || !this.state.feeAmount) return defaultFee;

        const coreStatus = this.state.feeStatus["1.3.0"];
        const withdrawAssetStatus = this.state.feeStatus[this.state.to_withdraw.asset_id];
        if (coreStatus && coreStatus.hasBalance) return coreStatus.fee;
        if (coreStatus && !coreStatus.hasBalance && withdrawAssetStatus && withdrawAssetStatus.hasBalance) {
            return withdrawAssetStatus.fee;
        }
        return coreStatus ? coreStatus.fee : defaultFee;
    }

    _onInputAmount(e) {

        try {
            this.state.to_withdraw.setAmount({
                real: parseFloat(e.target.value || 0)
            });
            this.setState({
                withdrawValue: e.target.value,
                amountError: null
            }, this._checkBalance);
        } catch(err) {
            console.error("err:", err);
        }
    }

    _onInputTo(e) {
        let toAddress = e.target.value.trim();

        this.setState({
            withdraw_address_check_in_progress: true,
            withdraw_address_selected: toAddress,
            validAddress: null,
            toAddress: toAddress
        });

        this._validateAddress(toAddress);
    }

    _onMemoChanged(e) {
        this.setState({memo: e.target.value}, this._updateFee);
    }

    _validateAddress(address, props = this.props) {
        validateAddress({walletType: props.walletType, newAddress: address})
            .then(isValid => {
                if (this.state.toAddress === address) {
                    this.setState({
                        withdraw_address_check_in_progress: false,
                        validAddress: isValid
                    });
                }
            }).catch(err => {
                console.error("Error when validating address:", err);
            });
    }

    _openRegistrarSite(e) {
        e.preventDefault();
        let newWnd = window.open(SettingsStore.site_registr, "_blank");
        newWnd.opener = null;
    }

    _renderWithdraw() {
        const {replacedName} = utils.replaceName(this.props.asset.get("symbol"), !!this.props.asset.get("bitasset"));
        let assetName = replacedName;
        let tabIndex = 1;
        const {supportsMemos} = this.props;

        if(this.props.fiatModal){
            if(~this.props.fiatModal.indexOf('canFiatWith')){
                return (<WithdrawFiatOpenLedger
                    account={this.props.account}
                    issuer_account="openledger-fiat"
                    deposit_asset={this.props.asset.get("symbol").split('OPEN.').join('')}
                    receive_asset={this.props.asset.get("symbol")}
                    rpc_url={settingsAPIs.RPC_URL}
                />);
            }else{
                return (<p>{counterpart.translate("simple_trade.click")} <a href='#' onClick={(e)=>{ window.open(settingsAPIs.OPENLEDGER_FACET_REGISTR,'_blank');}} >{counterpart.translate("simple_trade.here")}</a> {counterpart.translate("simple_trade.to_register")} </p>);
            }
        }

        const currentFee = this._getFee();
        const feeStatus = this.state.feeStatus[currentFee.asset_id];
        const feeAsset = ChainStore.getAsset(currentFee.asset_id);
        let { fee_asset_types } = this._getAvailableAssets();

        let fee_count = 0;
        if(this.state.feeAmount){
            fee_count = this.state.feeAmount.getAmount({real: true})
        }

        return (
            <div>
                <p><Translate content="gateway.withdraw_funds" asset={assetName} /></p>

                {this._renderCurrentBalance()}

                <div className="SimpleTrade__withdraw-row">
                        <label className="left-label">{counterpart.translate("modal.withdraw.amount")}</label>
                        <div className="inline-label input-wrapper">
                            <input tabIndex={tabIndex++} type="text" value={this.state.withdrawValue} onChange={this._onInputAmount.bind(this)} />
                            <div className="form-label select floating-dropdown">
                                <div className="dropdown-wrapper inactive">
                                    <div>{assetName}</div>
                                </div>
                            </div>
                        </div>
                    {this.state.balanceError ? <p className="has-error no-margin" style={{paddingTop: 10}}><Translate content="transfer.errors.insufficient" /></p>:null}
                </div>

                <div className="SimpleTrade__withdraw-row">
                     <AmountSelector
                        refCallback={this.setNestedRef.bind(this)}
                        label="transfer.fee"
                        disabled={true}
                        amount={fee_count}
                        onChange={this.onFeeChanged.bind(this)}
                        asset={this.state.fee_asset_id}
                        assets={fee_asset_types}
                        tabIndex={10}
                    />
                        <div className="inline-label input-wrapper">
                           {/* <input type="text" value={currentFee.getAmount({real: true})} /> */}

                           {/*<AmountSelector
                                refCallback={this.setNestedRef.bind(this)}
                                label="transfer.fee"
                                disabled={true}
                                amount={currentFee.getAmount({real: true})}
                                onChange={this.onFeeChanged.bind(this)}
                                asset={this.state.fee_asset_id}
                                assets={fee_asset_types}
                                tabIndex={10}
                            /> */}



                            <div className="form-label select floating-dropdown">
                                {/*<div className="dropdown-wrapper inactive">
                                    <div>{feeAsset ? <AssetName name={feeAsset.get("symbol")} /> : null}</div>
                                </div>*/}
                            </div>
                        </div>
                    {feeStatus && !feeStatus.hasBalance ? <p className="has-error no-margin" style={{paddingTop: 10}}><Translate content="transfer.errors.insufficient" /></p>:null}
                </div>

                <div className="SimpleTrade__withdraw-row">
                    <label className="left-label">{counterpart.translate("modal.withdraw.address")}</label>
                        <div className="inline-label input-wrapper">
                            <input placeholder={counterpart.translate("gateway.withdraw_placeholder", {asset: assetName})} tabIndex={tabIndex++} type="text" value={this.state.toAddress} onChange={this._onInputTo.bind(this)} />

                            <div className="form-label select floating-dropdown">
                                <div className="dropdown-wrapper inactive">
                                    <div data-place="right" data-tip={counterpart.translate("tooltip.withdraw_address", {asset: assetName})}>
                                        ?
                                    </div>
                                </div>
                            </div>
                        </div>
                    {!this.state.validAddress && this.state.toAddress ? <div className="has-error" style={{paddingTop: 10}}><Translate content="gateway.valid_address" coin_type={assetName} /></div> : null}
                </div>

                {supportsMemos ? (
                    <div className="SimpleTrade__withdraw-row">
                        <label className="left-label">{counterpart.translate("transfer.memo")}</label>
                            <div className="inline-label input-wrapper">
                                <textarea rows="1" value={this.state.memo} tabIndex={tabIndex++} onChange={this._onMemoChanged.bind(this)} />
                            </div>
                        {!this.state.validAddress && this.state.toAddress ? <div className="has-error" style={{paddingTop: 10}}><Translate content="gateway.valid_address" coin_type={assetName} /></div> : null}
                    </div>
                ) : null}

                <div className="button-group SimpleTrade__withdraw-row">
                    <button tabIndex={tabIndex++} className={"button" + ((feeStatus && !feeStatus.hasBalance) || this.state.balanceError ? " disabled" : "")} onClick={this.onSubmit.bind(this)} type="submit" >
                        <Translate content="gateway.withdraw_now" />
                    </button>
                </div>
            </div>
        );
    }

    _renderDeposit() {
        const {receive_address} = this.state;
        const {replacedName} = utils.replaceName(this.props.asset.get("symbol"), !!this.props.asset.get("bitasset"));
        let assetName = replacedName;
        const hasMemo = receive_address && "memo" in receive_address && receive_address.memo;
        const addressValue = receive_address && receive_address.address || "";
        let tabIndex = 1;

        if(this.props.fiatModal){
            if(~this.props.fiatModal.indexOf('canFiatDep')){
                return (<DepositFiatOpenLedger
                    account={this.props.account}
                    issuer_account="openledger-fiat"
                    deposit_asset={this.props.asset.get("symbol").split('OPEN.').join('')}
                    receive_asset={this.props.asset.get("symbol")}
                    rpc_url={settingsAPIs.RPC_URL}
                />);
            }else{
                return (<p>{counterpart.translate("simple_trade.click")} <a href='#' onClick={(e)=>{ window.open(settingsAPIs.OPENLEDGER_FACET_REGISTR,'_blank');}} >{counterpart.translate("simple_trade.here")}</a> {counterpart.translate("simple_trade.to_register")} </p>);
            }
        }

        return (
            <div className={!addressValue ? "no-overflow" : ""}>
                <p><Translate unsafe content="gateway.add_funds" account={this.props.sender.get("name")} /></p>

                {this._renderCurrentBalance()}

                <div className="SimpleTrade__withdraw-row">
                    <p style={{marginBottom: 10}} data-place="right" data-tip={counterpart.translate("tooltip.deposit_tip", {asset: assetName})}>
                        <Translate className="help-tooltip" content="gateway.deposit_to" asset={assetName} />:
                    </p>
                    {!addressValue ? <LoadingIndicator type="three-bounce"/> :<label>
                        <span className="inline-label">
                            <input readOnly type="text" value={addressValue} />

                            <CopyButton
                                text={addressValue}
                            />
                        </span>
                    </label>}
                     {this.props.asset.get("symbol").indexOf("OPEN.BTC")==0?<img src={`https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${addressValue}`} />:null }
                    {hasMemo ?
                        <label>
                            <span className="inline-label">
                                <input readOnly type="text" value={counterpart.translate("transfer.memo") + ": " + receive_address.memo} />

                                <CopyButton
                                    text={receive_address.memo}
                                />
                            </span>
                        </label> : null}

                    {receive_address && receive_address.error ?
                        <div className="has-error" style={{paddingTop: 10}}>
                            {receive_address.error.message}
                        </div> : null}
                </div>

                <div className="button-group SimpleTrade__withdraw-row">
                    <button tabIndex={tabIndex++} className="button" onClick={requestDepositAddress.bind(null, this._getDepositObject())} type="submit" >
                        <Translate content="gateway.generate_new" />
                    </button>
                </div>
            </div>
        );
    }

    _renderCurrentBalance() {
        const {replacedName} = utils.replaceName(this.props.asset.get("symbol"), !!this.props.asset.get("bitasset"));
        let assetName = replacedName;
        const isDeposit = this.props.action === "deposit";
        const { feeAmount } = this.state;

        let currentBalance = this._getCurrentBalance();

        let asset = currentBalance ? new Asset({
            asset_id: currentBalance.get("asset_type"),
            precision: this.props.asset.get("precision"),
            amount: currentBalance.get("balance")
        }) : null;

        // TEMP //
        // asset = new Asset({
        //     asset_id: this.props.asset.get("id"),
        //     precision: this.props.asset.get("precision"),
        //     amount: 65654645
        // });


        /*let result_withdrawal = 0;
        if(currentBalance){
            result_withdrawal = currentBalance.get("balance");
            if()
        }*/

        //currentBalance.minus(feeAmount);

        const applyBalanceButton = isDeposit ?
            <span style={{border: "2px solid black", borderLeft: "none"}} className="form-label">{assetName}</span> :
        (
            <button
                data-place="right" data-tip={counterpart.translate("tooltip.withdraw_full")}
                className="button"
                style={{border: "2px solid black", borderLeft: "none"}}
                onClick={this._updateAmount.bind(this, !currentBalance ? 0 : parseInt(currentBalance.get("balance"), 10))}
            >
                <Icon name="clippy" />
            </button>
        );

        return (
            <div className="SimpleTrade__withdraw-row" style={{fontSize: "1rem"}}>
                <label style={{fontSize: "1rem"}}>
                    {counterpart.translate("gateway.balance_asset", {asset: assetName||"aaa"})}:
                    <span className="inline-label">
                        <input
                            disabled
                            style={{color: "black", border: "2px solid black", padding: 10, width: "100%"}}
                            value={!asset ? 0 : asset.getAmount({real: true})}
                        />
                        {applyBalanceButton}
                    </span>
                </label>
            </div>
        );
    }

    render() {
        let {asset, action} = this.props;

        let isDeposit = action === "deposit";

        if (!asset) {
            return null;
        }

        const {replacedName: assetName} = utils.replaceName(asset.get("symbol"), true);

        return (
            <div className="SimpleTrade__modal">
                <div className="Modal__header">
                    <h3><Translate content={isDeposit ? "gateway.deposit" : "modal.withdraw.submit"} /> {assetName}</h3>
                </div>
                <div className="Modal__divider"></div>

                <div
                    className="grid-block vertical no-overflow"
                    style={{
                        zIndex: 1002,
                        paddingLeft: "2rem",
                        paddingRight: "2rem",
                        paddingTop: "1rem"
                    }}>

                    {isDeposit ? this._renderDeposit() : this._renderWithdraw()}
                </div>
            </div>
        );
    }
}
DepositWithdrawContent = BindToChainState(DepositWithdrawContent);

export default class SimpleDepositWithdrawModal extends React.Component {
    constructor() {
        super();

        this.state = {open: false};
    }

    show() {
        this.setState({open: true}, () => {
            ZfApi.publish(this.props.modalId, "open");
        });
    }

    onClose() {
        this.setState({open: false});
    }

    render() {
        return (
            <BaseModal className="test" onClose={this.onClose.bind(this)} overlay={true} id={this.props.modalId}>
                {this.state.open ? <DepositWithdrawContent {...this.props} open={this.state.open} /> : null}
            </BaseModal>
        );
    }
}
