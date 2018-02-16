import React from "react";
import utils from "common/utils";

export class DecimalChecker extends React.Component {
    onKeyPress(e){
        if(e.key === "." && e.target.value === "") e.target.value = "0";
        var nextValue = e.target.value + e.key;
        var decimal = nextValue.match(/\./g);
        var decimalCount = decimal ? decimal.length : 0;
        if(e.key === "." && decimalCount > 1) e.preventDefault();
        if(parseFloat(nextValue) != nextValue) e.preventDefault();

        if(this.props.onKeyPress) this.props.onKeyPress(e);
    }
}

class ExchangeInput extends DecimalChecker {
    constructor(){
        super();
    }

    componentWillReceiveProps(np) {
        if (this.props.value && !np.value) {
            this.refs.input.value = "";
        }
    }

    render(){
        return <input ref="input" type="text" {...this.props} value={utils.format_from_exponential(this.props.value)} onKeyPress={this.onKeyPress.bind(this)} />;
    }
}

export default ExchangeInput;
