const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: './src/index.ts',
    stats: {
        errorDetails: true
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "bundle.js",
    },
    module: {
        rules: [
            {
                test: /\.(png|jpe?g|gif|woff|svg|eot|ttf)$/i,
                use: [{ loader: 'file-loader' }],
            },
            {
                test: /\.css$/i,
                include: path.resolve(__dirname, 'src'),
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
        }),
    ],
    resolve: {
        extensions: ['.ts', '.js', '.css']
    },
};
