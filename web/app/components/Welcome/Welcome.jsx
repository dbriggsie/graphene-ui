import React from "react";
import {Link} from "react-router/es";
import Translate from "react-translate-component";

export default class Welcome extends React.Component {

    onSelect(route) {
        this.props.router.push("/create-account/" + route);
    }

    render() {
        return (
            <div className="grid-block align-center">
                <div className="grid-block shrink vertical">
                    <div className="grid-content shrink text-center account-creation welcome">
                        <div>
                            <img src="/app/assets/logo.png" alt="" />                            
                        </div>
                        <Translate content="account.welcome" component="h4"/>
                        <Translate unsafe content="account.centralized" component="h5" />
                        <div className="button-group">
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
