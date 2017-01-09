require("file?name=dictionary.json!common/dictionary_en.json");


//require("whatwg-fetch");
require("indexeddbshim");
require("./assets/locales/locales.js");

if (!window.Intl) { // Safari polyfill
    require.ensure(['intl'], require => {
        window.Intl = require('intl');
        Intl.__addLocaleData(require("./assets/intl-data/en.json"));
        require("./App.jsx");
    });
} else {
    require("./App.jsx");
}
