// Generated using webpack-cli https://github.com/webpack/webpack-cli
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';

const stylesHandler = isProduction ? MiniCssExtractPlugin.loader : 'style-loader';

const CopyWebpackPlugin = require('copy-webpack-plugin');

const config = {
    entry: {
        main: './src/index.ts',
        login: './src/login.ts'
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: isProduction ? '/secret/' : '/',
    },
    devServer: {
        open: true,
        host: 'localhost',
        port: 3306, // Port demandé dans le sujet
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',
            filename: 'index.html',
            chunks: ['main']
        }),
        new HtmlWebpackPlugin({
            template: './login.html',
            filename: 'login.html',
            chunks: ['login'] // N'inclut que le JS du login
        }),
        new webpack.DefinePlugin({
            __API_PATH__: isProduction
                ? JSON.stringify('https://192.168.75.88/api')
                : JSON.stringify('http://localhost:3376')
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/icons', to: 'icons' }
            ]
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
            },
            {
                test: /\.css$/i,
                use: [stylesHandler, 'css-loader'],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },
            {
                test: /\.html$/i,
                use: ['html-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
    },
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';
        config.plugins.push(new MiniCssExtractPlugin());
    } else {
        config.mode = 'development';
    }
    return config;
};