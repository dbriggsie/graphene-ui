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

		let isBitAsset = asset.has("bitasset");
		let isPredMarket = isBitAsset && asset.getIn(["bitasset", "is_prediction_market"]);


		let {name: replacedName, prefix} = utils.replaceName(name, isBitAsset && !isPredMarket && asset.get("issuer") === "1.2.0");
		// let prefix = isBitAsset && !isPredMarket ? <span>bit</span> :
		// 			 replacedName !== this.props.name ? <span>{replacedPrefix}</span> : null;

		if (popover) {
			let desc = asset_utils.parseDescription(asset.getIn(["options", "description"]));
			return (
				<Popover
					isOpen={this.state.isPopoverOpen}
					onOuterAction={() => {this.setState({isPopoverOpen: false});}}
					body={(
						<div style={{minWidth: "20rem", minHeight: "15rem"}}>
							<h3>{prefix}{replacedName}</h3>
							<div className="grid-block small-8" style={{paddingTop: 10}}>{desc.short ? desc.short : desc.main}</div>

							<AssetImage style={{maxHeight: 125, position: "absolute", top: 25, right: 15}} assetName={asset.get("symbol")} />

						</div>
					)}
					preferPlace="right"
				>
					<span className="asset-with-border" onClick={() => {this.setState({isPopoverOpen: !this.state.isPopoverOpen});}} >
						<span className="asset-prefix-replaced">{prefix}</span>
						<span>{replacedName}</span>
					</span>
				</Popover>
			);
		}

		if (replace && replacedName !== this.props.name) {
			let desc = asset_utils.parseDescription(asset.getIn(["options", "description"]));
			let tooltip = `<div><strong>${prefix}</strong><br />${desc.short ? desc.short : desc.main}</div>`;
			return (
				<span
					className="tooltip"
					data-tip={tooltip}
					data-place="bottom"
					data-type="light"
					data-html={true}
				>
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
