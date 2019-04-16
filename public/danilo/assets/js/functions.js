String.prototype.sprintf = function(){
	var args = arguments, counter = 0;
	//return this.replace(/%(\d+)\$s/gi,'{$1}').replace(/\{(\d+)\}/gi, function(a,number){
	return this.replace(/%(?:(\d+)\$)?s/gi,function(a,b){
		return typeof b !== "undefined" ? "{"+b+"}" : "{"+ (++counter) +"}"
	}).replace(/\{(\d+)\}/gi, function(a,number){
		return args[+number - 1] || a;
	});
};