import React from "react";
import Immutable from "immutable";
import Ps from "perfect-scrollbar";
import utils from "common/utils";
import Translate from "react-translate-component";
import { connect } from "alt-react";
import MarketRow from "./MarketRow";
import SettingsStore from "stores/SettingsStore";
import MarketsStore from "stores/MarketsStore";
import AssetStore from "stores/AssetStore";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import AssetName from "../Utility/AssetName";
import SettingsActions from "actions/SettingsActions";
import AssetActions from "actions/AssetActions";
import cnames from "classnames";
import {debounce} from "lodash";
import Icon from "../Icon/Icon";

import {ChainStore} from "bitsharesjs/es";
import MarketsActions from "actions/MarketsActions";

function set_sposition_for_active_market() {
    let table_trs = document.querySelectorAll(".table .clickable");
    let table_active = document.querySelector(".table .clickable.activeMarket");

    if (table_trs.length > 20) {
        if (table_active) {
            let table_area = document.querySelector(".table-container.mymarkets-list");
            if (table_area && table_area.scrollTop == 0) {
                table_area.scrollTop = table_active.offsetTop - 28;
            }

        }

    }
}

let lastLookup = new Date();

class MarketGroup extends React.Component {

    static defaultProps = {
        maxRows: 20,
        router: React.PropTypes.object
    };

    constructor(props) {
        super();
        this.state = this._getInitialState(props);
    }

    _getInitialState(props) {
        let open = props.forceOpen ? true : props.viewSettings.get(`myMarketsBase_${props.index}`);
        return {
            open: open !== undefined ? open : true,
            inverseSort: props.viewSettings.get("myMarketsInvert", true),
            sortBy: props.viewSettings.get("myMarketsSort", "volume"),
            inputValue: "",
            market_list:[]
        };
    }

    componentWillMount() {


        this.set_interval = setInterval(() => {

            let {
                columns,
                markets,
                base,
                marketStats,
                starredMarkets,
                current,
                maxRows
            } = this.props;            

            let obj_for_duplicate = {};

            let market_list = markets.map((market, key) => {

                let market_base = ChainStore.getAsset(market.base);
                let market_quote = ChainStore.getAsset(market.quote);

                if (obj_for_duplicate[market.id]) {
                    return null;
                } else {
                    obj_for_duplicate[market.id] = true;
                }

                if (market_base && market_quote) {
                    MarketsActions.getMarketStats.defer(market_base, market_quote);
                } else {
                    return null;
                }               

                return {
                    key: market.id,
                    name:base === ("others" ? <span> <AssetName name={market.quote} /> : <AssetName name={market.base} /></span> : <AssetName name={market.quote} />),
                    base: market_base,
                    quote: market_quote,
                    columns,
                    leftAlign: true,
                    compact: true,
                    noSymbols: true,
                    stats: marketStats.get(market.id),
                    starred: starredMarkets.has(market.id),
                    current: current === market.id
                }
            }).filter(m=>m&&m.base&&m.quote);

            this.setState({
                market_list
            });            

        }, 500);

    }

