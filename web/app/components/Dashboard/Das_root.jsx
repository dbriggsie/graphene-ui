import React from "react";
import {Link} from "react-router/es";
import Immutable from "immutable";
import DashboardList from "./DashboardList";
import { RecentTransactions } from "../Account/RecentTransactions";
import Translate from "react-translate-component";
import MarketCard from "./MarketCard";
import utils from "common/utils";
import { Apis } from "bitsharesjs-ws";
import LoadingIndicator from "../LoadingIndicator";
import counterpart from "counterpart";

import AccountStore from "stores/AccountStore";
import SettingsStore from "stores/SettingsStore";
import MarketsStore from "stores/MarketsStore";
import AltContainer from "alt-container";


class Das_root extends React.Component {

    constructor() {
        super();
        let marketsByChain = {
            "4018d784":[
                ["OPEN.BTC", "BTS", false],
                ["OPEN.BTC", "OPEN.ETH"],
                ["OPEN.BTC", "OPEN.STEEM"],
                ["USD", "EDEV"],
                ["USD", "REALITY"],
                ["OPEN.BTC", "ICOO"],
                ["BTS", "OBITS"],
                ["BTS", "BTSR"],
                ["USD", "APPX.WARRANT"],
                ["CNY", "YOYOW"],
                ["USD", "ZENGOLD"],
                ["USD", "OPEN.ETP"],
                ["BTS", "USD"],
                ["BTS", "EUR"],
                ["BTS", "CNY"],
                ["USD", "OBITS.WARRANT"]
            ],
            "39f5e2ed": [
                ["TEST", "PEG.FAKEUSD"],
                ["TEST", "BTWTY"]
            ]
        };
        let chainID = Apis.instance().chain_id;
        if (chainID) chainID = chainID.substr(0, 8);

        this.state = {
            featuredMarkets: marketsByChain[chainID] || marketsByChain["4018d784"],
            newAssets: [],
            error:""
        };

    }

    componentDidMount() {
        //window.addEventListener("resize", this._setDimensions, {capture: false, passive: true});
    	let landing = this.refs.landing.parentNode;

       
        // Fixed header
        landing.onscroll = function() {
            let scrolled = landing.pageYOffset || landing.scrollTop;
            scrolled > 0 ? $('.g_header').addClass('scroll'): $('.g_header').removeClass('scroll');
        }
    }

    shouldComponentUpdate(nextProps, nextState) {

    	        if(nextProps.accountsReady){

    	        	setTimeout(()=>{
    	        		this._owl_render();
    	        	},500)
    	        }


        return (
            !utils.are_equal_shallow(nextState.featuredMarkets, this.state.featuredMarkets) ||
            !utils.are_equal_shallow(nextProps.lowVolumeMarkets, this.props.lowVolumeMarkets) ||
            !utils.are_equal_shallow(nextState.newAssets, this.state.newAssets) ||
            // nextProps.marketStats !== this.props.marketStats ||
            nextProps.accountsReady !== this.props.accountsReady ||
            nextState.error !== this.state.error 
        );
    }

    _owl_render(){ 
            $(function(){
                // Carousel
                $('.slider_markets').owlCarousel({
                    loop:true,
                    margin:0,
                    nav:false,
                    autoplay:true,
                    autoplayTimeout:5000,
                    autoplayHoverPause:true,
                    autoplaySpeed: 1500,
                    responsive:{
                        0:{
                            items:1
                        },
                        450:{
                            items:2
                        },
                        750:{
                            items:3
                        },
                        1000:{
                            items:4
                        }
                    }
                });

            });         
    }


    _submit_subs(e) {
        e&&e.preventDefault();
        var subs_email = this.refs.subs_email.value;
        var context = this;

        if (!subs_email) {
            context.setState({
                error: counterpart.translate("popups.input")
            });
            return;
        } else if (/.+@.+\..+/i.test(subs_email) == false) {

            context.setState({
                error: counterpart.translate("popups.email_error")
            });
            return;
        } else {
            context.setState({
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
                    error: ""
                });
                if(e&&e.target){
                	e.target.innerHTML = counterpart.translate("popups.thanks");
                }
            }
        }
        var message = "popEmail=" + subs_email + "&popName=none";

