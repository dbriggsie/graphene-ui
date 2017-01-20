import React from "react";
import utils from "common/utils";
import asset_utils from "common/asset_utils";
import ChainTypes from "./ChainTypes";
import BindToChainState from "./BindToChainState";
import Popover from "react-popover";
import AssetImage from "../Utility/AssetImage";

@BindToChainState()
class AssetName extends React.Component {

	static propTypes = {
		asset: ChainTypes.ChainAsset.isRequired,
		replace: React.PropTypes.bool.isRequired,
		name: React.PropTypes.string.isRequired
	};

	static defaultProps = {
		replace: true,
		popOver: false
	};

	constructor() {
		super();

		this.state = {
			isPopoverOpen: false
		}
	}

	shouldComponentUpdate(nextProps) {
		return (
			nextProps.replace !== this.props.replace ||
			nextProps.name !== this.props.replace
		);
	}

	render() {
		let {name, replace, asset, popover} = this.props;

		// let isBitAsset = asset.has("bitasset");
		// let isPredMarket = isBitAsset && asset.getIn(["bitasset", "is_prediction_market"]);


		let {name: replacedName, prefix} = utils.replaceName(name);
		// let prefix = isBitAsset && !isPredMarket ? <span>bit</span> :
		// 			 replacedName !== this.props.name ? <span>{replacedPrefix}</span> : null;

		if (popover) {
			let desc = asset_utils.parseDescription(asset.getIn(["options", "description"]));
			return (
				<Popover className="simple_Popover"
					isOpen={this.state.isPopoverOpen}
					onOuterAction={() => {this.setState({isPopoverOpen: false});}}
					body={(
						<div >
							<h3>{prefix}{replacedName}</h3>
							<div className="grid-block no-overflow small-8" >{desc.short ? desc.short : desc.main}</div>

							<AssetImage assetName={asset.get("symbol")} />

						</div>
					)}
					preferPlace="right"
				>
					<span className="help-tooltip" onClick={() => {this.setState({isPopoverOpen: !this.state.isPopoverOpen});}} >
						<span className="asset-prefix-replaced">{prefix}</span>
						<span>{replacedName}</span>
					</span>
				</Popover>
			);
		}

		if (replace && replacedName !== this.props.name) {
			let desc = asset_utils.parseDescription(asset.getIn(["options", "description"]));
			// let tooltip = `<div><strong>${prefix}</strong><br />${desc.short ? desc.short : desc.main}</div>`;
			return (
				<span>
					<span className="asset-prefix-replaced">{prefix}</span><span>{replacedName}</span>
				</span>
			);
		} else {
			return <span>{prefix}<span>{replacedName}</span></span>
		}

	}
}

export default class AssetNameWrapper extends React.Component {

	render() {
		return (
			<AssetName {...this.props} asset={this.props.name} />
		);
	}
}
