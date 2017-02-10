import React from "react";
import utils from "common/utils";
import asset_utils from "common/asset_utils";
import ChainTypes from "./ChainTypes";
import BindToChainState from "./BindToChainState";
import Popover from "react-popover";
import AssetImage from "../Utility/AssetImage";

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
		let {replaceName, prefix} = utils.replaceName(name);

		if (popover) {
			let desc = asset_utils.parseDescription(asset.getIn(["options", "description"]));
			return (
				<Popover className="simple_Popover"
					isOpen={this.state.isPopoverOpen}
					onOuterAction={() => {this.setState({isPopoverOpen: false});}}
					body={(
						<div >
							<h3>{prefix}{replaceName}</h3>
							<div style={{width:'70%',float:'left',padding: '0 15px 0 0'}} >{desc.short ? desc.short : desc.main}</div>

							<AssetImage assetName={asset.get("symbol")} />

						</div>
					)}
					preferPlace="right"
				>
					<span className="help-tooltip" onClick={() => {this.setState({isPopoverOpen: !this.state.isPopoverOpen});}} >
						<span className="asset-prefix-replaced">{prefix}</span>
						<span>{replaceName}</span>
					</span>
				</Popover>
			);
		}

		if (replace && replaceName !== this.props.name) {
			let desc = asset_utils.parseDescription(asset.getIn(["options", "description"]));
			let tooltip = `<div><strong>${this.props.name}</strong><br />${desc.short ? desc.short : desc.main}</div>`;
			return (
				<div
					className="tooltip inline-block"
					data-tip={tooltip}
					data-place="bottom"
					data-html={true}
				>
					<span className="asset-prefix-replaced">{prefix}</span><span>{replaceName}</span>
				</div>
			);
		} else {
			return <span>{prefix}<span>{replaceName}</span></span>
		}

	}
}

AssetName = BindToChainState(AssetName);

export default class AssetNameWrapper extends React.Component {

	render() {
		return (
			<AssetName {...this.props} asset={this.props.name} />
		);
	}
}
