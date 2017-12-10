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
import { estimateFee } from "common/trxHelper";

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
        let asset_types = [];
        let fee_asset_types = [];

        if (!(from_account && from_account.get("balances") && !from_error)) {
            return {asset_types, fee_asset_types};
        }
        let account_balances = state.from_account.get("balances").toJS();

        for (let key in account_balances) {
            let asset = ChainStore.getObject(key);
            let balanceObject = ChainStore.getObject(account_balances[key]);

            if (balanceObject && balanceObject.get("balance") > 0) {
                if(fee_asset_types.indexOf(key)==-1){
                    asset_types.push(key);
                }
            }

            if(asset&&utils.isValidPrice(asset.getIn(["options", "core_exchange_rate"]))&&parseInt(asset.getIn(["dynamic", "fee_pool"]), 10)>this._feeBTS){
                fee_asset_types.push(key);
            }

        }
        
        return {asset_types, fee_asset_types};
    }

    render() {
        if(!this.state.from_account){
            return null;
        }
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
        let fee = this._feeBTS = estimateFee("limit_order_cancel", null, ChainStore.getObject("2.0.0"));
        let { fee_asset_types } = this._getAvailableAssets();
        let balance_fee = null;
        let feeID = feeAsset ? feeAsset.get("id") : "1.3.0";
        let core = ChainStore.getObject("1.3.0");

        // Estimate fee
        if (from_account && from_account.get("balances") && !from_error) {

            let account_balances = from_account.get("balances").toJS();

            // Finish fee estimation            
            if (feeAsset && feeAsset.get("id") !== "1.3.0" && core) {
                let price = utils.convertPrice(core, feeAsset.getIn(["options", "core_exchange_rate"]).toJS(), null, feeAsset.get("id"));
                let rate = feeAsset.getIn(["options", "core_exchange_rate"]).toJS();

                fee = utils.convertValue(price, fee, core, feeAsset);

                if (parseInt(fee, 10) !== fee) {
                    fee += 1; // Add 1 to round up;
                }

                fee = Math.floor(fee)/Math.pow(10,feeAsset.get("precision"));

            }else{
                fee = Math.floor(fee)/Math.pow(10,core.get("precision"));
            }            

            if (asset_types.length === 1){
               asset = ChainStore.getAsset(asset_types[0]); 
            }

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
                        amount={fee.toFixed(total_precision)}
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
