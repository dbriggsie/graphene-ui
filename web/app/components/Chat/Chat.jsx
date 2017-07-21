import React from "react";
import { connect } from "alt-react";
import AccountStore from "stores/AccountStore";
import Translate from "react-translate-component";
import Icon from "../Icon/Icon";
import {ChainStore} from "bitsharesjs/es";
import {debounce} from "lodash";
import SettingsActions from "actions/SettingsActions";
import SettingsStore from "stores/SettingsStore";
import utils from "common/utils";
import counterpart from "counterpart";
import LoadingIndicator from "../LoadingIndicator";
import AccountActions from "actions/AccountActions";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import {FetchChainObjects} from "bitsharesjs/es";
import TimeAgo from "../Utility/TimeAgo";

let from_local = ["2012-07-14 10:23:00","2013-07-14 11:23:22"];

let from_server = {
    "2011-07-14 08:23:00": {
        title: "Blockchain Real Use Case: Land Inventory in Africa and Beyond",
        content: "In developing countries the right to own landed properties as a priority can be placed just behind the right to life.Using Nigeria as a typical example, every piece of land is claimed, whether on record or not. Besides lands found almost in the middle of nowhere, ancestral owne!",
        type: "news",
        link: "https://blog.openledger.info/2017/03/03/obits-is-now-listed-on-livecoin%e2%80%8a-%e2%80%8amajor-altcoin-exchange/"
    },
    "2012-07-14 10:23:00": {
        title: "Wrong adress in bitcoin",
        content: "Wrong adress a record! Over 222 bitcoin Wrong adressg the OBITS Wrong adressast Sunday. The entire supply of OBITS is now available",
        type: "warning",
        link: "https://blog.openledger.info/2017/03/08/ronny-boesing-center-stage-at-the-blockchain-bitcoin-conference-tallinn/"
    },
    "2013-07-14 11:23:22": {
        title: "Milestone in fact",
        content: "50,000 signed-ups users milestone in fact, already 52,518 and we have been growing by 500",
        type: "news",
        link: "https://blog.openledger.info/2017/06/09/denmark-based-openledger-inks-deal-with-chinese-company-raising-11-million-dkk/"
    },
    "2014-08-11 07:13:00": {
        title: "ZenGold Special",
        content: "Developed on the Metaverse Blockchain, ZenGold creates crypto assets that are backed by physical gold enabling investors to instantly buy and transfer gold, in any quantity, anywhere in the worl",
        type: "news",
        link: "https://blog.openledger.info/2017/05/27/zengold-special-ico-prelaunch-exclusively-on-openledger/"        
    }
};
from_server = {"2011-07-14 08:23:00":{"id":"6","title":"Blockchain Real Use Case: Land Inventory in Africa and Beyond","content":"In developing countries the right to own landed properties as a priority can be placed just behind the right to life.Using Nigeria as a typical example, every piece of land is claimed, whether on record or not. Besides lands found almost in the middle of ","type":"news","link":"https:\/\/blog.openledger.info\/2017\/03\/03\/obits-is-now-listed-on-livecoin%e2%80%8a-%e2%80%8amajor-altcoin-exchange\/","show_news":"1"},"2012-07-14 10:23:00":{"id":"8","title":"Wrong adress in bitcoin","content":"In developing countries the right to own landed properties as a priority can be placed just behind the right to life.Using Nigeria as a typical example, every piece of land is claimed, whether on record or not. Besides lands found almost in the middle of ","type":"warning","link":"https:\/\/blog.openledger.info\/2017\/03\/08\/ronny-boesing-center-stage-at-the-blockchain-bitcoin-conference-tallinn\/","show_news":"1"},"2013-07-14 11:23:22":{"id":"9","title":"Milestone in fact","content":"50,000 signed-ups users milestone in fact, already 52,518 and we have been growing by 500","type":"news","link":"https:\/\/blog.openledger.info\/2017\/06\/09\/denmark-based-openledger-inks-deal-with-chinese-company-raising-11-million-dkk\/","show_news":"1"},"2014-08-11 07:13:00":{"id":"10","title":"ZenGold Special","content":"Developed on the Metaverse Blockchain, ZenGold creates crypto assets that are backed by physical gold enabling investors to instantly buy and transfer gold, in any quantity, anywhere in the worl","type":"news","link":"https:\/\/blog.openledger.info\/2017\/05\/27\/zengold-special-ico-prelaunch-exclusively-on-openledger\/","show_news":"0"}};

