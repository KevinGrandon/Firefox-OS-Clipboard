function HtmlInputStrategy(node) {
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
};