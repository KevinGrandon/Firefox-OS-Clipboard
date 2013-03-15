/**
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

  shrinkRight: function() {
    this.sel.modify('extend', 'left', 'word');
  },

  extendRight: function() {
    this.sel.modify('extend', 'right', 'word');
  },

  shrinkLeft: function() {
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);

    range.setStart(sel.anchorNode, sel.anchorOffset + 1);
  },

  extendLeft: function() {
    // Detect if selection is backwards
    var sel = window.getSelection();
    var range = document.createRange();
    range.setStart(sel.anchorNode, sel.anchorOffset);
    range.setEnd(sel.focusNode, sel.focusOffset);
    var backwards = range.collapsed;
    range.detach();

    // modify() works on the focus of the selection
    var endNode = sel.focusNode;
    var endOffset = sel.focusOffset;
    sel.collapse(sel.anchorNode, sel.anchorOffset);

    var selDirection;
    if (backwards) {
        selDirection = 'forward';
    } else {
        selDirection = 'backward';
    }

    sel.modify('move', selDirection, 'word');
    sel.extend(endNode, endOffset);
  }

};