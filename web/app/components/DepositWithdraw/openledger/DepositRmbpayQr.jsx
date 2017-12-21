import React, { Component } from "react";
import Translate from "react-translate-component";
import Trigger from "react-foundation-apps/src/trigger";
import LoadingIndicator from "components/LoadingIndicator";

const logoAliPay = '/app/assets/logoAlipay.png';

class DepositRmbpayQr extends Component {

    constructor(props) {
        super(props);
    }

    componentWillReceiveProps(np) {
        this.setState({
            withdraw_amount: np.withdraw_amount
        });
    }

    render() {
        const { coinName, depositAmount, qrCodeLink } = this.props;
        return (
            <div className="grid-container center-content">
                {
                    <div>
                        <div>
                            <img
                                style={{ marginBottom: '10px' }}
                                src={logoAliPay}
                                alt="Alipay" />
                        </div>
                        <p>To complete the deposit scan the QR-code and send money to that address</p>
                        <div>
                            <img style={{ maxWidth: '150px' }}
                                 src={qrCodeLink}
                                 alt="qrCode"
                            />
                        </div>
                    </div>}
                <h4>Amount to transfer: {depositAmount} {coinName}</h4>
                <p>Tokens will be transferred to your account in 24 hours</p>
                <Trigger close={this.props.modal_id} >
                    <div style={{ minWidth: '100px' }} className="button"><Translate content="gateway.rmbpay.ok" /></div>
                </Trigger>
            </div>)
    }
}

export default DepositRmbpayQr;