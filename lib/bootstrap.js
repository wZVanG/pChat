const SERVER_CODES = require('./SERVER_CODES');
const CLIENT_CODES = require('./CLIENT_CODES');
const fs = require('fs');

module.exports = async function(app){


	//Create admin

	let admin = await app.db.models.Usuarios.findOne({
		nickname: {
			$regex: new RegExp('^' + app.config.chat.super_administrator.nickname.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i')
		}
	});


	if(!admin){

		let admin_created = new app.db.models.Usuarios({
			nickname: app.config.chat.super_administrator.nickname,
			clave: app.config.chat.super_administrator.password,
			tipo: CLIENT_CODES.USER_GROUPS.super_administrator,
			created_at: new Date()
		});
		admin_created.save();

		admin = admin_created.toJSON();

	}

	app.config.chat.super_administrator._id = admin._id;

	console.info("Super Administrator: ", admin.nickname);

	//Create lobby room

	let lobby = await app.db.models.Chats.findOne({tipo:CLIENT_CODES.CHAT_TIPOS.lobby});

	if(!lobby){
		let lobby_created = new app.db.models.Chats({
			tipo: CLIENT_CODES.CHAT_TIPOS.lobby,
			created_at: new Date(),
			nombre: app.config.chat.lobby_name
		});
		lobby_created.save();

		lobby = lobby_created.toJSON();

		console.info("Sala principal creada: ", lobby);
	}
	//Update nombre lobby
	let update = await app.db.models.Chats.update({_id:lobby._id}, {$set: {nombre: app.config.chat.lobby_name}});

	if(update.nModified > 0) console.info("Nuevo nombre de sala principal: ", app.config.chat.lobby_name);

	//Define lobby_id for global access
	app.config.chat.lobby_id = lobby._id;

	//Welcome message content
	let data_file = fs.readFileSync(app.paths.app_root + '/data/sombrero', "utf8");

	app.config.chat.welcome_content = `<pre>${data_file}\n\n\n${app.config.phrases.start_message}</pre>`;

	return admin;

}
