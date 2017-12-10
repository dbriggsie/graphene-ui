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
import {ChainStore, FetchChainObjects} from "bitsharesjs/es";
import {LimitOrderCreate, Price, Asset} from "common/MarketClasses";
import utils from "common/utils";
import BindToChainState from "../Utility/BindToChainState";
import ChainTypes from "../Utility/ChainTypes";
import AccountApi from "api/accountApi";
import AccountActions from "actions/AccountActions";
import AccountSelector from "../Account/AccountSelector";

class SimpleTransferContent extends React.Component {

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
    }

    componentWillReceiveProps(np) {
        if (np.asset && np.asset !== this.props.asset) {
            this.setState({
                to_send: new Asset({
                    asset_id: np.asset.get("id"),
                    precision: np.asset.get("precision")
                }),
                sendValue: ""
            });
        }
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
        let currentBalance = this._getCurrentBalance();

        let amountToTransfer = this.state.to_send.getAmount();

        AccountActions.transfer(
            this.props.sender.get("id"),
            this.state.to_account.get("id"),
            amountToTransfer,
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

    _onInputSend(e) {
        try {
            this.state.to_send.setAmount({
                real: parseFloat(e.target.value || 0)
            });
            this.setState({
                sendValue: e.target.value,
                amountError: null
            });
        } catch(err) {
            console.error("err:", err);
        }
    }

    _onToChanged(to_name) {
        this.setState({to_name, error: null});
    }

    _onToAccountChanged(to_account) {
        this.setState({to_account, error: null});
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

    _getCurrentBalance() {
        return this.props.balances.find(b => {
            return b && b.get("asset_type") === this.props.asset.get("id");
        });
    }

    _onToggleMemo() {
        this.setState({
            includeMemo: !this.state.includeMemo
        });
    }

    _onInputMemo(e) {
        this.setState({
            memo: e.target.value
        });
    }

    render() {
        let {asset, sender, balances} = this.props;
        let {to_send, toSendText, to} = this.state;

        if (!asset) {
            return null;
        }

        const fee = this._getFee();

        let currentBalance = this._getCurrentBalance();

        const currentB = currentBalance ?
        <div
            onClick={this._updateAmount.bind(this, parseInt(currentBalance.get("balance"), 10))}
            style={{
                position: "absolute",
                right: 0,
                top: 0,
                borderBottom: "#A09F9F 1px dotted",
                cursor: "pointer"
            }}
        >
            <FormattedAsset amount={currentBalance.get("balance")} asset={currentBalance.get("asset_type")} />
        </div> : null;

        const {replacedName:assetName}  = utils.replaceName(asset.get("symbol"), true);

        let tabIndex = 1;

        return (
            <div className="SimpleTrade__modal">
                <div className="Modal__header">
                    <h3><Translate content="transfer.send" /> {assetName}</h3>
                </div>
                <div className="Modal__divider"></div>

                <div className="grid-block vertical no-overflow" style={{zIndex: 1002, paddingLeft: "2rem", paddingRight: "2rem"}}>
                    <form style={{paddingTop: 20}} onSubmit={this.onSubmit.bind(this)}>

                        {/* SEND TO */}
                        <div className="SimpleTrade__withdraw-row">
                            {/* <div style={{display: "table-cell", float: "left", marginTop: 11}}>
                                <label><Translate content="transfer.to" />:</label>
                            </div> */}

                            {/* <label>
                                <span className="inline-label">
                                    <input readOnly style={{border: "1px solid grey"}} type="text" value={addressValue} />
                                    <CopyButton
                                        text={addressValue}
                                    />
                                </span>
                            </label> */}

                            <div>
                                <label>
                                    <Translate content="transfer.to" />:
                                    <span className="inline-label">
                                        <AccountSelector
                                            fullWidth
                                            style={{width: "100%"}}
                                            noImage
                                            accountName={this.state.to_name}
                                            onChange={this._onToChanged.bind(this)}
                                            onAccountChanged={this._onToAccountChanged.bind(this)}
                                            account={this.state.to_name}
                                            error={this.state.error}
                                            tabIndex={tabIndex++}
                                        />
                                    {/* <input type="text" value={this.state.to} onChange={this._onInputTo.bind(this)} /> */}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* SEND AMOUNT */}
                        <div className="SimpleTrade__withdraw-row">
                            {/* <div style={{display: "table-cell", float: "left", marginTop: 11}}>
                                <label></label>
                            </div> */}

                            <div>
                                <div style={{position: "relative"}}>
                                    {currentB}
                                </div>
                                <label>
                                    <Translate content="transfer.amount" />:
                                    <span className="inline-label">
                                        <input tabIndex={tabIndex++} type="text" value={this.state.sendValue} onChange={this._onInputSend.bind(this)} />
                                        <span className="form-label" style={{padding: "0 1.5rem"}}><AssetName name={asset.get("symbol")} /></span>
                                    </span>
                                </label>

                                <div style={{position: "relative"}}>
                                    <label style={{margin: 0}}>
                                        {this.state.amountError ? <div style={{fontSize: "1rem", top: "0.65rem", position: "absolute"}} className="error">
                                        <span><Translate content={this.state.amountError} /></span>
                                    </div> : null}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="SimpleTrade__withdraw-row" style={{padding: "30px 0"}}>
                            <div style={{position: "relative"}}>
                                <label style={{position: "relative", top: 10}}>
                                    <Translate content="transfer.fee" />
                                    <span>: </span>
                                    <FormattedFee
                                        ref="feeAsset"
                                        asset={fee.asset}
                                        opType="transfer"
                                    />
                                </label>
                                <div style={{position: "absolute", right: 0, top: 0}}>
                                    <label style={{
                                        display: "inline-block",
                                        position: "relative",
                                        top: -10,
                                        margin: 0
                                    }}
                                    >
                                        <Translate content="simple_trade.include_memo" />:
                                    </label>
                                    <div onClick={this._onToggleMemo.bind(this)} style={{transform: "scale3d(0.75, 0.75, 1)"}} className="switch">
                                        <input tabIndex={tabIndex++} checked={this.state.includeMemo} type="checkbox" />
                                        <label style={{marginRight: 0}} />
                                    </div>
                                </div>

                            </div>
                        </div>

                        {this.state.includeMemo ?
                            <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 30}}>
                                <div>
                                    <label>
                                        <Translate content="transfer.memo" />:
                                        <textarea style={{marginBottom: 0}} rows="1" value={this.state.memo} tabIndex={tabIndex++} onChange={this._onInputMemo.bind(this)} />
                                    </label>
                                </div>
                            </div>
                            : null}

                        <div className="button-group">
                            <button tabIndex={tabIndex++} className="button" onClick={this.onSubmit.bind(this)} type="submit" >
                                <Translate content="transfer.send" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }
}
SimpleTransferContent = BindToChainState(SimpleTransferContent);

export default class SimpleTransferModal extends React.Component {
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
            <Modal onClose={this.onClose.bind(this)} id={this.props.modalId} overlay={true}>
                <Trigger close={this.props.modalId}>
                    <a href="#" className="close-button">&times;</a>
                </Trigger>
                {this.state.open ? <SimpleTransferContent {...this.props} open={this.state.open} /> : null}
            </Modal>
        );
    }
}