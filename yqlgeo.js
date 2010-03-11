/*
  YQL Geo library by Christian Heilmann
  Homepage: http://isithackday.com/geo/yql-geo-library
  Copyright (c)2010 Christian Heilmann
  Code licensed under the BSD License:
  http://wait-till-i.com/license.txt
*/

// -- BEGIN GEARS_INIT
(function() {
  // We are already defined. Hooray!
  if (window.google && google.gears) {
    return;
  }

  var factory = null;

  // Firefox
  if (typeof GearsFactory != 'undefined') {
    factory = new GearsFactory();
  } else {
    // IE
    try {
      factory = new ActiveXObject('Gears.Factory');
      // privateSetGlobalObject is only required and supported on WinCE.
      if (factory.getBuildInfo().indexOf('ie_mobile') != -1) {
        factory.privateSetGlobalObject(this);
      }
    } catch (e) {
      // Safari
      if ((typeof navigator.mimeTypes != 'undefined') && navigator.mimeTypes["application/x-googlegears"]) {
        factory = document.createElement("object");
        factory.style.display = "none";
        factory.width = 0;
        factory.height = 0;
        factory.type = "application/x-googlegears";
        document.documentElement.appendChild(factory);
      }
    }
  }

  // *Do not* define any objects if Gears is not installed. This mimics the
  // behavior of Gears defining the objects in the future.
  if (!factory) {
    return;
  }

  // Now set up the objects, being careful not to overwrite anything.
  //
  // Note: In Internet Explorer for Windows Mobile, you can't add properties to
  // the window object. However, global objects are automatically added as
  // properties of the window object in all browsers.
  if (!window.google) {
    google = {};
  }

  if (!google.gears) {
    google.gears = {factory: factory};
  }
})();
// -- END GEARS_INIT

var yqlgeo = function(){
  var callback;
  function get(){
    var args = arguments;
    for(var i=0;i<args.length;i++){
      if(typeof args[i] === 'function'){
        callback = args[i];
      }
    }
    if(args[0] === 'visitor'){getVisitor();}
    if(typeof args[0] === 'string' && args[0] != 'visitor'){
      if(args[0]){
        if(/^http:\/\/.*/.test(args[0])){
          getFromURL(args[0]);
        } else if(/^[\d+\.?]+$/.test(args[0])){
          getFromIP(args[0]);
        } else {
          getFromText(args[0]);
        }
      } 
    }
    var lat = args[0];
    var lon = args[1];
    if(typeof lat.join !== undefined && args[0][1]){
      lat = args[0][0];
      lon = args[0][1];
    };    
    if(isFinite(lat) && isFinite(lon)){
      if(lat > -90 && lat < 90 &&
         lon > -180 && lon < 180){
        getFromLatLon(lat,lon);
      }
    }
  }
  function getVisitor(){
    if(navigator.geolocation){
       navigator.geolocation.getCurrentPosition(
        function(position){
          getFromLatLon(position.coords.latitude,
                        position.coords.longitude);
        },
        function(error){
          retrieveip();
        }
      );
	 } else if(window.google && google.gears) {
		retrieveGears();
    } else{
      retrieveip();
    }
  };

  function getFromIP(ip){
    var yql = 'select * from geo.places where woeid in ('+
              'select place.woeid from flickr.places where (lat,lon) in('+
              'select Latitude,Longitude from ip.location'+
              ' where ip="'+ip+'"))';
    load(yql,'yqlgeo.retrieved');
  };

  function retrieveip(){
    jsonp('http://jsonip.appspot.com/?callback=yqlgeo.ipin');
  };

  function retrieveGears() {
    try {
      var geo = google.gears.factory.create('beta.geolocation');
      geo.getCurrentPosition(function(position) { getFromLatLon(position.latitude,position.longitude); }, function() {retrieveip();});
    }
    catch(ex) {
      retrieveip();
    }
  };

  function ipin(o){
    getFromIP(o.ip);
  };

  function getFromLatLon(lat,lon){
    var yql = 'select * from geo.places where woeid in ('+
              'select place.woeid from flickr.places where lat='+
              lat + ' and  lon=' + lon + ')';
    load(yql,'yqlgeo.retrieved');
  };

  function getFromURL(url){
    var yql = 'select * from geo.places where woeid in ('+
              'select match.place.woeId from geo.placemaker where '+
              'documentURL="' + url + '" and '+
              'documentType="text/html" and appid="")';
    load(yql,'yqlgeo.retrieved');
  }

  function getFromText(text){
    var yql = 'select * from geo.places where woeid in ('+
              'select match.place.woeId from geo.placemaker where'+
              ' documentContent = "' + text + '" and '+
              'documentType="text/plain" and appid = "")';
    load(yql,'yqlgeo.retrieved');
  };

  function jsonp(src){
    if(document.getElementById('yqlgeodata')){
      var old = document.getElementById('yqlgeodata');
      old.parentNode.removeChild(old);
    }
    var head = document.getElementsByTagName('head')[0];
    var s = document.createElement('script');
    s.setAttribute('id','yqlgeodata');
    s.setAttribute('src',src);
    head.appendChild(s);
  };

  function load(yql,cb){
    if(document.getElementById('yqlgeodata')){
      var old = document.getElementById('yqlgeodata');
      old.parentNode.removeChild(old);
    }
    var src = 'http://query.yahooapis.com/v1/public/yql?q='+
              encodeURIComponent(yql) + '&format=json&callback=' + cb + '&'+
              'env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
    var head = document.getElementsByTagName('head')[0];
    var s = document.createElement('script');
    s.setAttribute('id','yqlgeodata');
    s.setAttribute('src',src);
    head.appendChild(s);
  };

  function retrieved(o){
    if(o.query.results){
      callback(o.query.results);
    } else {
      callback({error:o.query});
    }
  };
  return {
    get:get,
    retrieved:retrieved,
    ipin:ipin
  };
}();