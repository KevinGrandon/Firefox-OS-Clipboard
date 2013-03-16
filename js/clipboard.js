(function() {
/**
 * Copy/Paste base class
 */
function Clipboard() {
  this.clipboard = '';

  this.MENU_ADJUST_TOP = -45;
  this.MENU_ADJUST_LEFT = 20;

  this.INTERACT_DELAY = 700;
  this.TOUCH_BOUND = 50;

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
    dump('GOT TOUCH START' + e);

    if (this.controlsShown) {
      this.teardown();
      return;
    }

    this.startE = e;
    this.startXY = this.coords(e);

    this.interactTimeout = setTimeout(
      this.showControls.bind(this),
      this.INTERACT_DELAY
    );
  },

  onMove: function(e) {
    var xy = this.coords(e);

    if (!this.controlsShown && (
        Math.abs(this.startXY.x - xy.x) > this.TOUCH_BOUND ||
        Math.abs(this.startXY.y - xy.y) > this.TOUCH_BOUND)) {
      this.teardown();
    }

    //dump('Got move!' + xy.x + ' - ' + xy.y)
    //dump('Got move!')
  },

  onEnd: function(e) {
    if (this.controlsShown) {
      return;
    }

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
    var targetArea = target.getBoundingClientRect();
    var leftKnobPos = {
      top: targetArea.top + window.pageYOffset,
      left: targetArea.left + window.pageXOffset
    };

    var rightKnobPos = this.strategy.endPosition();

    this.createKnob('left', leftKnobPos);
    this.createKnob('right', rightKnobPos);

    this.optionsEl = document.createElement('ul');
    this.optionsEl.id = 'clipboard-menu';
    var actions = [
      '<li data-action="cut">Cut</li>',
      '<li data-action="copy">Copy</li>'
    ];
    if (this.clipboard) {
      actions.push('<li data-action="paste">Paste</li>');
    }
    this.optionsEl.innerHTML = actions.join('');

    this.optionsEl.addEventListener(this.START, this);

    document.body.appendChild(this.optionsEl);
    this.positionMenu();
  },

  positionMenu: function() {

    var top = parseInt(this.leftKnob.style.top, 10);
    var left = parseInt(this.leftKnob.style.left, 10);

    this.optionsEl.style.top = (top + this.MENU_ADJUST_TOP) + 'px';
    this.optionsEl.style.left = (left + this.MENU_ADJUST_LEFT) + 'px';
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
      document.body.removeChild(this.leftKnob);
      delete this.leftKnob;
    }

    if (this.rightKnob) {
      document.body.removeChild(this.rightKnob);
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
      this[knob].parentNode.removeChild(this[knob]);
    }

    this[knob] = document.createElement('div');
    this[knob].className = 'knob ' + name;
    document.body.appendChild(this[knob]);

    this[knob].style.left = pos.left + 'px';
    this[knob].style.top = pos.top + 'px';

    this[knob].addEventListener(this.START, function(origEvt) {

      this[knob].classList.add('moving');
      origEvt.stopImmediatePropagation();
      origEvt.preventDefault();

      var mover = this.getKnobMover(this[knob]);
      window.addEventListener(this.MOVE, mover);
      window.addEventListener(this.END, function() {
        window.removeEventListener(this.MOVE, mover);
        this[knob].classList.remove('moving');
      }.bind(this));
    }.bind(this));
  },

  /**
   * Logic to expand/collapse the selection
   * when the right knob is moved.
   */
  rightKnobHandler: function(xy, el) {
    var modification = 'word';
    var direction;

    if (xy.x > parseInt(el.style.left, 10) ||
        xy.y > parseInt(el.style.top, 10)) {
      direction = 'right';
    } else {
      direction = 'left';
    }

    var lastPosition = {};
    while (true) {

      var thisPosition = this.strategy.bottomRect();

      // Break if we meet the word, or did not move on this iteration
      var buffer = 10;
      if (thisPosition.bottom == lastPosition.bottom &&
        thisPosition.right == lastPosition.right) {
        break;
      } else if (direction == 'right' &&
        thisPosition.bottom + buffer > xy.y &&
        thisPosition.right + buffer > xy.x) {
        break;
      } else if (direction == 'left' &&
        thisPosition.bottom - buffer < xy.y &&
        thisPosition.right - buffer < xy.x) {
        break;
      }

      if (direction == 'left') {
        this.strategy.shrinkRight();
      } else {
        this.strategy.extendRight();
      }

      lastPosition = thisPosition;
    }
  },

  /**
   * Logic to expand/collapse the selection
   * when the left knob is moved.
   */
  leftKnobHandler: function(xy, el) {
    var direction;

    var thisPosition = this.strategy.topRect();

    if (xy.y < thisPosition.top ||
        xy.x < thisPosition.left) {
      direction = 'left';
    } else {
      direction = 'right';
    }

    var lastPosition = {};

    while (true) {

      thisPosition = this.strategy.topRect();
      // Break if we meet the word, or did not move on this iteration
      if (thisPosition.top == lastPosition.top &&
        thisPosition.left == lastPosition.left) {
        break;
      }

      var buffer = 10;
      if (direction == 'right' && (
        thisPosition.top + buffer > xy.y &&
        thisPosition.left + buffer > xy.x)) {
        break;
      } else if (direction == 'left' &&
        thisPosition.top - buffer < xy.y &&
        thisPosition.left - buffer < xy.x) {
        break;
      }

      if (direction == 'left') {
        this.strategy.extendLeft();
      } else {
        this.strategy.shrinkLeft();
      }

      lastPosition = thisPosition;
    }
  },

  /**
   * Is called when the user has tapped on a knob
   * and moves their finger around.
   */
  getKnobMover: function(el) {
    var self = this;

    return function(evt) {
      evt.stopImmediatePropagation();

      var xy = self.coords(evt);

      if (el.classList.contains('right')) {
        self.rightKnobHandler(xy, el);
      } else {
        self.leftKnobHandler(xy, el);
      }

      el.style.left = xy.x + 'px';
      el.style.top = xy.y + 'px';

      self.positionMenu();
    }
  }
};function HtmlInputStrategy(node) {
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
      .substring(0, this.node.selectionStart - 1) +
      this.node.value.substring(this.node.selectionEnd);
  },

  paste: function(clipboard) {
    this.node.value = clipboard.value;
  },

  /**
   * Creates the initial selection
   * This is currently the entire value of the input
   */
  initialSelection: function() {
    this.node.selectionStart = 0;
    this.node.selectionEnd = this.node.value.length;
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
    var cssDefaultStyles = 'white-space:pre;padding:0;margin:0;',
        listOfModifiers = ['direction', 'font-family', 'font-size',
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

    return returnValue;
  },

   /**
   * Gets the outer rectangle coordinates of the selction
   * Normalizes data to absolute values with window offsets.
   * Inspired by: stackoverflow.com/questions/6930578
   */
  endPosition: function() {
    var region = this.getRegion();
    return {
      top: region.bottom + window.pageYOffset,
      left: region.right + window.pageYOffset
    };
  },

  /**
   * Inputs just have one square generally, so return it
   * This could be better for textareas
   */
  bottomRect: function() {
    var rects = this.getRegion('getClientRects');

    var bottom;
    for (var i = 0, rect; rect = rects[i]; i++) {
      if (!bottom || rect.bottom > bottom.bottom) {
        bottom = rect;
      }
    }

    if (!bottom) {
      return {};
    }

    var rangePosition = {
      bottom: bottom.bottom + window.pageYOffset,
      right: bottom.right + window.pageXOffset
    };

    return rangePosition;
  },

  /**
   * Inputs just have one square generally, so return it
   * This could be better for textareas
   */
  topRect: function() {
    var rects = this.getRegion('getClientRects');

    var topmost;
    for (var i = 0, rect; rect = rects[i]; i++) {
      if (!topmost || rect.top < topmost.top) {
        topmost = rect;
      }
    }

    if (!topmost) {
      return {};
    }

    var rangePosition = {
      top: topmost.top + window.pageYOffset,
      left: topmost.left + window.pageXOffset
    };

    return rangePosition;
  },

  shrinkRight: function() {
      this.node.selectionEnd--;
  },

  extendRight: function() {
    this.node.selectionEnd++;
  },

  shrinkLeft: function() {
    this.node.selectionStart++;
  },

  extendLeft: function() {
    this.node.selectionStart--;
  }
};/**
 * General range helper functions
 */
