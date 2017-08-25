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

import Popups, {Youtube} from "../Modal/Popups";

class Das_root extends React.Component {

    constructor() {
        super();
        let marketsByChain = SettingsStore.dashboard_assets;
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

        setTimeout(()=>{
            let src = document.createElement('script');
            src.src = "/pushy_mod.min.js";
            src.id = "pushy_mod";
            document.body.appendChild(src);            
        },500)
    }

    componentWillUnmount(){
        document.getElementById("pushy_mod")&&document.getElementById("pushy_mod").remove();
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
			        <div className="menu-btn" style={{order:5}} >
			            <span className="icon menu icon-32px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#FFF" d="M17.5 6h-15a.5.5 0 0 1 0-1h15a.5.5 0 0 1 0 1zM17.5 11h-15a.5.5 0 0 1 0-1h15a.5.5 0 0 1 0 1zM17.5 16h-15a.5.5 0 0 1 0-1h15a.5.5 0 0 1 0 1z"></path></svg></span>
			        </div>
			        <a href="/root" className="land_logo">
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
			                <li><Link className="lnk_brd_bottom" to={"/market/OBITS_BTS"}><Translate component="p" className="menu_header_ancor" content="root.exchange"  /></Link></li>
			                <li><a className="lnk_brd_bottom" target="_blank" href="https://blog.openledger.info/"><Translate component="p" className="menu_header_ancor" content="root.blog" /></a></li>
			                <li><Link className="lnk_brd_bottom" to={"/help"}><Translate component="p" content="root.help" className="menu_header_ancor" /></Link></li>
                            <li><Link className="" to={"/create-account"}><Translate component="p" content="root.sign_up" className="menu_header_ancor" /></Link></li>
			            </ul>
			        </nav>
			        <div className="site-overlay"></div>
			    </header>
			    <main className="g_wrapper olDarkTheme">
			        <section className="welcome_window">
			            <div className="main_logo">
			                <img src="/app/assets/landing_files/logo_big.svg" alt="OpenLedger" />
			                <div className="main_logo__text">
			                    <Translate component="span" content="root.blockchain_powered"  />
			                </div>
			            </div>	
			            <Translate className="title_main" component="div" content="root.welcome_to_the" />
                        <Translate component="p" className="main_text" content="root.the_openLedger_dex_is_a_cryptocurrency" style={{"margin":"0 0 0 0"}} />                    
                        <Translate component="p" className="main_text" content="root.designed_for_high_speed_transactions"  />		            
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
					                <Translate component="h2" content="root.features" />
					                <a href="#" className="whitepaper" ><i className="icon _pdf"></i><Translate component="span" content="root.whitepaper" /></a>
					            </div>
					            <div className="features_info grid-block">
					                <div className="large-5">
					                    <div className="">
					                        <div className="carousel_info__item">
					                            <Translate className="text-yellow font_bold" component="h5" content="root.the_openLedger_dex" />
					                            <section className="features_section_text">
					                                <Translate component="div" className="text_upper" content="root.speed"  />
					                                <Translate component="p" content="root.we_let_you_send_it"  />
					                            </section>
					                            <section className="features_section_text">
					                                <Translate component="div" className="text_upper" content="root.security"  />
					                                <Translate component="p" content="root.you_are_always_in_control" />
					                            </section>
					                            <section className="features_section_text">
					                                <Translate component="div" className="text_upper" content="root.acceptance"  />
                                                    <Translate component="p" content="root.you_can_spend_your_money_instantly_using" />
                                                </section>
                                                <section className="features_section_text">
                                                    <Translate component="div" className="text_upper" content="root.trust"  />
					                                <Translate component="p" content="root.your_money_goes_directly_from" />
                                                </section>
                                                <section className="features_section_text">
                                                    <Translate component="div" className="text_upper" content="root.privacy"  />
                                                    <Translate component="p" content="root.only_those_you_authorize_can"  />
                                                </section>
                                                <section className="features_section_text">
                                                    <Translate component="div" className="text_upper" content="root.multi_signature_accounts"  />
                                                    <Translate component="p" content="root.share_control_of_accounts_with"  />
                                                </section>
                                                <section className="features_section_text">
                                                    <Translate component="div" className="text_upper" content="root.streamlined_compliance"  />
                                                    <Translate component="p" content="root.compilance_of_kyc"  />
					                            </section>
					                        </div>
					                    </div>
					                </div>
					                <div className="large-7 grid-block_inner features_advantages custom-control">
                                        <Link to="/help/introduction/wallets" className="large-4 custom-control__item features_hover" data-slide="0" >
                                            <div className="features_advantages__icon">
                                                <img src="/app/assets/landing_files/land_wallet.svg" alt="wallet" />
                                            </div>
                                            <Translate component="h5" className="features_advantages__title" content="root.wallet" />
                                            <Translate component="p" content="root.the_openLedger_offers_the_users_a_wallet" />
                                        </Link>
                                        <Link to="/market/OPEN.USD_OPEN.BTC" className="large-4 custom-control__item features_hover" data-slide="1" >
                                            <div className="features_advantages__icon">
                                                <img src="/app/assets/landing_files/land_exchange.svg" alt="exchange" />
                                            </div>
                                            <Translate component="h5" className="features_advantages__title" content="root.exchange" />
                                            <Translate component="p" content="root.the_openledger_decentralized_exchange"  />
                                        </Link>
                                        <Link to="/help/accounts/membership" className="large-4 custom-control__item features_hover" data-slide="2" >
                                            <div className="features_advantages__icon">
                                                <img src="/app/assets/landing_files/land_star.svg" alt="lifetime" />
                                            </div>
                                            <Translate component="h5" className="features_advantages__title" content="root.lifetime_membership" />
                                            <Translate component="p" content="root.lifetime_members_get"  />
                                        </Link>
					                    <div className="large-4 custom-control__item" data-slide="3">
					                        <div className="features_advantages__icon">
					                            <img src="/app/assets/landing_files/black_stopwatch.svg" alt="instant" />
					                        </div>
                                            <Translate component="h5" className="features_advantages__title" content="root.instant_withdrawal" />
                                            <Translate component="p" content="root.openLedger_lets_you_send_money"  />
                                        </div>
					                    <div className="large-4 custom-control__item" data-slide="4">
					                        <div className="features_advantages__icon">
					                            <img src="/app/assets/landing_files/land_switch.svg" alt="basic/trader modes" />
					                        </div>
                                            <Translate component="h5" className="features_advantages__title" content="root.basic_trader_modes" />
                                            <Translate component="p" content="root.use_basic_mode"  />
    				                    </div>
					                    <div className="large-4 custom-control__item" data-slide="5">
					                        <div className="features_advantages__icon">
					                            <img src="/app/assets/landing_files/land_security.svg" alt="security" />
					                        </div>
                                            <Translate component="h5" className="features_advantages__title" content="root.security" />
                                            <Translate component="p" content="root.no_one_can_freeze"  />					                       
					                    </div>
					                </div>
					            </div>
					        </div>
					    </section>  
                        <Youtube /> 
					    <section className="sec_privileges">
					        <div className="grid-container">
					            <Translate className="text-center" component="h2" content="root.openledger_issued_tokens"  />
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
                                <Translate className="text-center" component="h2" content="root.openledger_issued_tokens_for"  />
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
			                <a style={{textAlign:"center"}} className="footer_logo" href="/"><img src="/app/assets/landing_files/logo_big.svg" alt="OpenLedger" /></a>
			                <p style={{textAlign:"center"}} >&copy; 2011-2017 OpenLedger ApS</p>
			            </div>
			            <div className="footer_section">
			                <Translate className="footer_title" component="div" content="root.openledger_ecosystem"  />
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
		                    <Translate className="footer_title" component="div" content="root.get_in_touch" />
			                <ul>
			                    <li><a href="https://www.facebook.com/openledger/?fref=ts" target="_blank">Facebook</a></li>
			                    <li><a href="https://twitter.com/ccedkopenledger" target="_blank">Twitter</a></li>
			                    <li><a href="https://www.linkedin.com/company/openledger" target="_blank">Instagram</a></li>
			                    <li><a href="https://www.youtube.com/channel/UCZHkjzM5Vp5RH0H_XGBtS0g" target="_blank">YouTube</a></li>
			                    <li><a href="https://telegram.me/OpenLedgerDC" target="_blank">Telegram</a></li>
			                    <li><a href="mailto:ronny@ccedk.com" target="_blank">Email</a></li>
			                </ul>
                            <Translate className="footer_title" component="div" content="root.additional_info" />
			                <ul>
			                    <li><Link to={"/help/"}>FAQ</Link></li>
			                    <li><Link to={"/help/dex/trading/"}>Terms of use</Link></li>
			                </ul>
			            </div>
    
			            <div className="footer_section" style={{maxWidth: "20%", padding: "1rem 3rem 0 0"}} >
			                <Translate className="footer_title" component="div" content="root.sign_for_newsletter"  />
			                <p><Translate component="span" content="root.input"  />Be the 1<sup>st</sup> to know the breaking news from OpenLedger</p>
			                <form className="footer_form" action="" >
			                    <input className="footer_form__input" ref="subs_email" type="text" />
			                    <button className="footer_form__btn" onClick={this._submit_subs.bind(this)} >Subscribe</button>			              
			                </form>
			                <p style={{margin:"5px 0 0 0","textTransform": "capitalize"}} className="error" >{this.state.error}</p>
			            </div>
			            <div className="footer_section">
		                    <Translate className="footer_title" component="div" content="root.about"  />
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