        xhr.send(message);
    }

    render() {

        let { accountsReady, traderMode } = this.props;
        let { featuredMarkets, newAssets} = this.state;
        //console.log('@>',this.props)

        let validMarkets = 0;

        let array_cards = [];

        for (let i1 = 0; i1 < featuredMarkets.length; i1+=1) {
            let className = "";
            let pair = featuredMarkets[i1];
            let isLowVolume = this.props.lowVolumeMarkets.get(pair[1] + "_" + pair[0]) || this.props.lowVolumeMarkets.get(pair[0] + "_" + pair[1]);
            if (!isLowVolume) {
            	validMarkets++;
            }

            let card = (
                <MarketCard
                    key={pair[0] + "_" + pair[1]}
                    marketId={pair[1] + "_" + pair[0]}
                    new={newAssets.indexOf(pair[1]) !== -1}
                    className={className}
                    quote={pair[0]}
                    base={pair[1]}
                    invert={pair[2]}
                    isLowVolume={isLowVolume}
                    hide={validMarkets > 16}
                />
            );

            if(!(i1%2)){
            	array_cards[i1]=[card];
            }else if(featuredMarkets.length>1){
            	array_cards[i1-1].push(card);
            }

        }

        array_cards = array_cards.map( (el,key)=>{
        	return (<div key={key} className="markets_container_vertical">{el}</div>)
        });

        
	    return (
        	<div ref="landing" >
        		<style>
        		{`       			
        			.header, .footer{
        				display:none;
        			}

        		`}
        		</style>
        		<header className="g_header">
			        <div className="menu-btn">
			            <span className="icon menu icon-32px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#FFF" d="M17.5 6h-15a.5.5 0 0 1 0-1h15a.5.5 0 0 1 0 1zM17.5 11h-15a.5.5 0 0 1 0-1h15a.5.5 0 0 1 0 1zM17.5 16h-15a.5.5 0 0 1 0-1h15a.5.5 0 0 1 0 1z"></path></svg></span>
			        </div>
			        <a href="#" className="land_logo">
			            <img src="/app/assets/landing_files/land_logo.svg" alt="OpenLedger" />
			        </a>
			        <ul className="header_social">
			            <li className="fb">
			                <a href="https://www.facebook.com/openledger/?fref=ts" target="_blank"></a>
			            </li>
			            <li className="tw">
			                <a href="https://twitter.com/ccedkopenledger" target="_blank"></a>
			            </li>
			            <li className="in">
			                <a href="https://www.linkedin.com/company/openledger" target="_blank"></a>
			            </li>
			            <li className="you">
			                <a href="https://www.youtube.com/channel/UCZHkjzM5Vp5RH0H_XGBtS0g" target="_blank"></a>
			            </li>
			            <li className="tel">
			                <a href="https://telegram.me/OpenLedgerDC" target="_blank"></a>
			            </li>
			            <li className="gmail">
			                <a href="#" target="_blank"></a>
			            </li>
			            <li className="bell">
			                <a href="#" target="_blank"></a>
			            </li>
			        </ul>
			        <nav className="menu_header">
			            <ul className="pushy pushy-left"> 
			                <li><Link className="lnk_brd_bottom" to={"/market/USD_BTS"}>Exchange</Link></li>
			                <li><a className="lnk_brd_bottom" target="_blank" href="https://blog.openledger.info/">Blog</a></li>
			                <li><Link className="lnk_brd_bottom" to={"/help"}>Help</Link></li>
			            </ul>
			        </nav>
			        <div className="header_enter"> 
			            <Link className="" to={"/create-account"}>Sign up</Link>
			        </div>
			        <div className="site-overlay"></div>
			    </header>
			    <main className="g_wrapper olDarkTheme">
			        <section className="welcome_window">
			            <div className="main_logo">
			                <img src="/app/assets/landing_files/logo_big.svg" alt="OpenLedger" />
			                <div className="main_logo__text">
			                    Blockchain Powered. People Driven.
			                </div>
			            </div>
			            <div className="title_main">
			                Welcome to the OpenLedger Decentralized Exchange (DEX)
			            </div>
			            <p className="main_text">The OpenLedger DEX is a cryptocurrency trading platform acting as the skeleton for constant innovation.
			                <br /> Designed for high-speed transactions, the OpenLedger DEX allows you to trade assets in real time, securely, with ultra-low fees.
			            </p>			            
			            <div className="landCarousel">
				           	{accountsReady?<div className="owl-carousel slider_markets owl-theme">
				            	{array_cards} 
				            </div>:<LoadingIndicator />}
			            </div>
			            	

        			</section>
					<div className="container">
					    <section className="sec_features">
					        <div className="grid-container grid-content">
					            <div className="text-center">
					                <h2>Features</h2>
					                <a href="#"><i className="icon _pdf"></i>Whitepaper</a>
					            </div>
					            <div className="features_info grid-block">
					                <div className="large-5">
					                    <div className="">
					                        <div className="carousel_info__item">
					                            <h5 className="text-yellow font_bold">The OpenLedger DEX - Amazing Trading at Your Fingertips</h5>
					                            <section className="features_section_text">
					                                <div className="text_upper">Speed</div>
					                                <p>We let you send it anywhere in the world within seconds.</p>
					                            </section>
					                            <section className="features_section_text">
					                                <div className="text_upper">Security</div>
					                                <p>You are always in control, and your identity can never be stolen.</p>
					                            </section>
					                            <section className="features_section_text">
					                                <div className="text_upper">Acceptance</div>
					                                <p>You can spend your money instantly using both mobile app and QR codes, and soon, anywhere major debit cards are accepted. We handle the conversions for you.</p>
					                            </section>
					                            <section className="features_section_text">
					                                <div className="text_upper">Trust</div>
					                                <p>Your money goes directly from you to its destination.</p>
					                            </section>
					                            <section className="features_section_text">
					                                <div className="text_upper">privacy</div>
					                                <p>Only those you authorize can see your accounts. We make our ledgers public for transparency, but you can keep yours private.</p>
					                            </section>
					                            <section className="features_section_text">
					                                <div className="text_upper">Multi-signature accounts</div>
					                                <p>Share control of accounts with friends, family, and business associates with complete accountability and flexibility, <b><i>never before</i></b> available in legacy banking.</p>
					                            </section>
					                            <section className="features_section_text">
					                                <div className="text_upper">Streamlined compilance</div>
					                                <p>Compilance of KYC (Know Your Customer) and AML laws (Anti Money Laundering), same as with any deposit and withdrawals of FIAT Currency.</p>
					                            </section>
					                        </div>
					                    </div>
					                </div>
					                <div className="large-7 grid-block_inner features_advantages custom-control">
					                    <div className="large-4 custom-control__item" data-slide="0">
					                        <div className="features_advantages__icon">
					                            <img src="/app/assets/landing_files/land_wallet.svg" alt="wallet" />
					                        </div>
					                        <h5 className="features_advantages__title">
					                                   wallet
					                                </h5>
					                        <p>Sign up and use OL as a wallet. 100 500 cryptocoins for trading, sending, withdraw etc.</p>
					                    </div>
					                    <div className="large-4 custom-control__item" data-slide="1">
					                        <div className="features_advantages__icon">
					                            <img src="/app/assets/landing_files/land_exchange.svg" alt="exchange" />
					                        </div>
					                        <h5 className="features_advantages__title">
					                                    exchange
					                                </h5>
					                        <p>Aenean id nisi eu est pulvinar tristique eget non libero. In hac habitasse platea dictumst.</p>
					                    </div>
					                    <div className="large-4 custom-control__item" data-slide="2">
					                        <div className="features_advantages__icon">
					                            <img src="/app/assets/landing_files/land_star.svg" alt="lifetime" />
					                        </div>
					                        <h5 className="features_advantages__title">
					                                lifetime membership
					                            </h5>
					                        <p>Aenean id nisi eu est pulvinar tristique eget non libero. In hac habitasse platea dictumst.</p>
					                    </div>
					                    <div className="large-4 custom-control__item" data-slide="3">
					                        <div className="features_advantages__icon">
					                            <img src="/app/assets/landing_files/black_stopwatch.svg" alt="instant" />
					                        </div>
					                        <h5 className="features_advantages__title">
					                               instant withdrawal
					                            </h5>
					                        <p>Aenean id nisi eu est pulvinar tristique eget non libero. In hac habitasse platea dictumst.</p>
					                    </div>
					                    <div className="large-4 custom-control__item" data-slide="4">
					                        <div className="features_advantages__icon">
					                            <img src="/app/assets/landing_files/land_switch.svg" alt="basic/trader modes" />
					                        </div>
					                        <h5 className="features_advantages__title">
					                                basic/trader modes
					                            </h5>
					                        <p>Aenean id nisi eu est pulvinar tristique eget non libero. In hac habitasse platea dictumst.</p>
					                    </div>
					                    <div className="large-4 custom-control__item" data-slide="5">
					                        <div className="features_advantages__icon">
					                            <img src="/app/assets/landing_files/land_security.svg" alt="security" />
					                        </div>
					                        <h5 className="features_advantages__title">
					                                security
					                        </h5>
					                        <p>Aenean id nisi eu est pulvinar tristique eget non libero. In hac habitasse platea dictumst.</p>
					                    </div>
					                </div>
					            </div>
					        </div>
					    </section>
					    <section className="sec_video">
					        <a href="https://www.youtube.com/watch?v=JG_XiOdbum8&feature=youtu.be"></a>
					    </section>
					    <section className="sec_privileges">
					        <div className="grid-container">
					            <h3 className="text-center">OpenLegder Issued Tokens</h3>
					            <div className="privilegies_icons">
					                <div className="privilegies_item">
					                    <a href="https://obits.io/" target="_blank">
					                        <img src="/app/assets/landing_files/obits_logo.png" alt="OBITS" />
					                    </a>
					                </div>
					                <div className="privilegies_item">
					                    <a href="https://btsr.io/" target="_blank">
					                        <img src="/app/assets/landing_files/btsr_logo.png" alt="BTSR" />
					                    </a>
					                </div>
					                <div className="privilegies_item">
					                    <a href="https://icoo.io/" target="_blank">
					                        <img src="/app/assets/asset-symbols/icoo.png" alt="ICOO" />
					                    </a>
					                </div>
					            </div>
					            <h3 className="text-center">OpenLegder Issued Tokens - For Release</h3>
					            <div className="privilegies_icons">
					                <div className="privilegies_item">
					                    <a target="_blank" href="https://www.apptrade.io/">
					                           APPX <br />
					                            LIVE
					                        </a>
					                </div>
					                <div className="privilegies_item">
					                    <a target="_blank" href="https://getgame.io/">
					                            REALITY<br />
					                            <span className="privilegies_item__date">June 30</span>
					                        </a>
					                </div>
					            </div>
					        </div>
					    </section>
					</div>
        		</main>

			    <footer className="g_footer">
			        <div className="grid-container grid-block">
			            <div className="footer_section footer_logo">
			                <a className="footer_logo" href="/"><img src="/app/assets/landing_files/logo_big.svg" alt="OpenLedger" /></a>
			                <p>&copy; 2011-2017 OpenLedger ApS</p>
			            </div>
			            <div className="footer_section">
			                <div className="footer_title">
			                    Openledger ecosystem
			                </div>
			                <ul>
			                    <li><Link to={"/"}>OpenLedger Decentralized Exchange</Link></li>
			                    <li><a href="https://bloggersclub.net/" target="_blank">Bloggers Club 500</a></li>
			                    <li><a href="https://getgame.io/" target="_blank">GetGame</a></li>
			                    <li><a href="https://icoo.io/" target="_blank">ICOO</a></li>
			                    <li><a href="https://bitteaser.com/" target="_blank">BitTeaser</a></li>
			                    <li><a href="https://btsr.io/" target="_blank">BTSR</a></li>
			                    <li><a href="https://hubdsp.com/" target="_blank">hubDSP</a></li>
			                    <li><a href="https://obits.io/" target="_blank">OBITS</a></li>
			                    <li><a href="https://ito.apptrade.io/" target="_blank">Apptrade</a></li>
			                    <li><a href="https://www.ccedk.com/" target="_blank">CCEDK</a></li>
			                    <li><a href="http://edev.one/" target="_blank">EDEV</a></li>
			                </ul>
			            </div>
			            <div className="footer_section _min">
			                <div className="footer_title">
			                    Get in touch
			                </div>
			                <ul>
			                    <li><a href="https://www.facebook.com/openledger/?fref=ts" target="_blank">Facebook</a></li>
			                    <li><a href="https://twitter.com/ccedkopenledger" target="_blank">Twitter</a></li>
			                    <li><a href="https://www.linkedin.com/company/openledger" target="_blank">Instagram</a></li>
			                    <li><a href="https://www.youtube.com/channel/UCZHkjzM5Vp5RH0H_XGBtS0g" target="_blank">YouTube</a></li>
			                    <li><a href="https://telegram.me/OpenLedgerDC" target="_blank">Telegram</a></li>
			                    <li><a href="mailto:ronny@ccedk.com" target="_blank">Email</a></li>
			                </ul>
			                <div className="footer_title">
			                    Additional info
			                </div>
			                <ul>
			                    <li><Link to={"/help/"}>FAQ</Link></li>
			                    <li><Link to={"/help/dex/trading/"}>Terms of use</Link></li>
			                </ul>
			            </div>
			            <div className="footer_section">
			                <div className="footer_title">
			                    Sign for newsletter
			                </div>
			                <p>Be the 1<sup>st</sup> to know the breaking news from OpenLedger</p>
			                <form className="footer_form" action="" >
			                    <input className="footer_form__input" ref="subs_email" type="text" />
			                    <button className="footer_form__btn" onClick={this._submit_subs.bind(this)} >Subscribe</button>			              
			                </form>
			                <p className="error" >{this.state.error}</p>
			            </div>
			            <div className="footer_section">
			                <div className="footer_title">
			                    About
			                </div>
			                <p>OpenLedger ApS registrar of
			                    <br /> OpenLedger DEX
			                    <br /> Birkevej 15
			                    <br /> DK-9490 Pandrup
			                    <br /> Denmark
			                </p>
			                <p>Tel/Fax: +45 36 98-11-50
			                    <br />
			                    <a href="mailto:ronny@ccedk.com">ronny@ccedk.com</a>
			                </p>
			                <p>VAT/CVR no.:DK35809171</p>
			            </div>
			        </div>
			    </footer>


        	</div>            
        );
    }
}

class Das_Container extends React.Component {
    render() {
        return (
            <AltContainer
                stores={[AccountStore, SettingsStore, MarketsStore]}
                inject={{
                    traderMode: () => {
                        return SettingsStore.getState().settings.get("traderMode");
                    },
                    defaultAssets: () => {
                        return SettingsStore.getState().topMarkets;
                    },
                    accountsReady: () => {
                        return AccountStore.getState().accountsLoaded && AccountStore.getState().refsLoaded;
                    },
                    lowVolumeMarkets: () => {
                        return MarketsStore.getState().lowVolumeMarkets;
                    }
                }}>
                    <Das_root {...this.props} />
            </AltContainer>
        );
    }
}



export default Das_Container;
