import React from "react";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Modal from "react-foundation-apps/src/modal";
import Trigger from "react-foundation-apps/src/trigger";
import utils from "common/utils";
import Translate from "react-translate-component";

import AmountSelector from "components/Utility/AmountSelector";
import BalanceComponent from "components/Utility/BalanceComponent";
import AccountStore from "stores/AccountStore";
import {ChainStore} from "bitsharesjs/es";

export default class ConfirmCancelModal extends React.Component {


    constructor(props) {
        super(props);

        this.state = {
            from_account: ChainStore.getAccount(AccountStore.getState().currentAccount),
            from_error: null,
            asset: null,
            feeAsset: null,
            fee_asset_id: "1.3.0",
            orderID:""
        };
    }

    show(orderID) {
        this.setState({
            orderID
        });

        let {type} = this.props;
        ZfApi.publish(type, "open");
    }

    close(e) {
        let {type} = this.props;
        e&&e.preventDefault();

        ZfApi.publish(type, "close");
    }

    setNestedRef(ref) {
        this.nestedRef = ref;
    }

    onFeeChanged({asset}) {
        this.setState({feeAsset: asset, error: null});
    }


    _getAvailableAssets(state = this.state) {
        const { from_account, from_error } = state;
        let asset_types = [], fee_asset_types = [];
        if (!(from_account && from_account.get("balances") && !from_error)) {
            return {asset_types, fee_asset_types};
        }
        let account_balances = state.from_account.get("balances").toJS();
        asset_types = Object.keys(account_balances).sort(utils.sortID);
        fee_asset_types = Object.keys(account_balances).sort(utils.sortID);
        for (let key in account_balances) {
            let asset = ChainStore.getObject(key);
            let balanceObject = ChainStore.getObject(account_balances[key]);
            if (balanceObject && balanceObject.get("balance") === 0) {
                asset_types.splice(asset_types.indexOf(key), 1);
                if (fee_asset_types.indexOf(key) !== -1) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
                }
            }

            if (asset) {
                if (asset.get("id") !== "1.3.0" && !utils.isValidPrice(asset.getIn(["options", "core_exchange_rate"]))) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
                }
            }
        }

        return {asset_types, fee_asset_types};
    }

    render() {
        let {type, onCancel} = this.props;
        let {orderID} = this.state;
        let fee_asset_choosen="1.3.0";
        if(this.state.feeAsset){
            fee_asset_choosen=this.state.feeAsset.get("id");
        }

        let account_balances = this.state.from_account.toJS();
        let asset_types = Object.keys(account_balances);

        // Estimate fee VARIABLES
        const { from_account, from_error, fee_asset_id } = this.state;
        let feeAsset = this.state.feeAsset;
        let asset = this.state.asset;
        let { fee_asset_types } = this._getAvailableAssets();
        let balance_fee = null;
        let feeID = feeAsset ? feeAsset.get("id") : "1.3.0";
        let core = ChainStore.getObject("1.3.0");

        window._eee = ChainStore.getObject;

        // Estimate fee
        let globalObject = ChainStore.getObject("2.0.0");
        let fee = utils.estimateFee("transfer", null, globalObject);

        if (from_account && from_account.get("balances") && !from_error) {

            let account_balances = from_account.get("balances").toJS();

            // Finish fee estimation            
            if (feeAsset && feeAsset.get("id") !== "1.3.0" && core) {

                let price = utils.convertPrice(core, feeAsset.getIn(["options", "core_exchange_rate"]).toJS(), null, feeAsset.get("id"));
                fee = utils.convertValue(price, fee, core, feeAsset);

                if (parseInt(fee, 10) !== fee) {
                    fee += 1; // Add 1 to round up;
                }
            }
            if (core) {
                fee = utils.limitByPrecision(utils.get_asset_amount(fee, feeAsset || core), feeAsset ? feeAsset.get("precision") : core.get("precision"));
            }else{
                return null;
            }

            if (asset_types.length === 1) asset = ChainStore.getAsset(asset_types[0]);
            if (asset_types.length > 0) {
                let current_asset_id = asset ? asset.get("id") : asset_types[0];                
                balance_fee = (<span style={{borderBottom: "#A09F9F 1px dotted", cursor: "pointer"}} ><Translate component="span" content="transfer.available"/>: <BalanceComponent balance={account_balances[current_asset_id]}/></span>);
            } else {
                balance_fee = "No funds";
            }
        } else {
            fee_asset_types = ["1.3.0"];
            if (core) {
                fee = utils.limitByPrecision(utils.get_asset_amount(fee, feeAsset || core), feeAsset ? feeAsset.get("precision") : core.get("precision"));
            }
        }

        let total_precision = feeAsset ? feeAsset.get("precision") : core.get("precision");

        return (
            <Modal id={type} overlay={true} ref={type}>
                <Trigger close={type}>
                    <a href="#" className="close-button">&times;</a>
                </Trigger>
                <Translate component="h3" content="transaction.confirm" />
                <AmountSelector
                        refCallback={this.setNestedRef.bind(this)}
                        label="transfer.fee"
                        disabled={true}
                        amount={fee}
                        onChange={this.onFeeChanged.bind(this)}
                        asset={fee_asset_choosen}
                        assets={fee_asset_types}
                        tabIndex={1}
                    />
                <div className="grid-block vertical">
                    <div className="button-group" style={{paddingTop: "2rem"}}>
                        <a onClick={(e)=>{onCancel(e,{orderID,fee_asset_choosen})}} className="button white_color_a"><Translate content="exchange.confirm_cancel" /></a>
                    </div>
                </div>
            </Modal>
        );
    }
}
