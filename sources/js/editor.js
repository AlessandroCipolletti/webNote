(function (app) {

  var _config = {
    primaryColors: ["#000000", "#808080", "#C0C0C0", "#6DF4FF", "#007AFF", "#0000FF", "#800080", "#000080", "#FFFF00", "#00FF00", "#4CD900", "#A08066","#F06A31", "#008000", "#FF0000", "#A52A2A", "#800000"],
    tools: ["marker", "pencil", "eraser", "undo", "redo", "save", "paper", "clear"],
    toolsSide: "left"
  };

  var PI = Math.PI;
  var PI2 = PI * 2;
  var random = function (n) {
    return Math.random() * n | 0;
  };
  var round = function (n, d) {
    var m = d ? Math.pow(10, d) : 1;
    return Math.round(n * m) / m;
  };
  var _container, _canvas, _context, _canvasWidth, _canvasHeight;
  var _touchDown = false;
  var _currentPaper = "white";
  var _minX, _minY, _maxX, _maxY, _oldX, _oldY, _oldMidX, _oldMidY, _cursorX, _cursorY, _toolsWidth;
  var _frameUpdateForce = false, _touchForce = 0, _touchEventObject = {};
  var _step = [], _stepCacheLength = 21, _currentStep = 0;
  var _tool = {
    size: 25,
    forceFactor: 2,
    speedFactor: 0,
    color: "",
    randomColor: true,
    shape: "circle",
    globalCompositeOperation: ""
  };

  function save () {


  }

  function show () {
    app.Utils.fadeInElements(_container);
  }

  function _hide () {
    app.Utils.fadeOutElements(_container);
  }

  function setTool (tool) {
    // questa viene chiamata dal modulo che creerà la barra laterale dei tools su tool change
    // TODO: devo tener conto anche che potrebbe essere il righello o il picker
    var key;
    for (key in tool) {
      if (typeof (_tool[key]) !== "undefined") {
        _tool[key] = tool[key];
      }
    }

  }

  function _saveLayer () {

    return {
      data : _minX === -1 ? _context.getImageData(-1, -1, -1, -1) : _context.getImageData(_minX, _minY, _maxX - _minX, _maxY - _minY),
      minX : _minX,
      minY : _minY,
      maxX : _maxX,
      maxY : _maxY,
      oldX : _oldX,
      oldY : _oldY
    };

  }

  function _saveStep () {

    if (_currentStep !== 0) {
      _step.splice(0, _currentStep);
      _currentStep = 0;
    }
    _step.splice(0, 0, _saveLayer());
    if (_step.length > _stepCacheLength)
      _step.splice(_stepCacheLength, _step.length);
    if (_step.length > 1) {
      app.Editor.Tools.toggleButton("undo", true);
      app.Editor.Tools.toggleButton("save", true);
    } else {
      app.Editor.Tools.toggleButton("undo", false);
      app.Editor.Tools.toggleButton("save", false);
    }
    app.Editor.Tools.toggleButton("redo", false);

  }

  function undo () {

    var step = _step[_currentStep + 1];
    if (step) {

      var tot = _step.length - _currentStep - 2;
      _currentStep = _currentStep + 1;
      _clear();
      _restoreStep(step);
      if (!tot) {
        app.Editor.Tools.toggleButton("undo", false);
        app.Editor.Tools.toggleButton("save", false);
      } else {
        app.Editor.Tools.toggleButton("save", true);
      }
      app.Editor.Tools.toggleButton("redo", true);

    }

  }

  function redo () {

    if (_currentStep > 0) {
      _currentStep -= 1;
      var step = _step[_currentStep];
      _clear();
      _restoreStep(step);
      app.Editor.Tools.toggleButton("undo", true);
      app.Editor.Tools.toggleButton("save", true);
      if (_currentStep <= 0) {
        app.Editor.Tools.toggleButton("redo", false);
      }
    }

  }

  function changePaper () {

    _canvas.classList.remove("paper-squares", "paper-lines", "paper-white");
    if (_currentPaper === "white") {
      _currentPaper = "squares";
    } else if (_currentPaper === "squares") {
      _currentPaper = "lines";
    } else {
      _currentPaper = "white";
    }
    _canvas.classList.add("paper-" + _currentPaper);

  }

  function clear () {

    //if (Messages.confirm(label["areYouSure"])) {
    if (_minX === -1) {
      return;
    }
    _clear();
    //_draft = {};
    _saveStep();
    app.Editor.Tools.toggleButton("redo", false);
    app.Editor.Tools.toggleButton("save", false);

  }

  function _clear () {

    _context.clearRect(0, 0, app.width, app.height);
    _minX = _minY = _maxX = _maxY = _oldX = _oldY = -1;

  }

  function _restoreStep (step) {

    _context.putImageData(step.data, step.minX, step.minY);
    _minX = step.minX;
    _minY = step.minY;
    _maxX = step.maxX;
    _maxY = step.maxY;
    _oldX = step.oldX;
    _oldY = step.oldY

  }

  function _checkCoord (x, y) {

    //var offset = _tool.size / 2;
    var offset = _tool.size;
    if (_minX === -1 || _minX > (x - offset)) _minX = x - offset;
    if (_minY === -1 || _minY > (y - offset)) _minY = y - offset;
    if (_maxX === -1 || _maxX < (x + offset)) _maxX = x + offset;
    if (_maxY === -1 || _maxY < (y + offset)) _maxY = y + offset;
    if (_minX < 0) _minX = 0;
    if (_minY < 0) _minY = 0;
    if (_maxX > app.width) _maxX = app.width;
    if (_maxY > app.height) _maxY = app.height;
    _oldX = x;
    _oldY = y;

  }

  function _circle (x, y) {

    _context.beginPath();
    _context.fillStyle = _tool.color;
    _context.arc(x, y, _tool.size / 2, 0, PI2, true);
    _context.fill();

  }

  function _getRandomColor (alpha) {
    //function (a,b,c){return"#"+((256+a<<8|b)<<8|c).toString(16).slice(1)};
    if (alpha === false || typeof(alpha) === "undefined") {
      return "rgb(" + random(255) + ", " + random(255) + ", " + random(255) + ")";
    } else if (alpha === true) {
      return "rgba(" + random(255) + ", " + random(255) + ", " + random(255) + ", 0.7)";
    } else if (typeof(alpha) === "number") {
      return "rgba(" + random(255) + ", " + random(255) + ", " + random(255) + ", " + alpha + ")";
    }

  }

  function _updateTouchForce () {
    _touchForce = _touchEventObject.force;
    if (_touchForce > 0) {
      _frameUpdateForce = requestAnimationFrame(_updateTouchForce);
    } else {
      _frameUpdateForce = false;
    }
  }

  function _getCoordX (e) {

    if (typeof(e.layerX) === "undefined") {
      if (e.type.indexOf("mouse") >= 0) {
        return e.clientX - _toolsWidth;
      } else {
        return e.touches[0].clientX - _toolsWidth;
      }
    } else {
      return e.layerX;
    }

  }

  function _getCoordY (e) {

    if (typeof(e.layerY) === "undefined") {
      if (e.type.indexOf("mouse") >= 0) {
        return e.clientY - _toolsWidth;
      } else {
        return e.touches[0].clientY - _toolsWidth;
      }
    } else {
      return e.layerY;
    }

  }

  function _onTouchStart (e) {
    console.log(e);
    e.preventDefault();
    if ((e.touches && e.touches.length > 1) || _touchDown) return;
    if (app.Param.supportTouch) {
      _touchEventObject = e.touches[0];
      _updateTouchForce();
    }
    _touchDown = true;
    _cursorX = _getCoordX(e);
    _cursorY = _getCoordY(e);
    _checkCoord(_cursorX, _cursorY);
    if (_tool.randomColor) {
      _tool.color = _getRandomColor();
    }
    //_context.globalAlpha = 0.7;
    //_context.globalCompositeOperation = "lighter";
    _context.globalCompositeOperation = _tool.globalCompositeOperation;
    _context.strokeStyle = _tool.color;
    _context.lineWidth = _tool.size;
    _context.lineJoin = "round";
    _context.lineCap = "round";
    //_context.shadowBlur = 10;
    //_context.shadowColor = _tool.color;
    if (_tool.shape === "circle") {
      _circle(_cursorX, _cursorY);
    }
    _oldMidX = _cursorX;
    _oldMidY = _cursorY;

  }

  function _onTouchMove (e) {

    e.preventDefault();
    if ((e.touches && e.touches.length > 1) || _touchDown === false) return;
    if (app.Param.supportTouch) {
      _touchEventObject = e.touches[0];
      if (_frameUpdateForce === false && _touchForce === 0 && _touchEventObject.force > 0) {
        _updateTouchForce();
      }
    } else {
      _touchForce = 0;
    }
    _cursorX = _getCoordX(e);
    _cursorY = _getCoordY(e);
    var distance = app.Utils.distance(_cursorX, _cursorY, _oldX, _oldY);

    if (_tool.size < 25 && distance < 3) return;
    var midX = _oldX + _cursorX >> 1;
    var midY = _oldY + _cursorY >> 1;
    _context.beginPath();
    _context.lineWidth = _tool.size + round(_tool.size * _tool.forceFactor * _touchForce, 1) + (_tool.speedFactor > 0 ? Math.min(distance, _tool.size * _tool.speedFactor) : 0);
    _context.moveTo(midX, midY);
    _context.quadraticCurveTo(_oldX, _oldY, _oldMidX, _oldMidY);
    _context.stroke();
    _oldMidX = midX;
    _oldMidY = midY;
    _checkCoord(_cursorX, _cursorY);

  }

  function _onTouchEnd (e) {

    if (_touchDown === false || (e.touches && e.touches.length)) return;
    _touchDown = false;
    if (app.Param.supportTouch === false) {
      _cursorX = _getCoordX(e);
      _cursorY = _getCoordY(e);
      if (_cursorX !== _oldX) {
        _context.beginPath();
        _context.moveTo(_oldMidX, _oldMidY);
        _context.quadraticCurveTo(_oldX, _oldY, _cursorX, _cursorY);
        _context.stroke();
      }
    }
    _saveStep();

  }

  function _onGestureStart (e) {
    console.log(e);
  }

  function _onGestureChange (e) {
    console.log(e);
  }

  function _onGestureEnd (e) {
    console.log(e);
  }

  function _onRotate (e) {

    _canvasWidth = app.width - 151;
    _canvasHeight = app.height - 151;
    _canvas.width = _canvasWidth;
    _canvas.height = _canvasHeight;
    canvasStyle = undefined;

  }

  function _initDom () {

    _container = document.createElement("div");
    _container.classList.add("cloudnote-editor__container", "displayNone", "fadeOut");
    _canvas = document.createElement("canvas");
    _context = _canvas.getContext("2d");
    _canvas.classList.add("cloudnote-editor__canvas", "paper-white");
    _canvas.addEventListener(app.Param.eventStart, _onTouchStart, true);
    _canvas.addEventListener(app.Param.eventMove, _onTouchMove, true);
    _canvas.addEventListener(app.Param.eventEnd, _onTouchEnd, true);

    if (app.Param.supportGesture) {

      _canvas.addEventListener("gesturestart", _onGestureStart, true);
      _canvas.addEventListener("gesturechange", _onGestureChange, true);
      _canvas.addEventListener("gestureend", _onGestureEnd, true);

    }

    _container.appendChild(_canvas);
    app.Param.container.appendChild(_container);
    app.Main.addRotationHandler(_onRotate);

  }

  function _initSubModules () {

    app.Editor.ColorPicker.init(_config);
    app.Editor.Tools.init(_config);

  }

  function addSubmoduleDom (dom) {
    _container.appendChild(dom);
  }

  function _setConfig (params) {

    var key;
    for (key in params) {
      if (typeof (_config[key]) !== "undefined") {
        _config[key] = params[key];
      }
    }
    _toolsWidth = _config.toolsSide === "left" ? app.width - _canvasWidth : 0;

  }

  function init (params) {

    _setConfig(params);
    _initDom();
    _minX = _minY = _maxX = _maxY = _oldX = _oldY = _oldMidX = _oldMidY = -1;
    _saveStep();
    _initSubModules();

  }

  app.Editor = {
    init: init,
    show: show,
    setTool: setTool,
    undo: undo,
    redo: redo,
    clear: clear,
    changePaper: changePaper,
    addSubmoduleDom: addSubmoduleDom
  };

})(cloudnote);
