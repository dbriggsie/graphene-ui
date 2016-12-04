import React from "react";
import {PropTypes} from "react";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Modal from "react-foundation-apps/src/modal";
import Trigger from "react-foundation-apps/src/trigger";
import SettingsActions from "actions/SettingsActions";
import Translate from "react-translate-component";
import BalanceComponent from "../Utility/BalanceComponent";
import {ChainStore} from "graphenejs-lib";

export default class ConfirmModal extends React.Component {

    constructor() {
        super();

        this.state = {
            balanceIndex: 0
        };
    }

    show() {
        ZfApi.publish(this.props.modalId, "open");
    }

    _setBalance(index) {
        this.setState({
            balanceIndex: index
        });
    }

    _dropdownBalance(e) {
        console.log(e.target.value, e.target.id);
        let index = this.props.balances.findIndex(a => {
            return a.get("asset_type") === e.target.value;
        });

        this.setState({
            balanceIndex: index
        });
    }

    render() {
        let {modalId, asset, balances} = this.props;
        let {balanceIndex} = this.state;

        let index = -1;
        let balanceOptions = [];
        let balanceSelections = balances.map(b => {
            index++;
            balanceOptions.push({id: b.get("asset_type"), asset: ChainStore.getAsset(b.get("asset_type"))});
            return <div key={b.get("asset_type")} onClick={this._setBalance.bind(this, index)} className={"balance-row" + (index === this.state.balanceIndex ? " active": "")}><BalanceComponent balance={b.get("id")} /></div>;
        });

        let activeBalance = ChainStore.getAsset(balances[balanceIndex].get("asset_type"));

        if (!activeBalance) {
            return null;
        }

        return (
            <Modal id={modalId} overlay={true} className="test">
                <Trigger close={modalId}>
                    <a href="#" className="close-button">&times;</a>
                </Trigger>

                <div style={{padding: "20px 2rem", backgroundColor: "#545454"}}>
                    <h3>Buy {asset}</h3>
                    <div style={{paddingBottom: 10}}>Your Balances:</div>
                    <div style={{overflowY: "auto", maxHeight: 188, padding: "0 10px", border: "1px solid black"}}>
                        {balanceSelections}
                    </div>

                </div>
                <div className="grid-block vertical no-overflow" style={{zIndex: 1002, paddingLeft: "2rem", paddingRight: "2rem"}}>

                    <div style={{margin: "0 -2rem", borderBottom: "2px solid #020202"}}></div>

                    <form style={{paddingTop: 20}}>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>Amount</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                <label style={{width: "100%", margin: 0}}>
                                    <span className="inline-label" style={{margin: 0}}>
                                        <input type="text" />
                                        <span className="form-label">{asset}</span>
                                    </span>
                                </label>
                                <div className="SimpleBuySell__help-text">Enter the amount you wish to buy</div>
                            </div>
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>Spend</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                <label style={{width: "100%", margin: 0}}>
                                    <span className="inline-label" style={{margin: 0}}>
                                        <input type="text" />
                                        <span className="form-label" style={{border: "none", paddingLeft: 0, paddingRight: 0}}>
                                            <select onChange={this._dropdownBalance.bind(this)} value={activeBalance.get("id")} style={{color: "inherit", fontWeight: "normal", fontSize: "inherit", backgroundColor: "#eee", border: "none", margin: 0, paddingTop: 4, paddingBottom: 4}}>
                                                {balanceOptions
                                                    .filter(a => a && a.asset)
                                                    .map((b, index) => {
                                                        let name = b.asset.get("symbol");
                                                        return <option key={name} value={b.id}>{name}</option>;
                                                    })}
                                            </select>
                                        </span>
                                    </span>
                                </label>
                                <div className="SimpleBuySell__help-text">Enter the maximum amount you want to spend</div>
                            </div>
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left", marginTop: 11}}>Price</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                <label style={{width: "100%", margin: 0}}>
                                    <span className="inline-label" style={{margin: 0}}>
                                        <input type="text" />
                                        <span className="form-label">{activeBalance.get("symbol")}</span>
                                    </span>
                                </label>
                                <div className="SimpleBuySell__help-text">Enter your desired price for 1 {asset}</div>
                            </div>
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left"}}><Translate content="transfer.fee" /></div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                0.147 BTS
                            </div>
                        </div>

                        <div style={{width: "100%", display: "table-row", float: "left", paddingBottom: 20}}>
                            <div style={{display: "table-cell", float: "left"}}>Total</div>
                            <div style={{display: "table-cell", float: "right", width: "70%"}}>
                                X {asset} => X other asset
                            </div>
                        </div>

                        <div className="button-group">
                            <div className="button">Show market orders</div>
                            <div className="button">Place my order</div>
                        </div>
                    </form>
                </div>
            </Modal>
        );
    }
}
