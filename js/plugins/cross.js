(function () {

var
  D = Flotr.DOM,
  E = Flotr.EventAdapter;

Flotr.addPlugin('cross', {
  options: {
    mode: "",            // => one of null, 'x', 'y' or 'xy'
    color: '#c1c1c1',      // => cross color
    hideCursor: false       // => hide the cursor when the cross is shown
  },
  callbacks: {
    'flotr:click': function(pos, e) {
      if (this.options.cross.mode) {
        this.cross.drawCross(pos);
      }
    }
  },
  /**   
   * Draws the selection box.
   */
  drawCross: function(pos) {

    var octx = this.octx,
      options = this.options.cross,
      plotOffset = this.plotOffset,
      vh = this.cross.getVH(),
      v = vh.v,
      h = vh.h,
      stack = this.axes.y2.options.stack,
      c = this.hit.closest(pos),
      dataIndex = c.x.dataIndex,
      rotate = this.options.rotate,
      x = plotOffset.left + Math.round(rotate ? pos.relX : (this.axes.x.d2p(dataIndex) -1)),
      y = plotOffset.top + Math.round(rotate ? (this.axes.x.d2p(dataIndex) + plotOffset.left - plotOffset.top) : pos.relY);

    E.fire(this.el, 'flotr:dataIndex', [dataIndex, this.axes.x, this]);
    this.cross.hideShowVH();
    if (!this.options.rotate && (pos.relX < 0 || pos.relY < 0 || pos.relX > this.plotWidth || (pos.relY > this.plotHeight && !this.axes.y2.options.stack)) ||
        this.options.rotate && (pos.relY < this.plotOffset.left || x > this.canvasHeight || pos.relX < -plotOffset.left + 1 || pos.relY + plotOffset.top > this.canvasWidth)) {

      this.el.style.cursor = null;
      D.removeClass(this.el, 'flotr-cross');
      D.hide(v);
      D.hide(h);
      return; 
    }
    
    if (options.hideCursor) {
      this.el.style.cursor = 'none';
      D.addClass(this.el, 'flotr-cross');
    }
    
    if (options.mode.indexOf('v') != -1) {
      if(this.options.rotate){
        //TODO
        v.style.top = y + "px";
      } else {
        v.style.left = x + "px";
      }
    }
    
    if (options.mode.indexOf('h') != -1) {
      if(this.options.rotate){
        h.style.left = x + "px";
      } else {
        h.style.top = y + "px";
      }
    }
  },

  getVH: function(){
    if(!this.cross.vh){
      var
      v = D.create("div"),
      h = D.create("div"),
      options = this.options.cross,
      color = this.cross.options.color,
      rotate = this.options.rotate,
      stack = this.axes.y2.options.stack;
      if(rotate){
        D.setStyles(v, {
          "borderTop": "1px solid "+ color,
          "position": "absolute",
          "width": (this.canvasHeight - this.plotOffset.top - (this.axes.y2.options.stack?1:this.plotOffset.bottom))+"px",
          "height": 0,
          "top": this.plotOffset.left + "px",
          "left": (stack ? 1 : this.plotOffset.bottom) + "px"
        });

        D.setStyles(h, {
          "borderLeft": "1px solid "+ color,
          "position": "absolute",
          "height": this.plotWidth+"px",
          "width": 0,
          "left": (stack ? 1 : this.plotOffset.bottom) + "px",
          "top": this.plotOffset.left + "px"
        });
      } else {
        D.setStyles(v, {
          "borderLeft": "1px solid "+ color,
          "position": "absolute",
          "width": 0,
          "height": (this.canvasHeight - this.plotOffset.top - (stack?1:this.plotOffset.bottom))+"px"
        });

        D.setStyles(h, {
          "borderTop": "1px solid "+ color,
          "position": "absolute",
          "height": 0,
          "width": this.plotWidth+"px",
          "left": this.plotOffset.left+"px"
        });
      }
      
      D.insert(this.el, v);
      D.insert(this.el, h);
      this.cross.vh = {v: v,h: h};
      this.cross.hideShowVH();
    }
    return this.cross.vh;
  },

  hideShowVH: function(){
    var
    options = this.options.cross,
    vh = this.cross.vh,
    v = vh.v,
    h = vh.h;
    
    (options.mode.indexOf("v") == -1) ? D.hide(v) : D.show(v);
    (options.mode.indexOf("h") == -1) ? D.hide(h) : D.show(h);
  }
  
});
})();


