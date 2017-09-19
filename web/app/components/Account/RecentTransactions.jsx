import React from "react";
import Translate from "react-translate-component";
import {saveAs} from "file-saver";
import Operation from "../Blockchain/Operation";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import utils from "common/utils";
import {ChainTypes as grapheneChainTypes} from "bitsharesjs/es";
import TransitionWrapper from "../Utility/TransitionWrapper";
import ps from "perfect-scrollbar";
import counterpart from "counterpart";

const {operations} = grapheneChainTypes;

function compareOps(b, a) {
    if (a.block_num === b.block_num) {
        return a.virtual_op - b.virtual_op;
    } else {
        return a.block_num - b.block_num;
    }
}

function textContent(n) {
    return n ? `"${n.textContent.replace(/[\s\t\r\n]/gi, " ")}"` : "";
}

class RecentTransactions extends React.Component {

    static propTypes = {
        accountsList: ChainTypes.ChainAccountsList.isRequired,
        compactView: React.PropTypes.bool,
        limit: React.PropTypes.number,
        maxHeight: React.PropTypes.number,
        fullHeight: React.PropTypes.bool,
        showFilters: React.PropTypes.bool
    };

    static defaultProps = {
        limit: 25,
        maxHeight: 500,
        fullHeight: false,
        showFilters: false
    };

    constructor(props) {
        super();
        this.state = {
            limit: props.limit || 20,
            csvExport: false,
            headerHeight: 85,
            filter: "all"
        };
    }

    componentDidMount() {
        if (!this.props.fullHeight) {
            let t = this.refs.transactions;
            ps.initialize(t);

            this._setHeaderHeight();

        }

    }

    _setHeaderHeight() {
        let height = this.refs.header.offsetHeight;

        if (height !== this.state.headerHeight) {
            this.setState({
                headerHeight: height
            });
        }
    }

    shouldComponentUpdate(np, ns) {
        if(!utils.are_equal_shallow(this.props.accountsList, np.accountsList)) return true;
        if(this.props.maxHeight !== np.maxHeight) return true;
        if(this.state.headerHeight !== ns.headerHeight) return true;
        if(this.state.filter !== ns.filter) return true;
        if (this.props.customFilter && np.customFilter) {
            if(!utils.are_equal_shallow(this.props.customFilter.fields, np.customFilter.fields) ||
                !utils.are_equal_shallow(this.props.customFilter.values, np.customFilter.values)) {
                return true;
            };
        } else if (this.props.customFilter && !np.customFilter) {
            return true;
        }

        if(this.props.maxHeight !== np.maxHeight) return true;
        if (ns.limit !== this.state.limit || ns.csvExport !== this.state.csvExport) return true;
        for(let key = 0; key < np.accountsList.length; ++key) {
            let npa = np.accountsList[key];
            let nsa = this.props.accountsList[key];
            if(npa && nsa && (npa.get("history") !== nsa.get("history"))) return true;
        }
        return false;
    }

    componentDidUpdate() {
        if (this.state.csvExport) {
            this.state.csvExport = false;
            const csv_export_container = document.getElementById("csv_export_container");
            const nodes = csv_export_container.childNodes;
            let csv = "";
            for (const n of nodes) {
                //console.log("-- RecentTransactions._downloadCSV -->", n);
                const cn = n.childNodes;
                if (csv !== "") csv += "\n";
                csv += [textContent(cn[0]), textContent(cn[1]), textContent(cn[2]), textContent(cn[3])].join(",");
            }
            var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            var today = new Date();
            saveAs(blob, "btshist-" + today.getFullYear() + "-" + today.getMonth() + "-" + today.getDate() + ".csv");
        }

        if (!this.props.fullHeight) {
            let t = this.refs.transactions;
            ps.update(t);

            this._setHeaderHeight();

        }

    }

    _onIncreaseLimit() {
        this.setState({
            limit: this.state.limit + 30
        });
    }

    _getHistory(accountsList, filterOp, customFilter) {
        let history = [];
        let seen_ops = new Set();
        for (let account of accountsList) {
            if(account) {
                let h = account.get("history");
                if (h) history = history.concat(h.toJS().filter(op => !seen_ops.has(op.id) && seen_ops.add(op.id)));
            }
        }
        if (filterOp) {
            if (!Array.isArray(filterOp)) {
                filterOp = [filterOp];
            }

            history = history.filter(a => {
                return filterOp.reduce((ret, op) => {
                    return ret || a.op[0] === operations[op];
                }, false);
            });
        }

        if (customFilter) {
            history = history.filter(a => {
                let finalValue = customFilter.fields.reduce((final, filter) => {
                    let filterValue = customFilter.values[filter];
                    switch (filter) {
                    case "asset_id":
                        if (a.op[0] === 1) { // limit_order_create
                            return final && (a.op[1]["amount_to_sell"][filter] === filterValue || a.op[1]["min_to_receive"][filter] === filterValue);
                        }
                        if (a.op[0] === 4) { // fill_order
                            return final && (a.op[1]["pays"][filter] === filterValue || a.op[1]["receives"][filter] === filterValue);
                        }
                        return final && a.op[1]["amount"][filter] === filterValue;
                        break;
                    default:
                        return final && a.op[1][filter] === filterValue;
                        break;
                    }
                }, true)
                return finalValue;
            });
        }
        return history;
    }

