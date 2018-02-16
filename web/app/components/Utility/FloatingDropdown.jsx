import React from "react";
import utils from "common/utils";
import Icon from "../Icon/Icon";

class Dropdown extends React.Component {

    static propTypes = {
        scrollLength: React.PropTypes.number
    }

    static defaultProps = {
        scrollLength: 9
    }

    constructor(props) {
        const scrollLength = props.scrollLength;
        super(props);
        this.state = {
            active: false
        };

        this.listener = false;
        this.onBodyClick = this.onBodyClick.bind(this);
    }

    componentDidMount() {
        this._setListener();
    }

    shouldComponentUpdate(np, ns) {
        return (
            !utils.are_equal_shallow(np.entries, this.props.entries) ||
            !utils.are_equal_shallow(ns, this.state) ||
            np.value !== this.props.value
        );
    }

    _setListener(props = this.props) {
        if(props.entries.length > 1 && !this.listener) {
            this.listener = true;
            document.body.addEventListener("click", this.onBodyClick, {capture: false, passive: true});
        }
    }

    _removeListener() {
        document.body.removeEventListener("click", this.onBodyClick);
        this.listener = false;
    }

    componentWillReceiveProps(np) {
        if (np.entries.length === 1) {
            this._removeListener();
        } else if (np.entries.length > 1) {
            this._setListener(np);
        }
    }

    componentWillUnmount() {
        this._removeListener();
    }

    onBodyClick(e) {
        let el = e.target;
        let insideActionSheet = false;

        do {
            if(el.classList && el.classList.contains("dropdown") && el.id === this.props.id) {
                insideActionSheet = true;
                break;
            }
        } while ((el = el.parentNode));

        if(!insideActionSheet) {
            this.setState({active: false});
        } else {
            e.stopPropagation();
        }
    }

    onChange(value, e) {
        e.preventDefault();
        e.stopPropagation();
        this.props.onChange(value);
        this.setState({
            active: false
        });
    }

    onChangeWithDel(value, e) {
        e.preventDefault();
        e.stopPropagation();
        this.props.onChange(value);
        this.setState({
            active: false
        });
        this.props.coincidenceFav(value)
    }

    _toggleDropdown() {
        this.setState({
            active: !this.state.active
        });
    }

    _removeFavorites(value){
       this.props.favoritesDel(value);
       this.props.coincidenceFav(value);
    }

    render() {

        let {entries, value, startListCurrency} = this.props;
        let {active} = this.state;

        if(startListCurrency){
            let startCurrencyId;
            entries.map((item, ind)=>{
                if(item == startListCurrency) startCurrencyId = ind;
            })
            entries.unshift(...entries.splice(startCurrencyId,1))
        }

        if(entries.length === 0) return null;
        if(entries.length == 1 && this.props.label !== "transfer.to") {
            return (
                <div className={"dropdown-wrapper inactive" + (this.props.upperCase ? " upper-case" : "")}>
                    <div>
                        {this.props.singleEntry ? this.props.singleEntry : entries[0]}
                    </div>
                </div>
            );
        } else {

            let options = entries.map(value => {
                return <li className={this.props.upperCase ? "upper-case" : ""} key={value} onClick={this.onChange.bind(this, this.props.values[value])}><span>{value}</span></li>;
            });

            let optionsWithDel = entries.map(value => {
                return <li style={{position: 'relative'}} className={this.props.upperCase ? "upper-case" : ""} key={value} >
                    <span onClick={this.onChangeWithDel.bind(this, this.props.values[value])} style={{paddingRight: '35px'}}>{value}</span>
                    <span className="iconRemoveFavorites" onClick={this._removeFavorites.bind(this,value)}>
                        <Icon  name="cross-circle" className="icon-14px" />
                    </span>
                    </li>;
            });
            return (
                <div onClick={this._toggleDropdown.bind(this)} className={"dropdown-wrapper" + (active ? " active" : "")  + (this.props.upperCase ? " upper-case" : "")}>
                    <div style={{paddingRight: 15}}>{value ? value : <span className="hidden">A</span>}</div>
                    <ul className="dropdown" style={{overflow: entries.length >= this.props.scrollLength ? "auto": "hidden"}}>
                        {this.props.label == "transfer.to" ? optionsWithDel : options}
                    </ul>
                </div>
            );
        }
    }
}

export default Dropdown;
