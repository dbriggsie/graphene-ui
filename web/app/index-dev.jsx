import React from "react";
import ReactDOM from "react-dom";

/*
* Routes-dev is only needed for react hot reload, as this does not work with
* the async routes defined in Routes.jsx. Any changes to the routes must be kept
* synchronized between the two files
*/
import Routes from "./Routes-dev";

require("./components/Utility/Prototypes"); // Adds a .equals method to Array for use in shouldComponentUpdate

const NextApp = require("./Routes-dev").default;
ReactDOM.render(<NextApp />,document.getElementById("content"));

