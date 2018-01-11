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
                        <Translate className="font-secondary" component="p" content="gateway.rmbpay.scan_qr" />
                        <div>
                            <img style={{ maxWidth: '150px' }}
                                src={qrCodeLink}
                                alt="qrCode"
                            />
                        </div>
                    </div>}
                <h4>
                    <Translate content="gateway.rmbpay.amount_to_transfer" /> {depositAmount} {coinName}
                </h4>
                <Translate className="font-secondary" component="p" content="gateway.rmbpay.transfer_24_h" />
                <Trigger close={this.props.modal_id} >
                    <div style={{ minWidth: '100px' }} className="button"><Translate content="gateway.rmbpay.ok" /></div>
                </Trigger>
            </div>)
    }
}

export default DepositRmbpayQr;