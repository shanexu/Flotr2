(function () {

var
  D = Flotr.DOM,
  E = Flotr.EventAdapter;

Flotr.addPlugin('datacross', {
  options: {
    mode: '',            // => one of null, 'x', 'y' or 'xy'
    color: '#c1c1c1',      // => datacross color
    pointColor: '#00a8f0',
    hideCursor: false,       // => hide the cursor when the datacross is shown,
    drawPoint: false
  },
  callbacks: {
    'flotr:mousedown': function(e, pos){
      var self = this;
      self.datacross.state = 'mousedown';
      self.datacross.timeout = setTimeout(function(){
        self.datacross.state = 'datacross';
        if (self.options.datacross.mode) {
          self.datacross.clearDataCross(pos);
          self.datacross.drawDataCross(pos);
        }
      }, 500);
    },
    'flotr:mouseup': function(e, pos){
      this.datacross.state = 'mouseup';
      clearTimeout(this.datacross.timeout);
    },
    'flotr:mousemove': function(e, pos){
      if(this.datacross.state === 'datacross'){
        if (this.options.datacross.mode) {
          this.datacross.clearDataCross(pos);
          this.datacross.drawDataCross(pos);
        }
      } else {
        clearTimeout(this.datacross.timeout);
        this.datacross.state = null;
      }
    }
  },

  clearDataCross: function(pos){
    var x, y,
        context = this.octx;
    if(this.datacross.prevXY){
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
      yvalue = this.getDataIndexValue(dataIndex),
      x = plotOffset.left + Math.round(this.axes.x.d2p(xvalue) -1),
      y = plotOffset.top + Math.round(pos.relY),
      p = Math.round(this.axes.y.d2p(this.getDataIndexValue(dataIndex)));
    if (pos.relX < 0 || pos.relY < 0 || pos.relX > this.plotWidth || (pos.relY > this.plotHeight && !this.axes.y2.options.stack)) {
      this.el.style.cursor = null;
      D.removeClass(this.el, 'flotr-datacross');
      D.hide(v);
      D.hide(h);
      E.fire(this.el, 'flotr:dataIndex', [{dataIndex: -1}, this]);
      return; 
    }
    
    if (options.hideCursor) {
      this.el.style.cursor = 'none';
      D.addClass(this.el, 'flotr-datacross');
    }
    
    if (options.mode.indexOf('v') != -1) {
      v.style.left = x + 'px';
      v.style.top = this.plotOffset.top + 'px';
    }
    
    if (options.mode.indexOf('h') != -1) {
      y = p + this.plotOffset.top + 1;
      h.style.top = y + "px";
    }
    
    if(options.drawPoint){
      var x1 = x;
      var y1 = y;

      octx.save();
      octx.strokeStyle = options.pointColor || options.color;
      octx.lineWidth = 3;
      octx.beginPath();
      octx.arc(x1, y1, 3, 0, 2 * Math.PI, false);
      octx.stroke();
      octx.closePath();
      this.datacross.prevXY = {x:x1, y:y1};
    }

    this.datacross.hideShowVH();
    E.fire(this.el, 'flotr:dataIndex', [{dataIndex: dataIndex, x:x, y:y, xvalue: xvalue, yvalue: yvalue, datum: this.data[0].data[dataIndex], data: this.data[0]}, this]);
  },

  getVH: function(){
    if(!this.datacross.vh){
      var
      v = D.create("div"),
      h = D.create("div"),
      options = this.options.datacross,
      color = options.color,
      stack = this.axes.y2.options.stack;

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

