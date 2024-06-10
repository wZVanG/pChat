var crypto = require("crypto");
var hashAsset = crypto
	.createHash("md5")
	.update("2018-04-06 12:02:00")
	.digest("hex");

module.exports = {
	page: {
		title: "Piura.chat",
	},
	database: {
		host: "localhost",
		port: 27017,
		dbname: "piura_chat",
	},
	session: {
		secret: "",
		saveUninitialized: false,
		resave: false,
	},
	phrases: {
		start_message:
			"Bienvenido a Piura.chat ! ...red anónima de mensajería casual",
	},
	server: {
		port: 8099,
	},
	chat: {
		super_administrator: { nickname: "Piura.chat", password: "" },
		nick_default_prefix: "Anonimo",
		start_messages_limit: 100,
		nick_minlength: 1,
		nick_maxlength: 32,
		nicks_reserved: ["chat", "admin", "administrator", "administrador"],
		lobby_name: "Lobby!",
	},
	hashAsset: hashAsset,
};
