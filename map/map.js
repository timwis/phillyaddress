//initialize dojo
dojo.require("esri.map");
dojo.require("esri.tasks.geometry");
dojo.require("esri.layers.FeatureLayer");
dojo.require("dojo.parser");
dojo.require("esri.tasks.query")
dojo.require("esri.dijit.Legend");
dojo.require("esri.dijit.PopupMobile");
dojo.addOnLoad(init);

var map, gsvc;
var URL_BASE = 'http://m.phillyaddress.com';
var URL_BASE_MAP = 'http://gis.phila.gov/ArcGIS/rest/services/BaseMaps/GrayBase/MapServer';
var URL_GEOMETRY_SERVER = 'http://gis.phila.gov/ArcGIS/rest/services/Geometry/GeometryServer';
var URL_MAP_SERVER = 'http://data1.commons.psu.edu/ArcGIS/rest/services/pasda/CityPhilly/MapServer';
var URL_MAP_LAYER_ID = '21';
var BASE_MAP_EXTENT = [2597643.10015863,174842.222144772,2826642.43548899,325643.926092033];
var BASE_MAP_WKID = 2272;
var MAP_ELEMENT_ID = 'map';
var INFO_WINDOW_TEXT = '${HOUSE} ${STDIR:stringCheck} ${STNAM} ${STDES}';
var SELECT_FIELDS = ['HOUSE', 'STDIR', 'STNAM', 'STDES', 'STATUS']; // should correspond to INFO_WINDOW_TEXT
var LAYER_MIN_SCALE = 16000;
var LAYER_COLOR = [254,216,93,.60];
var INITIAL_ZOOM = 8;
var MARKER_IMAGE = 'bluedot.png';
var MARKER_SIZE = [40, 40];

function init() {
	var supportsOrientationChange = 'onorientationchange' in window, orientationEvent = supportsOrientationChange ? 'orientationchange' : 'resize';
	window.addEventListener(orientationEvent, function () {
		resizeMap();
	}, false);
	
	$.mobile.showPageLoadingMsg();
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(initMap, defaultInit);
	}
	else {
		defaultInit();
	}
}

function initMap(location) {
	// Create custom extent and spatial reference for phila basemap
	var customExtentAndSR = new esri.geometry.Extent(BASE_MAP_EXTENT[0], BASE_MAP_EXTENT[1], BASE_MAP_EXTENT[2], BASE_MAP_EXTENT[3], new esri.SpatialReference({'wkid': BASE_MAP_WKID}));
	
	// Create a popupmobile type info window
	var popup = new esri.dijit.PopupMobile(null, dojo.create('div'));
	
	// Create the map
	map = new esri.Map(MAP_ELEMENT_ID, {extent: customExtentAndSR, infoWindow: popup});
	
	// Add the basemap to the map
	var basemap = new esri.layers.ArcGISTiledMapServiceLayer(URL_BASE_MAP);
	map.addLayer(basemap);
	
	// Create a geometry service so we can center on a 4326 point (necessary for location detection) even though the basemap is in 2272 (does this need to be in initMap()?)
	gsvc = new esri.tasks.GeometryService(URL_GEOMETRY_SERVER);
	
	// When the map is loaded, zoom to the user's location, resize the map to fit the browser window, and call jQueryReady
	dojo.connect(map, 'onLoad', function() {
		resizeMap();
		zoomToLocation(location);
		$(document).ready(jQueryReady); // Call jQuery's ready function
	});
	
	// Customize the info window
	var infoTemplate = new esri.InfoTemplate();
	infoTemplate.setTitle(INFO_WINDOW_TEXT);
	map.infoWindow.resize(185, 100);
	
	// Create the parcels layer
	var featureLayer = new esri.layers.FeatureLayer(URL_MAP_SERVER + '/' + URL_MAP_LAYER_ID,{
		mode: esri.layers.FeatureLayer.MODE_ONDEMAND,
		outFields: SELECT_FIELDS,
		infoTemplate: infoTemplate
	});
	
	// Set filter to include only Active Parcels
	featureLayer.setDefinitionExpression("STATUS = 1");
	
	// Set minimum zoom level for displaying the layer
	dojo.connect(featureLayer, 'onLoad', function() {
		featureLayer.minScale = LAYER_MIN_SCALE;
	});
	
	// Set render colour
	var rend =new esri.renderer.SimpleRenderer(new esri.symbol.SimpleFillSymbol().setColor(new dojo.Color(LAYER_COLOR)));
	featureLayer.setRenderer(rend);
	
	// Tie clicking to the info window. Also highlights the selected shape
	dojo.connect(featureLayer, 'onClick', function(evt) {
		map.infoWindow.setFeatures([evt.graphic]);
	});
	
	// Add the parcels layer to the map
	map.addLayer(featureLayer);
}

// Resizes map to fit browser window
function resizeMap(){
	if(map) {
		$('#' + MAP_ELEMENT_ID).height($(window).height() - $('[data-role="header"]').height());
		$('#' + MAP_ELEMENT_ID).css('width', 'auto');
		map.reposition();
		map.resize();
	}
}

// Takes a location in 4326, converts it to the base map's wkid, puts the marker there and zooms to it
function zoomToLocation(location) {
	$.mobile.hidePageLoadingMsg();
	var pt = new esri.geometry.Point(location.coords.longitude, location.coords.latitude, new esri.SpatialReference({wkid: 4326}));
	
	var outSR = new esri.SpatialReference({ wkid: BASE_MAP_WKID});
	gsvc.project([ pt ], outSR, function(projectedPoints) {
		pt = projectedPoints[0];
		map.centerAndZoom(pt, INITIAL_ZOOM);
		
		var symbol = new esri.symbol.PictureMarkerSymbol(MARKER_IMAGE, MARKER_SIZE[0], MARKER_SIZE[1]);
		map.graphics.add(new esri.Graphic(pt,symbol));
	});
}

// Callback for info window text. Returns empty string if input is a zero. So we don't put 0 for something like street direction
function stringCheck(string) {
	return string == '0' ? '' : string;
}

// Initialize the map centered on city hall
function defaultInit(error) {
	initMap({coords: {longitude: -75.163949994, latitude: 39.9534052450001}});
}

// Overrides the default info window 'arrow button' function with a phillyaddress search. Hacky...
function jQueryReady() {
	$('.titleButton.arrow').bind('click', function(e) {
		$('.esriMobileNavigationBar, .esriMobileInfoView').hide();
		var address = $.trim($(this).siblings('.title').text());
		window.location.href = URL_BASE + '/?q=' + encodeURIComponent(address);
	});
}