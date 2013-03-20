(function() {
var LEFT_CONTROL_ADJUST_Y = 5;
var LEFT_CONTROL_ADJUST_X = - 10;
var RIGHT_CONTROL_ADJUST_Y = 25;
var RIGHT_CONTROL_ADJUST_X = 10;

var RANGE_ADJUST_Y = 10;
var RANGE_ADJUST_X = 30;

var KNOB_SIZE = 50;

var MENU_ADJUST_TOP = - 55;
var MENU_ADJUST_LEFT = 15;

var INTERACT_DELAY = 700;
var INIT_MOVE_LIMIT = 50;

/**
 * Copy/Paste base class
 */
function Clipboard() {
  this.clipboard = '';

  this.controlsShown = false;

  this.init();
}

Clipboard.prototype = {
  init: function() {
    window.addEventListener(this.START, this.onStart.bind(this));
    window.addEventListener(this.MOVE, this.onMove.bind(this));
    window.addEventListener(this.END, this.onEnd.bind(this));
  },

  onStart: function(e) {
    if (this.controlsShown) {
      this.teardown();
      return;
    }

    this.startE = e;
    this.startXY = this.coords(e);

    this.interactTimeout = setTimeout(
      this.showControls.bind(this),
      INTERACT_DELAY
    );
  },

  onMove: function(e) {

    if (!this.startXY) {
      return;
    }

    var xy = this.coords(e);

    if (!this.controlsShown && (
        Math.abs(this.startXY.x - xy.x) > INIT_MOVE_LIMIT ||
        Math.abs(this.startXY.y - xy.y) > INIT_MOVE_LIMIT)) {
      this.teardown();
    }

    //dump('Got move!' + xy.x + ' - ' + xy.y)
    //dump('Got move!')
  },

  onEnd: function(e) {
    if (this.controlsShown) {
      return;
    }

    delete this.startXY;
    this.teardown();
  },

  showControls: function() {
    this.controlsShown = true;

    var target = this.startE.target;

    if (target instanceof HTMLInputElement) {
      this.strategy = new HtmlInputStrategy(target);
    } else if (target instanceof HTMLTextAreaElement) {
      this.strategy = new HtmlInputStrategy(target);
    } else {
      this.strategy = new HtmlContentStrategy(target);
    }

    this.strategy.initialSelection();

    // Get the region of the selection
    var targetArea = this.strategy.getRegion();
    var leftKnobPos = {
      y: targetArea.top + LEFT_CONTROL_ADJUST_Y,
      x: targetArea.left + LEFT_CONTROL_ADJUST_X,
      offsetY: RANGE_ADJUST_Y,
      offsetX: RANGE_ADJUST_X,
    };

    var rightTargetArea = this.strategy.endPosition();
    var rightKnobPos = {
      y: rightTargetArea.top + RIGHT_CONTROL_ADJUST_Y,
      x: rightTargetArea.left + RIGHT_CONTROL_ADJUST_X,
      offsetY: -RANGE_ADJUST_Y,
      offsetX: -RANGE_ADJUST_X
    };

    this.createKnob('left', leftKnobPos);
    this.createKnob('right', rightKnobPos);

    this.optionsEl = document.createElement('ul');
    this.optionsEl.id = 'clipboard-menu';
    var actions = [
      '<li data-action="cut">Cut</li>',
      '<li data-action="copy">Copy</li>'
    ];

    if (this.clipboard && this.strategy.canPaste) {
      actions.push('<li data-action="paste">Paste</li>');
    }
    this.optionsEl.innerHTML = actions.join('');

    this.optionsEl.addEventListener(this.START, this);

    document.body.appendChild(this.optionsEl);
    this.positionMenu();
  },

  positionMenu: function() {

    var top = this.leftKnob.y;
    var left = this.leftKnob.x;

    this.optionsEl.style.top = (top + MENU_ADJUST_TOP) + 'px';
    this.optionsEl.style.left = (left + MENU_ADJUST_LEFT) + 'px';
  },

  /**
   * Called when a user clicks on the menu
   */
  handleEvent: function(e) {
    e.stopPropagation();
    e.preventDefault();

    var action = e.target.dataset.action;
    if (!action) {
      return;
    }

    var sel = window.getSelection();
    this.strategy[action]({

      value: this.clipboard,

      modify: function(clipboard) {
        this.clipboard = clipboard;
      }.bind(this)
    });

    this.teardown();
  },

  /**
   * Removes the Copy/Paste UI
   */
  teardown: function() {

    if (this.interactTimeout) {
      clearTimeout(this.interactTimeout);
    }

    if (this.leftKnob) {
      document.body.removeChild(this.leftKnob.element);
      delete this.leftKnob;
    }

    if (this.rightKnob) {
      document.body.removeChild(this.rightKnob.element);
      delete this.rightKnob;
    }

    this.controlsShown = false;

    if (this.optionsEl) {
      document.body.removeChild(this.optionsEl);
      delete this.optionsEl;
    }
  },

  /**
   * Creates a left or right knob
   */
  createKnob: function(name, pos) {
    var knob = name + 'Knob';
    if (this[knob]) {
      document.body.removeChild(this[knob].element);
      delete this[knob];
    }

    this[knob] = new SelectionControl({
      className: name,
      x: pos.x,
      y: pos.y,
      offsetY: pos.offsetY,
      offsetX: pos.offsetX
    });

    this[knob].element.addEventListener(this.START, function(origEvt) {

      this[knob].element.classList.add('moving');
      this.optionsEl.classList.add('moving');

      origEvt.stopImmediatePropagation();
      origEvt.preventDefault();

      var mover = this.getKnobMover(name);
      window.addEventListener(this.MOVE, mover);
      window.addEventListener(this.END, function() {
        window.removeEventListener(this.MOVE, mover);
        if (this[knob]) {
          this[knob].element.classList.remove('moving');
        }
        if (this.optionsEl) {
          this.optionsEl.classList.remove('moving');
        }
      }.bind(this));
    }.bind(this));
  },

  /**
   * Is called when the user has tapped on a knob
   * and moves their finger around.
   * @param {String} knob name (left or right)
   */
  getKnobMover: function(name) {
    var self = this;
    var el = this[name + 'Knob'];

    return function(evt) {
      evt.stopImmediatePropagation();

      var xy = self.coords(evt);

      el.x = xy.x;
      el.y = xy.y;

      self.strategy.rebuildSelection(self.leftKnob, self.rightKnob);

      self.positionMenu();
    }
  }
};
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
};function HtmlInputStrategy(node) {
  this.canPaste = true;
  this.node = node;
}

HtmlInputStrategy.prototype = {

  copy: function(clipboard) {
    var content = this.node.value.substring(
      this.node.selectionStart,
      this.node.selectionEnd
    );

    clipboard.modify(content);
  },

  cut: function(clipboard) {
    this.copy(clipboard);
    this.node.value = this.node.value
      .substring(0, this.node.selectionStart) +
      this.node.value.substring(this.node.selectionEnd);
  },

  paste: function(clipboard) {
    this.node.value = this.node.value
      .substring(0, this.node.selectionStart) +
      clipboard.value +
      this.node.value.substring(this.node.selectionEnd)
  },

  /**
   * Creates the initial selection
   * It should be whatever word you were focused on
   */
  initialSelection: function() {

    var value = this.node.value;

    var leftBound = this.node.selectionStart;
    var rightBound = this.node.selectionEnd;
    var start = this.node.selectionStart;

    for (var i = leftBound-1, letter; letter = value[i]; i--) {
      if (/[\s]+/.test(letter)) {
        break;
      } else {
        leftBound--;
        if (!leftBound) {
          break;
        }
      }
    }

    for (var i = rightBound, letter; letter = value[i]; i++) {
      if (/[\s]+/.test(letter)) {
        break;
      } else {
        rightBound++;
        if (!rightBound) {
          break;
        }
      }
    }

    this.node.selectionStart = leftBound;
    this.node.selectionEnd = rightBound;
  },

  /**
   * Rebuilds selection from knob placement
   */
  rebuildSelection: function(left, right) {
    var start = document.caretPositionFromPoint(left.cursorX, left.cursorY);
    var end = document.caretPositionFromPoint(right.cursorX, right.cursorY);
    //console.log('Debug viewport offsets:', start.offsetNode, start.offset, end.offsetNode, end.offset)

    // Extend the range a bit so there isn't a big gap
    // We do the same for the content strategy
    var extension = 2;

    this.node.selectionStart = start.offset - extension;
    this.node.selectionEnd = end.offset + extension;
  },

  /**
   * Gets the region of the selectedText inside of an input
   */
  getRegion: function(method) {

    method = method || 'getBoundingClientRect';

    var input = this.node;
    var offset = getInputOffset(),
        topPos = offset.top,
        leftPos = offset.left,
        width = getInputCSS('width', true),
        height = getInputCSS('height', true);

        // Styles to simulate a node in an input field
    var cssDefaultStyles = 'white-space:pre; padding:0; margin:0;';
    var listOfModifiers = ['direction', 'font-family', 'font-size',
        'font-size-adjust', 'font-variant', 'font-weight', 'font-style',
        'letter-spacing', 'line-height', 'text-align', 'text-indent',
        'text-transform', 'word-wrap', 'word-spacing'];

    topPos += getInputCSS('padding-top', true);
    topPos += getInputCSS('border-top-width', true);
    leftPos += getInputCSS('padding-left', true);
    leftPos += getInputCSS('border-left-width', true);
    leftPos += 1; //Seems to be necessary

    for (var i = 0; i < listOfModifiers.length; i++) {
        var property = listOfModifiers[i];
        cssDefaultStyles += property + ':' + getInputCSS(property) + ';';
    }
    // End of CSS variable checks

    var text = this.node.value,
        textLen = text.length,
        fakeClone = document.createElement('div');

    if (this.node.selectionStart > 0)
      appendPart(0, this.node.selectionStart);

    var fakeRange = appendPart(
      this.node.selectionStart,
      this.node.selectionEnd
    );

    if (textLen > this.node.selectionEnd)
      appendPart(this.node.selectionEnd, textLen);

    // Styles to inherit the font styles of the element
    fakeClone.style.cssText = cssDefaultStyles;

    // Styles to position the text node at the desired position
    fakeClone.style.position = 'absolute';
    fakeClone.style.top = topPos + 'px';
    fakeClone.style.left = leftPos + 'px';
    fakeClone.style.width = width + 'px';
    fakeClone.style.height = height + 'px';
    fakeClone.style.backgroundColor = '#FF0000';
    document.body.appendChild(fakeClone);
    var returnValue = fakeRange[method]();

    fakeClone.parentNode.removeChild(fakeClone); // Comment this to debug

    function appendPart(start, end) {
      var span = document.createElement('span');
      //Force styles to prevent unexpected results
      span.style.cssText = cssDefaultStyles;
      span.textContent = text.substring(start, end);
      fakeClone.appendChild(span);
      return span;
    }

    // Computing offset position
    function getInputOffset() {
      var body = document.body,
          win = document.defaultView,
          docElem = document.documentElement,
          box = document.createElement('div');
      box.style.paddingLeft = box.style.width = '1px';
      body.appendChild(box);
      var isBoxModel = box.offsetWidth == 2;
      body.removeChild(box);
      box = input.getBoundingClientRect();
      var clientTop = docElem.clientTop || body.clientTop || 0,

          clientLeft = docElem.clientLeft || body.clientLeft || 0,

          scrollTop = win.pageYOffset || isBoxModel &&
            docElem.scrollTop || body.scrollTop,

          scrollLeft = win.pageXOffset || isBoxModel &&
            docElem.scrollLeft || body.scrollLeft;

      return {
          top: box.top + scrollTop - clientTop,
          left: box.left + scrollLeft - clientLeft};
    }

    function getInputCSS(prop, isnumber) {
      var val = document.defaultView
        .getComputedStyle(input, null).getPropertyValue(prop);

      return isnumber ? parseFloat(val) : val;
    }

    return {
      top: returnValue.top + window.pageYOffset,
      bottom: returnValue.bottom + window.pageYOffset,
      left: returnValue.left + window.pageXOffset,
      right: returnValue.right + window.pageXOffset
    };
  },

   /**
   * Gets the outer rectangle coordinates of the selction
   * Normalizes data to absolute values with window offsets.
   * Inspired by: stackoverflow.com/questions/6930578
   */
  endPosition: function() {
    var region = this.getRegion();
    return {
      top: region.bottom,
      left: region.right
    };
  },

  extendRight: function() {
    this.node.selectionEnd++;
  },

  extendLeft: function() {
    this.node.selectionStart--;
  }
};/**
 * General range helper functions
 */
function HtmlContentStrategy(node) {
  this.canPaste = false;
  this.node = node;
}

HtmlContentStrategy.prototype = {

  get sel() {
    return window.getSelection();
  },

  copy: function(clipboard) {
    clipboard.modify(this.sel.toString());
  },

  cut: function(clipboard) {
    clipboard.modify(this.sel.toString());
    range = this.sel.getRangeAt(0);
    range.deleteContents();
  },

  paste: function(clipboard) {
    var range = this.sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(clipboard.value));
  },

  /**
   * Creates the initial selection
   * This is currently the entire elemtn
   */
  initialSelection: function() {

    var directions = ['left', 'right'];

    this.extendLeft('word')
    this.extendRight('word')
  },

  /**
   * Rebuilds selection from knob placement
   * @param {Object} left selection control.
   * @param {Object} right selection control.
   */
  rebuildSelection: function(left, right) {

    var start = document.caretPositionFromPoint(left.cursorX, left.cursorY);
    var end = document.caretPositionFromPoint(right.cursorX, right.cursorY);
    //console.log('Debug viewport offsets:', start.offsetNode, start.offset, end.offsetNode, end.offset)

    this.sel.removeAllRanges();
    var newRange = document.createRange();
    newRange.setStart(start.offsetNode, start.offset);
    newRange.setEnd(end.offsetNode, end.offset);
    this.sel.addRange(newRange);

    // Extend the range a bit so there isn't a big gap
    // This feels the best in practice, we may be able to adjust the CSS so this isnt' needed.
    this.extendLeft('character');
    this.extendLeft('character');
    this.extendRight('character');
    this.extendRight('character');
  },

  /**
   * Normalized wrapper for getBoundingClientRect()
   */
  getRegion: function() {
    var range = this.sel.getRangeAt(0);
    var region =  range.getBoundingClientRect();

    return {
      top: region.top + window.pageYOffset,
      left: region.left + window.pageXOffset,
      bottom: region.bottom + window.pageYOffset,
      right: region.right + window.pageXOffset
    }
  },

   /**
   * Gets the outer rectangle coordinates of the selction
   * Normalizes data to absolute values with window offsets.
   */
  endPosition: function() {
    var range = this.sel.getRangeAt(0).cloneRange();
    range.collapse(false);
    var dummy = document.createElement('span');
    range.insertNode(dummy);

    var rect = dummy.getBoundingClientRect();
    var coords = {
      top: rect.top + window.pageYOffset,
      left: rect.left + window.pageXOffset
    };
    dummy.parentNode.removeChild(dummy);

    return coords;
  },

  /**
   * Extends the right selection bound
   */
  extendRight: function(magnitude) {
    magnitude = magnitude || 'character';

    var curSelected = this.sel + '';
    this.sel.modify('extend', 'right', magnitude);

    if (this.sel + '' == curSelected && magnitude == 'character') {
      this.extendRight('word');
    }
  },

  /**
   * Extends the left selection bound
   */
  extendLeft: function(magnitude) {
    magnitude = magnitude || 'character';

    var sel = this.sel;

    // modify() works on the focus of the selection
    var endNode = sel.focusNode;
    var endOffset = sel.focusOffset;
    sel.collapse(sel.anchorNode, sel.anchorOffset);

    var curSelected = this.sel + '';
    sel.modify('move', 'backward', magnitude);
    sel.extend(endNode, endOffset);

    if (this.sel + '' == curSelected && magnitude == 'character') {
      this.extendLeft('word');
    }
  }

};function MouseClipboard() {
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
}());
