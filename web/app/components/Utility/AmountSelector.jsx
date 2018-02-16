import React from "react";
import Translate from "react-translate-component";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import FormattedAsset from "./FormattedAsset";
import FloatingDropdown from "./FloatingDropdown";
import Immutable from "immutable";
import counterpart from "counterpart";
import utils from "common/utils";

class AssetSelector extends React.Component {

    static propTypes = {
        assets: ChainTypes.ChainAssetsList,
        value: React.PropTypes.string, // asset id
        onChange: React.PropTypes.func,
        scrollLength: React.PropTypes.number
    };

    render() {
        if(this.props.assets.length === 0) return null;

        return <FloatingDropdown
            entries={this.props.assets.map(a => a && a.get("symbol")).filter(a => !!a)}
            values={this.props.assets.reduce((map, a) => {if (a && a.get("symbol")) map[a.get("symbol")] = a; return map;}, {})}
            singleEntry={this.props.assets[0] ? <FormattedAsset asset={this.props.assets[0].get("id")} amount={0} hide_amount={true}/> : null}
            value={this.props.value}
            onChange={this.props.onChange}
            scrollLength={this.props.scrollLength}
        />;
    }
}

AssetSelector = BindToChainState(AssetSelector);

class AmountSelector extends React.Component {

    static propTypes = {
        label: React.PropTypes.string, // a translation key for the label
        asset: ChainTypes.ChainAsset.isRequired, // selected asset by default
        assets: React.PropTypes.array,
        amount: React.PropTypes.any,
        placeholder: React.PropTypes.string,
        onChange: React.PropTypes.func.isRequired,
        tabIndex: React.PropTypes.number,
        error: React.PropTypes.string,
        scrollLength: React.PropTypes.number
    };

    static defaultProps = {
        disabled: false
    };

    componentDidMount() {
        this.onAssetChange(this.props.asset);
    }

    formatAmount(v) {
        /*// TODO: use asset's precision to format the number*/
        if (!v) v = "";
        if (typeof v === "number") v = v.toString();
        let value = v.trim().replace(/,/g, "");
        return value;
    }

    _onChange(event) {
        let amount = event.target.value;
        this.props.onChange({amount: amount, asset: this.props.asset});
    }

    _onBlur(event){
        let amount = event.target.value;
        this.props.hasOwnProperty('onBlur') ? this.props.onBlur({amount: amount}) : null;
    }

    onAssetChange(selected_asset) {
        this.props.onChange({amount: this.props.amount, asset: selected_asset});
    }
    render() {
        let {label, startListCurrency} = this.props;
        let value = this.props.error ? counterpart.translate(this.props.error) : utils.format_from_exponential(this.formatAmount(this.props.amount));

        return (
            <div className="amount-selector" style={this.props.style}>
                {label ? <label className="right-label">{this.props.display_balance}</label> : null}
                {label ?<Translate className="left-label" component="label" content={this.props.label}/> : null}
                <div className="inline-label input-wrapper">
                    <input
                        disabled={this.props.disabled}
                        type="text"
                        value={value || ""}
                        placeholder={this.props.placeholder}
                        onChange={this._onChange.bind(this) }
                        tabIndex={this.props.tabIndex}
                        onBlur={this._onBlur.bind(this)}
                    />
                    <div className="form-label select floating-dropdown">
                        <AssetSelector
                            ref={this.props.refCallback}
                            value={this.props.asset.get("symbol")}
                            assets={Immutable.List(this.props.assets)}
                            onChange={this.onAssetChange.bind(this)}
                            scrollLength={this.props.scrollLength}
                        />
                    </div>
                </div>
            </div>
        )
    }
}
AmountSelector = BindToChainState(AmountSelector);

export default AmountSelector;
