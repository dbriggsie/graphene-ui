import React from "react";
import {Link} from "react-router";
import Translate from "react-translate-component";

export default class Residents_unsupport extends React.Component {
	componentDidMount() {
	    console.log('@>componentDidMount')
	    document.querySelector(".header").style.opacity = "0";
	    document.querySelector(".footer").style.opacity = "0";
	}

	componentWillUnmount() {
	    console.log('@>componentWillUnmount');
	    document.querySelector(".header").style.opacity = "1";
	    document.querySelector(".footer").style.opacity = "1";
	}

	render() {
        return (
            <div className="grid-content" style={{paddingTop: 130,textAlign:"center"}}>
				<h3>Unfortunately, we are unable to take contributions from US citizens.</h3>
				<p>{""}</p>
				<h5>Please keep an eye on our website to get all of the latest information.</h5>
            </div>
        );
    }
}
