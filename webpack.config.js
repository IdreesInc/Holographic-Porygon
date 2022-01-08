const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
	entry: [
		"./src/application.js"
	],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"]
			},
			{
				test: /\.glsl/,
				type: "asset/source",
			},
			{
				test: /\.glb/,
				type:"asset/resource"
			},
			{
				test: /\.png/,
				type:"asset/resource",
				generator: {
					filename: '[name][ext]'
				}
			},
			{
				test: /\.jpg/,
				type:"asset/resource",
				generator: {
					filename: '[name][ext]'
				}
			},
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, "src", "index.html")
		})
	],
	devtool: "eval-source-map"
};