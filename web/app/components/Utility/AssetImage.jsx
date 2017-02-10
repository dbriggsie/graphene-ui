import React from "react";

export default class AssetImage extends React.Component {

    render() {
        let {assetName} = this.props;
        let imgName = assetName.split(".").join('_');

        return (
            <img ref={assetName} onError={(e) => {this.refs[assetName].style = "visibility: hidden;";}} style={this.props.style} src={"/app/assets/asset-symbols/"+ imgName.toLowerCase() + ".png"} />
        );
    }
}
