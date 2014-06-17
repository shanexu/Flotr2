(function () {

var
  D = Flotr.DOM,
  E = Flotr.EventAdapter,
  _ = Flotr._,
  x0, y0;

Flotr.addPlugin('datacursor', {
  options: {
  },
  callbacks: {
    'flotr:mousedown':function(e, pos){
      x0 = pos.absX;
      y0 = pos.absY;
    },
    
    'flotr:mousemove':function(e, pos){
      var
      oe = e.originalEvent || e,
      x1 = pos.absX,
      y1 = pos.absY,
      dx = Math.round((x1 - x0) / this.axes.x.scale * 1.5),
      adx = Math.abs(dx);
      
      if(oe.type != "mousedown" && oe.type != "touchmove") return;

      if(adx >= 1 && this.datacross.state !== 'datacross'){
        x0 = x1;
        y0 = y1;
        E.fire(this.el, "flotr:datacursor", [-dx, this]);
      }
    }
  }
});
})();












