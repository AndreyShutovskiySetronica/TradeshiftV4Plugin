'use strict';

var TS = app('Core');
var angular = app('AngularJS');
var APIExplorer = angular
    .module('APIExplorer', ['ng', 'ts'])
    .controller('main', require('./src/js/controllers/main'));

module.exports = TS.component({
    type: 'angular',
    module: APIExplorer,
    view: require('./src/views/main.html')
});