class Chat extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            messages: [{
                user: counterpart.translate("chat.welcome_user"),
                message: counterpart.translate("chat.welcome"),
                color: "black"
            }],
            readed:JSON.parse(localStorage.getItem("readed"))||[],
            news:{},
            showChat: props.viewSettings.get("showChat", true),
            myColor: props.viewSettings.get("chatColor", "#904E4E"),
            shouldScroll: true,
            loading: true,
            chat_error:true,
            docked: props.viewSettings.get("dockedChat", false),
            hasFetchedHistory: false
        };

        this.get_news(this);
        setInterval(()=>{this.get_news(this)}, 20000);

    }

    /*shouldComponentUpdate(nextProps, nextState) {
        return (
            !utils.are_equal_shallow(nextProps, this.props) ||
            !utils.are_equal_shallow(nextState, this.state)
        );
    }*/

    componentDidUpdate(prevProps) {
        if (this.props.footerVisible !== prevProps.footerVisible) {
            this._scrollToBottom();
        }
    }

    componentWillMount() {
        //this._connectToServer();
    }

    componentWillUnmount() {

    }

    get_news(context,e) {
        e&&e.preventDefault&&e.preventDefault(); 

        //1000-01-01 00:00:00 DATETIME //new Date("2011-07-14 11:23:00".replace(/-/g,"/"));

        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://openledger.info', true); // 'your api adress'
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.onreadystatechange = function() {
            if (this.readyState != 4) return;
           // var ans = JSON.parse(this.responseText);

           let { readed } = context.state;


           context.setState({
                loading:false,
                news:from_server,
                chat_error:false //@>
           });

            /*if (ans && ans.error) {
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
            }*/

        }
        xhr.send();
    }


    _scrollToBottom() {
        if (this.refs.chatbox && this.state.shouldScroll) {
            this.refs.chatbox.scrollTop = this.refs.chatbox.scrollHeight;
        }
    }

    _onScroll(e) {
        let {scrollTop, scrollHeight, clientHeight} = this.refs.chatbox;

        let shouldScroll = scrollHeight - scrollTop <= clientHeight;
        if (shouldScroll !== this.state.shouldScroll) {
            this.setState({
                shouldScroll: shouldScroll
            });
        }
    }


    onToggleChat(e) {
        e.preventDefault();
        let showChat = !this.state.showChat;
        this.setState({
            showChat: showChat,
            docked: (!showChat && this.state.docked) ? false : this.state.docked
        });

        SettingsActions.changeViewSetting({
            showChat: showChat,
            dockedChat: (!showChat && this.state.docked) ? false : this.state.docked
        });
    }

    onToggleSettings(e) {
        let newValue = !this.state.showSettings;
        this.setState({
            showSettings: newValue
        }, () => {
            if (!newValue) {
                this._scrollToBottom();
            }
        });
    }

    onChangeColor(e) {

        if (this.refs.colorInput) {
            console.log("change color:", this.refs.colorInput.value);
            this.setState({
                myColor: this.refs.colorInput.value
            });

            SettingsActions.changeViewSetting({
                chatColor: this.refs.colorInput.value
            });
        }
    }

    disableChat(e) {
        e.preventDefault();
        SettingsActions.changeViewSetting({
            showChat: false
        });
        SettingsActions.changeSetting({
            setting: "disableChat",
            value: true
        });
    }

    _set_reader(news_date){
        let { readed } = this.state;
        if(readed.indexOf(news_date)==-1){
            readed.push(news_date);
            this.setState({
                readed:readed
            },localStorage.setItem("readed",JSON.stringify(readed)));
        }        

    }

    render() {

        let {loading, docked, showChat, news, readed, chat_error} = this.state;    

        let telegram = (<div className="telegramm_messsage">
            <Translate component="p" content="chat.wesorry" />
            <Translate component="p" content="chat.butserverwith" />
            <Translate component="p" content="chat.pleasejoin" />
            <a target="_blank" href="https://telegram.me/OpenLedgerDC">@OpenLedgerDC</a>
        </div>);

        let news_list = [];
        let need_to_readed = 0;

        for(let i in news){
            if(!parseInt(news[i].show_news)){
                continue;
            }

            if(readed.indexOf(i)==-1){
                need_to_readed+=1;
            }

           let i1 = news[i];
           news_list.push( <li key={i} className="news_li" > 
               <a className="news_ancor" href={i1.link} target="_blank" onClick={(e)=>{this._set_reader(i)}} >
                   <p className="news_title">{i1.title}</p>
                   <p className="news_date">{i}</p>
                   <p className="news_content">{i1.content.slice(0,90)}...</p>
               </a>
           </li> );
        }

        showChat = (showChat || need_to_readed);

        let chatStyle = {
            display: !showChat ? "none" : !docked ?"block" : "inherit",
            float: !docked ? "right" : null,
            height: !docked ? 35 : null,
            margin: !docked ? "0 .5em" : null,
            width: !docked ? 350 : 300,
            marginRight: !docked ? "1rem" : null
        };

        return (
            <div
                id="chatbox"
                className={docked ? "chat-docked grid-block" : "chat-floating"}
                style={{
                    bottom: this.props.footerVisible && !docked ? 36 : null,
                    height: !docked ? 35 : null
                }}
            >
                {!showChat ?
                <a className="toggle-controlbox" onClick={this.onToggleChat.bind(this)}>
                    <span className="chat-toggle"><Translate content="chat.button" />{need_to_readed?`(${need_to_readed})`:null}</span>
                </a> : null}

                <div style={chatStyle} className={"chatbox"}>
                    <div className={"grid-block main-content vertical " + (docked ? "docked" : "flyout")} >
                        <div className="chatbox-title grid-block shrink">
                            <Translate content="chat.title" /> {need_to_readed?`(${need_to_readed})`:null}
                            <a onClick={this.onToggleChat.bind(this)} className="chatbox-close">&times;</a>
                        </div>

                        {loading ? <div><LoadingIndicator /></div> :  (
                        <div className="grid-block vertical chatbox">
                            {chat_error?telegram:(<ul className="news_list">{news_list}</ul>)}                                            
                        </div>)}
                        { /*showSettings*/}
                    </div>
                </div>
            </div>
        );
    }
}

class SettingsContainer extends React.Component {

    render() {
        if (!this.props.accountsReady) return null;
        return <Chat {...this.props} />;
    }
}

export default connect(SettingsContainer, {
    listenTo() {
        return [AccountStore, SettingsStore];
    },
    getProps() {
        return {
            currentAccount: AccountStore.getState().currentAccount,
            linkedAccounts: AccountStore.getState().linkedAccounts,
            viewSettings: SettingsStore.getState().viewSettings,
            accountsReady: AccountStore.getState().accountsLoaded && AccountStore.getState().refsLoaded
        };
    }
});
