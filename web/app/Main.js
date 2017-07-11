require("file-loader?name=dictionary.json!common/dictionary_en.json");
require("file-loader?name=jquery-2.2.1.min.js!./assets/jquery-2.2.1.min.js.file");
require("file-loader?name=owl.carousel.min.js!./assets/owl.carousel.min.js.file");
require("file-loader?name=pushy_mod.min.js!./assets/pushy_mod.min.js.file");
require("whatwg-fetch");
require("indexeddbshim");
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