    componentWillUnmount() {
        clearInterval(this.set_interval);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.forceOpen !== this.props.forceOpen) {
            this.setState(this._getInitialState(nextProps));
        }
    }

    _inverseSort() {
        SettingsActions.changeViewSetting({
            myMarketsInvert: !this.state.myMarketsInvert
        });
        this.setState({
            inverseSort: !this.state.inverseSort
        });
    }

    _changeSort(type) {
        if (type !== this.state.sortBy) {
            SettingsActions.changeViewSetting({
                myMarketsSort: type
            });
            this.setState({
                sortBy: type
            });
        } else {
            this._inverseSort();
        }
    }

    // _onSelectBase(e) {
    //     e.preventDefault();
    //     e.stopPropagation();

    //     SettingsActions.changeBase(this.props.index, e.target.value);
    // }

    _onToggle(e) {
        if (!this.props.forceOpen) {
            let open = !this.state.open;
            this.setState({
                open: open
            });

            let setting = {};
            setting[`myMarketsBase_${this.props.index}`] = open;
            SettingsActions.changeViewSetting(setting);
        }
    }

    render() {
        let {columns, markets, base, marketStats, starredMarkets,
            current, maxRows} = this.props;
        let {sortBy, inverseSort, open, market_list} = this.state;


        if (!markets || !markets.length) {
            return null;
        }
 

        let headers = columns.map(header => {
            switch (header.name) {

            case "star":
                return <th key={header.name} className="clickable" onClick={this._changeSort.bind(this, "star")}><Icon className="gold-star" name="fi-star"/></th>;

            case "market":
                return <th key={header.name} className="clickable" onClick={this._changeSort.bind(this, "name")}><Translate content="exchange.market" />{sortBy=="name"&&(inverseSort?"⇑":"⇓")}</th>;

            case "vol":
                return <th key={header.name} className="clickable" onClick={this._changeSort.bind(this, "volume")}style={{textAlign: "right"}}><Translate content="exchange.vol_short" />{sortBy=="volume"&&(inverseSort?"⇓":"⇑")}</th>;

            case "price":
                return <th key={header.name} style={{textAlign: "right"}} className="clickable" onClick={this._changeSort.bind(this, "price")} ><Translate content="exchange.price" />{sortBy=="price"&&(inverseSort?"⇑":"⇓")}</th>;

            case "quoteSupply":
                return <th key={header.name}><Translate content="exchange.quote_supply" /></th>;

            case "baseSupply":
                return <th key={header.name}><Translate content="exchange.base_supply" /></th>;

            case "change":
                return <th key={header.name} className="clickable" onClick={this._changeSort.bind(this, "change")} style={{textAlign: "right"}}><Translate content="exchange.change" />{sortBy=="change"&&(inverseSort?"⇓":"⇑")}</th>;

            default:
                return <th key={header.name}></th>;
            }
        });





        let marketRows = market_list.sort((a, b) => {

            let a_symbols = a.key.split("_");
            let b_symbols = b.key.split("_");
            let aStats = a.stats;
            let bStats = b.stats;

            let aStar = a.starred;
            let bStar = b.starred;

            if (marketStats.size == 0) {
                return 0;
            }

            switch (sortBy) {

                case "name":
                    if (a_symbols[0] > b_symbols[0]) {
                        return inverseSort ? -1 : 1;
                    } else if (a_symbols[0] < b_symbols[0]) {
                        return inverseSort ? 1 : -1;
                    } else {
                        if (a_symbols[1] > b_symbols[1]) {
                            return inverseSort ? -1 : 1;
                        } else if (a_symbols[1] < b_symbols[1]) {
                            return inverseSort ? 1 : -1;
                        } else {
                            return 0;
                        }
                    }

                case "volume":
                    if (aStats && bStats) {
                        if (inverseSort) {
                            return bStats.volumeBase - aStats.volumeBase;
                        } else {
                            return aStats.volumeBase - bStats.volumeBase;
                        }
                    } else {
                        return 0;
                    }

                case "star":
                    if (aStats && bStats) {
                        if (aStar == bStar) {
                            return 0;
                        }
                        if (inverseSort) {
                            return aStar && !bStar ? 1 : -1;
                        } else {
                            return !aStar && bStar ? 1 : -1;
                        }
                    } else {
                        return 0;
                    }

                case "change":
                    if (aStats && bStats) {
                        if (inverseSort) {
                            return bStats.change - aStats.change;
                        } else {
                            return aStats.change - bStats.change;
                        }
                    } else {
                        return 0;
                    }

                case "price":
                    let a_price = 0;
                    let b_price = 0;
                    if (aStats && aStats.price) {
                        a_price = (aStats.price.base.amount / aStats.price.base.satoshi) / (aStats.price.quote.amount / aStats.price.quote.satoshi);
                    }

                    if (bStats && bStats.price) {
                        b_price = (bStats.price.base.amount / bStats.price.base.satoshi) / (bStats.price.quote.amount / bStats.price.quote.satoshi);
                    }

                    if (inverseSort) {
                        return a_price-b_price;
                    } else {
                        return b_price-a_price;
                    }

            }


        }).map( (market,key) => {
            return (
                <MarketRow
                    key={market.id}
                    name={base === "others" ? <span> <AssetName name={market.quote.get("symbol")} /> : <AssetName name={market.base.get("symbol")} /></span> : <AssetName name={market.quote.get("symbol")} />}
                    quote={market.quote}
                    base={market.base}
                    columns={columns}
                    leftAlign={true}
                    compact={true}
                    noSymbols={true}
                    stats={market.stats}
                    starred={market.starred}
                    current={current === market.id}
                />
            );
        }).filter(a => {
            return !!a;
        }); 

        let caret = open ? <span>&#9660;</span> : <span>&#9650;</span>;

        return (
            <div style={{paddingRight: 10}}>

                {open ? (
                <table className="table table-hover text-right">
                    <thead>
                        <tr>{headers}</tr>
                    </thead>
                    {marketRows && marketRows.length ?
                        <tbody>{marketRows}</tbody> : null
                    }
                </table>) : null}
            </div>
        );
    }
}