function HtmlContentStrategy(node) {
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
    range = this.sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(clipboard.value));
  },

  /**
   * Creates the initial selection
   * This is currently the entire elemtn
   */
  initialSelection: function() {
    window.getSelection().selectAllChildren(this.node);
  },

  /**
   * Returns the topmost rectangle that makes up the selection
   */
  topRect: function() {
    var range = this.sel.getRangeAt(0);
    var rects = range.getClientRects();

    var topmost;
    for (var i = 0, rect; rect = rects[i]; i++) {
      if (!topmost || rect.top < topmost.top) {
        topmost = rect;
      }
    }

    if (!topmost) {
      return {};
    }

    var rangePosition = {
      top: topmost.top + window.pageYOffset,
      left: topmost.left + window.pageXOffset
    };

    return rangePosition;
  },

  /**
   * Returns the bottom rectangle that makes up the selection
   */
  bottomRect: function() {
    var range = this.sel.getRangeAt(0);
    var rects = range.getClientRects();

    var bottom;
    for (var i = 0, rect; rect = rects[i]; i++) {
      if (!bottom || rect.bottom > bottom.bottom) {
        bottom = rect;
      }
    }

    if (!bottom) {
      return {};
    }

    var rangePosition = {
      bottom: bottom.bottom + window.pageYOffset,
      right: bottom.right + window.pageXOffset
    };

    return rangePosition;
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
   * Shrinks the right selection bound
   */
  shrinkRight: function(magnitude) {
    magnitude = magnitude || 'character';

    var curSelected = this.sel + '';
    this.sel.modify('extend', 'left', magnitude);

    if (this.sel + '' == curSelected && magnitude == 'character') {
      this.shrinkRight('word');
    }
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
   * Shrinks the left selection bound
   */
  shrinkLeft: function(magnitude) {
    magnitude = magnitude || 'character';

    var sel = this.sel;

    // modify() works on the focus of the selection
    var endNode = sel.focusNode;
    var endOffset = sel.focusOffset;
    sel.collapse(sel.anchorNode, sel.anchorOffset);

    var curSelected = this.sel + '';
    sel.modify('move', 'forward', magnitude);
    sel.extend(endNode, endOffset);

    if (this.sel + '' == curSelected && magnitude == 'character') {
      this.shrinkLeft('word');
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
