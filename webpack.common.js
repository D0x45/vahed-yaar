const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
        }),
    ],
    output: {
        path: path.resolve('./dist'),
        filename: 'index.js',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.(png|jpe?g|gif|woff|svg|eot|ttf)$/i,
                use: [{ loader: 'file-loader' }],
            },
            {
                test: /\.css$/i,
                include: path.resolve('./src'),
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.css']
    },
};
