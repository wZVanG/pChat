const config = require('../config');
const mongoose = require('mongoose');

//Configure mongoose
mongoose.connect(`mongodb://${config.database.host}:${config.database.port}/${config.database.dbname}`);
mongoose.Promise = global.Promise;
mongoose.connection.on('error', (e) => {
	console.error('MongoDB connection error:', e.message);
	process.exit(0);
});

module.exports = {
	mongoose: mongoose,
	models: {
		Chats: mongoose.model('Chats', { 
			tipo: Number,
			nombre: String, 
			usuarios: [
				{type: mongoose.Schema.Types.ObjectId, ref: 'Usuarios'}
			],
			created_at: Date
		}),
		ChatMensajes: mongoose.model('ChatMensaje', { 
			chat: {type: mongoose.Schema.Types.ObjectId, ref: 'Chats'},
			usuario: {type: mongoose.Schema.Types.ObjectId, ref: 'Usuarios'},
			mensaje: String, 
			fecha: Number, 
			tipo: Number,
			code: Number,
			ip: String
		}),
		Usuarios: mongoose.model('Usuarios', { 
			nickname: String, 
			email: String,
			clave: String,
			joined: Number,
			created_at: Date,
			tipo: Number,
			ip: String
		}),
	},
	Types: mongoose.Types
};