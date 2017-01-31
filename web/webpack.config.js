'use strict';
const NODE_ENV = process.env.NODE_ENV || 'development';
const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs');
const git = require('git-rev-sync');
const exec = require('child_process').exec;

exec(`rm -fr ${__dirname}/dist/*`, (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
});

function CreateWebpackConfig(type) {

    let ext = (type == 'js' && 'js' || type == 'scss' && 'css' || type == 'html' && 'html');

    this.entry = {};
    //custom files input
    if (type == 'js') {
        this.entry['app'] = path.join(__dirname, 'app', 'Main');
        //this.entry['app'] = path.join(__dirname, 'app', 'a11');
    } else if (type == 'scss') {
        this.entry['files'] = path.join(__dirname, 'app', 'assets', 'files');
        this.entry['app'] = path.join(__dirname, 'app', 'assets', 'stylesheets', 'app');
        //this.entry['file1'] = path.join(__dirname, folder, 'file1');
    } else if (type == 'html') {
        this.entry['index'] = path.join(__dirname, 'app', 'assets', 'index');
    }

    this.output = {
        filename: '[name].' + ext,
        path: path.join(__dirname, 'dist'),
        publicPath: ''
    }; //publicPath !!

    let outputfile = path.join(this.output.path, `index.${ext}`);

    this.resolve = {
        extensions: ['']
    };

    this.resolve.extensions.push(`.${type}`);

    this.module = {
        loaders: []
    };

    if (type == 'js') {

        this.resolve.extensions.push(".jsx");
        this.resolve.extensions.push(".coffee");
        this.resolve.extensions.push(".json");

        this.resolve.root = [path.resolve(__dirname, "./app"), path.resolve(__dirname, "./lib")];
        this.resolve.modulesDirectories = ["../node_modules"];
        this.resolve.fallback = [path.resolve(__dirname, "../node_modules")];
        this.resolveLoader = {
            root: path.join(__dirname, "../node_modules"),
            fallback: [path.resolve(__dirname, "../node_modules")]
        };

        this.module.loaders.push({
            test: /\.md/,
            loader: 'html?removeAttributeQuotes=false!remarkable'
        });

        this.remarkable = {
            preset: "full",
            typographer: true
        };

        this.module.loaders.push({
            test: /\.jsx{0,1}$/i,
            exclude: /node_modules\/(?!(react-foundation-apps)\/).*/,  
            //include: ["../node_modules/react-foundation-apps"],
            loader: 'babel',
            query: {
                presets: ["react", "es2015", "stage-0"],
                plugins: ["transform-decorators-legacy", "transform-decorators"]
            }
        });

        this.module.loaders.push({
            test: /\.json/,
            loader: "json",
            exclude: [
                path.resolve(__dirname, "../dl/src/common"),
                path.resolve(__dirname, "../web/app/assets/locales")
            ]
        });

        this.module.loaders.push({
            test: /\.coffee$/,
            loader: "coffee-loader"
        });

        this.module.loaders.push({
            test: /\.(coffee\.md|litcoffee)$/,
            loader: "coffee-loader?literate"
        });

    } else if (type == 'scss') {

        this.module.loaders.push({
            test: /\.scss$/,
            loader: ExtractTextPlugin.extract('style-loader', 'css-loader?sourceMap!sass-loader?outputStyle=expanded&sourceMap=true&sourceMapContents=true')
        });

        this.module.loaders.push({
            test: /\.(jpe?g|png|gif|svg|ttf|eot|woff|woff2)$/i,
            loader: 'file?name=[path][name].[ext]'
        });

        this.module.loaders.push({
            test: /\.md/,
            loader: 'html?removeAttributeQuotes=false!remarkable'
        });

        this.module.postcss = function() {
            return [precss, autoprefixer];
        };

    } else if (type == 'html') {

        this.module.loaders.push({
            test: /\.html$/,
            loader: ExtractTextPlugin.extract('html?minimize=false')
        });
    }

    this.plugins = [
        new webpack.DefinePlugin({
            NODE_ENV: JSON.stringify(NODE_ENV),
            APP_VERSION: JSON.stringify(git.tag()),
            __ELECTRON__: false
        }),
        new webpack.NoErrorsPlugin(),
        function() {
            this.plugin("done", function(stats) {
                if (stats.compilation.errors && stats.compilation.errors.length) {
                    console.log(stats.compilation.errors[0].error);
                    if (fs.existsSync(outputfile)) {
                        fs.writeFileSync(outputfile, JSON.stringify(stats.compilation.errors[0].error.details), 'utf8');
                    }
                }
            });
        }
    ];

    if (type == 'scss' || type == 'html') {
        this.plugins.push(new ExtractTextPlugin(`[name].${ext}`))
    }

    this.devtool = (NODE_ENV == 'development' ? "inline-source-map" : '');

    if (NODE_ENV == 'production') {
        this.plugins.push(new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            comments: false,
            compress: {
                sequences: true,
                booleans: true,
                loops: true,
                unused: true,
                warnings: false,
                drop_console: true,
                unsafe: true
            }
        }));
    }
}

module.exports = [
   new CreateWebpackConfig('js'),
   new CreateWebpackConfig('scss'),
   new CreateWebpackConfig('html')
];
