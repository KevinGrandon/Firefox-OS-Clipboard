  if ('ontouchstart' in window) {
    var copyPaste = new TouchClipboard();
  } else {
    var copyPaste = new MouseClipboard();
  }
}());
