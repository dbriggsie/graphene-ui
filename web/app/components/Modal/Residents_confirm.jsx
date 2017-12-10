import React from "react";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Modal from "react-foundation-apps/src/modal";
import Trigger from "react-foundation-apps/src/trigger";
import utils from "common/utils";
import Translate from "react-translate-component";

export default class Residents_confirm extends React.Component {

    static contextTypes = {
        location: React.PropTypes.object.isRequired,
        router: React.PropTypes.object.isRequired
    };


    constructor(props) {
        super(props);

        this.state = {
            null:""
        };
    }

    show() {
        let {type} = this.props;
        ZfApi.publish(type, "open");
    }

    close(e) {
        let {type} = this.props;
        e&&e.preventDefault();

        ZfApi.publish(type, "close");
    }

    setNestedRef(ref) {
        this.nestedRef = ref;
    }


    reg_continue(){
        ZfApi.publish(this.props.type, "close");
        //localStorage.setItem("airbitz_backup_option","true")
        //console.log('@>airbitz_backup_option login', JSON.parse(localStorage.getItem("airbitz_backup_option")));
        console.log('@>this.props.type',this.props.type)
        this.context.router.push(`/create-account/${window._type_registration_wallet||"wallet"}`);
    }

    resident_failed(){
        ZfApi.publish(this.props.type, "close");
        this.context.router.push("/residents-unsupported");
    }

    render() {

        let {type} = this.props;

        console.log('@>type_registration_wallet',window._type_registration_wallet)

        return (
            <Modal id={type} overlay={true} ref={type}>
                <Trigger close={type}>
                    <a href="#" className="close-button">&times;</a>
                </Trigger>
                <p>{""}</p>
                <Translate component="p" content="popups.residents" />
                <p>United States</p>

                <div className="grid-block vertical">
                    <div className="button-group" style={{paddingTop: "2rem"}}>
                        <a onClick={(e)=>{this.resident_failed(e)}} className="button white_color_a"><Translate content="popups.residents_yes" /></a>
                        <a onClick={(e)=>{this.reg_continue(e)}} className="button white_color_a"><Translate content="popups.residents_no" /></a>
                    </div>
                </div>
            </Modal>
        );
    }
}
