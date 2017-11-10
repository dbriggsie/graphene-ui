import React from "react";
import { Link } from "react-router";
import Translate from "react-translate-component";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";

if (localStorage.getItem("airbitz_backup_option") === null) {
    localStorage.setItem("airbitz_backup_option", "true")
}

export default class LoginSelector extends React.Component {

    static contextTypes = {
        location: React.PropTypes.object.isRequired,
        router: React.PropTypes.object.isRequired
    };

    constructor(context) {


        super();
        this.state = {
            airbitz_backup_option: false//JSON.parse(localStorage.getItem("airbitz_backup_option"))
        };

        this.show_registration_choose = this.show_registration_choose.bind(this);

    }

    componentDidUpdate() {
        // if (this.state.airbitz_backup_option !== JSON.parse(localStorage.getItem("airbitz_backup_option"))) {
        //     this.setState({
        //         airbitz_backup_option: JSON.parse(localStorage.getItem("airbitz_backup_option"))
        //     });
        // }
    }

    onSelect(route) {
        this.props.router.push("/create-account/" + route);
    }


    show_registration_choose(e) {
        e && e.preventDefault && e.preventDefault();
        localStorage.setItem("airbitz_backup_option", "false")
        this.setState({
            airbitz_backup_option: false
        });
    }


    open_residents_confirm(type_registration_wallet, e) {
        window._type_registration_wallet = type_registration_wallet;
        ZfApi.publish("residents_confirm", "open");
    }

    render() {

        let { airbitz_backup_option } = this.state;

        console.log('@>airbitz_backup_option', airbitz_backup_option)

        if (this.props.children) {
            return this.props.children;
        }
        return (

            <div className="grid-block align-center">
                <div className="grid-block shrink vertical">
                    <div className="grid-content shrink account-creation">
                        <div className="create_account_index text-center">
                            <img src="/app/assets/logo.png" alt="" />
                            <Translate content="account.welcome" component="h3" />
                               
                        </div>

                        {(() => {
                            return (<div className="grid-block login-selector align-center">
                                <div className="box large-6">
                                    <div className="block-content-header" style={{ position: "relative" }}>
                                        <Translate content="wallet.wallet_model" component="h3" />
                                        <Translate content="wallet.wallet_model_sub" component="h4" style={{ paddingTop: 5 }} />
                                    </div>
                                    <div className="box-content">
                                        {
                                            //<Translate content="wallet.wallet_model_1" component="p" /> 
                                        }
                                        <Translate content="wallet.wallet_model_2" component="p" />

                                        <Translate unsafe content="wallet.wallet_model_3" component="ul" />


                                    </div>
                                    <Translate className="button" style={{alignSelf:"flex-start"}} onClick={this.onSelect.bind(this, "wallet")} content="wallet.use_wallet" />
                                    {
                                        //<div className="button"><Link to="/create-account/wallet"><Translate content="wallet.use_wallet" /></Link></div>
                                    }

                                </div>

                                <div className="box large-6">
                                    <div className="block-content-header" style={{ position: "relative" }}>
                                        <Translate content="wallet.password_model" component="h3" />
                                        <Translate content="wallet.password_model_sub" component="h4" style={{ paddingTop: 5 }} />
                                    </div>
                                    <div className="box-content">
                                        {
                                            //<Translate content="wallet.password_model_1" component="p" />
                                        }
                                        <Translate unsafe content="wallet.password_model_2" component="p" />
                                        <Translate unsafe content="wallet.password_model_3" component="ul" />
                                        <Translate className="button" onClick={this.onSelect.bind(this, "password")} content="wallet.use_password" />
                                    </div>
                                    {
                                        //<div className="button"><Link to="/create-account/password"><Translate content="wallet.use_password" /></Link></div>  
                                    }
                                </div>
                            </div>);

                        })()}


                    </div>
                </div>
            </div>
        );
    }
}
