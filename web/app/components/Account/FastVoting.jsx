import React from "react"
import { connect } from "alt-react"
import Translate from "react-translate-component"
import BindToChainState from "../Utility/BindToChainState"
import Immutable from "immutable"
import AccountStore from "stores/AccountStore"
import ChainTypes from "../Utility/ChainTypes"
import ApplicationApi from "api/ApplicationApi"
import accountUtils from "common/account_utils"
import ZfApi from "react-foundation-apps/src/utils/foundation-api"
import LoadingIndicator from "../LoadingIndicator";

const OPENLEDGER_ID = "1.2.96393"

class FastVoting extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired
    }

    constructor(props) {
        super(props)
        this.state = {
            complete: false,
            processing: false
        }
        this.onPublish = this.onPublish.bind(this)
        this.onContinue = this.onContinue.bind(this)
        this._transactionListener = this._transactionListener.bind(this)
    }

    _transactionListener(name, msg) {
        if (msg === "cancel") {
            this.setState({
                processing: false
            })
        }
    }
    componentWillUnmount() {
        ZfApi.unsubscribe("transaction-action", this._transactionListener)
    }

    componentDidMount() {
        ZfApi.subscribe("transaction-action", this._transactionListener)
    }

    onPublish() {
        this.setState({
            processing: true
        })
        let updated_account = this.props.account.toJS()
        let updateObject = { account: updated_account.id }
        let new_options = { memo_key: updated_account.options.memo_key }
        new_options.voting_account = OPENLEDGER_ID
        new_options.num_committee = 0
        new_options.num_witness = 0
        new_options.votes = []

        updateObject.new_options = new_options
        updateObject.fee = {
            amount: 0,
            asset_id: accountUtils.getFinalFeeAsset(updated_account.id, "account_update")
        }
        ApplicationApi.updateAccount(updateObject).then(
            () => {
                this.setState({
                    complete: true,
                    processing: false
                })
                ZfApi.publish("fast-voting-message", "done")
            }
        ).catch(() => {
            this.setState({
                processing: false
            })
        })
    }

    onContinue() {
        this.props.router.push("/")
    }

    render() {
        return (
            <div className="grid-content shrink vertical">
                <div className="account-creation">
                    <div className="text-center">
                        <img src="/app/assets/logo.png" alt="openledger" />
                        <Translate content="account.fast_voting.title" component="h3" />
                    </div>
                    {this.state.complete ?
                        <div>
                            <Translate content="account.fast_voting.thanks" unsafe component="p" />
                            <div className="text-center fz_14 mb_5">
                                <Translate className="button" content="account.fast_voting.continue" onClick={this.onContinue} />
                            </div>
                        </div> :
                        <div>
                            <Translate content="account.fast_voting.invitation_intro" unsafe component="p" />
                            <Translate content="account.fast_voting.invitation_explanation" unsafe component="p" />
                            <Translate content="account.fast_voting.invitation_conclusion" unsafe component="p" />
                            <Translate content="account.fast_voting.invitation_click" unsafe component="p" className="content-block" />
                            <div className="text-center fz_14 mb_5">
                                <button className="button spinner-button-circle">
                                    {this.state.processing ? <LoadingIndicator type="circle" /> : null} <Translate content="account.fast_voting.vote" onClick={this.onPublish} />
                                </button>
                            </div>
                        </div>
                    }
                </div>
            </div>
        )
    }
}
FastVoting = BindToChainState(FastVoting)

export default connect(FastVoting, {
    listenTo() {
        return [AccountStore]
    },
    getProps() {
        return {
            account: AccountStore.getState().currentAccount || AccountStore.getState().passwordAccount 
        }
    }
})
