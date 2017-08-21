import React from "react";
import {Link} from "react-router";
import Translate from "react-translate-component";

export default class LoginSelector extends React.Component {

    constructor(){

        super();
        this.state={
            //show_registration_choose:false
            show_registration_choose:true
        };            
        

    }

    onSelect(route) {
        this.props.router.push("/create-account/" + route);
    }

    render() {

        let { show_registration_choose } = this.state;

        if (this.props.children) {
            return this.props.children;
        }
        return (
            <div className="grid-content" style={{paddingTop: 30}}>
                
                <div className="create_account_index " >
                    <img src="/app/assets/logo.png" alt=""/> 
                    <h1 >OpenLedger</h1>
                    {/*<span>Blockchain Powered. People Driven.</span>*/}
                    <Translate content="wallet.welcome_to_the" component="h3" />
                    <Translate content="wallet.create_account_description" component="p" unsafe />
                    {show_registration_choose?<Translate content="wallet.login_type" component="h4" />:null}
                    {show_registration_choose?<div className="index_button_section" >
                        <div className="button"><Link to="/create-account/wallet"><Translate content="wallet.use_wallet" /></Link></div>
                        <div className="button"><Link to="/create-account/password"><Translate content="wallet.use_password" /></Link></div>
                    </div>:null}

                </div>

                {(()=>{
                    if(show_registration_choose){
                        return (<div className="grid-block small-10 login-selector">
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
                                    <Translate unsafe content="wallet.password_model_2"  component="p" />
                                    <Translate unsafe content="wallet.password_model_3" component="ul" />
                                </div>
                                {
                                //<div className="button"><Link to="/create-account/password"><Translate content="wallet.use_password" /></Link></div>  
                                }
                            </div>
                        </div>);
                    }else{
                        return (<div className="grid-block small-10 login-selector">
                                    <div className="box-content">
                                        <div className="button create_acc_button">
                                            <Link to="/create-account/password">
                                                <Translate unsafe content="wallet.airbitz_create_wallet" component="p" />
                                            </Link>
                                        </div>
                                        <p className="create_acc_button_another" onClick={()=>{}} >or <a href="#">create account without Airbitz security</a></p>
                                    </div>
                                    <Translate unsafe content="wallet.airbitz_full_description" className="create_acc_airbitz_description" component="p" />
                                    <div className="create_acc_login">
                                        <Translate unsafe content="wallet.have_an_old" component="span" /> &nbsp;
                                        <a href="#" className="create_acc_airbitz_description" >
                                            <Translate unsafe content="wallet.login_here" component="span" />
                                        </a>
                                    </div>
                                </div>);
                    }                    

                })()}
               


            </div>
        );
    }
}
