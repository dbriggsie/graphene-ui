import React from "react";
import {PropTypes} from "react";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Modal from "react-foundation-apps/src/modal";
import Trigger from "react-foundation-apps/src/trigger";
import Translate from "react-translate-component";
import AssetName from "../Utility/AssetName";
import FormattedFee from "../Utility/FormattedFee";
import BalanceComponent from "../Utility/BalanceComponent";
import FormattedAsset from "../Utility/FormattedAsset";
import {ChainStore, FetchChainObjects} from "graphenejs-lib";
import {LimitOrderCreate, Price, Asset} from "common/MarketClasses";
import utils from "common/utils";
import BindToChainState from "../Utility/BindToChainState";
import ChainTypes from "../Utility/ChainTypes";
import AccountApi from "api/accountApi";
import AccountActions from "actions/AccountActions";
import AccountSelector from "../Account/AccountSelector";
import ReactTooltip from "react-tooltip";
import counterpart from "counterpart";
import {requestDepositAddress} from "common/blockTradesMethods";
import BlockTradesDepositAddressCache from "common/BlockTradesDepositAddressCache";
import ClipboardButton from "react-clipboard.js";
import Icon from "../Icon/Icon";

@BindToChainState()
class DepositWithdrawContent extends React.Component {

    static propTypes = {
        sender: ChainTypes.ChainAccount.isRequired,
        asset: ChainTypes.ChainAsset.isRequired,
        coreAsset: ChainTypes.ChainAsset.isRequired,
        globalObject: ChainTypes.ChainAsset.isRequired
    };

    static defaultProps = {
        coreAsset: "1.3.0",
        globalObject: "2.0.0"
    }

    constructor(props) {
        super();

        this.state = {
            to: "",
            sendValue:"",
            amountError: null,
            to_send: new Asset({
                asset_id: props.asset.get("id"),
                precision: props.asset.get("precision")
            }),
            includeMemo: false,
            memo: ""
        };

        this.deposit_address_cache = new BlockTradesDepositAddressCache();
        this.addDepositAddress = this.addDepositAddress.bind(this);
    }

    componentWillMount() {
        this._getDepositAddress();
    }

