var path = require('path')

module.exports = {
	entry: {
		app: path.join(__dirname, '/js/index.js')
	},

	output: {
		path: path.join(__dirname, '/js'),
		filename: 'bundle.js',
		publicPath: '/js/'
	},

	module: {
		loaders:[
			{
				test: /\.js?$/,
				loader: 'babel-loader',
				include: path.join(__dirname, '/js')
			},

			{
				test: /\.css$/,
				loaders: ['style-loader', 'css-loader'],
				include: path.join(__dirname, '/')
			}
		]	
		}
}