/*
  Documentations:

*/
(function (app) {
  "use strict";
  // Dependencies
  var Utils = {};
  var Messages = {};

  var _config = {
    px4mm: 1,
    gpsRefreshTime: 5000,
    gpsTimeoutTime: 25000,
    scalePrecision: true,
    watchPosition: false,
    watchDuration: 10000
  };

  var PI = Math.PI;
  var _lastPosition = false;
  var _geoWatchId = false;
  var _gpsGlobalStatus = "drawith__GPS-ON";
  var _GEO = navigator.geolocation, _scaleFactor;

  var _WGS84 = {
    r_major: 6378137000,
    r_minor: 6356752314.245179,
    f: 298.257223563,
  };
  var _geoOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  };

  function _positionIsValid () {
    return (_lastPosition && (new Date().getTime() - _lastPosition.timestamp < _config.gpsRefreshTime));
  }

  function _scaleFactorExact (lat) {

    var r = Math.radians(lat);
    var s = 1 / Math.cos(r);
    var c = Math.sqrt(1 - Math.pow(0.006694379990141317, 2) * Math.pow(Math.sin(r), 2));
    return s * c;

  }

  function _scaleFactorRounded (lat) {
    return 1 / Math.cos(Math.radians(lat));
  }

  function _lon2mm (lon) {
    return Math.round((_WGS84.r_major * Math.radians(lon)) * 10) / 10;
  }

  function _lat2mm (lat) {

    if (lat > 89.5) lat = 89.5;
    if (lat < -89.5) lat = -89.5;
    var phi = Math.radians(lat);
    var con = _WGS84.eccent * Math.sin(phi);
    con = Math.pow((1.0 - con) / (1.0 + con), 0.5 * _WGS84.eccent);

    return Math.round((-_WGS84.r_major * Math.log(Math.tan(0.5 * (PI * 0.5 - phi)) / con)) * 10) / 10;

  }

  function _mm2lon (mmx) {
    return Math.degrees((mmx / _WGS84.r_major));
  }

  function _mm2lat (mmy) {

    var N_ITER = 15;
    var HALFPI = PI / 2;
    var TOL = 0.0000000001;
    var ts = Math.exp(0 - (mmy / _WGS84.r_major));
    var e = _WGS84.eccent;
    var i = N_ITER;
    var eccnth = 0.5 * e, Phi, con, dphi;
    Phi = HALFPI - 2 * Math.atan(ts);

    do {
      con = e * Math.sin(Phi);
      dphi = HALFPI - 2 * Math.atan(ts * Math.pow((1 - con) / (1 + con), eccnth)) - Phi;
      Phi = Phi + dphi;
    } while (Math.abs(dphi) > TOL && --i);

    return Math.degrees(Phi);

  }

  function _gps2px (position, lat, lon) {

    if (position) {
      lon = position.coords.longitude;
      lat = position.coords.latitude;
    }

    return {
      x: _lon2mm(lon) * _config.px4mm,
      y: _lat2mm(lat) * _config.px4mm
    };

  }

  function _px2gps (pxx, pxy) {

    return {
      lat: _mm2lat(pxy / _config.px4mm),
      lon: _mm2lon(pxx / _config.px4mm)
    };

  }

  function _geoError (err) {
    console.log(err);
    Messages.error("Geolocalisation error");
  }

  function _startWatchPosition (callback, error) {

    _GEO.getCurrentPosition(callback, error, _geoOptions);
    _clearWatchPosition();
    _geoWatchId = _GEO.watchPosition(callback, error, _geoOptions);
    setTimeout(_clearWatchPosition, _config.watchDuration);
    Utils.addGlobalStatus(_gpsGlobalStatus);

  }

  function _clearWatchPosition () {

    if (_geoWatchId) {
      _GEO.clearWatch(_geoWatchId);
      _geoWatchId = false;
      Utils.removeGlobalStatus(_gpsGlobalStatus);
    }

  }

  function _getCurrentPosition (callback, error) {

    Utils.addGlobalStatus(_gpsGlobalStatus);
    _GEO.getCurrentPosition(callback, error, _geoOptions);
    setTimeout(function () {
      Utils.removeGlobalStatus(_gpsGlobalStatus);
    }, 2500);

  }

  var _getPosition = _GEO ? function (force, callback, error) {
      if (_config.watchPosition) {
        _startWatchPosition(callback, error);
      } else if (force || !_positionIsValid()) {
        _getCurrentPosition(callback, error);
      } else {
        callback(_lastPosition);
      }

    } : function (force, callback, error) {
      error();
    };

  function pxy2scale (pxy) {
    return _scaleFactor(_mm2lat(pxy / _config.px4mm));
  }

  function coordGps2px (lat, lon) {
    return _gps2px(false, lat, lon);
  }

  function currentGps2px (forceRefresh, callback, error) {

    if (!callback) return;
    _getPosition(forceRefresh, function (position) {
      // debugger;
      _lastPosition = position;
      console.log("GPS - lat:", position.coords.latitude, "lon:", position.coords.longitude);
      var px = _gps2px(position);
      callback(px.x, px.y);
    }, error || _geoError);

  }

  function setConfig (params) {
    _config = Utils.setConfig(params, _config);
  }

  function init (params) {

    Utils = app.Utils;
    Messages = app.Messages;
    _config = Utils.setConfig(params, _config);
    _geoOptions.timeout = _config.gpsTimeoutTime;
    _WGS84.temp = _WGS84.r_minor / _WGS84.r_major;
    _WGS84.eccent = Math.sqrt(1.0 - (_WGS84.temp * _WGS84.temp));
    _scaleFactor = _config.scalePrecision ? _scaleFactorExact : _scaleFactorRounded;

  }

  app.module("Dashboard.Gps", {
    init: init,
    setConfig: setConfig,
    pxy2scale: pxy2scale,
    currentGps2px: currentGps2px,
    coordGps2px: coordGps2px
  });

})(APP);
