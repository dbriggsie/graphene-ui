import React from "react";

//this.refs[imgName.toLowerCase()].src = "/app/assets/asset-symbols/bts.png";

/*



*/


function _onError(el, imgName) {

    el.target.classList.add("hidden");

    /*if (!this.state.imgError) {
        this.refs[imgName.toLowerCase()].src = "/app/assets/asset-symbols/bts.png";
        this.setState({
            imgError: true
        });
    }*/

}

function _handleImageLoaded(el, imgName) {
    el.target.classList.remove("hidden");
}

export default function(props) {
    let { assetName, style, className, onError } = props;

    let img_name = assetName.toLowerCase();

    if(img_name.indexOf("open.")===0){
        img_name = img_name.split("open.").join("");
    }

    let img_path = "/app/assets/asset-symbols/" + img_name + ".png";
    return <img className={className} onError={(e)=>{_onError(e,img_name)}} onLoad={(e)=>{_handleImageLoaded(e,img_name)}} style={props.style} src={img_path} />
}

//<img className="align-center" ref={imgName.toLowerCase()} onError={this._onError.bind(this, imgName)} style={{maxWidth: 70}} src={"/app/assets/asset-symbols/"+ imgName.toLowerCase() + ".png"} />

/*

class AssetImage extends React.Component {

    render() {
        let { assetName, style } = this.props;
        let imgName = assetName.split(".").join('_');

        return (
            <img ref={assetName} onError={(e) => {this.refs[assetName].style = "visibility: hidden;";}} style={this.props.style} src={"/app/assets/asset-symbols/" + imgName.toLowerCase() + ".png"} />
        );
    }
}*/


/*function getImageName(asset) {
    let symbol = asset.get("symbol");
    if (symbol === "OPEN.BTC") return symbol;
    if(symbol.indexOf("OPEN.")===0){
        return symbol.split("OPEN.").join("");
    }
    let imgName = asset.get("symbol").split(".");
    return imgName.length === 2 ? imgName[1] : imgName[0];
}
let imgName = getImageName(base);*/
