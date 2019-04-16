

window.PiuraChat = angular.module('PiuraChat', ['ngSanitize']);

window.PiuraChat

.config(["$logProvider", function($logProvider){
	$logProvider.debugEnabled(!!location.port);
}])
.run(["$rootScope", function($rootScope){
	$rootScope.supported = !!window.WebSocket
}])
.filter('chatFecha', [function(){
	return function(timeline){
		var time = new Date(timeline);
		return [time.getHours(), time.getMinutes(), time.getSeconds()].map(function(num){
			return num <= 9 ? "0" + num : num
		}).join(":");
	}
}])
.directive('title', [function(){
	return {
		restrict: "E",
		link: function(scope){
			var originalTitle = angular.copy(document.title), lastChar = " !", pos = 1;
			function update(){
				document.title = originalTitle.substr(0, pos++) + lastChar;
				pos > originalTitle.length ? (pos = 1) : setTimeout(update, 100);
			}
			
			update();
			setInterval(update, 36e4);

		}
	}
}])
.directive('piuraChat', [function(){
	return {
		restrict: "E",
		//templateUrl:  "assets/templates/body.html",
		template: '<div class="chat"><div class="chat-body scroll" chat-body><ul class="chat-mensajes"><li ng-repeat="linea in Chat.chats[Chat.chat_active_id].mensajes | orderBy:\'fecha\'" chat-mensaje="linea"></li></ul></div><div class="chats"><div ng-class="{active: id==Chat.chat_active_id, \'has-unread\': chat.unread > 0}" ng-repeat="(id, chat) in Chat.chats" ng-click="Chat.selectChat(id)" unread="{{chat.unread}}" chat-tab="chat"></div></div><div class="chat-mensaje"><form name="chat_mensaje" ng-if="Chat.usuario.nickname"><div class="chat-author truncate flex-end"><em>{{Chat.usuario.nickname}}:</em></div><input type="text" id="chat_mensaje_input" ng-model="Chat.mensaje" autofocus="" ng-keydown="Chat.keydown($event)"/></form></div></div><div class="usuarios"><div class="chat-usuarios scroll"> <ul ng-if="Chat.chats[Chat.chat_active_id].tipo !=CLIENT_CODES.CHAT_TIPOS.usuario"><li ng-repeat="usuario in Chat.chats[Chat.chat_active_id].sala_usuarios | orderBy:\'joined\'" class="cp" ng-click="Chat.createChat(CLIENT_CODES.CHAT_TIPOS.usuario, usuario._id)"><span class="icon icon-online"></span> <em chat-usuario="usuario._id"></em></li></ul></div><div class="controls row flex-end"><span class="flex-end"><a href="javascript:/wZVanG/" target="_blank" ng-click="about($event)" tabindex="-1">Acerca de...</a></span></div></div>'
		//controller: 'MainController'
	}
}])
.directive('chatBody', ["$timeout",function($timeout){
	return {
		restrict: "A",
		link: function(scope, element){

			var isScrollToBottom = true, obj = element[0], offsetScroll = 100;

			scope.$on(":MOVE_BODY", function(e, data){
				$timeout(function(){
					isScrollToBottom && (obj.scrollTop = obj.scrollHeight);	
				});
			});

			element.on("scroll", function(){
				isScrollToBottom = obj.scrollTop + obj.clientHeight + offsetScroll >= obj.scrollHeight;
			});


		}
	}

}])
.directive('chatUsuario', ["Chat", "ChatUtils", function(Chat, ChatUtils){
	return {
		restrict: "A",
		scope: {
			chatUsuario: '='
		},
		template: '{{usuario.nickname}}',
		link: function(scope, element){

			scope.usuario = Chat.usuarios.find(function(usuario){
				return scope.chatUsuario == usuario._id
			});
			
		}
	}
}])
.directive('chatTab', ["Chat", "ChatUtils", function(Chat, ChatUtils){
	return {
		restrict: "A",
		scope: {
			chat: '=chatTab'
		},
		template: '<span ng-if="nombre" ng-bind="nombre"></span><span ng-if="id_usuario" chat-usuario="id_usuario"></span>',
		link: function(scope, element){

			if(scope.chat.nombre) {
				scope.nombre = scope.chat.nombre;
				return;
			}

			var friend = scope.chat.sala_usuarios.find(function(usuario){
				return Chat.usuario._id != usuario._id
			});

			if(friend){
				scope.id_usuario = friend._id;
			}else{
				//Automessage
				scope.id_usuario = scope.chat.usuarios[0]
			}
			
		}
	}
}])
.directive('chatMensaje', ["$compile", "ChatUtils", function($compile, ChatUtils){
	return {
		restrict: "A",
		scope: {
			chatMensaje: '='
		},
		link: function(scope, element){

			var msg = angular.copy(scope.chatMensaje);

			//if(msg.usuario) msg.usuario = Utils.itemCollectionToObject(msg.usuario, 'CHAT_MENSAJE_USUARIO');

			var types = Utils.swapObject(CLIENT_CODES.MESSAGE_TYPES)
			, code_types = Utils.swapObject(CLIENT_CODES.QUICK_MESSAGES)
			, codeClass = msg.code ? code_types[msg.code].toLowerCase() : 'none'
			, linea = angular.element('<div class="chat-tipo-'+types[msg.tipo].toLowerCase()+' chat-code-'+codeClass+'">')
			, fecha = '<span title="{{mensaje.fecha | date: \'medium\'}}">{{mensaje.fecha | chatFecha}}</span>'
			//, usuario = '<em>{{mensaje.usuario.nickname}}</em>'
			, usuario = '<em chat-usuario="mensaje.usuario"></em>'
			, mensaje_html = '<span class="mensaje">{{mensaje.mensaje}}</span>'
			, html;

			scope.mensaje = msg;


			switch(msg.tipo){
				case CLIENT_CODES.MESSAGE_TYPES.SISTEMA:
					mensaje_html = '<span class="mensaje" ng-bind-html="mensaje.mensaje"></span>'
					html = [fecha, mensaje_html];
					break;
				case CLIENT_CODES.MESSAGE_TYPES.QUICK:
					scope.mensaje.mensaje =  ChatUtils.quickMessage(msg.mensaje, msg.code);
					html = [fecha, mensaje_html];
					break;
				default:
					html = [fecha, usuario, mensaje_html];
			}

			linea.html(html.join(" - "));
			$compile(linea.contents())(scope);
			element.append(linea);

		}
	}

}])
.factory('ChatUtils', ["$log", function($log){
	return {
		quickMessage: function(content, code){

			switch(code){
				case CLIENT_CODES.QUICK_MESSAGES.user_join:
					return content + ' ha entrado al chat';
				case CLIENT_CODES.QUICK_MESSAGES.user_quit:
					return content + ' ha salido del chat';
				case CLIENT_CODES.QUICK_MESSAGES.user_nickchanged:
					try{
						var users = JSON.parse(content);
						return users[0] + ' ha cambiado su nick a ' + users[1];
					}catch(e){
						$log.error(e);
						break;
					}
					
			}
			return '¿' + content + '?';
		}
	};
}])
.service('Chat', ["$rootScope", "$log", "$timeout", "$interval",function($rootScope, $log, $timeout, $interval){

	var el = this;

	this.socket = null;
	this.usuario = {};
	this.usuarios = [];
	this.mensaje = "";
	this.cache_mensaje = [];
	this.cache_mensaje_position = 0;
	this.cache_mensaje_max = 3;
	this.reconnect_loop = 3000;
	this.mensajes = [];
	this.chat_active_id = null;
	this.chats = {};
	this.user_chat_ids = {};

	this.openChat = function(tipo, obj_id, fromUser){

		var data = [];
		data[CLIENT_CODES.CHAT_OPEN.tipo] = tipo;
		data[CLIENT_CODES.CHAT_OPEN.obj_id] = obj_id;
		data[CLIENT_CODES.CHAT_OPEN.from] = fromUser ? 1 : 0;
		this.send(SERVER_CODES.CHAT_OPEN, data);

	};

	this.createChat = function(tipo, id, fromUser){

		var chat_id = id;
		
		if(!this.chats[id]){

			if(tipo == CLIENT_CODES.CHAT_TIPOS.usuario && this.user_chat_ids[id]){
				chat_id = this.user_chat_ids[id];
			}else{

				//New chat
				this.openChat(tipo, id, fromUser);
				return;

			}

		}

		this.selectChat(chat_id);

	};

	this.selectChat = function(id){
		if(id == this.chat_active_id) return;
		this.chat_active_id = id;
		this.chats[id].unread = 0;

		//$timeout($rootScope.$broadcast.bind($rootScope, ));
		$rootScope.$broadcast(":MOVE_BODY");
	};

	this.reconnect = function(){
		this.disconnected = true;
		$log.debug("Reconectando en "+this.reconnect_loop+"ms...");
		$timeout(this.connect.bind(this, true), this.reconnect_loop);
	};
	this.connect = function(isReconnect){
		this.socket = new WebSocket("ws" + (location.protocol === "https:" ? "s" : "") + "://"+location.hostname+(location.port?":" + location.port : ""));

		this.socket.onopen = el.start.bind(this, !!isReconnect);
		this.socket.onclose = function(closeEvent){
			console.warn("Onclose!", arguments);
			closeEvent.type === "close" && el.reconnect();
		};
	};
	this.send = function(type, data){

		message = JSON.stringify([type, data]);
		this.socket.send(message);
		$log.debug("Enviado al servidor:", message);
	};
	this.start = function(isReconnect){

		this.disconnected = false;
		
		if(isReconnect){
			//this.mensajes = [];
			//this.usuarios = [];
			this.usuario = {};
		}

		this.socket.onmessage = function (event) {

			var payload = event.data;

			$log.debug("Recibiendo de servidor:", payload);
	
			var body = JSON.parse(payload)
			, type = (SERVER_CODES_KEYS[body[0]]||"")
			, cb = el.listeners[type] ? el.listeners[type] : angular.noop
			, data = null;

			if(CLIENT_CODES[type]) data = Utils.itemCollectionToObject(body[1], type);

			$rootScope.$evalAsync(cb.bind(el, data));
			$rootScope.$broadcast(":" + type, data);

		}
	};

	this.keydown = function(e){
		var mensaje = (this.mensaje + "").trim();

		if(e.keyCode == 13 && mensaje.length){

			var data = [];
			data[CLIENT_CODES.CHAT_MENSAJE.chat] = this.chat_active_id === this.lobby_id ? null : this.chat_active_id;
			data[CLIENT_CODES.CHAT_MENSAJE.mensaje] = mensaje;

			this.send(SERVER_CODES.CHAT_MENSAJE, data);

			this.cache_mensaje.unshift(mensaje);
			this.cache_mensaje.splice(this.cache_mensaje_max);

			this.mensaje = "";
			this.cache_mensaje_position = 0;

		}else if(e.keyCode == 38){
			this.mensaje = this.cache_mensaje[this.cache_mensaje_position] || "";
			this.cache_mensaje_position = this.cache_mensaje_position >= this.cache_mensaje_max - 1 ? 0 : this.cache_mensaje_position + 1;
		}else if(!mensaje.length){
			this.cache_mensaje_position = 0;
		}
	};

	this.parseMessage = function(messages){
		return Utils.itemsCollectionToObject(messages, 'CHAT_MENSAJE');
	};

	this.addUsers = function(usuarios){

		usuarios.forEach(function(usuario){
			var index = el.usuarios.findIndex(function(u){
				return usuario._id == u._id;
			});
			if(index === -1) el.usuarios.push(usuario);
			else el.usuarios[index] = usuario;
		});

	};

	this.listeners = {
		PING_PONG: function(data){

			this.usuario = Utils.itemCollectionToObject(data.usuario,'USUARIO_INICIO');
			this.lobby_id = data.lobby_id;

			this.createChat(CLIENT_CODES.CHAT_TIPOS.lobby);
			//this.chats['lobby'].mensajes = this.chats['lobby'].mensajes.concat(this.parseMessage(data.mensajes));
			//this.usuarios = Utils.itemsCollectionToObject(data.usuarios, 'CHAT_USUARIOS');
			
		},

		CHAT_RECEIVED: function(data){

			if(this.chats[data._id]) return;


			data.usuarios_all = Utils.itemsCollectionToObject(data.usuarios_all||[],'CHAT_USUARIOS');
			data.mensajes = Utils.itemsCollectionToObject(data.mensajes||[],'CHAT_MENSAJE');
			
			//Room user list
			if(!data.sala_usuarios){ //CHAT_TIPOS.usuario
				data.sala_usuarios = data.usuarios_all.map(function(usuario){
					return {_id: usuario._id, joined: usuario.joined }
				});
			}

			this.addUsers(data.usuarios_all);

			delete data.usuarios_all;

			this.chats[data._id] = data;

			if(!data.from){
				this.chat_active_id = data._id;	
			}
			

		},

		CHAT_FRIEND_INDEX: function(data){
			this.user_chat_ids[data.id_friend] = data.id_chat;
		},

		CHAT_MENSAJE: function(data){
			var chat_key = !data.chat ? this.lobby_id : data.chat;

			if(!this.chats[chat_key]){
				this.createChat(CLIENT_CODES.CHAT_TIPOS.chat, chat_key, chat_key);
			}else{
				this.chats[chat_key].mensajes.push(data);
				if(this.chat_active_id != chat_key){
					this.chats[chat_key].unread++;
				}else{
					//this.chats[chat_key].unread = 0;
				}
			}

			console.log("this.chat_active_id", this.chat_active_id);

			$timeout($rootScope.$broadcast.bind($rootScope, ":MOVE_BODY", data))

		},
		NICK_NAME: function(data){
			if(this.usuario._id == data._id){
				this.usuario.nickname = data.nick;
			}
			var current = this.usuarios.findIndex(function(item){
				return item._id == data._id
			});
			if(current !== -1){
				this.usuarios[current].nickname = data.nick;
			}
		},
		LIMPIAR_MENSAJES: function(data){
			this.chats[data.chat].mensajes = [];
		},
		USUARIO_CONECTADO: function(data){

			var usuario = Utils.itemCollectionToObject(data.usuario, 'CHAT_USUARIOS')
			, exists = this.usuarios.find(function(item){
				return item._id == usuario._id
			});

			!exists && this.usuarios.push(usuario);
			
			if(!this.chats[data.id_chat]) return;

			data.mensaje && this.chats[data.id_chat].mensajes.push(this.parseMessage([data.mensaje])[0]);

			var sala_exists = this.chats[data.id_chat].sala_usuarios.find(function(item){
				return item._id == usuario._id
			});

			!sala_exists && this.chats[data.id_chat].sala_usuarios.push({
				_id: usuario._id,
				joined: data.joined
			});

		},
		USUARIO_DESCONECTADO: function(data){
			/*var index = this.usuarios.findIndex(function(item){
				return item._id == data._id
			});
			index !== -1 && this.usuarios.splice(index, 1);*/
			var index = this.chats[this.lobby_id].sala_usuarios.findIndex(function(item){
				return item._id == data._id
			});
			index !== -1 && this.chats[this.lobby_id].sala_usuarios.splice(index, 1);
			this.chats[this.lobby_id].mensajes.push(this.parseMessage([data.mensaje])[0])
		}
	}
}])
.controller('IndexController', ["$scope", "$window", "Chat", function($scope, $window, Chat){
	Chat.connect();

	$scope.SERVER_CODES = SERVER_CODES;
	$scope.CLIENT_CODES = CLIENT_CODES;
	$scope.Chat = Chat;

	$scope.about = function(){
		$window.alert("© Piura.chat 2018\nContacto proyecto Beta: wz.vang@gmail.com");
	}
}])
