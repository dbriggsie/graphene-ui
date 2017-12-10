var path = require("path");
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var Clean = require("clean-webpack-plugin");
var git = require("git-rev-sync");
require("es6-promise").polyfill();
NODE_ENV='development';
// BASE APP DIR
var root_dir = path.resolve(__dirname);

let env = { dev: true };


module.exports = function() {
    if (!env.profile) {
        console.log("env:", env);
    }
    // console.log(env.prod ? "Using PRODUCTION options\n" : "Using DEV options\n");
    // STYLE LOADERS
    var cssLoaders = [
        {
            loader: "style-loader"
        },
        {
            loader: "css-loader"
        },
        {
            loader: "postcss-loader"
        }
    ];

    var scssLoaders =  [
        {
            loader: "style-loader"
        },
        {
            loader: "css-loader"
        },
        {
            loader: "postcss-loader",
            options: {
                plugins: [require("autoprefixer")]
            }
        },
        {
            loader: "sass-loader",
            options: {
                outputStyle: "expanded"
            }
        }
    ];

    // OUTPUT PATH
    var outputPath = path.join(root_dir, "dist");

    // COMMON PLUGINS
    var plugins = [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.DefinePlugin({
            APP_VERSION: JSON.stringify(git.tag()),
            __ELECTRON__: !!env.electron,
            __HASH_HISTORY__: !!env.hash,
            __BASE_URL__: JSON.stringify("baseUrl" in env ? env.baseUrl : "/"),
            __UI_API__: JSON.stringify(env.apiUrl || "https://ui.bitshares.eu/api"),
            __TESTNET__: !!env.testnet
        })
    ];

    if (!"prod") {
        // PROD OUTPUT PATH
        let outputDir = env.electron ? "electron" : env.hash ? "hash-history" : "dist";
        outputPath = path.join(root_dir, outputDir);

        // DIRECTORY CLEANER
        var cleanDirectories = [outputDir];

        // WRAP INTO CSS FILE
        const extractCSS = new ExtractTextPlugin("app.css");
        cssLoaders = ExtractTextPlugin.extract({
            fallback: "style-loader",
            use: [{loader: "css-loader"}, {loader: "postcss-loader", options: {
                plugins: [require("autoprefixer")]
            }}]}
        );
        scssLoaders = ExtractTextPlugin.extract({fallback: "style-loader",
            use: [{loader: "css-loader"}, {loader: "postcss-loader", options: {
                plugins: [require("autoprefixer")]
            }}, {loader: "sass-loader", options: {outputStyle: "expanded"}}]}
        );

        // PROD PLUGINS
        plugins.push(new Clean(cleanDirectories, {root: root_dir}));
        plugins.push(new webpack.DefinePlugin({
            "process.env": {NODE_ENV: JSON.stringify("production")},
            __DEV__: false
        }));
        plugins.push(extractCSS);
        plugins.push(new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false
        }));
        plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
        if (!env.noUgly) {

            plugins.push(new webpack.optimize.UglifyJsPlugin({
                sourceMap: true,
                compress: {
                    warnings: true
                },
                output: {
                    screw_ie8: true
                }
            }));
        }
    } else {
        // plugins.push(new webpack.optimize.OccurenceOrderPlugin());
        plugins.push(new webpack.DefinePlugin({
            "process.env": {NODE_ENV: JSON.stringify("development")},
            __DEV__: true
        }));
        plugins.push(new webpack.HotModuleReplacementPlugin());
        plugins.push(new webpack.NoEmitOnErrorsPlugin());
    }

    var config = {
        entry: {
            // vendor: ["react", "react-dom", "highcharts/highstock", "bitsharesjs", "lodash"],
            app:  path.resolve(root_dir, "app/Main.js")
        },
        output: {
            publicPath: "",
            path: outputPath,
            filename: "[name].js",
            pathinfo: !env.prod,
            sourceMapFilename: "[name].js.map"
        },
        devtool: "devtool",
        module: {
            rules: [
                {
                    test: /\.jsx$/,
                    include: [path.join(root_dir, "app"), path.join(root_dir, "node_modules/react-foundation-apps")],
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                cacheDirectory: env.prod ? false : true
                            }
                        }
                    ]
                },
                {
                    test: /\.js$/,
                    exclude: [/node_modules/],
                    loader: "babel-loader",
                    options: {compact: false, cacheDirectory: true}
                },
                {
                    test: /\.json/, loader: "json-loader",
                    exclude: [
                        path.resolve(root_dir, "lib/common"),
                        path.resolve(root_dir, "app/assets/locales")
                    ]
                },
                { test: /\.coffee$/, loader: "coffee-loader" },
                { test: /\.(coffee\.md|litcoffee)$/, loader: "coffee-loader?literate" },
                {
                    test: /\.css$/,
                    use: cssLoaders
                },

                // var cssLoaders = "style-loader!css-loader!postcss-loader",
                //   scssLoaders =  "style-loader!css-loader!postcss-loader!sass-loader?outputStyle=expanded";

                {
                    test: /\.scss$/,
                    use: scssLoaders
                },
                {
                    test: /\.png$/,
                    exclude:[path.resolve(root_dir, "app/assets/asset-symbols"), path.resolve(root_dir, "app/assets/language-dropdown/img")],
                    use: [
                        {
                            loader: "url-loader",
                            options: {
                                limit: 100000
                            }
                        }
                    ]
                },

                {
                    test: /\.woff$/,
                    use: [
                        {
                            loader: "url-loader",
                            options: {
                                limit: 100000,
                                mimetype: "application/font-woff"
                            }
                        }
                    ]
                },
                { test: /.*\.svg$/, loaders: ["svg-inline-loader", "svgo-loader"] },
                {
                    test: /\.md/,
                    use: [
                        {
                            loader: "html-loader",
                            options: {
                                removeAttributeQuotes: false
                            }
                        },
                        {
                            loader: "remarkable-loader",
                            options: {
                                preset: "full",
                                typographer: true
                            }
                        }
                    ]
                }
            ]
        },
        resolve: {
            modules: [
                path.resolve(root_dir, "app"),
                path.resolve(root_dir, "lib"),
                "node_modules"
            ],
            extensions: [".js", ".jsx", ".coffee", ".json"],
            // fallback: [path.resolve(root_dir, "./node_modules")]
        },
        resolveLoader: {
            modules: [path.join(root_dir, "node_modules")],
            // fallback: [path.resolve(root_dir, "./node_modules")]
        },
        plugins: plugins
    };

    // if(env.prod) config.entry.vendors = [
    //     "classnames", "react-router", "highcharts/highstock", "counterpart", "react-translate-component",
    //     "perfect-scrollbar", "jdenticon", "react-notification-system", "react-tooltip",
    //     "whatwg-fetch", "alt", "react-json-inspector",
    //     "immutable", "bitsharesjs"
    // ];

    return config;
};
