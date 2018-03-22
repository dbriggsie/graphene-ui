import React from "react";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import BaseModal from "../Modal/BaseModal";
import Translate from "react-translate-component";
import utils from "common/utils";
import BindToChainState from "../Utility/BindToChainState";
import ChainTypes from "../Utility/ChainTypes";
import ReactTooltip from "react-tooltip";
import counterpart from "counterpart";
import { requestDepositAddress, validateAddress, WithdrawAddresses, getDepositAddress } from "common/blockTradesMethods";
import CopyButton from "../Utility/CopyButton";
import LoadingIndicator from "../LoadingIndicator";
import { DecimalChecker } from "../Exchange/ExchangeInput";
import AssetImage from "../Utility/AssetImage";

// import DepositFiatOpenLedger from "components/DepositWithdraw/openledger/DepositFiatOpenLedger";
// import WithdrawFiatOpenLedger from "components/DepositWithdraw/openledger/WithdrawFiatOpenLedger";

class DepositWithdrawContent extends DecimalChecker {

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
            amountError: null,
            symbol: props.asset.get("symbol"),
            loading: false,
            emptyAddressDeposit: false
        };

        //this.deposit_address_cache = new BlockTradesDepositAddressCache();
        this.addDepositAddress = this.addDepositAddress.bind(this);
    }

    componentWillMount() {
        this.unmounted = false;
        this._getDepositAddress();
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    componentWillReceiveProps(np) {
        if ((np.asset && this.props.asset) && np.asset.get("id") !== this.props.asset.get("id")) {
            this.setState({
                gateFee: np.asset.get("gateFee"),
                symbol: np.asset.get("symbol"),
                memo: "",
                receive_address: null
            }, this._getDepositAddress);
        }
    }

    _getDepositAddress() {
        if (!this.props.backingCoinType) return;
        let account_name = this.props.sender.get("name");

        let receive_address = getDepositAddress({ coin: `open.${(this.props.backingCoinType).toLowerCase()}`, account: this.props.account, stateCallback: this.addDepositAddress })
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

    requestDepositAddressLoad() {
        this.setState({
            loading: true,
            emptyAddressDeposit: false
        });
        requestDepositAddress(this._getDepositObject());
    }

    addDepositAddress(receive_address) {
        if (this.unmounted) {
            return;
        }
        let account_name = this.props.sender.get("name");

        if (receive_address.error) {
            receive_address.error.message === "no_address" ? this.setState({ emptyAddressDeposit: true }) : this.setState({ emptyAddressDeposit: false })
        }

        /*   this.deposit_address_cache.cacheInputAddress(
               "openledger",
               account_name,
               this.props.backingCoinType.toLowerCase(),
               this.props.symbol.toLowerCase(),
               receive_address.address,
               receive_address.memo
           );*/

        this.setState({
            receive_address,
            loading: false
        });
    }

    componentDidUpdate() {
        ReactTooltip.rebuild();
    }

    _renderDeposit() {
        const { receive_address, loading, emptyAddressDeposit } = this.state;
        let symbol = this.props.asset.get("symbol");
        const { name: assetName } = utils.replaceName(this.props.asset.get("symbol"), !!this.props.asset.get("bitasset"));
        const hasMemo = receive_address && "memo" in receive_address && receive_address.memo;
        const addressValue = receive_address && receive_address.address || "";
        let tabIndex = 1;

        // if(this.props.fiatModal){
        //     if(~this.props.fiatModal.indexOf('canFiatDep')){
        //         return (<DepositFiatOpenLedger
        //             account={this.props.account}
        //             issuer_account="openledger-fiat"
        //             deposit_asset={this.props.asset.get("symbol").split('OPEN.').join('')}
        //             receive_asset={this.props.asset.get("symbol")}
        //             rpc_url={SettingsStore.rpc_url}
        //         />);
        //     }else{
        //         return (<p>Click <a href='#' onClick={this._openRegistrarSite} >here</a> to register for deposits </p>);
        //     }
        // }

        return (
            <div className={!addressValue ? "no-overflow" : ""}>
                <div className="SimpleTrade__modal-wrapper-text">

                    <Translate unsafe component="div" className='text-center mb_6' content="gateway.add_funds" account={this.props.sender.get("name")} />

                    <div className="SimpleTrade__withdraw-row text-center">
                        <p style={{ marginBottom: 20 }} data-place="right" data-tip={counterpart.translate("tooltip.deposit_tip", { asset: assetName })}>
                            <Translate className="help-tooltip" content="gateway.deposit_to" asset={assetName} />:
                            <div className="fz_12 help-text"><Translate content="gateway.deposit_notice_delay" /></div>
                        </p>
                    </div>
                    <div>
                        {!addressValue ? <LoadingIndicator type="three-bounce" /> :
                            emptyAddressDeposit ? <Translate content="gateway.please_generate_address" /> :
                                <div className="content-block">
                                    <label className="left-label">
                                        <Translate component="span" content="gateway.address" />
                                    </label>
                                    <span className="inline-label">
                                        <input readOnly type="text" value={addressValue} />
                                        <CopyButton text={addressValue} />
                                    </span>
                                </div>}
                        {hasMemo ?
                            <div className="content-block">
                                <label className="left-label">
                                    <Translate component="span" content="transfer.memo" />
                                </label>
                                <span className="inline-label">
                                    <input readOnly type="text" value={receive_address.memo} />
                                    <CopyButton
                                        text={receive_address.memo}
                                    />
                                </span>
                            </div>
                            : null}

                        {/*  {receive_address && receive_address.error ?
                            <div className="has-error" style={{paddingTop: 10}}>
                                {receive_address.error.message}
                            </div> : null}*/}
                    </div>

                    <Translate className="has-error fz_14" unsafe component="p" content="gateway.min_deposit_warning" minDeposit={this.props.gateFee * 2 || (assetName === "USDT" ? 25 : 0)} coin={assetName} />
                    <div className="text-center">
                        <button tabIndex={tabIndex++} className="button spinner-button-circle" onClick={this.requestDepositAddressLoad.bind(this)} type="submit" >
                            {loading ? <LoadingIndicator type="circle" /> : null}<Translate content="gateway.generate_new" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    render() {
        let { asset } = this.props;

        if (!asset) {
            return null;
        }
        const symbol = asset.get("symbol");
        const { name: assetName } = utils.replaceName(symbol, true);

        let content = this.props.isDown ?
            <div><Translate className="txtlabel cancel" content="gateway.unavailable_OPEN" component="p" /></div> :
            !this.props.isAvailable ?
                <div><Translate className="txtlabel cancel" content="gateway.unavailable" component="p" /></div> :
                this._renderDeposit();

        return (
            <div className="SimpleTrade__modal">
                <div className="modal-filled-header">
                    <h3><Translate content="gateway.deposit" /></h3>
                </div>
                <div className="grid-block vertical no-overflow modal-body">
                    <div className="text-center asset-header">
                        <h4><AssetImage assetName={symbol} style={{ width: "28px" }} /> {assetName}</h4>
                    </div>
                    {content}
                </div>
            </div>
        );
    }
}
DepositWithdrawContent = BindToChainState(DepositWithdrawContent);

export default class SimpleDepositWithdrawModal extends React.Component {
    constructor() {
        super();

        this.state = { open: false };
    }

    show() {
        this.setState({ open: true }, () => {
            ZfApi.publish(this.props.modalId, "open");
        });
    }

    onClose() {
        this.setState({ open: false });
    }

    render() {
        return (
            <BaseModal className="test" onClose={this.onClose.bind(this)} overlay={true} id={this.props.modalId}>
                {this.state.open ? <DepositWithdrawContent {...this.props} open={this.state.open} /> : null}
            </BaseModal>
        );
    }
}
