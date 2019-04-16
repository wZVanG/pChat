const Utils = require('./utils');
const SERVER_CODES = require('./SERVER_CODES');
const CLIENT_CODES = require('./CLIENT_CODES');
const SERVER_CODES_KEYS = Object.assign({}, ...Object.entries(SERVER_CODES).map(([a,b]) => ({ [b]: a })));


module.exports = {
	wss: null,
	counter: 1,
	models: {},

	broadcast: function(type, data, ws){
		try{
			data = JSON.stringify([type, data]);
			this.wss.broadcast(data);
		}catch(e){

		}
	},
	send: function(type, data, ws){
		try{
			data = JSON.stringify([type, data]);
			ws.send(data);
		}catch(e){

		}
	},

	sendChatSystem: function(msg, ws){
		return this.send(SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray({
				mensaje: msg,
				fecha: Utils.timeline(),
				tipo: CLIENT_CODES.TIPO_MSG_SISTEMA
			},'CHAT_MENSAJE'), ws);
	},
	manage: function(message, ws, req){
		
		try{
			let body = JSON.parse(message)
			, type = (SERVER_CODES_KEYS[body[0]]||"").toLowerCase()
			, data = body[1];

			if(this.listeners[type]) this.listeners[type].call(this, ws, req, data);
		}catch(e){

		}
		
	}, 
	commands: {
		nick: async function(ws, req, nickname){
			
			nickname = String(nickname).trim();

			if(nickname.length < 3 || nickname.length > 32) return this.sendChatSystem('Tu nick debe contener de 3 a 32 caracteres', ws);

			let data_nick = {
				nick: nickname,
				nick_anterior: req.session.user
			};

			let data_mensaje = {
				mensaje: `${data_nick.nick_anterior} ha cambiado su nick ha a ${nickname}.`,
				fecha: Utils.timeline(),
				tipo: CLIENT_CODES.TIPO_MSG_SISTEMA
			};

			req.session.user = nickname;

			const row = new this.models.ChatMensaje(data_mensaje);
			let mensaje_saved = await row.save();			

			

			console.log("req.session.user", req.session.user);

			this.broadcast(SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray(data_mensaje,'CHAT_MENSAJE'), ws);
			this.broadcast(SERVER_CODES.NICK_NAME, Utils.itemCollectionToArray(data_nick,'NICK_NAME'), ws);
		}
	},
	listeners: {
		chat_mensaje: async function(ws, req, body){
			if(!req.session.user) return this.sendChatSystem('No estás autorizado para realizar esta acción', ws);

			body = Utils.itemCollectionToObject(body, 'CHAT_MENSAJE');

			let mensaje = String(body.mensaje).substr(0,256), command;

			if(command = mensaje.match(/^\/(\w+)(.*)/)){
				if(this.commands[command[1]]) return await this.commands[command[1]].call(this, ws, req, command[2]);
			}

			let data = {
				usuario: req.session.user,
				mensaje: mensaje,
				fecha: Utils.timeline(),
				tipo: CLIENT_CODES.TIPO_MSG_CHAT
			};

			const row = new this.models.ChatMensaje(data);
			let mensaje_saved = await row.save();

			this.broadcast(SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray(data,'CHAT_MENSAJE'), ws);

		}
	},
	init: function(req, next){

		console.log("req.session.user>>",req.session.user);
	
		if(!req.session.user){
			const id = this.counter++;
			const user = `Anonimo${id}`;
			req.session.user = user;
			console.log(`Nueva sesión ${user}`);
		}
		next()
	}
};