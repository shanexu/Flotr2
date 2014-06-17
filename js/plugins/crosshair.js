(function () {

var D = Flotr.DOM;

Flotr.addPlugin('crosshair', {
  options: {
    mode: null,            // => one of null, 'x', 'y' or 'xy'
    color: '#FF0000',      // => crosshair color
    hideCursor: true       // => hide the cursor when the crosshair is shown
  },
  callbacks: {
    'flotr:mousemove': function(e, pos) {
      if (this.options.crosshair.mode) {
        this.crosshair.clearCrosshair();
        this.crosshair.drawCrosshair(pos);
      }
    }
  },
  /**   
   * Draws the selection box.
   */
  drawCrosshair: function(pos) {
    var octx = this.octx,
      options = this.options.crosshair,
      plotOffset = this.plotOffset,
      x = plotOffset.left + Math.round(pos.relX) + 0.5,
      y = plotOffset.top + Math.round(pos.relY) + 0.5;

    if (pos.relX < 0 || pos.relY < 0 || pos.relX > this.plotWidth || (pos.relY > this.plotHeight && !this.axes.y2.options.stack)) {     
      this.el.style.cursor = null;
      D.removeClass(this.el, 'flotr-crosshair');
      return; 
    }
    
    if (options.hideCursor) {
      this.el.style.cursor = 'none';
      D.addClass(this.el, 'flotr-crosshair');
    }
    
    octx.save();
    octx.strokeStyle = options.color;
    octx.lineWidth = 1;
    octx.beginPath();
    
    if (options.mode.indexOf('x') != -1) {
      octx.moveTo(x, plotOffset.top);
      octx.lineTo(x, plotOffset.top + this.axes.y2.options.stack ? this.canvasHeight : this.plotHeight);
    }
    
    if (options.mode.indexOf('y') != -1) {
      octx.moveTo(plotOffset.left, y);
      octx.lineTo(plotOffset.left + this.plotWidth, y);
    }
    
    octx.stroke();
    octx.restore();
  },
  /**
   * Removes the selection box from the overlay canvas.
   */
  clearCrosshair: function() {

    var
      plotOffset = this.plotOffset,
      position = this.lastMousePos,
      context = this.octx,
      x = plotOffset.left + Math.round(position.relX) + 0.5,
      y = plotOffset.top + Math.round(position.relY) + 0.5;

    if (position) {
      context.clearRect(
        x - 2.5,
        plotOffset.top,
        5,
        this.axes.y2.options.stack ? this.canvasHeight - plotOffset.top : this.plotHeight + 1
      );
      context.clearRect(
        plotOffset.left,
        y - 2.5,
        this.plotWidth + 1,
        5
      );
    }
  }
});
})();