    componentWillReceiveProps(np) {
        if (np.asset && np.asset !== this.props.asset) {
            this.setState({
                to_send: new Asset({
                    asset_id: np.asset.get("id"),
                    precision: np.asset.get("precision")
                }),
                sendValue: "",
                receive_address: null
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
            url: "https://bitshares.openledger.info/depositwithdraw/api/v2",
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
        this.setState( {receive_address} );
    }

    componentDidUpdate() {
        ReactTooltip.rebuild();
    }

    onSubmit(e) {
        e.preventDefault();

        if (this.state.to_send.getAmount() === 0) {
            return this.setState({
                amountError: "transfer.errors.pos"
            });
        }

        if (!this.state.to_account) return;

        let fee = this._getFee();

        let feeToSubtract = this.state.to_send.asset_id !== fee.asset ? 0 :
            fee.amount;

        AccountActions.transfer(
            this.props.sender.get("id"),
            this.state.to_account.get("id"),
            this.state.to_send.getAmount() - feeToSubtract,
            this.state.to_send.asset_id,
            this.state.includeMemo ? this.state.memo : null, // memo
            null,
            fee.asset
        );
    }

    _updateAmount(amount) {
        this.state.to_send.setAmount({sats: amount});
        this.setState({
            sendValue: this.state.to_send.getAmount({real: true}),
            amountError: null
        });
    }

    _onToChanged(to_name) {
        this.setState({to_name, error: null});
    }

    _getFee() {
        let {globalObject, asset, coreAsset, balances} = this.props;
        return utils.getFee({
            opType: "transfer",
            options: [],
            globalObject: this.props.globalObject,
            asset: this.props.asset,
            coreAsset,
            balances
        });
    }

    toClipboard(clipboardText) {
        try {
            this.refs.deposit_address.select();
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('copy text command was ' + msg);
        } catch(err) {
            console.log('Oops, unable to copy',err);
        }
    }

    _renderWithdraw() {
        const assetName = utils.replaceName(this.props.asset.get("symbol"), true);
        let tabIndex = 1;

        return (
            <div style={{paddingTop: 20}}>
                <p>You are going to withdraw funds from your OpenLedger account.</p>

                {this._renderCurrentBalance()}

                <section style={{paddingTop: 15, paddingBottom: 15}}>
                    <p className="help-tooltip" data-place="right" data-tip={counterpart.translate("tooltip.deposit_tip", {asset: assetName})}>Please send your {assetName} to the address below:</p>
                    <div>TEMP</div>
                </section>

                <div className="button-group">
                    <button tabIndex={tabIndex++} className="button" onClick={this.onSubmit.bind(this)} type="submit" >
                        Generate new address
                    </button>
                </div>
            </div>
        );
    }

    _renderDeposit() {
        const {receive_address} = this.state;
        const assetName = utils.replaceName(this.props.asset.get("symbol"), true);
        const hasMemo = receive_address && "memo" in receive_address && receive_address.memo;
        const addressValue = receive_address && receive_address.address || "";
        let tabIndex = 1;

        return (
            <div style={{paddingTop: 20}}>
                <p><Translate content="gateway.add_funds" /></p>

                {this._renderCurrentBalance()}

                <section style={{paddingTop: 15, paddingBottom: 15}}>
                    <p className="help-tooltip" data-place="right" data-tip={counterpart.translate("tooltip.deposit_tip", {asset: assetName})}>Please send your {assetName} to the address below:</p>
                    <label>
                        <span className="inline-label">
                            <input readOnly style={{border: "1px solid grey"}} type="text" value={addressValue} />
                            <ClipboardButton data-clipboard-text={addressValue} className="button">
                                <Icon name="clippy"/>
                            </ClipboardButton>
                        </span>
                    </label>
                    {hasMemo ?
                        <label>
                            <span className="inline-label">
                                <input readOnly style={{border: "1px solid grey"}} type="text" value={counterpart.translate("transfer.memo") + ": " + receive_address.memo} />
                                <ClipboardButton data-clipboard-text={receive_address.memo} className="button">
                                    <Icon name="clippy"/>
                                </ClipboardButton>
                            </span>
                        </label> : null}
                </section>

                <div className="button-group">
                    <button tabIndex={tabIndex++} className="button" onClick={requestDepositAddress.bind(null, this._getDepositObject())} type="submit" >
                        <Translate content="gateway.generate_new" />
                    </button>
                </div>
            </div>
        );
    }

    _renderCurrentBalance() {
        const assetName = utils.replaceName(this.props.asset.get("symbol"), true);

        let currentBalance = this.props.balances.find(b => {
            return b && b.get("asset_type") === this.props.asset.get("id");
        });

        let asset = currentBalance ? new Asset({
            asset_id: currentBalance.get("asset_type"),
            precision: currentBalance.get("precision"),
            amount: currentBalance.get("balance")
        }) : null;

        return (
            <div style={{color: "black", fontWeight : "bold"}}>
                <div style={{paddingBottom: 8, fontSize: "85%"}}>Current {assetName} balance:</div>
                <div
                    onClick={!currentBalance ? () => {} : this._updateAmount.bind(this, parseInt(currentBalance.get("balance"), 10))}
                >
                    <input disabled={this.props.action === "deposit"} style={{border: "2px solid black", padding: 10, width: "100%"}} value={!asset ? 0 : asset.getAmount({real: true})} />
                </div>
            </div>
        );
    }

    render() {
        let {asset, sender, balances, action} = this.props;
        let {to_send, toSendText, to} = this.state;

        let isDeposit = action === "deposit";

        if (!asset) {
            return null;
        }

        const fee = this._getFee();



        const assetName = utils.replaceName(asset.get("symbol"), true);

        let tabIndex = 1;

        return (
            <div style={{backgroundColor: "#545454"}}>
                <div style={{padding: "20px 2rem"}}>
                        <h3><Translate content={"gateway." + (isDeposit ? "deposit" : "withdraw")} /> {assetName}</h3>
                </div>

                <div className="grid-block vertical no-overflow" style={{zIndex: 1002, paddingLeft: "2rem", paddingRight: "2rem"}}>

                    {isDeposit ? this._renderDeposit() : this._renderWithdraw()}
                </div>
            </div>
        );
    }
}

export default class SimpleDepositWithdrawModal extends React.Component {
    constructor() {
        super();

        this.state = {open: false};
    }

    show() {
        ZfApi.publish(this.props.modalId, "open");
        this.setState({open: true});
    }

    onClose() {
        this.setState({open: false});
    }

    render() {
        return (
            <Modal className="small" onClose={this.onClose.bind(this)} id={this.props.modalId} overlay={true}>
                <Trigger close={this.props.modalId}>
                    <a href="#" className="close-button">&times;</a>
                </Trigger>
                <DepositWithdrawContent {...this.props} open={this.state.open} />
            </Modal>
        );
    }
}
