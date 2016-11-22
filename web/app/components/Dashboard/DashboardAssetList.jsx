import React from "react";
import {ChainStore} from "graphenejs-lib";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import Immutable from "immutable";
import FormattedAsset from "../Utility/FormattedAsset";
import AssetName from "../Utility/AssetName";

@BindToChainState()
class DashboardAssetList extends React.Component {

    static propTypes = {
        balances: ChainTypes.ChainObjectsList,
        assets: ChainTypes.ChainAssetsList
    };

    shouldComponentUpdate(np) {
        let balancesChanged = false;
        np.balances.forEach((a, i) => {
            if (!Immutable.is(a, this.props.balances[i])) {
                balancesChanged = true;
            }
        });

        let assetsChanged = false;
        np.assets.forEach((a, i) => {
            if (!Immutable.is(a, this.props.assets[i])) {
                assetsChanged = true;
            }
        });

        return (
            np.account !== this.props.account ||
            balancesChanged ||
            assetsChanged
        );
    }



    _getBalance(asset_id) {
        let currentBalance = this.props.balances.find(a => {
            return (a ? a.get("asset_type") === asset_id : false);
        });

        return (!currentBalance || currentBalance.get("balance") === 0) ? null : {amount: currentBalance.get("balance"), asset_id: asset_id};
    }

    _renderRow(assetName) {
        let asset = ChainStore.getAsset(assetName);

        if (!asset) {
            return null;
        }

        let balance = this._getBalance(asset.get("id"));

        let imgName = asset.get("symbol").split(".");
        imgName = imgName.length === 2 ? imgName[1] : imgName[0];

        return (
            <tr key={assetName}>
                <td><img style={{maxWidth: 30}} src={"asset-symbols/"+ imgName.toLowerCase() + ".png"} /></td>
                <td><AssetName asset={assetName} name={assetName}/></td>
                <td>{balance ? <FormattedAsset hide_asset amount={balance.amount} asset={balance.asset_id} /> : "0"}</td>
                <td><a>Deposit</a> | <a>Withdraw</a></td>
                <td><a>Buy</a> | <a>Sell</a></td>
                <td></td>
            </tr>
        );
    }

    render() {
        let assets = this.props.assetNames;
        // console.log("account:", this.props.account.toJS(), "balances:", this.props.balances);
        return (
            <div>
                <h3>Wallet</h3>

                <table className="table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Asset</th>
                            <th>Value</th>
                            <th>Transfer actions</th>
                            <th>Trade actions</th>
                            <th>Pinned</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(a => this._renderRow(a))}
                    </tbody>
                </table>
            </div>
        );
    }
}

@BindToChainState()
export default class ListWrapper extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired
    };

    _getAssets() {
        return ["BTS", "BTSR", "OBITS", "OPEN.XMR", "OPEN.BTC", "OPEN.MKR"];
    }

    render() {
        let balances = this.props.account.get("balances").map((a, key) => {
            return a;
        }).toArray();

        let assets = this._getAssets();

        return (
            <DashboardAssetList
                account={this.props.account}
                balances={Immutable.List(balances)}
                assetNames={assets}
                assets={Immutable.List(assets)}
            />
        );
    }
}
