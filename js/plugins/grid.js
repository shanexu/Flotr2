(function () {

var E = Flotr.EventAdapter,
    _ = Flotr._;

Flotr.addPlugin('graphGrid', {

  callbacks: {
    'flotr:beforedraw' : function () {
      this.graphGrid.drawGrid();
    },
    'flotr:afterdraw' : function () {
      this.graphGrid.drawOutline();
    },
    'flotr:beforedrawy2axis' : function () {
      this.graphGrid.drawGridY2Axis();
    }
  },

  drawGrid: function(){

    var
      ctx = this.ctx,
      options = this.options,
      grid = options.grid,
      verticalLines = grid.verticalLines,
      horizontalLines = grid.horizontalLines,
      minorVerticalLines = grid.minorVerticalLines,
      minorHorizontalLines = grid.minorHorizontalLines,
      plotHeight = this.plotHeight,
      plotWidth = this.plotWidth,
      scope = {ctx:ctx, plotWidth: plotWidth, plotHeight: plotHeight, top: 0},
      a, v, i, j;
        
    if(verticalLines || minorVerticalLines || 
           horizontalLines || minorHorizontalLines){
      E.fire(this.el, 'flotr:beforegrid', [this.axes.x, this.axes.y, options, this]);
    }
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = grid.tickColor;
    
    var circularHorizontalTicks = function(ticks) {
      for(i = 0; i < ticks.length; ++i){
        var ratio = ticks[i].v / a.max;
        for(j = 0; j <= sides; ++j){
          ctx[j === 0 ? 'moveTo' : 'lineTo'](
            Math.cos(j*coeff+angle)*radius*ratio,
            Math.sin(j*coeff+angle)*radius*ratio
          );
        }
      }
    };

    if (grid.circular) {
      ctx.translate(this.plotOffset.left+plotWidth/2, this.plotOffset.top+plotHeight/2);
      var radius = Math.min(plotHeight, plotWidth)*options.radar.radiusRatio/2,
          sides = this.axes.x.ticks.length,
          coeff = 2*(Math.PI/sides),
          angle = -Math.PI/2;
      
      // Draw grid lines in vertical direction.
      ctx.beginPath();
      
      a = this.axes.y;

      if(horizontalLines){
        circularHorizontalTicks(a.ticks);
      }
      if(minorHorizontalLines){
        circularHorizontalTicks(a.minorTicks);
      }
      
      if(verticalLines){
        _.times(sides, function(i){
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(i*coeff+angle)*radius, Math.sin(i*coeff+angle)*radius);
        });
      }
      ctx.stroke();
    }
    else {
      ctx.translate(this.plotOffset.left, this.plotOffset.top);
  
      // Draw grid background, if present in options.
      if(grid.backgroundColor){
        ctx.fillStyle = this.processColor(grid.backgroundColor, {x1: 0, y1: 0, x2: plotWidth, y2: plotHeight});
        ctx.fillRect(0, 0, plotWidth, plotHeight);
      }
      
      ctx.beginPath();

      a = this.axes.x;
      if (verticalLines)        this.graphGrid.drawGridLines(a, grid, a.ticks, ctx, this.graphGrid.drawVerticalLines(scope));
      if (minorVerticalLines)   this.graphGrid.drawGridLines(a, grid, a.minorTicks, ctx, this.graphGrid.drawVerticalLines(scope));      
      
      a = this.axes.y;
      if (horizontalLines)      this.graphGrid.drawGridLines(a, grid, a.ticks, ctx, this.graphGrid.drawHorizontalLines(scope));
      if (minorHorizontalLines) this.graphGrid.drawGridLines(a, grid, a.minorTicks, ctx, this.graphGrid.drawHorizontalLines(scope));
      
      ctx.stroke();
      ctx.strokeStyle = grid.specialColor;
      if(ctx.setLineDash){
        ctx.setLineDash(grid.specialLineDash);
      }
      ctx.beginPath();
      a = this.axes.x;
      this.graphGrid.drawGridLines(a, grid, a.specialTicks, ctx, this.graphGrid.drawVerticalLines(scope));
      a = this.axes.y;
      this.graphGrid.drawGridLines(a, grid, a.specialTicks, ctx, this.graphGrid.drawHorizontalLines(scope));
      ctx.stroke();
    }
    
    ctx.restore();
    if(verticalLines || minorVerticalLines ||
       horizontalLines || minorHorizontalLines){
      E.fire(this.el, 'flotr:aftergrid', [this.axes.x, this.axes.y, options, this]);
    }
  },

  drawGridY2Axis: function(){

    var
      ctx = this.ctx,
      options = this.options,
      grid = options.grid,
      verticalLines = grid.verticalLines,
      horizontalLines = grid.horizontalLines,
      minorVerticalLines = grid.minorVerticalLines,
      minorHorizontalLines = grid.minorHorizontalLines,
      plotHeight = this.plotHeight,
      plotWidth = this.plotWidth,
      scope = {ctx:ctx, plotWidth: plotWidth, plotHeight: plotHeight, top: this.plotHeight - this.axes.y2.canvasHeight + 2},
      a, v, i, j;
        
    if(verticalLines || minorVerticalLines || 
           horizontalLines || minorHorizontalLines){
      E.fire(this.el, 'flotr:beforegridy2axis', [this.axes.x, this.axes.y2, options, this]);
    }
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = grid.tickColor;
    
    ctx.beginPath();

    a = this.axes.x;
    if (verticalLines)        this.graphGrid.drawGridLines(a, grid, a.ticks, ctx, this.graphGrid.drawVerticalLines(scope));
    if (minorVerticalLines)   this.graphGrid.drawGridLines(a, grid, a.minorTicks, ctx, this.graphGrid.drawVerticalLines(scope));

    a = this.axes.y2;
    if(a.options.stack){
      if (horizontalLines)      this.graphGrid.drawGridLines(a, grid, a.ticks, ctx, this.graphGrid.drawHorizontalLines(scope));
      if (minorHorizontalLines) this.graphGrid.drawGridLines(a, grid, a.minorTicks, ctx, this.graphGrid.drawHorizontalLines(scope));
    }
    
    ctx.stroke();
    
    ctx.strokeStyle = grid.specialColor;
    if(ctx.setLineDash){
      ctx.setLineDash(grid.specialLineDash);
    }
    ctx.beginPath();
    a = this.axes.x;
    this.graphGrid.drawGridLines(a, grid, a.specialTicks, ctx, this.graphGrid.drawVerticalLines(scope));
    a = this.axes.y2;
    this.graphGrid.drawGridLines(a, grid, a.specialTicks, ctx, this.graphGrid.drawHorizontalLines(scope));
    ctx.stroke();
    
    ctx.restore();
    if(verticalLines || minorVerticalLines ||
       horizontalLines || minorHorizontalLines){
      E.fire(this.el, 'flotr:aftergridy2axis', [this.axes.x, this.axes.y2, options, this]);
    }
  },

  drawGridLines: function(axis, grid, ticks, ctx, callback) {
    _.each(_.pluck(ticks, 'v'), function(v){
      // Don't show lines on upper and lower bounds.
      if ((v <= axis.min || v >= axis.max) || 
          (v == axis.min || v == axis.max) && grid.outlineWidth)
        return;
      callback(Math.floor(axis.d2p(v)) + ctx.lineWidth/2);
    });
  },

  drawVerticalLines: function(scope) {
    var
      ctx = scope.ctx,
      top = scope.top,
      plotHeight = scope.plotHeight;
    return function(x){
      ctx.moveTo(x, top);
      ctx.lineTo(x, plotHeight);
    };
  },

  drawHorizontalLines: function(scope) {
    var
      ctx = scope.ctx,
      plotWidth = scope.plotWidth;
    return function(y){
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
    };
  },

  drawOutline: function(){
    var
      that = this,
      options = that.options,
      grid = options.grid,
      outline = grid.outline,
      ctx = that.ctx,
      backgroundImage = grid.backgroundImage,
      plotOffset = that.plotOffset,
      leftOffset = plotOffset.left,
      topOffset = plotOffset.top,
      plotWidth = that.plotWidth,
      plotHeight = that.plotHeight,
      v, img, src, left, top, globalAlpha;
    
    if (!grid.outlineWidth) return;
    
    ctx.save();
    
    if (grid.circular) {
      ctx.translate(leftOffset + plotWidth / 2, topOffset + plotHeight / 2);
      var radius = Math.min(plotHeight, plotWidth) * options.radar.radiusRatio / 2,
          sides = this.axes.x.ticks.length,
          coeff = 2*(Math.PI/sides),
          angle = -Math.PI/2;
      
      // Draw axis/grid border.
      ctx.beginPath();
      ctx.lineWidth = grid.outlineWidth;
      ctx.strokeStyle = grid.color;
      ctx.lineJoin = 'round';
      
      for(i = 0; i <= sides; ++i){
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(i*coeff+angle)*radius, Math.sin(i*coeff+angle)*radius);
      }
      //ctx.arc(0, 0, radius, 0, Math.PI*2, true);

      ctx.stroke();
    }
    else {
      ctx.translate(leftOffset, topOffset);
      
      // Draw axis/grid border.
      var lw = grid.outlineWidth,
          orig = 0.5-lw+((lw+1)%2/2),
          lineTo = 'lineTo',
          moveTo = 'moveTo';
      ctx.lineWidth = lw;
      ctx.strokeStyle = grid.color;
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(orig, orig);
      plotWidth = plotWidth - (lw / 2) % 1;
      plotHeight = plotHeight + lw / 2;
      ctx[outline.indexOf('n') !== -1 ? lineTo : moveTo](plotWidth, orig);
      ctx[outline.indexOf('e') !== -1 ? lineTo : moveTo](plotWidth, plotHeight);
      ctx[outline.indexOf('s') !== -1 ? lineTo : moveTo](orig, plotHeight);
      ctx[outline.indexOf('w') !== -1 ? lineTo : moveTo](orig, orig);

      if(this.axes.y2.options.stack){
        ctx.translate(-leftOffset, -topOffset);
        ctx.translate(leftOffset, this.canvasHeight - this.axes.y2.canvasHeight);
        plotHeight = this.axes.y2.length + lw / 2;
        ctx.moveTo(orig, orig);
        ctx[outline.indexOf('n') !== -1 ? lineTo : moveTo](plotWidth, orig);
        ctx[outline.indexOf('e') !== -1 ? lineTo : moveTo](plotWidth, plotHeight);
        ctx[outline.indexOf('s') !== -1 ? lineTo : moveTo](orig, plotHeight);
        ctx[outline.indexOf('w') !== -1 ? lineTo : moveTo](orig, orig);
        ctx.translate(-leftOffset, -this.canvasHeight + this.axes.y2.canvasHeight);
        ctx.translate(leftOffset, topOffset);
      }
      ctx.stroke();
      ctx.closePath();
    }
    
    ctx.restore();

    if (backgroundImage) {

      src = backgroundImage.src || backgroundImage;
      left = (parseInt(backgroundImage.left, 10) || 0) + plotOffset.left;
      top = (parseInt(backgroundImage.top, 10) || 0) + plotOffset.top;
      img = new Image();

      img.onload = function() {
        ctx.save();
        if (backgroundImage.alpha) ctx.globalAlpha = backgroundImage.alpha;
        ctx.globalCompositeOperation = 'destination-over';
        ctx.drawImage(img, 0, 0, img.width, img.height, left, top, plotWidth, plotHeight);
        ctx.restore();
      };

      img.src = src;
    }
  }
});

})();
