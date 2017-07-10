import React, { Component } from 'react';

import Trigger from "react-foundation-apps/src/trigger";
import Modal from "react-foundation-apps/src/modal";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import Translate from "react-translate-component";
import counterpart from "counterpart";

class Popups extends Component {
    constructor() {
        super();
        this.state = {
            open: false,
            error: "",
            answer: ""
        };
    }

    submit_subs(e) {
        e.preventDefault();
        var subs_name = this.refs.subs_name.value;
        var subs_email = this.refs.subs_email.value;
        var context = this;

        if (!subs_name || !subs_email) {
            this.setState({
                error: counterpart.translate("popups.input")
            });
            return;
        } else if (/.+@.+\..+/i.test(subs_email) == false) {

            this.setState({
                error: counterpart.translate("popups.email_error")
            });
            return;
        } else {
            this.setState({
                error: ""
            });
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://ccpayt.com/crypto/mailchimp.api/api/index.php', true); // 'your api adress'
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=utf-8');
        xhr.onreadystatechange = function() {
            if (this.readyState != 4) return;
            var ans = JSON.parse(this.responseText);

            if (ans && ans.error) {
                context.setState({
                    error: ans.error
                });
            } else if (ans && !ans.error) {
                context.setState({
                    error: "",
                    answer: counterpart.translate("popups.thanks")
                });
            }

        }
        var message = "popEmail=" + subs_email + "&popName=" + subs_name;
        xhr.send(message);
    }

    add_coin(e) {
        e.preventDefault();
        var context = this;
        let ob = {};
        ob.personname = this.refs.personname.value;
        ob.email = this.refs.email.value;
        ob.coinfullname = this.refs.coinfullname.value;
        ob.repository = this.refs.repository.value;
        ob.website = this.refs.website.value;
        ob.details = this.refs.details.value;

        let error_p = "";
        let request_p = [];

        for (let i in ob) {
            if (!ob[i]) {
                error_p += ` ${i}`;
            } else {
                request_p.push(`${i}=${ob[i]}`);
            }
        }

        if (error_p.length) {
            this.setState({
                error: counterpart.translate("popups.please_input") + error_p
            });
            return;
        } else if (/.+@.+\..+/i.test(ob.email) == false) {

            this.setState({
                error: counterpart.translate("popups.email_error")
            });
            return;
        } else {
            this.setState({
                error: ""
            });
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://openledger.info/create_asset/action_create_asset.php', true); // 'your api adress'
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
        xhr.onreadystatechange = function() {
            if (this.readyState != 4) return;
            var ans = JSON.parse(this.responseText);

            if (ans && ans.error) {
                context.setState({
                    error: ans.error
                });
                return;
            } else if (ans && !ans.error) {
                context.setState({
                    error: "",
                    answer: ans.text
                });
                return;
            }

        }
        var message = request_p.join("&");
        xhr.send(message);
    }

    show(modal_id) {
        this.setState({ open: true }, () => {
            ZfApi.publish(modal_id, "open");
        });
    }

    onClose() {
        this.setState({ open: false });
    }

    componentDidMount() {

        if (!__ELECTRON__) {
            window._show_footer_popup = () => { this.show("addcoin") }

            if (window.location.search == "?addcoin") {
                this.show("addcoin");
            }
        }
    }

    render() {

        return (
            <div className="popups grid-block" >
                <Modal onClose={this.onClose.bind(this)} id={"subscribe"} overlay={true} className="test">
                    <Trigger close={"subscribe"}>
                        <a href="#" className="close-button">&times;</a>
                    </Trigger>
                    <div className="grid-block vertical full-width-content" >
                        <div className="content-block">
                            <Translate component="h3" content="popups.sign_up"/>
                        </div>
                        <p className="error" >{this.state.error}</p>
                        <p className="addcoin_text" >{counterpart.translate("popups.get_latest")}</p>
                        <form style={{"padding":"30px 0 20px"}} >
                            <input type="text" ref="subs_name" placeholder={counterpart.translate("popups.your_name")} />
                            <input type="text" ref="subs_email" placeholder={counterpart.translate("popups.your_email")} />
                            <input type="button" value={counterpart.translate("popups.subscribe")} className="button" onClick={(e)=>{this.submit_subs(e)}} />
                            {this.state.answer}                         
                        </form>
                    </div>      
                </Modal>
                <Modal onClose={this.onClose.bind(this)} id={"addcoin"} overlay={true} className="test">
                    <Trigger close={"addcoin"}>
                        <a href="#" className="close-button">&times;</a>
                    </Trigger>
                    <div className="grid-block vertical full-width-content" >
                        <div className="content-block">
                            <Translate component="h3" content="popups.listing"/>
                        </div>
                        <p className="addcoin_text" >{counterpart.translate("popups.dear_coin")}</p>
                        <p className="error" >{this.state.error}</p>
                        <form style={{"padding":"10px 0 20px"}} >
                            <input type="text" ref="personname" placeholder={counterpart.translate("popups.contact_person")}  />
                            <input type="email" ref="email" placeholder={counterpart.translate("popups.contact_email")} />
                            <input type="text" ref="coinfullname" placeholder={counterpart.translate("popups.full_name")} />
                            <input type="text" ref="repository" placeholder={counterpart.translate("popups.link_to")} />
                            <input type="text" ref="website" placeholder={counterpart.translate("popups.official_website")} />
                            <textarea ref="details" cols="1" defaultValue={counterpart.translate("popups.detailed")} rows="2"></textarea>
                            <input type="button" value={counterpart.translate("popups.add_coin")} className="button" onClick={(e)=>{this.add_coin(e)}} />
                            {this.state.answer}                         
                        </form>
                    </div>      
                </Modal>                
                <div className="grid-block pointer" onClick={()=>{this.show("subscribe")}} >{counterpart.translate("popups.sign_up")}</div>
                <div className="grid-block pointer" onClick={()=>{this.show("addcoin")}} >{counterpart.translate("popups.add_coin")}</div>
            </div>
        );
    }
}


class Youtube extends Component {
    constructor() {
        super();
        this.state = {
            open: false
        };
    }

    show(modal_id) {
        this.setState({ open: true }, () => {
            ZfApi.publish(modal_id, "open");
        });
    }

    onClose() {
        this.setState({ open: false });
    }

    render() {
        return (<div className="sec_video pointer"> 
                    <div onClick={()=>{this.show("youtube")}} className="youtube_icon" ></div>
                    <Modal onClose={this.onClose.bind(this)} id={"youtube"} overlay={true} className="test">
                        <Trigger close={"youtube"}>
                            <a href="#" className="close-button">&times;</a>
                        </Trigger>
                        <div >
                            &nbsp;
                            <iframe width="100%" height="520" src="https://www.youtube.com/embed/JG_XiOdbum8?rel=0" frameBorder="0" allowFullScreen></iframe>
                        </div>      
                    </Modal>
                </div>   
        );
    }
}





export {Youtube};
export default Popups;


//counterpart.translate("tooltip.cant_buy")
