import React, { Component } from "react";
import Translate from "react-translate-component";
import Trigger from "react-foundation-apps/src/trigger";
import Icon from "components/Icon/Icon";

class DepositVesnaInvoice extends Component {

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        //this._downloadInvoice();
    }

    _downloadInvoice() {
        window.open(SERVER_ADMIN_URL + this.props.linkInvoice);
    }

    render() {
        const { depositAmount } = this.props;
        return (
            <div className="grid-container center-content">
                <h4 style={{marginBottom: "1rem", borderBottom: 'none'}}><Translate unsafe component="div" content="gateway.usd_vesna.email" /></h4>
                <p><Translate unsafe content="gateway.usd_vesna.deposit_amount_text" amount={depositAmount} email={this.props.email} /></p>
                <div style={{marginTop: "2rem"}} className="buttons-block-center mb_6">
                    <div className="button" onClick={this._downloadInvoice.bind(this)}><Translate content="gateway.usd_vesna.open_invoice" /></div>
                    <Trigger close={this.props.modalId} >
                        <div className="button cancel"><Translate content="transfer.close" /></div>
                    </Trigger>
                </div>
            </div>)
    }
}

export default DepositVesnaInvoice;