const Utils = require('./utils');
const config = require('../config');
const SERVER_CODES = require('./SERVER_CODES');
const CLIENT_CODES = require('./CLIENT_CODES');
const SERVER_CODES_KEYS = require('./SERVER_CODES_KEYS');
const WebSocket = require('ws');

var socketMap = {};

module.exports = function PiuraChat(app) {

	return {
		wss: null,
		counter: 1,
		db: null,
		usuarios: {},

		join: async function(userId, roomId, ws, req){

			let my_rooms = this.usuarios[userId].salas;
			if(my_rooms.indexOf(roomId) == -1) this.usuarios[userId].salas.push(String(roomId));
	
		},

		broadcast: function(type, data, ws, filter){

			let arr = [type];
			data !== undefined && arr.push(data);

			const raw = JSON.stringify(arr);

			var clients = [...this.wss.clients];

			if(filter !== undefined) clients = clients.filter(filter.bind(this));

			clients.forEach(client => client.readyState === WebSocket.OPEN && client.send(raw));

		},
		emit: function(id_users, type, data, ws){
			
			if(typeof id_users === "string"){ //Room
				let room_name = id_users;

				id_users = Object.entries(this.usuarios).filter(function(usuario){
					return usuario[1].salas.indexOf(room_name) > -1
				}).map(arr => arr[0]);
			}


			this.broadcast(type, data, ws, function(client){
				for(let i = 0, l = id_users.length; i < l; i++){
					if((this.usuarios[id_users[i]].sockets || []).indexOf(client.socketID) !== -1) return true;
				}
				return false;			
			});
		},
		send: function(type, data, ws){
			try{
				var arr = [];
				arr.push(type);
				data !== undefined && arr.push(data);
				ws.send(JSON.stringify(arr));
			}catch(e){
				console.log(e);
			}
		},

		createMessage:  async function(chat_key, msg, tipo, usuario, req){
			
			let data_mensaje = {
				chat: chat_key, 
				mensaje: msg,
				fecha: Date.now(),
				tipo: tipo,
				usuario: typeof usuario === 'object' && usuario._id ? usuario._id : undefined,
				ip: Utils.getIp(req)
			};
			
			//Mensajes personalizados, Ej: Cuando de conecta un usuario, {mensaje:'Pepin', code: '1'} => Pepin a ingresado al chat
			if(typeof usuario === "number") data_mensaje.code = usuario;

			const mensage = new this.db.models.ChatMensajes(data_mensaje);
			mensage.save();
			//await mensage.populate('usuario').execPopulate();

			let mensage_json = mensage.toJSON();

			//parse User to array
			//mensage_json.usuario && (mensage_json.usuario = Utils.itemCollectionToArray(mensage_json.usuario,'CHAT_MENSAJE_USUARIO'));

			return mensage_json;

		},

		sendChatSystem: function(id_chat, msg, ws){
			return this.send(SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray({
					chat: id_chat,
					mensaje: msg,
					fecha: Date.now(),
					tipo: CLIENT_CODES.MESSAGE_TYPES.SISTEMA
				},'CHAT_MENSAJE'), ws);
		},
		manage: async function(message, ws, req){

			if(!req.session.userId) return this.sendChatSystem(null, 'No estás autorizado para realizar esta acción', ws);

			try{
				let body = JSON.parse(message)
				, type = (SERVER_CODES_KEYS[body[0]]||"").toLowerCase()
				, data = body[1];


				let usuario = await this.db.models.Usuarios.findOne({_id: req.session.userId});
				req.usuario = usuario.toJSON();

				if(this.listeners[type]) await this.listeners[type].call(this, ws, req, data);
			}catch(e){
				console.error(e);
			}
			
		}, 
		commands: {
			'!': async function(ws, req, chat_key, mensaje){

				const data_mensaje =  await this.createMessage(null, mensaje, CLIENT_CODES.MESSAGE_TYPES.ADMIN, req.usuario, req);

				this.broadcast(SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray(data_mensaje,'CHAT_MENSAJE'), ws);
			},
			system: async function(ws, req, chat_key, mensaje){

				const data_mensaje =  await this.createMessage(null, mensaje, CLIENT_CODES.MESSAGE_TYPES.SISTEMA, req.usuario, req);
				this.broadcast(SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray(data_mensaje,'CHAT_MENSAJE'), ws);

			},

			nick: async function(ws, req, chat_key, nickname){
		
				nickname = String(nickname).trim();

				if(nickname == req.usuario.nickname) return this.sendChatSystem(chat_key, `Ingresa un nick diferente al actual`, ws);

				if(nickname.length < config.chat.nick_minlength || nickname.length > config.chat.nick_maxlength) 
					return this.sendChatSystem(chat_key, `Tu nick debe contener de ${config.chat.nick_minlength } a ${config.chat.nick_maxlength} caracteres, el nick tiene ${nickname.length} caracteres`, ws);

				//Nick válido?
				//if(/^[a-z0-9,.()@-_]+$/i.test(nickname)

				let id_usuario = req.session.userId, nickname_lowercase = nickname.toLowerCase();

				//Nick reservados
				const nicks_reservados = Object.keys(this.commands).concat(config.chat.nicks_reserved).map(n => n.toLowerCase());
				if(nicks_reservados.indexOf(nickname_lowercase) > -1) return this.sendChatSystem(chat_key, `Este nick está reservado`, ws);	

				//Nick existe? no Case sensitive
				let user_exists = await this.db.models.Usuarios.findOne({
					nickname: {
						$regex: new RegExp('^' + nickname.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i')
					}
				});

				if(user_exists){
					if(user_exists.clave){
						return this.sendChatSystem(chat_key, `Inicia sesión para ingresar con este nombre`, ws);
					}else{
						return this.sendChatSystem(chat_key, `Ya existe un usuario con este nick`, ws);					
					}
				}

				let data_nick = {
					nick: nickname,
					_id: id_usuario
				};

				//Update on this.usuarios collections
				this.usuarios[id_usuario].usuario.nickname = nickname;
				//Update on db
				await this.db.models.Usuarios.update({_id: id_usuario}, {$set: {nickname: nickname}});

				const data_mensaje =  await this.createMessage(null, JSON.stringify([req.usuario.nickname, nickname]), CLIENT_CODES.MESSAGE_TYPES.QUICK, CLIENT_CODES.QUICK_MESSAGES.user_nickchanged, req);

				this.broadcast(SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray(data_mensaje,'CHAT_MENSAJE'), ws);
				this.broadcast(SERVER_CODES.NICK_NAME, Utils.itemCollectionToArray(data_nick,'NICK_NAME'), ws);
			},
			thetime: function(ws, req){
				this.emit([req.session.userId], SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray({
					mensaje: new Date().toString(),
					fecha: Date.now(),
					tipo: CLIENT_CODES.MESSAGE_TYPES.SISTEMA
				}, 'CHAT_MENSAJE'), ws);
			},
			clean: function(ws, req, chat_key){

				chat_key = !chat_key ? config.chat.lobby_id : chat_key;

				this.send(SERVER_CODES.LIMPIAR_MENSAJES, Utils.itemCollectionToArray({
					chat: chat_key,
				},'LIMPIAR_MENSAJES'), ws);
			},
			crazy: async function(ws, req, chat_key){
				var el = this;
				for(var i = 0; i < 10; i++){
					await new Promise(function(resolve){
						setTimeout(resolve, 100)
					});
					this.sendChatSystem(chat_key, i, ws);
				}
			}
		},
		listeners: {
			chat_mensaje: async function(ws, req, body){

				body = Utils.itemCollectionToObject(body, 'CHAT_MENSAJE');

				let mensaje = String(body.mensaje).substr(0,256)
				, chat_key = body.chat, command;

				if((command = mensaje.match(/^\/(\w+)(.*)/)) || (command = mensaje.match(/^(\!)(.*)/))){
					if(this.commands[command[1]]) return await this.commands[command[1]].call(this, ws, req, chat_key, command[2]);
				}

				let data_mensaje =  await this.createMessage(chat_key, mensaje, CLIENT_CODES.MESSAGE_TYPES.CHAT, req.usuario, req);

				if(!chat_key){
					//Emit to lobby
					this.broadcast(SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray(data_mensaje,'CHAT_MENSAJE'), ws);
				}else{
					//Emit to users from id_chat (chat_key)
					let chat = await this.db.models.Chats.findOne({_id: chat_key}).lean().exec();
					this.emit(chat.usuarios,SERVER_CODES.CHAT_MENSAJE, Utils.itemCollectionToArray(data_mensaje,'CHAT_MENSAJE'), ws);
				}
				

			},
			chat_open: async function(ws, req, body){

				body = Utils.itemCollectionToObject(body, 'CHAT_OPEN');

				//let id_usuario = body.id_usuario, me = req.session.userId, usuarios = [];
				
				let me = req.session.userId, friend = body.obj_id
				, out_data = {}, chat_filter = {}
				, chat
				, mensajes
				, participants
				, usuarios_all;

				switch(body.tipo){
					case CLIENT_CODES.CHAT_TIPOS.usuario:

						chat =  await this.db.models.Chats.findOne({
							$or: [
								{ $and: [{'usuarios.0': me}, {'usuarios.1': friend}] },
								{ $and: [{'usuarios.1': me}, {'usuarios.0': friend}] },
							]
						}).lean().exec();

						if(!chat){
							let data = {
								created_at: new Date(),
								usuarios: [me, friend],
								tipo: CLIENT_CODES.CHAT_TIPOS.usuario
							};

							chat = new this.db.models.Chats(data);
							chat.save();
							chat = chat.toJSON();

						}

						chat_filter['chat'] = chat._id;

						//Friends id_user and id_chat
						this.emit([me], SERVER_CODES.CHAT_FRIEND_INDEX, Utils.itemCollectionToArray({
							id_friend: friend,
							id_chat: String(chat._id)
						},'CHAT_FRIEND_INDEX'), ws);

						//Mensajes sin datos de usuario
						mensajes = await this.db.models.ChatMensajes.find(chat_filter)
							.sort({ fecha: -1 }).limit(config.chat.start_messages_limit)
							.lean().exec();

						usuarios_all = await this.db.models.Usuarios.find({_id: {$in: chat.usuarios}}).lean().exec();

						break;

					case CLIENT_CODES.CHAT_TIPOS.lobby:
					case CLIENT_CODES.CHAT_TIPOS.chat:
					case CLIENT_CODES.CHAT_TIPOS.sala:

						if(CLIENT_CODES.CHAT_TIPOS.lobby == body.tipo){
							body.obj_id = config.chat.lobby_id;
							chat_filter['chat'] = null;
						}else{
							chat_filter['chat'] = body.obj_id;
						}

						chat = await this.db.models.Chats.findOne({_id: body.obj_id}).lean().exec();

						//Mensajes con datos de usuario
						mensajes = await this.db.models.ChatMensajes.find(chat_filter)
							.sort({ fecha: -1 }).limit(config.chat.start_messages_limit)
							.lean().exec();
						
						//Usuarios que escribieron anteriormente un mensaje en el room
						usuarios_all = await this.db.models.Usuarios.find({_id: {
							$in: mensajes.reduce(function(id_users, mensaje){
								mensaje.usuario && id_users.push(mensaje.usuario);
								return id_users;
							}, [])
						}}).lean().exec();

						//Combinar con usuarios conectados al room
						participants = await this.getUsers(chat._id);
						usuarios_all = usuarios_all.concat(participants);

						break;
					default:
						return false
				}

				if(!chat) return false;

				//Join room
				await this.join(me, String(chat._id), ws, req);

				out_data = chat;

				out_data.mensajes = Utils.itemsCollectionToArray(mensajes, 'CHAT_MENSAJE');

				out_data.usuarios_all = Utils.itemsCollectionToArray(usuarios_all, 'CHAT_USUARIOS');
				out_data.sala_usuarios = participants ? participants.map(participant => ({_id: participant._id, joined: participant.joined })) : undefined;
				out_data.from = body.from ? 1 : 0;
				out_data.unread = body.from ? 1 : 0;

				//Send chat content
				this.emit([me], SERVER_CODES.CHAT_RECEIVED, Utils.itemCollectionToArray(out_data,'CHAT_RECEIVED'), ws);

				//Send user connected
				//if(CLIENT_CODES.CHAT_TIPOS.usuario != body.tipo){

					//let data_mensaje =  await this.createMessage(null, this.usuarios[me].usuario.nickname, CLIENT_CODES.MESSAGE_TYPES.QUICK, CLIENT_CODES.QUICK_MESSAGES.user_join, req);
					let data_mensaje = {
						mensaje: this.usuarios[me].usuario.nickname,
						fecha: Date.now(),
						tipo: CLIENT_CODES.MESSAGE_TYPES.QUICK, 
						code: CLIENT_CODES.QUICK_MESSAGES.user_join
					};

					this.emit(String(chat._id), SERVER_CODES.USUARIO_CONECTADO, Utils.itemCollectionToArray({
						usuario: Utils.itemCollectionToArray(this.usuarios[me].usuario, 'CHAT_USUARIOS'),
						id_chat: chat._id,
						joined: this.usuarios[me].joined,
						mensaje: data_mensaje ? Utils.itemCollectionToArray(data_mensaje,'CHAT_MENSAJE') : undefined
					},'USUARIO_CONECTADO'), ws);
				//}

				//Lobby
				if(body.tipo == CLIENT_CODES.CHAT_TIPOS.lobby){

					//Emitir mensaje bienvenida	
					this.sendChatSystem(null, app.config.chat.welcome_content, ws);

				}


			}
		},
		createUser: function(fields){
			
			let data_usuario = Object.assign({
				created_at: new Date(),
			}, fields);

			const row = new this.db.models.Usuarios(data_usuario);
			row.save();

			return row;

		},
		init: async function(req, next){


			if(!req.session.userId){

				let user;

				while(await this.nicknameExists(user = `${config.chat.nick_default_prefix}${this.counter++}`));

				let usuario_creado = this.createUser({
					nickname: user,
					tipo: CLIENT_CODES.USER_GROUPS.guest,
					ip: Utils.getIp(req),
				});

				req.session.userId = usuario_creado._id;
			}
			next()
		},
		nicknameExists: async function(nickname){
			let user = await this.db.models.Usuarios.findOne({
				nickname: {
					$regex: new RegExp('^' + nickname.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i')
				}
			});
			return user;
		},
		getUsers: function(id_chat){

			return Object.entries(this.usuarios)
				.filter(usuario => usuario[1].salas.indexOf(String(id_chat)) > -1)
				.map(usuario => Object.assign({}, usuario[1].usuario, {joined: usuario[1].joined}));
		},
		onConnect: async function(ws, req){
			const id = req.session.userId;

			if(!this.usuarios[id]){
				this.usuarios[id] = {sockets: [], joined: Date.now(), usuario: req.usuario, salas: []};
			}

			this.usuarios[id].sockets.push(ws.socketID);

		},
		onDisconnect: async function(ws, req){

			const id = req.session.userId, user_sockets = (this.usuarios[id]||{}).sockets||[];
			const index = user_sockets.indexOf(ws.socketID);
			index !== -1 && user_sockets.splice(index, 1);

			if(!user_sockets.length && this.usuarios[id]){
				
				//const data_mensaje =  await this.createMessage(null, this.usuarios[id].usuario.nickname, CLIENT_CODES.MESSAGE_TYPES.QUICK, CLIENT_CODES.QUICK_MESSAGES.user_quit, req);
				let data_mensaje = {
					mensaje: this.usuarios[id].usuario.nickname,
					fecha: Date.now(),
					tipo: CLIENT_CODES.MESSAGE_TYPES.QUICK, 
					code: CLIENT_CODES.QUICK_MESSAGES.user_quit
				};

				this.broadcast(SERVER_CODES.USUARIO_DESCONECTADO, Utils.itemCollectionToArray({
					_id: id,
					mensaje: Utils.itemCollectionToArray(data_mensaje,'CHAT_MENSAJE')
				},'USUARIO_DESCONECTADO'), ws);

				delete this.usuarios[id];
			}

		}
	}
};