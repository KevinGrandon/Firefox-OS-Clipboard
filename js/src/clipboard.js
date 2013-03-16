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
    if (this.clipboard) {
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
