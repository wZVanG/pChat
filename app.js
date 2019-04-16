//START mongodb => $ mongod
//Happy Piura: https://www.youtube.com/watch?v=RCMXO9sBIcU&index=27&list=RDpZKYuD2IuPM
//SAD https://www.youtube.com/watch?v=xjoqx7wYbVw&list=RDiyjqRIDcQUs&index=7
//SAD 2 https://www.youtube.com/watch?v=6dT69FMYa-M&index=12&list=RDpZKYuD2IuPM
//SAD -> Happy https://www.youtube.com/watch?v=_Gd8mbQ3-mI&index=17&list=RDpZKYuD2IuPM
//Happy: https://www.youtube.com/watch?v=iqbczWOf3u4&list=RDiyjqRIDcQUs&index=8
//Motivación descenlace: https://www.youtube.com/watch?v=goMlSWvtUOI&list=RDiyjqRIDcQUs&index=9
//Energy https://www.youtube.com/watch?v=y-2eObnZT1s&list=RDiyjqRIDcQUs&index=10



/*

PIURA
Un hermoso lugar turístico, con muchas riquezas en recursos,  => Paita, Chacras
con lugares de diversas costumbres y las mejores playas del país => Bernal, Catacaos
motivo por lo que nos visitan más de 120.000 personas al mes... => Punta sal
En marzo de 2017 fue devastado a causa del Niño costero
un fenómeno climático que presenta eventualmente inmensas lluvias
Las lluvias eran constantes en toda la región hasta llegar a todo el norte del país
Piura se declara en estado de emergencia, dejando 200.000 afectados y más de 20.000 damnificados
la mayoría de estos últimos perdieron sus casas y siguen viviendo en refugios temporales.
El estado y varias empresas empezaron con el apoyo,
El noble corazón de varias personas voluntarias se unieron también para superar este hecho
ofreciendo toda la ayuda posible a nuestros hermanos damnificados 
personas sin ningún cargo a diferencia de muchas autoridades locales que no actuaron a tiempo en esta desgracia
Esta y muchas razones más son motivos para que piensas bien en tu voto de estas próximas elecciones
La señora Maricruz es una persona que viene haciendo labor social por más de 20 años,
rechazó más de 5 veces diversos cargos políticos en su región, por lo que nunca aceptó alguno!
ella es testigo y viviente de lo que pasó en nuestra región,
y quien se esmeró en ayudar a los damnificados por casi un año y hasta ahora...,
es testigo de ver un Piura sin progreso y lleno de corrupción,
Debido a esto, ella ha tomado un acto necesario por el bien de nuestra región,
respaldar y caminar de la mano de un nuevo candidato a la región, con el fin de querer ver a nuestro Piura mejor,
cumplir con todos y los pueblos más olvidados, ...es tiempo de cambiar.

*/

const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const express = require('express');
const favicon = require('serve-favicon');
const http = require('http');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid/v1');
const WebSocket = require('ws');
const config = require('./config');
const PiuraChatClass = require('./lib/piura-chat');
const Utils = require('./lib/utils');
const db = require('./lib/db');
const bootstrap = require('./lib/bootstrap');
const SERVER_CODES = require('./lib/SERVER_CODES');
const CLIENT_CODES = require('./lib/CLIENT_CODES');
const SERVER_CODES_KEYS = require('./lib/SERVER_CODES_KEYS');
const app = express();
const server = http.createServer(app);

const ENV_PRODUCTION = process.argv.indexOf('--prod') > -1;


//Generar JS codes de servidor / cliente
const codes = {SERVER_CODES: SERVER_CODES, CLIENT_CODES: CLIENT_CODES, SERVER_CODES_KEYS: SERVER_CODES_KEYS};
const raw_js_file = Object.entries(codes).map(key_value => `window.${key_value[0]}=${JSON.stringify(key_value[1])}`).join("\n");
fs.writeFileSync(__dirname + '/public/assets/app/js/codes.js', raw_js_file);

//Grunt
var child = require('child_process').exec("/usr/local/bin/grunt --gruntfile ./Gruntfile.js", function (error, stdout, stderr){
	console.log(stdout);
	console.log(stderr);
	if (error !== null) {
		console.log('exec error: ' + error);
	}
});

//Configurar sesion
const sessionParser = session({
	secret: config.session.secret,
	store: new MongoStore({ mongooseConnection: db.mongoose.connection }),
	saveUninitialized: config.session.saveUninitialized,
	resave: config.session.resave
});

//Configurar EJS
app.set('view engine', 'ejs');
app.set('views',__dirname+'/views');

//Configurar acceso folder publico
app.use(express.static(__dirname + '/public'));
app.use(sessionParser);

//Configurar favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

var ChatApp = {
	config: config,
	db: db,
	paths: {
		app_root: __dirname
	}
};

(async function(){
	await bootstrap(ChatApp);

	var PiuraChat = PiuraChatClass(ChatApp);

	//Route / index.html
	app.get('/', function(req, res){

		const client_data = {
			page: {
				title: config.page.title,
				hashAsset: config.hashAsset,
				production: ENV_PRODUCTION
			}
		};

		PiuraChat.init(req, () => res.render('index', client_data));

	});

	app.get('/user', function(req, res){


		res.send(JSON.stringify(req.session));

	});



	//Route /logout
	app.delete('/logout', (req, res) => {
	  req.session.destroy();
	  res.send({ result: 'OK', message: 'Session destroyed' });
	});

	PiuraChat.wss = new WebSocket.Server({
	  verifyClient: (info, done) => {
		sessionParser(info.req, {}, async () => {
		  //
		  // We can reject the connection by returning false to done(). For example,
		  // reject here if user is unknown.
		  //
		  done(info.req.session.userId);
		});
	  },
	  server
	});

	PiuraChat.wss.on('connection', async function(ws, req){

		//Keep alive sockets pong
		ws.isAlive = true;
		ws.on('pong', () => ws.isAlive = true);
		//

		ws.socketID = uuid();

		let usuario = await db.models.Usuarios.findOne({_id: req.session.userId}).exec();

		req.usuario = usuario.toJSON();

		PiuraChat.onConnect.apply(PiuraChat, arguments);

		let data = {
			usuario: Utils.itemCollectionToArray(req.usuario, 'USUARIO_INICIO'),
			lobby_id: config.chat.lobby_id
		};

		//Emitir variables de inicio (usuario, etc)
		PiuraChat.send(SERVER_CODES.PING_PONG, Utils.itemCollectionToArray(data,'PING_PONG'), ws);

		ws.on('message', message => PiuraChat.manage(message, ws, req));

		ws.on('close', () => PiuraChat.onDisconnect.call(PiuraChat, ws, req));

	});

	//Keep alive sockets interval

	const interval = setInterval(() => {
		PiuraChat.wss.clients.forEach((ws) => {
			if (ws.isAlive === false) return ws.terminate();
			ws.isAlive = false;
			ws.ping('', false, true);
		});
	}, 30000);


	PiuraChat.db = db;


	// Iniciar
	server.listen(config.server.port, '0.0.0.0');
	console.log(`                           
::::::::::::: Piura.chat on localhost:${config.server.port} :::::::::::::
	`);
})();