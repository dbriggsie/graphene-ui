import React from "react";
import counterpart from "counterpart";
import cnames from "classnames";
import Translate from "react-translate-component";
import Icon from "../Icon/Icon";

export default class ButtonsForGraphics extends React.Component {
    constructor() {
        super();

        this.state = {
            dropdowns: {
                indicators: false,
                tools: false,
                settings: false
            }
        };

        this._listener = this._listener.bind(this);
        this._onInputHeight = this._onInputHeight.bind(this)
    }

    _toggleDropdown(key, e) {
        e.stopPropagation();
        const { dropdowns } = this.state;
        let newState = {};
        for (let k in this.state.dropdowns) {
            if (k === key) newState[k] = !dropdowns[k];
            else newState[k] = false;
        }
        if (newState[key]) {
            document.addEventListener("click", this._listener, false);
        }
        this.setState({ dropdowns: newState });
    }

    _stopPropagation(e) {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    }

    _resetDropdowns() {
        let dropdowns = {};
        for (let key in this.state.dropdowns) {
            dropdowns[key] = false;
        }
        this.setState({ dropdowns });
    }

    _listener(e) {
        this._resetDropdowns();
        document.removeEventListener("click", this._listener);
    }

    _toggleTools(key) {
        this._resetDropdowns();
        this.props.onChangeTool(key);
        this.forceUpdate();
    }

    _changeSettings(payload, e) {
        e.persist();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    }

    _onInputHeight(e) {
        const val = e.target.value;
        this.props.onChangeChartHeight({ value: parseInt(val, 10) });
    }

