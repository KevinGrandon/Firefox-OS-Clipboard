/**
 * Copy/Paste base class
 */
function Clipboard() {
  this.clipboard = '';

  this.MENU_ADJUST_TOP = -30;
  this.MENU_ADJUST_LEFT = 35;
  this.KNOB_SIZE = 30;

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

    if (!this.startXY) {
      return;
    }

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
    var targetArea = target.getBoundingClientRect();
    var leftKnobPos = {
      top: targetArea.top + window.pageYOffset - 15,
      left: targetArea.left + window.pageXOffset - 20
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
    this[knob].innerHTML = '<span></span>';
    document.body.appendChild(this[knob]);

    this[knob].style.left = pos.left + 'px';
    this[knob].style.top = pos.top + 'px';

    this[knob].addEventListener(this.START, function(origEvt) {

      this[knob].classList.add('moving');
      this.optionsEl.classList.add('moving');

      origEvt.stopImmediatePropagation();
      origEvt.preventDefault();

      var mover = this.getKnobMover(name);
      window.addEventListener(this.MOVE, mover);
      window.addEventListener(this.END, function() {
        window.removeEventListener(this.MOVE, mover);
        if (this[knob]) {
          this[knob].classList.remove('moving');
        }
        if (this.optionsEl) {
          this.optionsEl.classList.remove('moving');
        }
      }.bind(this));
    }.bind(this));
  },

  /**
   * Logic to expand/collapse the selection
   * when the right knob is moved.
   */
  rightKnobHandler: function(xy, el) {
    var direction;

    var thisPosition = this.strategy.bottomRect();

    if (xy.y > thisPosition.bottom ||
        xy.x > thisPosition.right) {
      direction = 'right';
    } else {
      direction = 'left';
    }

    var lastPosition = {};
    var buffer = 10;
    while (true) {

      thisPosition = this.strategy.bottomRect();

      // Break if we meet the word, or did not move on this iteration
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
    var buffer = 10;
    while (true) {

      thisPosition = this.strategy.topRect();
      // Break if we meet the word, or did not move on this iteration
      if (thisPosition.top == lastPosition.top &&
        thisPosition.left == lastPosition.left) {
        break;
      } else if (direction == 'right' && (
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
   * @param {String} knob name (left or right)
   */
  getKnobMover: function(name) {
    var self = this;
    var el = this[name + 'Knob'];

    return function(evt) {
      evt.stopImmediatePropagation();

      var xy = self.coords(evt);

      // Dynamically call leftKnobHandler or rightKnobHandler
      self[name + 'KnobHandler'](xy, el);

      el.style.left = (xy.x - self.KNOB_SIZE/2) + 'px';
      el.style.top = (xy.y - self.KNOB_SIZE/2) + 'px';

      self.positionMenu();
    }
  }
};