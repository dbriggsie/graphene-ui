var path = require("path");
var webpack = require("webpack");
var express = require("express");
var app = express();
//var devMiddleware = require("webpack-dev-middleware");
/*var ProgressPlugin = require("webpack/lib/ProgressPlugin");
var config = require("./webpack_2.config.js");
var compiler = webpack(config);

compiler.apply(new ProgressPlugin(function(percentage, msg) {
    process.stdout.write((percentage * 100).toFixed(2) + '% ' + msg + '                 \033[0G');
}));*/

/*app.use(devMiddleware(compiler, {
    historyApiFallback: true
}));*/

var config = require("./webpack_2.config.js");

const compiler = webpack(config);

const watching = compiler.watch({
  aggregateTimeout: 300,
  poll: undefined
}, (err, stats) => {
	if(err){
		console.log("error", err);
	}
  // Print watch/build result here...
  console.log("done", stats);
});


app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


app.get("/([a-z,A-Z\-\/]+)", function(req, res) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get("/([a-z,A-Z,0-9\-\_\/]+\.[a-z,0-9]+)", function(req, res) {
    console.log('@>', req.url," ===>", path.join(__dirname, 'dist', req.url));

    res.sendFile( path.join(__dirname, 'dist', req.url));
});

app.listen(8080, function(err) {
    if (err) {
        return console.error(err);
    }

    console.log("Listening at http://localhost:8080/");
});
