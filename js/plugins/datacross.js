(function () {

var
  D = Flotr.DOM,
  E = Flotr.EventAdapter;

Flotr.addPlugin('datacross', {
  options: {
    mode: "",            // => one of null, 'x', 'y' or 'xy'
    color: '#c1c1c1',      // => datacross color
    pointColor: '#00a8f0',
    hideCursor: false,       // => hide the cursor when the datacross is shown,
    drawPoint: false
  },
  callbacks: {
    'flotr:click': function(pos, e) {
      if (this.options.datacross.mode) {
        this.datacross.clearDataCross(pos);
        this.datacross.drawDataCross(pos);
      }
    }
  },

  clearDataCross: function(pos){
    var x, y,
        context = this.octx;
    if(this.datacross.prevXY){
      console.log("hello");
      x = this.datacross.prevXY.x;
      y = this.datacross.prevXY.y;
      context.clearRect(x - 5, y - 5, 10, 10);
    }
  },
  
  /**   
   * Draws the selection box.
   */
  drawDataCross: function(pos) {
    var octx = this.octx,
      options = this.options.datacross,
      plotOffset = this.plotOffset,
      vh = this.datacross.getVH(),
      v = vh.v,
      h = vh.h,
      stack = this.axes.y2.options.stack,
      c = this.hit.closest(pos),
      dataIndex = c.x.dataIndex,
      xvalue = this.data[0].data[dataIndex][0],
      rotate = this.options.rotate,
      x = plotOffset.left + Math.round(rotate ? pos.relX : (this.axes.x.d2p(xvalue) -1)),
      y = plotOffset.top + Math.round(rotate ? (this.axes.x.d2p(xvalue) + plotOffset.left - plotOffset.top) : pos.relY);
    E.fire(this.el, 'flotr:dataIndex', [dataIndex, this.axes.x, this]);
    if (!this.options.rotate && (pos.relX < 0 || pos.relY < 0 || pos.relX > this.plotWidth || (pos.relY > this.plotHeight && !this.axes.y2.options.stack)) ||
        this.options.rotate && (pos.relY < this.plotOffset.left || x > this.canvasHeight || pos.relX < -plotOffset.left + 1 || pos.relY + plotOffset.top > this.canvasWidth)) {

      this.el.style.cursor = null;
      D.removeClass(this.el, 'flotr-datacross');
      D.hide(v);
      D.hide(h);
      return; 
    }
    
    if (options.hideCursor) {
      this.el.style.cursor = 'none';
      D.addClass(this.el, 'flotr-datacross');
    }
    
    if (options.mode.indexOf('v') != -1) {
      if(this.options.rotate){
        v.style.top = y + "px";
      } else {
        v.style.left = x + "px";

      }
    }
    
    if (options.mode.indexOf('h') != -1) {
      var p = Math.round(this.axes.y.d2p(this.getDataIndexValue(dataIndex)));
      if(this.options.rotate){
        h.style.left = (this.canvasHeight - plotOffset.top - 2  - p) + "px";
      } else {
        y = p + this.plotOffset.top + 1;
        h.style.top = y + "px";
      }
    }
    
    if(options.drawPoint){
      var x1 = rotate ? y : x;
      var y1 = rotate ? p + 2 : y;

      octx.save();
      octx.strokeStyle = options.pointColor || options.color;
      octx.lineWidth = 3;
      octx.beginPath();
      octx.arc(x1, y1, 3, 0, 2 * Math.PI, false);
      octx.stroke();
      octx.closePath();
      this.datacross.hideShowVH();
      this.datacross.prevXY = {x:x1, y:y1};
    }
    
  },

  getVH: function(){
    if(!this.datacross.vh){
      var
      v = D.create("div"),
      h = D.create("div"),
      options = this.options.datacross,
      color = options.color,
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
      this.datacross.vh = {v: v,h: h};
      this.datacross.hideShowVH();
    }
    return this.datacross.vh;
  },

  hideShowVH: function(){
    var
    options = this.options.datacross,
    vh = this.datacross.vh,
    v = vh.v,
    h = vh.h;
    
    (options.mode.indexOf("v") == -1) ? D.hide(v) : D.show(v);
    (options.mode.indexOf("h") == -1) ? D.hide(h) : D.show(h);
  }
  
});
})();