    render() {
        let {
            quoteAsset,
            baseAsset,
            showDepthChart,
            buckets,
            bucketSize,
            changeBucketSize,
            changeZoomPeriod,
            showIndicators,
            currentPeriod,
            onBorrowBase,
            onBorrowQuote,
            indicators,
            onChangeIndicators,
            indicatorSettings,
            tools,
            onChangeTool
        } = this.props;

        const { dropdowns } = this.state;

        // Lower bar
        let bucketText = function(size) {
            if (size === "all") {
                return counterpart.translate("exchange.zoom_all");
            } else if (size < 60) {
                return size + "s";
            } else if (size < 3600) {
                return (size / 60) + "m";
            } else if (size < 86400) {
                return (size / 3600) + "h";
            } else if (size < 604800) {
                return (size / 86400) + "d";
            } else if (size < 2592000) {
                return (size / 604800) + "w";
            } else {
                return (size / 2592000) + "m";
            }
        };

        let bucketOptions = buckets.filter(bucket => {
            return bucket > 60 * 4;
        }).map(bucket => {
            return <div key={bucket} className={cnames("label bucket-option", {"active-bucket": bucketSize === bucket})} onClick={this.props.changeBucketSize.bind(this, bucket)}>{bucketText(bucket)}</div>;
        });

        let oneHour = 3600,
            oneDay = oneHour * 24;
        let zoomPeriods = [oneHour * 6, oneHour * 48, oneHour * 48 * 2, oneHour * 24 * 7, oneDay * 14, oneDay * 30, oneDay * 30 * 3, "all"];

        let zoomOptions = zoomPeriods.map(period => {
            return <div key={period} className={cnames("label bucket-option", {"active-bucket": currentPeriod === period})} onClick={this.props.changeZoomPeriod.bind(this, period)}>{bucketText(period)}</div>;
        });

        /* Indicators dropdown */
        const indicatorOptionsVolume = [];
        const indicatorOptionsPrice = Object.keys(indicators).map(i => {
            let hasSetting = i in indicatorSettings;
            let settingInput = hasSetting ?
                <div style={{float: "right", clear: "both"}}>
                    <div className="inline-block" style={{paddingRight: 5}}><Translate content="exchange.chart_options.period" />:</div>
                    <input style={{margin: 0}} type="number" value={indicatorSettings[i]} onChange={this.props.onChangeIndicatorSetting.bind(null, i)} />
                </div> : null;

            if (i.toLowerCase().indexOf("volume") !== -1) {
                if (!this.props.showVolumeChart) return null;
                indicatorOptionsVolume.push(
                    <li className="indicator" key={i}>
                        <input className="clickable" type="checkbox" checked={indicators[i]} onClick={this.props.onChangeIndicators.bind(null, i)}/>
                        <div onClick={this.props.onChangeIndicators.bind(null, i)} className="clickable"><Translate content={`exchange.chart_options.${i}`} /></div>
                        { settingInput }
                    </li>
                );
            } else {
                return (
                    <li className="indicator" key={i} >
                        <input className="clickable" type="checkbox" checked={indicators[i]} onClick={this.props.onChangeIndicators.bind(null, i)}/>
                        <div className="clickable"><Translate content={`exchange.chart_options.${i}`} onClick={this.props.onChangeIndicators.bind(null, i)}/></div>
                        { settingInput }
                    </li>
                );
            }
        }).filter(a => !!a);

        /* Tools dropdown */
        const toolsOptions = Object.keys(this.props.tools).map(i => {
            return (
                <li className="clickable" key={i} onClick={this._toggleTools.bind(this, i)}>
                    <div style={{marginLeft: 5}} className="inline-block">
                        <Translate content={`exchange.chart_options.${i}`} />
                    </div>
                </li>
            );
        });

        /* Tools dropdown */
        const settingsOptions = ["volume", "height"].map(i => {
            let content;
            switch (i) {
                case "height":
                    {
                        content = (
                            <li className="indicator" key={i}>
                            <div style={{marginLeft: 0, paddingRight: 10}}>
                                <div><Translate content="exchange.chart_options.height" />:</div>
                            </div>
                            <div>
                                <input style={{margin: 0, textAlign: "right", maxWidth: 75}} value={this.props.chartHeight} type="number" onChange={this._onInputHeight} />
                            </div>
                        </li>
                        );
                        break;
                    }

                case "volume":
                    {
                        content = (
                            <li className="clickable indicator" key={i} onClick={this.props.onToggleVolume}>
                            <input type="checkbox" checked={this.props.showVolumeChart} />
                            <div><Translate content={`exchange.chart_options.${i}`} /></div>
                        </li>
                        );
                        break;
                    }

                default:
                    {
                        content = (
                            <li key={i}>
                            TBD
                        </li>
                        );
                    }
            }
            return content;
        });

        // return null;
        return (
            <div className="grid-block shrink" >
                        <ul className="grid-block market-stats stats bottom-stats no-over zoom_mobile" style={{ "justifyContent": "flex-end",overflow:"visible",margin:"0 20px 0 0"}}>
                        {showIndicators ?
                            <li className="stat custom-dropdown" style={{margin:"0 10px"}}>
                                <div className="indicators clickable" onClick={this._toggleDropdown.bind(this, "settings")}>
                                    <Icon className="icon-14px settings-cog" name="cog"/>
                                </div>
                                {dropdowns.settings ?
                                <div className="custom-dropdown-content" onClick={this._stopPropagation}>
                                    <ul>
                                        {settingsOptions}
                                    </ul>
                                </div> : null}
                            </li> : null}
                        {showIndicators ? (
                            <li className="stat custom-dropdown">
                                <div className="indicators label bucket-option clickable" onClick={this._toggleDropdown.bind(this, "tools")}>
                                    <Translate content="exchange.chart_options.tools" />
                                </div>
                                {dropdowns.tools ?
                                <div className="custom-dropdown-content"  onClick={this._stopPropagation}>
                                    <ul>
                                        {toolsOptions}
                                    </ul>
                                </div> : null}
                            </li>) : null}


                        {showIndicators ? (
                            <li className="stat custom-dropdown">
                                <div className="indicators label bucket-option clickable" onClick={this._toggleDropdown.bind(this, "indicators")}>
                                    <Translate content="exchange.chart_options.title" />
                                </div>
                                {dropdowns.indicators ?
                                <div className="custom-dropdown-content" onClick={this._stopPropagation}>
                                    <ul>
                                        <li className="indicator-title"><Translate content="exchange.chart_options.price_title" /></li>
                                            {indicatorOptionsPrice}
                                            {indicatorOptionsVolume.length ? <li className="indicator-title"><Translate content="exchange.chart_options.volume_title" />
                                        </li> : null}
                                        {indicatorOptionsVolume}
                                    </ul>
                                </div> : null}
                            </li>) : null}                      
                        {/* Borrow buttons */}
                        {showIndicators&&onBorrowQuote ? (
                            <li className="stat clickable" onClick={onBorrowQuote}>
                                <div className="indicators label bucket-option">
                                    <Translate content="exchange.borrow" />&nbsp;{quoteAsset.get("symbol")}
                                </div>
                            </li>) : null}

                        {showIndicators&&onBorrowBase ? 
                            <li className="stat clickable" onClick={onBorrowBase}>
                                <div className="indicators label bucket-option">
                                   <Translate content="exchange.borrow" />&nbsp;{baseAsset.get("symbol")}
                                </div>
                            </li> : null}
                        </ul>

        </div>);

    }
}
