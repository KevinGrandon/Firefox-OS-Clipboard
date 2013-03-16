function SelectionControl(config) {

  var defaults = {
    x: 0,
    y: 0,
    offsetY: 0,
    offsetX: 0
  };

  for (var i in defaults) {
    if (config[i] === undefined) {
      config[i] = defaults[i];
    }
  }
  this.config = config;

  this.element = document.createElement('div');
  this.element.className = 'knob ' + config.className;
  this.element.innerHTML = '<span></span>';
  document.body.appendChild(this.element);

  // Initial positions
  this.x = config.x;
  this.y = config.y;
}

SelectionControl.prototype = {

  set x(pos) {
    this.config.x = pos;
    this.element.style.left = (pos - KNOB_SIZE/2) + 'px';
  },

  set y(pos) {
    this.config.y = pos;
    this.element.style.top = (pos - KNOB_SIZE/2) + 'px';
  },

  get x() {
    return this.config.x;
  },

  get y() {
    return this.config.y;
  },

  get cursorX() {
    return this.config.x - window.pageXOffset + this.config.offsetX;
  },

  get cursorY() {
    return this.config.y - window.pageYOffset + this.config.offsetY;
  }
};