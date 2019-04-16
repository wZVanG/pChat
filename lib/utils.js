const SERVER_CODES = require('./SERVER_CODES');
const CLIENT_CODES = require('./CLIENT_CODES');

module.exports = {
	arrayToObject: function(arr, keys){

		var obj = {}, keys_arr = Array.isArray(keys) ? keys : (keys || "").split(/[, ]+/), i = 0;
		
		while(i < arr.length) obj[keys_arr[i] || i] = arr[i++];

		return obj;
	},
	itemsArrayToObject: function(items, keys){
		if(!Array.isArray(items)) return;
		var el = this;
		return items.map(function(item){
			return el.arrayToObject(item, keys);
		});
	}, 
	itemToArray: function(item_in_object, fields, sort){
		if(sort) fields.sort();
		
		return fields.reduce(function(arr, key){
			return arr.push(item_in_object[key]), arr;
		}, []);
	},
	itemsToArray: function(items, fieldsOrColletion, mapFn, sort){

		var el = this;
		var fields = fieldsOrColletion;

		if(!Array.isArray(fieldsOrColletion)){
			fields = [];
		}

		if(sort) fields.sort();

		return items.map(function(item){
			var item_in_object = mapFn ? mapFn(item) : item //Custom map
			return el.itemToArray(item_in_object, fields);
		});

	},
	itemCollectionToArray: function(item, collection){

		var sorted_fields = Object.keys(CLIENT_CODES[collection.toUpperCase()] || {});
		//sorted_fields.sort();
		return this.itemToArray(item, sorted_fields);

	},
	itemsCollectionToArray: function(items, collection){

		var sorted_fields = Object.keys(CLIENT_CODES[collection.toUpperCase()]);
		//sorted_fields.sort();
		return this.itemsToArray(items, sorted_fields);

	}, 
	itemCollectionToObject: function(item, collection){

		var sorted_fields = Object.keys(CLIENT_CODES[collection.toUpperCase()]);
		//sorted_fields.sort();


		return this.arrayToObject(item, sorted_fields);
	},
	
	itemsCollectionToObject: function(items, collection){

		var sorted_fields = Object.keys(CLIENT_CODES[collection.toUpperCase()]);
		//sorted_fields.sort();

		return this.itemsArrayToObject(items, sorted_fields);
	},

	timeline: function(){
		return Date.now() / 1000 | 0
	},

	getIp: function(req){
		return req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : undefined;
	}
}