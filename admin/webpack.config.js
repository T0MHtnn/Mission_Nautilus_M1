// Generated using webpack-cli https://github.com/webpack/webpack-cli
const path = require('path');
const webpack = require('webpack'); // AJOUTÉ pour gérer les variables globales
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isProduction = process.env.NODE_ENV === 'production';

const stylesHandler = isProduction ? MiniCssExtractPlugin.loader : 'style-loader';

const config = {
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        // Important pour que les assets soient cherchés au bon endroit sur la VM
        publicPath: isProduction ? '/admin/' : '/', 
    },
    devServer: {
        open: true,
        host: 'localhost',
        port: 3306, // Port demandé dans le sujet
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',
        }),
        
        // Point 5 : Injection de l'URL de l'API selon l'environnement
        new webpack.DefinePlugin({
            API_PATH: isProduction 
                ? JSON.stringify('https://192.168.75.88/api') // URL de ta VM
                : JSON.stringify('http://localhost:3000')      // URL locale
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