function HtmlInputStrategy(node) {
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

  extendRight: function() {
    this.node.selectionEnd++;
  },

  extendLeft: function() {
    this.node.selectionStart--;
  }
};