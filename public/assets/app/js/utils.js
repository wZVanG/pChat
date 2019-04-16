window.Utils = {
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
	swapObject: function(data){
		return Object.keys(data).reduce(function(obj,key){
			obj[data[key]] = key;
			return obj;
		},{});
	}
};

if (!Array.prototype.find) {
	Array.prototype.find = function(predicate) {
		'use strict';
		if (this == null) {
			throw new TypeError('Array.prototype.find called on null or undefined');
		}
		if (typeof predicate !== 'function') {
			throw new TypeError('predicate must be a function');
		}
		var list = Object(this);
		var length = list.length >>> 0;
		var thisArg = arguments[1];
		var value;

		for (var i = 0; i < length; i++) {
			value = list[i];
			if (predicate.call(thisArg, value, i, list)) {
				return value;
			}
		}
		return undefined;
	};
}



if (!Array.prototype.findIndex) {
	Array.prototype.findIndex = function(predicate) {
		if (this === null) {
			throw new TypeError('Array.prototype.findIndex called on null or undefined');
		}
		if (typeof predicate !== 'function') {
			throw new TypeError('predicate must be a function');
		}
		var list = Object(this);
		var length = list.length >>> 0;
		var thisArg = arguments[1];
		var value;

		for (var i = 0; i < length; i++) {
			value = list[i];
			if (predicate.call(thisArg, value, i, list)) {
				return i;
			}
		}
		return -1;
	};
}
