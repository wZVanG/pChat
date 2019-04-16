module.exports = {
	PING_PONG: {
		usuario: 0,
		lobby_id: 1
	},
	CHAT_TIPOS: {
		usuario: 0,
		chat: 1,
		sala: 2,
		lobby: 3
	},
	CHAT_OPEN: {
		tipo: 0,
		obj_id: 1,
		from: 2
	},
	CHAT_RECEIVED: {
		_id: 0,
		nombre: 1,
		tipo: 2,
		usuarios: 3,
		created_at: 4,
		mensajes: 5,
		usuarios_all: 6,
		from: 7,
		unread: 8,
		sala_usuarios: 9
	},
	CHAT_RECEIVED_USUARIOS: {
		_id: 0,
		joined: 1
	},
	CHAT_FRIEND_INDEX: {
		id_friend: 0,
		id_chat: 1
	},
	CHAT_MENSAJE: {
		chat: 0,
		mensaje: 1,
		usuario: 2,
		fecha: 3,
		tipo: 4,
		code: 5,
	},
	CHAT_MENSAJE_USUARIO: {
		nickname: 0,
	},
	LIMPIAR_MENSAJES: {
		chat: 0
	},
	USUARIO_CONECTADO: {
		usuario: 0,
		id_chat: 1,
		joined: 2,
		mensaje: 3
	},
	USUARIO_DESCONECTADO: {
		_id: 0,
		mensaje: 1
	},
	NICK_NAME: {
		nick: 0,
		_id: 1
	},
	CHAT_USUARIOS: {
		_id: 0,
		nickname: 1,
		joined: 2
	},
	USUARIO_INICIO: {
		_id: 0,
		nickname: 1, 
		joined: 4,
		tipo: 6,
		ip: String
	},
	USER_GROUPS: {
		guest: 0,
		user: 1,
		moderator: 5,
		administrator: 8,
		super_administrator: 9
	},

	MESSAGE_TYPES: {
		CHAT: 0,
		SISTEMA: 1,
		QUICK: 2,
		ADMIN: 5,
	},
	QUICK_MESSAGES: {
		user_join: 1,
		user_quit: 2,
		user_nickchanged: 5
	}
}