    _downloadCSV() {
        this.setState({csvExport: true});
    }

    _onChangeFilter(e) {
        this.setState({
            filter: e.target.value
        });
    }

    render() {
        let {accountsList, compactView, filter, customFilter, style, maxHeight} = this.props;
        let {limit, headerHeight} = this.state;
        let current_account_id = accountsList.length === 1 && accountsList[0] ? accountsList[0].get("id") : null;
        let history = this._getHistory(accountsList, this.props.showFilters && this.state.filter !== "all" ?  this.state.filter : filter, customFilter).sort(compareOps);
        let historyCount = history.length;

        console.log('@>history',history[0])

        style = style ? style : {};
        style.width = "100%";
        style.height = "100%";

        let options = null;
        if (true || this.props.showFilters) {
            options = ["all", "transfer", "limit_order_create", "limit_order_cancel", "fill_order", "account_create", "account_update", "asset_create",
            "witness_withdraw_pay", "vesting_balance_withdraw", "asset_publish_feed"]
            .map(type => {
                return <option value={type} key={type}>{counterpart.translate("transaction.trxTypes." + type)}</option>;
            });
        }

        const display_history = history.length ?
            history.slice(0, limit)
            .map(o => {

                return (
                    <Operation
                        key={o.id}
                        operation_id={o.id}
                        op={o.op}
                        result={o.result}
                        block={o.block_num}
                        current={current_account_id}
                        hideFee
                        inverted={false}
                        hideOpLabel={compactView}
                    />
                );
            }) : <tr><td colSpan={compactView ? "2" : "3"}><Translate content="operation.no_recent" /></td></tr>;

        return (
            <div className="recent-transactions no-overflow" style={style}>
                    <div ref="header">
                        <h4>{this.props.title ? this.props.title : <Translate content="account.recent" />}</h4>

                        {historyCount > 0 ?
                        <span >
                            <a
                                className="inline-block"
                                onClick={this._downloadCSV.bind(this)}
                                data-tip={counterpart.translate("transaction.csv_tip")}
                                data-place="bottom"
                            >
                                <Translate content="transaction.csv" />
                            </a>                                
                        </span> : null}

                        {this.props.showFilters ? (
                        <div className="float-right">
                            <select data-place="left" data-tip={counterpart.translate("tooltip.filter_ops")} style={{paddingTop: 0}} className="bts-select" value={this.state.filter} onChange={this._onChangeFilter.bind(this)}>{options}</select>
                        </div>) : null}
                        <table className={"table" + (compactView ? " compact" : "")}>
                            <thead>
                                <tr>
                                    {compactView ? null : <th className="column-hide-tiny" style={{width: "20%"}}><Translate content="explorer.block.op" /></th>}

                                    {compactView ? null : <th style={{width: "15%",padding: "0"}} >OPERATION ID</th>}

                                    <th><Translate content="account.votes.info" /></th>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    <div
                        className="box-content grid-block no-margin"
                        style={!this.props.fullHeight ? {
                            maxHeight: maxHeight - headerHeight
                        } : null}
                        ref="transactions">
                        <table className={"table" + (compactView ? " compact" : "")}>
                            <TransitionWrapper
                                component="tbody"
                                transitionName="newrow"
                            >
                                {display_history}
                            </TransitionWrapper>
                        </table>
                    </div>
                {
                    historyCount > 0 && this.state.csvExport &&
                    <div id="csv_export_container" style={{display: "none"}}>
                        <div>
                            <div>DATE</div>
                            <div>OPERATION</div>
                            <div>MEMO</div>
                            <div>AMOUNT</div>
                        </div>
                        {
                            history.map(o => {
                                return (
                                    <Operation
                                        key={o.id}
                                        operation_id={o.id}
                                        op={o.op}
                                        result={o.result}
                                        block={o.block_num}
                                        inverted={false}
                                        csvExportMode
                                    />
                                );
                            })
                        }
                    </div>
                }

                {this.props.showMore && historyCount > this.props.limit || 20 && limit < historyCount ? (
                    <div className="account-info more-button">
                        <button className="button outline small" onClick={this._onIncreaseLimit.bind(this)}>
                            <Translate content="account.more" />
                        </button>
                    </div>
                    ) : null}
            </div>
        );
    }
}
RecentTransactions = BindToChainState(RecentTransactions, {keep_updating: true});

class TransactionWrapper extends React.Component {

    static propTypes = {
        asset: ChainTypes.ChainAsset.isRequired,
        to: ChainTypes.ChainAccount.isRequired,
        fromAccount: ChainTypes.ChainAccount.isRequired
    };

    static defaultProps = {
        asset: "1.3.0"
    };

    render() {
        return <span className="wrapper">{this.props.children(this.props)}</span>;
    }
}
TransactionWrapper = BindToChainState(TransactionWrapper);

export {RecentTransactions, TransactionWrapper};

