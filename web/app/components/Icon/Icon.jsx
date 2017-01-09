// look for more icons here https://linearicons.com/free or here http://hawcons.com/preview/

import React from "react";

class Icon extends React.Component {
    render() {
        let classes = "icon " + this.props.name;
        if(this.props.size) {
            classes += " icon-" + this.props.size;
        }
        if(this.props.className) {
            classes += " " + this.props.className;
        }
        return <span className={classes} />;
    }
}

Icon.propTypes = {
    name: React.PropTypes.string.isRequired,
    size: React.PropTypes.oneOf(["1x", "2x", "3x", "4x", "5x", "10x"]),
    inverse: React.PropTypes.bool,
    className: React.PropTypes.string
};

export default Icon;
