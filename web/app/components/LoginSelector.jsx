import React from "react";
import {Link} from "react-router";
import Translate from "react-translate-component";

export default class LoginSelector extends React.Component {

    onSelect(route) {
        this.props.router.push("/create-account/" + route);
    }

    render() {
        if (this.props.children) {
            return this.props.children;
        }
        return (
            <div className="grid-content" style={{paddingTop: 30}}>
                
                <div className="create_account_index " >
                    <img src="/app/assets/logo.png" alt=""/> 
                    <h1 >OpenLedger</h1>
                    {/*<span>Blockchain Powered. People Driven.</span>*/}
                    <h3 >Welcome to the OpenLedger Decentralized Exchange (DEX)</h3>
                    <p>
The OpenLedger DEX is a cryptocurrency trading platform acting as the host and skeleton for constant innovation. <br />
Designed for high-speed transactions, the OpenLedger DEX allows you to trade assets in real time, securely, with ultra-low fees.
                    </p>
                    <Translate content="wallet.login_type" component="h4" />
                    <div className="index_button_section" >
                        <div className="button"><Link to="/create-account/wallet"><Translate content="wallet.use_wallet" /></Link></div>
                        <div className="button"><Link to="/create-account/password"><Translate content="wallet.use_password" /></Link></div>
                    </div>
                </div>


               
                <div className="grid-block small-10 login-selector">
                    <div className="box small-12 large-6" onClick={this.onSelect.bind(this, "wallet")}>
                        <div className="block-content-header" style={{position: "relative"}}>
                            <Translate content="wallet.wallet_model" component="h3" />
                            <Translate content="wallet.wallet_model_sub" component="h4" />
                        </div>
                        <div className="box-content">
                            {
                            //<Translate content="wallet.wallet_model_1" component="p" /> 
                            }
                            <Translate content="wallet.wallet_model_2" component="p" />

                            <Translate unsafe content="wallet.wallet_model_3" component="ul" />
                        </div>
                        {   
                        //<div className="button"><Link to="/create-account/wallet"><Translate content="wallet.use_wallet" /></Link></div>
                        }

                    </div>

                    <div className="box small-12 large-6 vertical" onClick={this.onSelect.bind(this, "password")}>
                        <div className="block-content-header" style={{position: "relative"}}>
                            <Translate content="wallet.password_model" component="h3" />
                            <Translate content="wallet.password_model_sub" component="h4" />
                        </div>
                        <div className="box-content">
                            {
                            //<Translate content="wallet.password_model_1" component="p" />
                            }
                            <Translate content="wallet.password_model_2" unsafe component="p" />

                            <Translate unsafe content="wallet.password_model_3" component="ul" />
                        </div>
                        {
                        //<div className="button"><Link to="/create-account/password"><Translate content="wallet.use_password" /></Link></div>  
                        }
                    </div>
                </div>

            </div>
        );
    }
}
