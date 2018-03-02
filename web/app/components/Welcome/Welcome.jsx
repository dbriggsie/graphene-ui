import React from "react";
import { connect } from "alt-react";
import AccountStore from "stores/AccountStore";
import {Link} from "react-router/es";
import Translate from "react-translate-component";
import ActionSheet from "react-foundation-apps/src/action-sheet";
import SettingsStore from "stores/SettingsStore";
import IntlActions from "actions/IntlActions";

const FlagImage = ({flag, width = 50, height = 50}) => {
    return <img height={height} width={width} src={`/app/assets/language-dropdown/img/${flag.toUpperCase()}.png`} />;
};

class Welcome extends React.Component {

    constructor(props){
        super(props);

        this.state = {
            locales: SettingsStore.getState().defaults.locale,
            currentLocale: SettingsStore.getState().settings.get("locale")
        };
    }

    componentDidUpdate() {
        const myAccounts = AccountStore.getMyAccounts();

        // use ChildCount to make sure user is on /create-account page except /create-account/*
        // to prevent redirect when user just registered and need to make backup of wallet or password
        const childCount = React.Children.count(this.props.children);

        // do redirect to portfolio if user already logged in
        if(Array.isArray(myAccounts) && myAccounts.length !== 0 && childCount === 0)
            this.props.router.push("/account/"+this.props.currentAccount);
    }

    onSelect(route) {
        this.props.router.push("/create-account/" + route);
    }

    render() {
        const translator = require("counterpart");

        const childCount = React.Children.count(this.props.children);


        const flagDropdown = <ActionSheet>
            <ActionSheet.Button title="" style={{width:"64px"}}>
                <a style={{padding: "2rem 2rem 2rem 2.8rem", border: "none"}} className="arrow-down-styling arrow-login-langeages">
                    <FlagImage flag={this.state.currentLocale} />
                </a>
            </ActionSheet.Button>
            <ActionSheet.Content>
                <ul className="no-first-element-top-border">
                    {this.state.locales.map(locale => {
                        return (
                            <li key={locale}>
                                <a href onClick={(e) => {e.preventDefault(); IntlActions.switchLocale(locale); this.setState({currentLocale: locale});}}>
                                    <div className="table-cell"><FlagImage width="20" height="20" flag={locale} /></div>
                                    <div className="table-cell" style={{paddingLeft: 10}}><Translate content={"languages." + locale} /></div>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </ActionSheet.Content>
        </ActionSheet>;

        return (
            <div className="grid-block align-center">
                <div className="grid-block shrink vertical">
                    <div className="grid-content shrink text-center account-creation welcome">
                        <div>
                            <img src="/app/assets/logo.png" alt="" />                            
                        </div>
                        <Translate content="account.welcome" component="h4"/>
                        <Translate unsafe content="account.centralized" component="h5" />

                        <div className="mt_6">
                            {flagDropdown}
                        </div>

                        <div className="button-group buttons-block-center">
                            <label style={{textAlign: "left"}}><Translate content="account.new_user" /><br/>
                                <Link to="/create-account">
                                    <div className="button">
                                        <Translate content="header.create_account" />
                                    </div>
                                </Link>
                            </label>

                            <label style={{textAlign: "left"}}><Translate content="account.existing_user" /><br/>
                                <Link to="/login">
                                    <div className="button">
                                        <Translate content="header.unlock_short" />
                                    </div>
                                </Link>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}


export default connect(Welcome, {
    listenTo() {
        return [AccountStore];
    },
    getProps() {
        return {
            currentAccount: AccountStore.getState().currentAccount || AccountStore.getState().passwordAccount,
        };
    }
});
