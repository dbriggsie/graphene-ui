import React, {PropTypes} from "react";
import FormattedAsset from "./FormattedAsset";
import ChainTypes from "./ChainTypes";
import BindToChainState from "./BindToChainState";
import utils from "common/utils";
import {ChainStore} from "bitsharesjs/es";

/**
 *
 *  Given an operation type, displays the fee for that operation using the given asset
 *
 */

class FormattedFee extends React.Component {

    static propTypes = {
        globalObject: ChainTypes.ChainObject.isRequired,
        opType: PropTypes.string,
        options: PropTypes.array,
        asset: ChainTypes.ChainAsset.isRequired
    };

    static defaultProps = {
        globalObject: "2.0.0",
        options: [],
        asset: "1.3.0"
    };

    getFee() { // Return fee via refs
        let {asset, opType, options, globalObject, balances} = this.props;
        let coreAsset = ChainStore.getAsset("1.3.0");

        const coreFee = utils.getFee({
            opType,
            options,
            globalObject,
            asset,
            coreAsset,
            balances
        });

        return coreFee;
    }

    render() {
        let {opType, options, globalObject} = this.props;

        if (!opType || !options || !globalObject) {
            return null;
        }

        let fee = this.getFee();

        return <FormattedAsset style={this.props.style} {...fee} />;
    }
}

export default BindToChainState(FormattedFee, {keep_updating: true});