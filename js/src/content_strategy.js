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
   * Gets fthe outer rectangle coordinates of the selction
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

};