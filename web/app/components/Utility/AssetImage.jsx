import React from "react";

export default class AssetImage extends React.Component {

    render() {
        let {assetName} = this.props;
        let imgName = assetName.split(".");
        imgName = imgName.length === 2 ? imgName[1] : imgName[0];

        return (
            <img ref={assetName} onError={(e) => {this.refs[assetName].style = "visibility: hidden;";}} style={this.props.style} src={"asset-symbols/"+ imgName.toLowerCase() + ".png"} />
        );
    }
}