class MyMarkets extends React.Component {

    static propTypes = {
        core: ChainTypes.ChainAsset.isRequired
    };

    static defaultProps = {
        activeTab: "starred",
        core: "1.3.0",
        setMinWidth: false
    };

    static contextTypes = {
        router: React.PropTypes.object.isRequired
    }

    constructor(props) {
        super();

        // let inputValue = null; // props.viewSettings.get("marketLookupInput", null);
        // let symbols = inputValue ? inputValue.split(":") : [null];
        // let quote = symbols[0];
        // let base = symbols.length === 2 ? symbols[1] : null;

        this.state = {
            inverseSort: props.viewSettings.get("myMarketsInvert", true),
            sortBy: props.viewSettings.get("myMarketsSort", "volume"),
            activeTab: props.viewSettings.get("favMarketTab", "starred"),
            activeMarketTab: props.viewSettings.get("activeMarketTab", 0),
            lookupQuote: null,
            lookupBase: null,
            inputValue: "",
            minWidth: "100%",
            showBaseTab: props.viewSettings.get("activeMarketTab", 0)==5?true:false,
        };

        this._setMinWidth = this._setMinWidth.bind(this);
        this.getAssetList = debounce(AssetActions.getAssetList.defer, 150);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (this.state.activeTab !== "all" && nextState.activeTab === "all" && this.state.inputValue) {
            this._lookupAssets({target: {value: this.state.inputValue}}, true);
        }

        return (
            !Immutable.is(nextProps.assets, this.props.assets) ||
            !Immutable.is(nextProps.searchAssets, this.props.searchAssets) ||
            !Immutable.is(nextProps.markets, this.props.markets) ||
            !Immutable.is(nextProps.starredMarkets, this.props.starredMarkets) ||
            !Immutable.is(nextProps.staticDefaultMarkets, this.props.staticDefaultMarkets) ||
            !Immutable.is(nextProps.marketStats, this.props.marketStats) ||
            nextState.activeMarketTab !== this.state.activeMarketTab ||
            nextState.inverseSort !== this.state.inverseSort ||
            nextState.sortBy !== this.state.sortBy ||
            nextState.activeTab !== this.state.activeTab ||
            nextState.lookupQuote !== this.state.lookupQuote ||
            nextState.lookupBase !== this.state.lookupBase ||
            nextProps.current !== this.props.current ||
            nextProps.minWidth !== this.props.minWidth ||
            nextProps.listHeight !== this.props.listHeight ||
            nextProps.preferredBases !== this.props.preferredBases
        );
    }

