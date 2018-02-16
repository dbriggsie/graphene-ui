import React from "react";
import {PropTypes} from "react";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Modal from "react-foundation-apps/src/modal";
import Trigger from "react-foundation-apps/src/trigger";

class BaseModal extends React.Component {
    constructor() {
        super();
    }

    componentDidMount(){
        this.modalEscapeListener = function(e){
            if(e.keyCode === 27){
                ZfApi.publish(this.props.id, "close");
            }
        }.bind(this);

        document.addEventListener("keydown", this.modalEscapeListener);
    }

    componentWillUnmount(){
        document.removeEventListener("keydown", this.modalEscapeListener);
    }

    clearInputModal(){
        ZfApi.publish(this.props.id, "close");
    }

    render() {
        const { props } = this;
        let {maxWidth, clearInput} = this.props;

        return (
            <Modal id={this.props.id} overlay={props.overlay} onClose={props.onClose} className={props.className} overlayClose={false}>
                {!props.noCloseBtn && <Trigger close={props.id}>
                    <a href="#" onClick={this.clearInputModal.bind(this)} className="close-button">&times;</a>
                </Trigger>}
                {props.children}
            </Modal>
        );
    }
}

BaseModal.defaultProps = {
    overlay: false,
}

BaseModal.propTypes = {
    id: PropTypes.string.isRequired,
    onClose: PropTypes.func,
    className: PropTypes.string,
    overlay: PropTypes.bool,
    overlayClose: PropTypes.bool,
    noCloseBtn: PropTypes.bool
};

export default BaseModal;
