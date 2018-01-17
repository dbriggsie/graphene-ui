const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const exec = require('child_process').exec;

const git = require("git-rev-sync");
require("es6-promise").polyfill();

exec(`rm -fr ${__dirname}/dist/*`, (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
});

function CreateWebpackConfig(type, options) {
    let folder = (type == "js" ? "scripts" : "assets");
    let ext = (type == "js" && "js" || type == "scss" && "css");

    this.plugins = [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.DefinePlugin({
            APP_VERSION: JSON.stringify(git.tag()),
            __ELECTRON__: !!options.electron,
            __HASH_HISTORY__: !!options.electron,
            __BASE_URL__: JSON.stringify(options.baseUrl || ""),
            __UI_API__: JSON.stringify(options.apiUrl || "https://ui.bitshares.eu/api"),
            __TESTNET__: !!options.testnet,
            __DEV__: false,
            ENV: JSON.stringify(options.ENV),
            SET: JSON.stringify(options.SET),
            "process.env": {
                NODE_ENV: JSON.stringify(process.env.NODE_ENV),
            },
            SERVER_ADMIN_URL: JSON.stringify(options.ENV === "production" ? "https://fiat.openledger.info" : "https://test-cny.openledger.info")
        })
    ];
    
    if (options.ENV == "production") {
        this.plugins.push(new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false
        }));
        this.plugins.push(new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            mangle: {
                screw_ie8: true,
                keep_fnames: true
            },
            compress: {
                screw_ie8: true
            },
            comments: false
        }));
        this.plugins.push(new webpack.DefinePlugin({
            ENV: JSON.stringify("production")
        }));
    }


    this.devtool = options.ENV == "production" ? "" : "inline-source-map";

    this.module = {
        rules: []
    };

    this.resolveLoader = {
        modules: [path.join(__dirname, "node_modules")],
        // fallback: [path.resolve(__dirname, "./node_modules")]
    };

    this.resolve = {
        modules: [
            path.resolve(__dirname, "app"),
            path.resolve(__dirname, "lib"),
            "node_modules"
        ],
        extensions: [
            `.${type}`,
        ]
    };

    this.entry = {
        // index: path.join(__dirname, folder, 'index')
    };

    //custom files input
    if (type == 'js') {
        this.entry['app'] = path.join(__dirname, 'app', 'Main');
        //this.entry['app'] = path.join(__dirname, 'app', 'a11');
    } else if (type == 'scss') {
        this.entry['files'] = path.join(__dirname, 'app', 'assets', 'files');
        this.entry['landing'] = path.join(__dirname, 'app', 'assets', 'landing');
        this.entry['app'] = path.join(__dirname, 'app', 'assets', 'stylesheets', 'app');

        this.plugins.push(new HtmlWebpackPlugin({
            filename: 'index.html',
            template: path.join(__dirname, 'app', 'assets', 'index.html'),
            inject: false,
            SET: options.SET,
            HASH: options.electron ? "" : "/",
            minify: {
                html5: true,
                collapseWhitespace: (options.ENV == "production" ? true : false),
            }
        }));
    }

    this.output = {
        filename: '[name].' + ext,
        path: path.join(__dirname, 'dist'),
        publicPath: '/'
    }; //publicPath !!


    this.module.rules.push({
        test: /\.md/,
        use: [{
            loader: "html-loader",
            options: {
                removeAttributeQuotes: false
            }
        }, {
            loader: "remarkable-loader",
            options: {
                preset: "full",
                typographer: true
            }
        }]
    });

    if (type == 'js') {

        this.resolve.extensions.push(".jsx");
        this.resolve.extensions.push(".coffee");
        this.resolve.extensions.push(".json");

        this.module.rules.push({
            test: /\.jsx$/,
            include: [path.join(__dirname, "app"), path.join(__dirname, "node_modules/react-foundation-apps")],
            use: {
                loader: "babel-loader",
                options: {
                    presets: ["es2015", "stage-0", "react"], //prod ["stage-0"],
                    plugins: options.ENV == "production" ? "transform-runtime" : ""
                }
            }
        });

        this.module.rules.push({
            test: /\.js$/,
            exclude: [/node_modules/],
            use: {
                loader: "babel-loader",
                options: {
                    presets: ["es2015", "stage-0"], //prod ["stage-0"],
                    plugins: options.ENV == "production" ? "transform-runtime" : ""
                }
            }
        });

        this.module.rules.push({
            test: /\.json/,
            loader: "json-loader",
            exclude: [
                path.resolve(__dirname, "lib/common"),
                path.resolve(__dirname, "app/assets/locales")
            ]
        });

        this.module.rules.push({ test: /\.coffee$/, loader: "coffee-loader" });

        this.module.rules.push({ test: /.*\.svg$/, loaders: ["svg-inline-loader", "svgo-loader"] });

    } else if (type == 'scss') {


        this.resolve.alias = {
            style_dir: path.resolve(__dirname, "app/assets/stylesheets")
        };

        this.module.rules.push({
            test: /\.(sass|scss)$/,
            exclude: /node_modules/,

            use: ExtractTextPlugin.extract({
                fallback: 'style-loader',
                use: [{
                    loader: 'css-loader',
                    query: {
                        minimize: options.ENV == "production" ? true : false,
                        modules: true, // enables CSS Modules spec
                        sourceMap: options.ENV == "production" ? false : true,
                        importLoaders: 1, // will import previous amount of loaders,
                        localIdentName: '[local]'
                    },
                }, {
                    loader: 'sass-loader',
                    query: {
                        sourceMap: options.ENV == "production" ? false : true,
                        sourceMapContents: options.ENV == "production" ? false : true,
                    },
                }]
            })
        });

        this.module.rules.push({
            test: /\.(jpe?g|png|gif|svg|ttf|eot|woff|woff2)$/i,
            use: {
                loader: 'file-loader',
                query: {
                    name: '[path][name].[ext]'
                }
            }
        });

        this.plugins.push(new ExtractTextPlugin({
            filename: `[name].${ext}`,
            disable: false,
            allChunks: true
        }));
    }
}

module.exports = function(options = {}) {
    console.log("options", options);
    return [
        new CreateWebpackConfig('js', options),
        new CreateWebpackConfig('scss', options)
    ];
}
