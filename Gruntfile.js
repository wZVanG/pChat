const config = require("./config");
const ENV_PRODUCTION = process.argv.indexOf('--prod') > -1;

module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
			//uglify
			uglify: {
				options: {
					//mangle: false,
					compress: {
						drop_console: true
					}
				},
				js: {
					src : ['public/assets/app/js/vendor/**/*.js', 'public/assets/app/js/*.js'], 
					dest : 'public/'+config.hashAsset+'.min.js',
				}
			},
			cssmin: {
			  target: {
					src : 'public/assets/app/css/**/*.css', 
					dest : 'public/'+config.hashAsset+'.min.css',
			  }
			}
	 });
	 
	// loadNpmTasks
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');

	// Run Default task(s).
	grunt.registerTask('default', ['uglify','cssmin']);


};