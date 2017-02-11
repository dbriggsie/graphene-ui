var path = require("path");
var webpack = require("webpack");
var express = require("express");
var app = express();
var webpackDevMiddleware = require("webpack-dev-middleware");
var ProgressPlugin = require("webpack/lib/ProgressPlugin");
var config = require("./webpack_2.config.js");
var compiler = webpack(config);

compiler.apply(new ProgressPlugin(function(percentage, msg) {
    process.stdout.write((percentage * 100).toFixed(2) + '% ' + msg + '                 \033[0G');
}));

app.use(webpackDevMiddleware(compiler, {
    publicPath: "/",
    historyApiFallback: true
}));


app.get("/([a-z,A-Z,0-9\-\/]+)", function(req, res) {
  res.sendFile(__dirname + '/app/assets/index.html')
})
app.listen(8080, function(err) {
    if (err) {
        return console.error(err);
    }
    console.log("Listening on port 3000!");
});
