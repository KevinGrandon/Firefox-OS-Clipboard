function MouseClipboard() {
  this.START = 'mousedown';
  this.MOVE = 'mousemove';
  this.END = 'mouseup';
  Clipboard.apply(this);
}

MouseClipboard.prototype = {
  __proto__: Clipboard.prototype,

  /**
   * Extracts the X/Y positions for a touch event
   */
  coords: function(e) {
    return {
      x: e.pageX,
      y: e.pageY
    };
  }
};

function TouchClipboard() {
  this.START = 'touchstart';
  this.MOVE = 'touchmove';
  this.END = 'touchend';
  Clipboard.apply(this);
}

TouchClipboard.prototype = {
  __proto__: Clipboard.prototype,

  /**
   * Extracts the X/Y positions for a touch event
   */
  coords: function(e) {
    var touch = e.touches[0];

    return {
      x: touch.pageX,
      y: touch.pageY
    };
  }
};

if ('ontouchstart' in window) {
  var copyPaste = new TouchClipboard();
} else {
  var copyPaste = new MouseClipboard();
}