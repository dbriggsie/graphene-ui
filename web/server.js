var path = require("path");
var url = require("url");
var webpack = require("webpack");
var express = require("express");
var app = express();
var webpackDevMiddleware = require("webpack-dev-middleware");
var ProgressPlugin = require("webpack/lib/ProgressPlugin");
var config = require("./webpack_2.config.js")({
    SET:"EU1",
    "electron":!!~process.argv.indexOf("electron"),
    "hash":!!~process.argv.indexOf("hash")
});
var compiler = webpack(config);

compiler.apply(new ProgressPlugin(function(percentage, msg) {
    process.stdout.write((percentage * 100).toFixed(2) + '% ' + msg + '                 \033[0G');
}));

app.use(webpackDevMiddleware(compiler, {
    publicPath: "/",
    historyApiFallback: true
}));

app.get("*", function(req, res) {
    let parsedUrl = url.parse(req.url, true);

    if(~parsedUrl.pathname.indexOf("/abcui/assets/")){
        let filepath = __dirname + parsedUrl.pathname;
        console.log('@>filepath',filepath)
        res.sendFile(filepath)
    }else{
        res.sendFile(__dirname + '/app/assets/index.html')
    }

    
})


app.listen(8080,"0.0.0.0", function(err) {
    if (err) {
        return console.error(err);
    }
    console.log("http://0.0.0.0:8080");
});
