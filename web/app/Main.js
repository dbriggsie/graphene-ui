require("file-loader?name=dictionary.json!common/dictionary_en.json");

//require("whatwg-fetch");
//require("indexeddbshim");
//require("./assets/locales/locales.js");


//require("./stylesheets/app.scss");
//require("file-loader?name=index.html!./index.html");
require("file-loader?name=dictionary.json!common/dictionary_en.json");
require("babel-polyfill");
require("whatwg-fetch");
require("indexeddbshim");
//require("./asset-symbols/symbols.js");
require("./assets/locales/locales.js");



if (!window.Intl) { // Safari polyfill
    require.ensure(["intl"], require => {
        window.Intl = require("intl");
        Intl.__addLocaleData(require("./assets/intl-data/en.json"));
        require("index-dev.jsx");
    });
} else {
    require("index-dev.jsx");
}
