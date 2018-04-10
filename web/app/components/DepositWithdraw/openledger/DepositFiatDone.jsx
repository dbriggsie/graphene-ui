import React, { Component } from "react";
import DepositRmbpayQr from "./DepositRmbpayQr";
import DepositVesnaInvoice from "./DepositVesnaInvoice";

class DepositFiatDone extends Component {

    constructor(props) {
        super(props);

        this._renderFinal = {
            "CNY": this._renderRmbpay.bind(this),
            "USD": this._renderUsd.bind(this)
        }
    }

    _renderRmbpay() {
        return (
            <DepositRmbpayQr
                coinName={this.props.coinName}
                depositAmount={this.props.depositAmount}
                qrCodeLink={this.props.qrCodeLink}
                modalId={this.props.modalId}
            />
        );
    }

    _renderUsd() {
        return (
            <DepositVesnaInvoice
                modalId={this.props.modalId}
                depositAmount={this.props.depositAmount}
                linkInvoice={this.props.linkInvoice}
                email={this.props.email}
            />
        );
    }

    render() {
        return <div className="fiat-final">{this._renderFinal[this.props.coinName]()}</div>;
    }
}

export default DepositFiatDone;