    componentDidMount() {
        let historyContainer = this.refs.favorites;
        Ps.initialize(historyContainer);

        this._setMinWidth();

        if (this.state.activeTab === "all" && this.state.inputValue) {
            this._lookupAssets({target: {value: this.state.inputValue}}, true);
        }

        setTimeout(set_sposition_for_active_market,1000)

    }

    componentWillMount() {
        if (this.props.setMinWidth) {
            window.addEventListener("resize", this._setMinWidth, {capture: false, passive: true});
        }
    }

    componetWillUnmount() {
        if (this.props.setMinWidth) {
            window.removeEventListener("resize", this._setMinWidth);
        }
    }

    _setMinWidth() {
        if (this.props.setMinWidth && this.refs.favorites && this.props.activeTab === "starred") {

            if (this.state.minWidth !== this.refs.favorites.offsetWidth) {
                this.setState({
                    minWidth: this.refs.favorites.offsetWidth
                });
            }
        }
    }

    componentDidUpdate() {

        if (this.refs.favorites) {
            let historyContainer = this.refs.favorites;
            Ps.update(historyContainer);
        }
        setTimeout(set_sposition_for_active_market,1000)

    }

    _inverseSort() {
        SettingsActions.changeViewSetting({
            myMarketsInvert: !this.state.myMarketsInvert
        });
        this.setState({
            inverseSort: !this.state.inverseSort
        });
    }

    _changeSort(type) {
        if (type !== this.state.sortBy) {
            SettingsActions.changeViewSetting({
                myMarketsSort: type
            });
            this.setState({
                sortBy: type
            });
        } else {
            this._inverseSort();
        }
    }

    _goMarkets() {
        this.context.router.push("/markets");
    }

    _changeTab(tab) {
        SettingsActions.changeViewSetting({
            favMarketTab: tab
        });
        this.setState({
            activeTab: tab
        });

        this._setMinWidth();
    }

    _lookupAssets(e, force = false) {
        console.log("lookup assets");

        let now = new Date();

        let symbol_one=this.refs.symbol_one ||{value:''};
        let symbol_two=this.refs.symbol_two ||{value:''};

        let input_value = symbol_one.value.toUpperCase()+':'+symbol_two.value.toUpperCase();
        let symbols = [symbol_one.value.toUpperCase(), symbol_two.value.toUpperCase()];
        let quote = symbols[0];
        let base = symbols[1];

        this.setState({
            lookupQuote: quote,
            lookupBase: base,
            inputValue: input_value
        });

        SettingsActions.changeViewSetting({
            marketLookupInput: input_value
        });

        
        if(e.target.id&&e.target.value){
            let res = [];
            let input_value = e.target.value.toLowerCase();
            this.props.searchAssets.map(el=>{
                if(el.symbol.toLowerCase().indexOf(input_value)===0){
                    if(input_value.length<el.symbol.length){
                        res.push(el.symbol);                        
                    }
                }
            });

            this.refs[e.target.id].value = res[0]||"";
        }else if(e.target.id){
            this.refs[e.target.id].value = ' ';
        }


        if (this.state.lookupQuote !== quote || force) {
            if ( now - lastLookup <= 250) {
                return false;
            }

            this.getAssetList(quote, 50);
        } else {
            if (base && this.state.lookupBase !== base) {
                if ( now - lastLookup <= 250) {
                    return false;
                }
                this.getAssetList(base, 50);
            }
        }
    }

    add_symbols_tooltip(e){
        if(this.refs[e.target.id].value&&(e.key === 'Tab'||e.key === 'ArrowRight')){
            e.target.value = this.refs[e.target.id].value;
            if(e.target.id==='symols_tooltip1'){                
                this.setState({
                    lookupQuote: this.refs[e.target.id].value
                });
            }else if(e.target.id==='symols_tooltip2'){
                this.setState({
                    lookupBase: this.refs[e.target.id].value
                });
            }
        }   

    }

