const db = require('./lib/db');

console.log("Iniciando limpieza de app en 5 segundos..., presiona CTRL + C para cancelar");

(async function CleanAPP(){

	try{

		await new Promise(function(resolve){setTimeout(resolve, 5000)});

		let drop = await db.mongoose.connection.db.dropDatabase();

		console.log("dropDatabase", drop);
		console.log("Con éxito!");

	}catch(e){
		console.error(e)
	}

	process.exit(0);

})();
	