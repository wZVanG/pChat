


var app = angular.module('TestsSystem', []);
app
.run(["$rootScope",function($rootScope){

}])
.filter('soles', ["$filter", function ($filter) {
    return function (input) {
    	var num = $filter("number")(input, 2);
        return 'S/.' + num;
    };
}])
.controller('FinalizeCtrl', ["$scope",   "$http", function ($scope, $http) {


	$scope.close = function(){
		//$uibModalInstance.close();
		location.href = "./";
	};

}])
.service('Tabla', ["$filter", function($filter){

	var el = this;

	this.collection = {};

	this.saldos = [];

	this.variables = {
		//activo_fijo: 2000,
		capital_trabajo: 3000,
		precio: 100,
		cantidad: 50,
		costo_variable: 40,
		costo_fijo: 1000,
		isr: 0.3,
		i: 0.2,
		i_format: 0.2,
		//Other
		vida_proyecto: 5,
		vida_proyecto_rango : []
	};


	this.prestamo = {
		cantidad: 2500,
		anhos: 3,
		interes: 0.1
	};
	
	this.cf = {
		prestamo: {
			nombre: 'P',
			fn: function(anho){
				if(anho < this.prestamo.anhos) return this.prestamo.cantidad / this.prestamo.anhos;
				return 0;
			}
		},
		ventas: {
			nombre: 'Ventas',
			fn: function(){
				return this.variables.precio * this.variables.cantidad
			}
		},
		costos: {
			nombre: 'Costos',
			fn: function(){
				return this.variables.cantidad * this.variables.costo_variable * -1
			}
		},
		gastos_fijos: {
			nombre: 'Gastos Fijos',
			fn: function(){
				return this.variables.costo_fijo * -1
			}
		},
		ebitda: {
			nombre: 'Ebitda',
			fn: function(anho){

				var venta = this.collection['cf']['ventas'][anho], costo = this.collection['cf']['costos'][anho],
				gastos_fijo = this.collection['cf']['gastos_fijos'][anho]

				return venta + costo + gastos_fijo;
			}
		},
		gfin: {
			nombre: 'Gastos financierons',
			fn: function(anho){
				
				if(!this.saldos[anho]) return 0;
				return this.saldos[anho].interes * -1
			}
		},
		dep: {
			nombre: 'Depreciación',
			fn: function(anho){
				return (this.collection['depreciacion']['equipo'][anho] +
					this.collection['depreciacion']['edificio'][anho] +
					this.collection['depreciacion']['terreno'][anho]) * -1
					
			}
		},
		utai: {
			nombre: 'UTAI',
			fn: function(anho){
								
				var utai_result = this.collection['cf']['ebitda'][anho] + 
				this.collection['cf']['gfin'][anho] + 
				this.collection['cf']['dep'][anho];

				return utai_result;
			},
			text: function(anho, value){
				
				if(anho + 1 === this.variables.vida_proyecto){
					var result = value - 
					(this.depreciacion['equipo'].vl - this.depreciacion['equipo'].valor_real) -
					(this.depreciacion['edificio'].vl - this.depreciacion['edificio'].valor_real);

					return $filter("soles")(value) + " (" + $filter("soles")(result) + ")";
				}
				return $filter("soles")(value);
			}
		},
		imp: {
			nombre: 'IMP',
			fn: function(anho){
				var utai = this.collection['cf']['utai'][anho];

				if(anho + 1 === this.variables.vida_proyecto){
					var utai_vl = utai - 
					(this.depreciacion['equipo'].vl - this.depreciacion['equipo'].valor_real) -
					(this.depreciacion['edificio'].vl - this.depreciacion['edificio'].valor_real);

					utai = utai_vl

				}

				return (utai * this.variables.isr) * -1
			}
		},
		udi: {
			nombre: 'UDI',
			fn: function(anho){
				return this.collection['cf']['utai'][anho] + this.collection['cf']['imp'][anho]
			}
		},
		dep_mas: {
			nombre: 'DEP',
			fn: function(anho){
				return this.collection['cf']['dep'][anho] * - 1
			}
		},
		cf: {
			nombre: 'CF',
			fn: function(anho){
				return this.collection['cf']['udi'][anho] +
				(-this.collection['cf']['dep'][anho])
			},
			text: function(anho, value){

				var text = $filter("soles")(value);

				if(anho + 1 === this.variables.vida_proyecto){
					var sum = this.variables.capital_trabajo + 
					this.depreciacion.equipo.valor_real + 
					this.depreciacion.edificio.valor_real + 
					this.depreciacion.terreno.valor_real;

					return text + " (" + $filter('soles')(sum) + ")";
				}
				return text;
			}
		},
		cap: {
			nombre: 'Capital',
			fn: function(anho){
				if(anho + 1 === this.variables.vida_proyecto){ //Ultima celda
					var sum = this.variables.capital_trabajo + 
					this.depreciacion.equipo.valor_real + 
					this.depreciacion.edificio.valor_real + 
					this.depreciacion.terreno.valor_real;

					return this.collection['cf']['cf'][anho] + sum;
				}
				
				return this.collection['cf']['cf'][anho] - this.collection['cf']['prestamo'][anho];
				
			}
		}
	};

	this.depreciacion = {
		equipo: {
			nombre: 'Equipo',
			valor: 500,
			rep: 0.1,
			valor_real: 200,
			anhos: 6,
			fn: function(anho, obj){
				return obj.valor * obj.rep
			}
		},
		edificio: {
			nombre: 'Edificio',
			valor: 500,
			rep: 0.33,
			valor_real: 300,
			anhos: 30,
			fn: function(anho, obj){
				return obj.valor / obj.anhos
			}
		},
		terreno: {
			nombre: 'Terreno',
			valor: 1000,
			rep: 100,
			valor_real: 1000,
			anhos: 1,
			fn: function(){
				return 0
			}
		}
	};

	function crearTabla(collectionName, elements, cells, filter, filterArgs){

		var el = this, filas = [];

		el.collection[collectionName] = {};


		angular.forEach(elements, function(obj, name){

			el.collection[collectionName][name] = [];

			var celdas = [];
			angular.forEach(el.variables.vida_proyecto_rango, function(anho){



				var result = obj.fn.apply(el, [anho, obj]);
				var cellText = obj.text ? obj.text.apply(el,[anho, result]) : result;

				if(!obj.text && filter){
					var filterFn = $filter(filter), args = [result].concat(filterArgs||[]);
					cellText = filterFn.apply(null, args);
				}

				celdas.push({
					value: cellText 
				});

				el.collection[collectionName][name][anho] = result;
			});

			angular.forEach(cells || [], function(cell){


				var result = cell.fn.apply(el, [name, obj])
				celdas.push({
					value:  cell.text ? cell.text.apply(el,[result]) : filter  ? $filter(filter)(result) : result
				})
			});

			filas.push({
				celdas: celdas,
				nombre: obj.nombre
			});

		});

		return filas;

	}

	function getVAN(cf0, caps, R){
		var cfs = [];

		cfs[0] = cf0;

		for(var i = 0; i < caps.length; i++){ //Capital de cada CF
			var capital = caps[i];			
			cfs[i + 1] =  capital / Math.pow(1 + R, i + 1);
		}
		
	
		var van = cfs.reduce(function(a, b){return a + b}, 0);

		console.log(R, van);

	}


	function IRRCalc(CArray) {

	  min = 0.0;
	  max = 1.0;
	  do {
	    guest = (min + max) / 2;
	    _NPV = 0;
	    for (var j=0; j<CArray.length; j++) {
	          _NPV += CArray[j]/Math.pow((1+guest),j);
	    }
	    if (_NPV > 0) {
	      min = guest;
	    }
	    else {
	      max = guest;
	    }
	  } while(Math.abs(_NPV) > 0.000001);
	  return guest * 100;
	}

	this.updateVAN = function(){
		var cfs = [];

		cfs[0] = (this.variables.capital_trabajo + 
				this.depreciacion.equipo.valor +
				this.depreciacion.edificio.valor +
				this.depreciacion.terreno.valor) * -1;


		var cashFlow = [cfs[0]];
		cashFlow = cashFlow.concat(this.collection['cf']['cap']);

		this.TIR = IRRCalc(cashFlow);

		this.variables.i = (this.TIR / 100);
		this.variables.i_format = parseFloat((this.variables.i).toFixed(2));


		for(var i = 0; i < this.collection['cf']['cap'].length; i++){ //Capital de cada CF
			var capital = this.collection['cf']['cap'][i]
			, elevacion = i + 1 * -1
			, resultado_elevacion = Math.pow(1  + this.variables.i_format, elevacion);
			
			cfs[i + 1] =  capital * resultado_elevacion;
		}
		
		this.cfs = cfs;
		this.VAN = cfs.reduce(function(a, b){return a + b}, 0);
	

	};

	this.actualizar = function(){

		
		this.depreciacion_stats = crearTabla.apply(this,['depreciacion',el.depreciacion, [{fn: function(name, obj){
			var sum_anhos = this.collection['depreciacion'][name].reduce(function(a, b){
				return a + b;
			}, 0);
			//console.log(this.collection['depreciacion'][name]);
			this.depreciacion[name].vl = obj.valor - sum_anhos;
			return this.depreciacion[name].vl
		}}, {fn: function(name, obj){
			return obj.valor_real
		}}], 'number', [2]]);
		this.cf_stats = crearTabla.apply(this,['cf',el.cf, [], 'soles']);

		this.updateVAN();

	}

	//CF0 (suma de equipo,edificio,terreno: 2000)
}])
.controller('MainCtrl', ['$rootScope', '$scope', '$location', '$timeout', '$http',  'Tabla', function($rootScope, $scope, $location, $timeout, $http,  Tabla) {



	$scope.Tabla = Tabla;

	$scope.$watchCollection("Tabla.variables", function(){

		var range = [];
		for(var i=0;i<$scope.Tabla.variables.vida_proyecto;i++) {
		  range.push(i);
		}
		$scope.Tabla.variables.vida_proyecto_rango = range;

		Tabla.actualizar();
	});


	$scope.$watchCollection("Tabla.prestamo", function(){

		$scope.Tabla.saldos = [];
		var saldo = $scope.Tabla.prestamo.cantidad;
		for(var i = 0; i < $scope.Tabla.prestamo.anhos; i++){
			
			//var interes = debe * $scope.prestamo.interes 
			$scope.Tabla.saldos.push({
				debe: saldo,
				interes: saldo * $scope.Tabla.prestamo.interes,
				c: $scope.Tabla.prestamo.cantidad / $scope.Tabla.prestamo.anhos 
			});

			saldo = saldo - $scope.Tabla.prestamo.cantidad / $scope.Tabla.prestamo.anhos ;
		}

		Tabla.actualizar();
	});

	$scope.$watch("Tabla.depreciacion", function(){
		Tabla.actualizar();
	}, true);




}]).directive('bindHtmlCompile', ['$compile', function ($compile) {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			scope.$watch(function () {
				return scope.$eval(attrs.bindHtmlCompile);
			}, function (value) {
				// In case value is a TrustedValueHolderType, sometimes it
				// needs to be explicitly called into a string in order to
				// get the HTML string.
				element.html(value && value.toString());
				// If scope is provided use it, otherwise use parent scope
				var compileScope = scope;
				if (attrs.bindHtmlScope) {
					compileScope = scope.$eval(attrs.bindHtmlScope);
				}
				$compile(element.contents())(compileScope);
			});
		}
	};
}])