    toggleActiveMarketTab(index) {
        SettingsActions.changeViewSetting({
            activeMarketTab: index
        });

        let newState = {
            activeMarketTab: index,
            showBaseTab: index==5?true:false,
        }

        index!==5?newState.lookupBase='':1;

        this.setState(newState);
    }

    render() {
        let {starredMarkets,staticDefaultMarkets, marketStats, columns, searchAssets,
            preferredBases, core, current, viewSettings, listHeight} = this.props;
        let {inverseSort, activeTab, sortBy, lookupQuote, lookupBase} = this.state;
        

        let hc = "mymarkets-header clickable";
        let starClass = cnames(hc, {inactive: activeTab === "all"});
        let allClass = cnames(hc, {inactive: activeTab === "starred"});

        let listStyle = {
            minWidth: this.state.minWidth
        };


        if (listHeight) {
            listStyle.height = listHeight;
        }

        ///### 
        let obj_search = {};
 
        // Add some default base options
        let baseGroups = {};
        let bases = [];
        let allMarkets = [];
        let otherMarkets = [];

        let activeMarkets = activeTab === "starred" ? starredMarkets : allMarkets;        

        let market_tab = preferredBases.toArray()[this.state.activeMarketTab];

        preferredBases.map(e=>{
            baseGroups[e] = [];
        });  

        if(activeTab == 'starred' && this.state.activeMarketTab < 5){
            SettingsStore.marketsList.map(e=>{
                e!==market_tab?baseGroups[market_tab].push({
                    id:  e+ '_' + market_tab,
                    base: market_tab,
                    quote: e
                }):1;
            });  
        }else if(activeTab == 'starred'&& this.state.activeMarketTab === 5){
            starredMarkets.map((e,index)=>{
                otherMarkets.push({
                    id:  index,
                    base: e.base,
                    quote: e.quote 
                });
            });
        }else if(activeTab == 'all' && this.state.activeMarketTab < 5 && lookupQuote){
            if(lookupQuote.length>1){
                searchAssets.filter(asset => {

                    let flag = false;
                    if(asset.symbol == market_tab ||asset.symbol.indexOf(lookupQuote)==0){                
                        flag = true;
                    }

                    return flag;

                }).map(e=>{
                    e.symbol!==market_tab?baseGroups[market_tab].push({
                        id:  e.symbol+ '_' + market_tab,
                        base: market_tab,
                        quote: e.symbol
                    }):1;
                });                
            }
        }else if(activeTab == 'all' && this.state.activeMarketTab === 5 &&lookupQuote&&lookupBase){

            if(lookupQuote.length>1&&lookupBase.length>1){
                let left_arr = [];
                let right_arr = [];

                searchAssets.map(asset => {
                    if(asset.symbol.indexOf(lookupQuote)==0){
                        left_arr.push(asset.symbol);
                    }else if(asset.symbol.indexOf(lookupBase)==0){                       
                        right_arr.push(asset.symbol);                        
                    }
                });

                for(let i1 = 0; i1<left_arr.length; i1+=1){
                    for(let i2 = 0; i2<right_arr.length; i2+=1){
                        otherMarkets.push({
                            id:  left_arr[i1] +'_'+ right_arr[i2],
                            base: right_arr[i2],
                            quote: left_arr[i1]  
                        });
                    }
                }
            }
        }

        return (
            <div className={this.props.className} style={this.props.style}>
                <div
                    style={this.props.headerStyle}
                    className="grid-block shrink left-orderbook-header bottom-header"
                >
                    <div ref="myMarkets" className={starClass} onClick={this._changeTab.bind(this, "starred")}>
                        <Translate content="exchange.market_name" />
                    </div>
                    <div className={allClass} onClick={this._changeTab.bind(this, "all")} >
                        <Translate content="exchange.more" />
                    </div>
                </div>

                {activeTab === "all" || this.props.controls ? (
                    <div>
                        {this.props.controls ? <div > {this.props.controls} </div> : null}
                        {activeTab === "all" ? <div className="symbols_input" >
                            <div>
                            <input ref="symols_tooltip1" className="hide_tooltip" type="text" onChange={(e)=>{}} disabled={true} />
                            <input ref="symbol_one" id ="symols_tooltip1" type="text" defaultValue={this.state.lookupQuote||''} onChange={this._lookupAssets.bind(this)} onKeyDown={this.add_symbols_tooltip.bind(this)} placeholder="CURRENCY 1" />
                            </div>
                            {this.state.showBaseTab?<div>
                                <input ref="symols_tooltip2" className="hide_tooltip" type="text" onChange={(e)=>{}} disabled={true} />
                                <input ref="symbol_two" id="symols_tooltip2" type="text" defaultValue={this.state.lookupBase||''} onChange={this._lookupAssets.bind(this)} onKeyDown={this.add_symbols_tooltip.bind(this)} placeholder="CURRENCY 2" />
                            </div>:null}
                        </div>
                        : null}
                    </div> ) : null}

                <ul className="mymarkets-tabs">
                    {preferredBases.map((base, index) => {
                        return (
                            <li
                                key={base}
                                onClick={this.toggleActiveMarketTab.bind(this, index)}
                                className={cnames("mymarkets-tab", {active: this.state.activeMarketTab === index})}
                            >
                                <AssetName name={base} />
                            </li>
                        );
                    })}
                    <li
                        style={{textTransform: "uppercase"}}
                        onClick={this.toggleActiveMarketTab.bind(this, preferredBases.size + 1)}
                        className={cnames("mymarkets-tab", {active: this.state.activeMarketTab === (preferredBases.size + 1)})}
                    >
                        {activeTab==="starred"?<span style={{"color":"#cc9f00","fontSize":"16px","lineHeight":"1rem"}}>&#9733;</span>:null}
                        {activeTab==="starred"?<Translate content="exchange.favorites" />:<Translate content="exchange.others" />}
                    </li>
                </ul>
  
                <div
                    style={listStyle}
                    className="table-container grid-block vertical mymarkets-list"
                    ref="favorites"
                >
                    {preferredBases.filter(a => {return a === preferredBases.get(this.state.activeMarketTab);}).map((base, index) => { 
                        return <MarketGroup
                            index={index}
                            allowChange={false}
                            key={base}
                            current={current}
                            starredMarkets={starredMarkets}
                            marketStats={marketStats}
                            viewSettings={viewSettings}
                            columns={columns}
                            markets={baseGroups[base]}
                            base={base}
                            maxRows={activeTab === "starred" ? 20 : 10}
                            forceOpen={activeTab === "all"}
                        />;
                    })}
                    {this.state.activeMarketTab === preferredBases.size + 1 ?
                    <MarketGroup
                        index={preferredBases.size}
                        current={current}
                        starredMarkets={starredMarkets}
                        marketStats={marketStats}
                        viewSettings={viewSettings}
                        columns={columns}
                        markets={otherMarkets}
                        base="others"
                        maxRows={activeTab === "starred" ? 20 : 10}
                        forceOpen={activeTab === "all"}
                    /> : null}
                </div>
            </div>
        );
    }
}
MyMarkets = BindToChainState(MyMarkets);

class MyMarketsWrapper extends React.Component {
    render () {
        return (
            <MyMarkets
                {...this.props}
            />
        );
    }
}

export default connect(MyMarketsWrapper, {
    listenTo() {
        return [SettingsStore, MarketsStore, AssetStore];
    },
    getProps() {
        return {
            starredMarkets: SettingsStore.getState().starredMarkets,
            staticDefaultMarkets: SettingsStore.getState().staticDefaultMarkets,
            viewSettings: SettingsStore.getState().viewSettings,
            preferredBases: SettingsStore.getState().preferredBases,
            marketStats: MarketsStore.getState().allMarketStats,
            searchAssets: AssetStore.getState().assets
        };
    }
});
