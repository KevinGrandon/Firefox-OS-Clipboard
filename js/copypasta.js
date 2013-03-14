(function initCopyPaste(){

  /**
   * Copy/Paste base class
   */
  function CopyPaste() {

    this.rangeHelper = new RangeHelper();

    this.clipboard = '';

    this.INTERACT_DELAY = 700;
    this.TOUCH_BOUND = 50;

    this.controlsShown = false;

    this.init();
  }

  CopyPaste.prototype = {
    init: function() {
      window.addEventListener(this.START, this.onStart.bind(this));
      window.addEventListener(this.MOVE, this.onMove.bind(this));
      window.addEventListener(this.END, this.onEnd.bind(this));
    },

    onStart: function(e) {
      dump('GOT TOUCH START' + e)

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

      if ( !this.controlsShown && (
          Math.abs(this.startXY.x - xy.x) > this.TOUCH_BOUND ||
          Math.abs(this.startXY.y - xy.y) > this.TOUCH_BOUND) ) {
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
        target.select();
        var sel = window.getSelection();
        var newRange = document.createRange();
        newRange.selectNode(target);
        sel.addRange(newRange);
      } else if (target instanceof HTMLTextAreaElement) {
        target.select();
        var sel = window.getSelection();
        var newRange = document.createRange();
        newRange.selectNode(target);
        sel.addRange(newRange);
      } else {
        window.getSelection().selectAllChildren(target);
      }

      // Get the region of the selection
      var targetArea = target.getBoundingClientRect();
      var leftKnobPos = {
        top: targetArea.top + window.pageYOffset,
        left: targetArea.left + window.pageXOffset
      };

      var rightKnobPos = this.rangeHelper.outerRect();

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

      this.optionsEl.addEventListener(this.START, this)

      document.body.appendChild(this.optionsEl);
      this.positionMenu();
    },

    positionMenu: function() {

      var top = parseInt(this.leftKnob.style.top, 10);
      var left = parseInt(this.leftKnob.style.left, 10);

      this.optionsEl.style.top = top + 'px';
      this.optionsEl.style.left = left + 'px';
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
      if (action == 'copy') {
        this.clipboard = sel.toString();
      } else if (action == 'cut') {
        this.clipboard = sel.toString();
        range = sel.getRangeAt(0);
        range.deleteContents();
      } else if (action == 'paste') {
        range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(this.clipboard));
      }

      this.teardown();
    },

    /**
     * Removes the Copy/Paste UI
     */
    teardown: function() {

      if (!this.controlsShown) {
        return;
      }

      clearTimeout(this.interactTimeout);

      if (this.leftKnob) {
        document.body.removeChild(this.leftKnob);
        delete this.leftKnob;
      }

      if (this.rightKnob) {
        document.body.removeChild(this.rightKnob);
        delete this.rightKnob;
      }

      this.controlsShown = false;

      document.body.removeChild(this.optionsEl);
    },

    /**
     * Creates a left or right knob
     */
    createKnob: function(name, pos) {
      var knob = name + 'Knob'
      if (this[knob]) {
        this[knob].parentNode.removeChild(this[knob]);
      }

      this[knob] = document.createElement('div');
      this[knob].className = 'knob ' + name;
      document.body.appendChild(this[knob]);

      this[knob].style.left = pos.left + 'px';
      this[knob].style.top = pos.top + 'px';

      this[knob].addEventListener(this.START, function(origEvt) {

        origEvt.stopImmediatePropagation();
        origEvt.preventDefault();

        var mover = this.getKnobMover(this[knob]);
        window.addEventListener(this.MOVE, mover);
        window.addEventListener(this.END, function() {
          window.removeEventListener(this.MOVE, mover);
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

        var thisPosition = this.rangeHelper.bottomRect();

        // Break if we meet the word, or did not move on this iteration
        if (thisPosition.bottom == lastPosition.bottom &&
          thisPosition.right == lastPosition.right) {
          break;
        } 
        if ( direction == 'right' &&
          thisPosition.bottom > xy.y &&
          thisPosition.right > xy.x) {
          break;
        } else if ( direction == 'left' &&
          thisPosition.bottom < xy.y &&
          thisPosition.right < xy.x) {
          break;
        }

        var selection = window.getSelection();
        selection.modify('extend', direction, modification);

        lastPosition = thisPosition;
      }
    },

    /**
     * Logic to expand/collapse the selection
     * when the left knob is moved.
     */
    leftKnobHandler: function(xy, el) {
      var direction;

      var thisPosition = this.rangeHelper.topRect();

      if (xy.y < thisPosition.top ||
          xy.x < thisPosition.left) {
        direction = 'left';
      } else {
        direction = 'right';
      }

      var modified = false;

      while (true) {

        thisPosition = this.rangeHelper.topRect();
        // Break if we meet the word, or did not move on this iteration
        if ( direction == 'right' && (
          thisPosition.top > xy.y &&
          thisPosition.left > xy.x) ) {
          break;
        } else if ( direction == 'left' &&
          thisPosition.top < xy.y &&
          thisPosition.left < xy.x) {
          break;
        }

        var range = window.getSelection().getRangeAt(0);
        var previous;
        var offset = 0;

        if (direction == 'left') {
            // Detect if selection is backwards
            var sel = window.getSelection();
            var range = document.createRange();
            range.setStart(sel.anchorNode, sel.anchorOffset);
            range.setEnd(sel.focusNode, sel.focusOffset);
            var backwards = range.collapsed;
            range.detach();

            // modify() works on the focus of the selection
            var endNode = sel.focusNode, endOffset = sel.focusOffset;
            sel.collapse(sel.anchorNode, sel.anchorOffset);

            var selDirection;
            if (backwards) {
                selDirection = 'forward';
            } else {
                selDirection = 'backward';
            }

            sel.modify("move", selDirection, "word");
            sel.extend(endNode, endOffset);
        } else {
          var sel = window.getSelection();
          var range = sel.getRangeAt(0);
          try {
            range.setStart(sel.anchorNode, sel.anchorOffset+1);
          } catch(e) {
            console.log('Couldn\'t get element')
            break;
          }
        }
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
  };

  /**
   * General range helper functions
   */
  function RangeHelper() {
  }

  RangeHelper.prototype = {

    get sel() {
      return window.getSelection();
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
    outerRect: function() {
      var range = this.sel.getRangeAt(0).cloneRange();
      range.collapse(false);
      var dummy = document.createElement("span");
      range.insertNode(dummy);

      var rect = dummy.getBoundingClientRect();
      var coords = {
        top: rect.top + window.pageYOffset,
        left: rect.left + window.pageXOffset
      };
      dummy.parentNode.removeChild(dummy);

      return coords;
    }
  };

  function MouseCopyPaste() {
    this.START = 'mousedown';
    this.MOVE = 'mousemove';
    this.END = 'mouseup';
    CopyPaste.apply(this);
  }

  MouseCopyPaste.prototype = {
    __proto__: CopyPaste.prototype,

    /**
     * Extracts the X/Y positions for a touch event
     */
    coords: function(e) {
      return {
        x: e.pageX,
        y: e.pageY,
      };
    }
  };

  function TouchCopyPaste() {
    this.START = 'touchstart';
    this.MOVE = 'touchmove';
    this.END = 'touchend';
    CopyPaste.apply(this);
  }

  TouchCopyPaste.prototype = {
    __proto__: CopyPaste.prototype,

    /**
     * Extracts the X/Y positions for a touch event
     */
    coords: function(e) {
      var touch = e.originalEvent.touches[0];

      return {
        x: touch.pageX,
        y: touch.pageY
      };
    }
  };

  if ("ontouchstart" in window) {
    var copyPaste = new TouchCopyPaste();
  } else {
    var copyPaste = new MouseCopyPaste();
  }
}());