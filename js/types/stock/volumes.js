/* vim: set et sw=2: */
Flotr.addType('stock_volumes', {
/** Stock_Volumes **/
  options: {
    shadowSize: 0,
    show: false,           // => setting to true will show bars, false will hide
    lineWidth: 1,          // => in pixels
    barWidth: 0.6,           // => in units of the x axis
	upFillColor: '#ff413a',// => up sticks fill color
    downFillColor: '#15a645',// => down sticks fill color
    fillOpacity: 1.0,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill,
    forceFill: false
  },

  draw : function (options) {
    var
      context = options.context;

    this.current += 1;

    context.save();
    context.lineJoin = 'miter';
    // @TODO linewidth not interpreted the right way.
    context.lineWidth = options.lineWidth;
    context.strokeStyle = options.color;
    
    this.plot(options);

    context.restore();
  },

  plot : function (options) {

    var
      data            = options.data,
      context         = options.context,
      shadowSize      = options.shadowSize,
      lineWidth       = options.lineWidth,
      forceFill       = options.forceFill,
      yi              = options.yi,
      prevClose       = options.prevClose,
      i, geometry, left, top, width, height,
      datum, open, close, color, datum0, open0, close0, fill;
debugger;
    if (data.length < 1) return;

    for (i = 0; i < data.length; i++) {

      geometry = this.getBarGeometry(data[i][0], data[i][yi], options);
      if (geometry === null) continue;

      left    = geometry.left;
      top     = geometry.top;
      width   = geometry.width;
      height  = geometry.height;
      datum   = data[i];
      open    = datum[1];
      close   = datum[4];
      datum0  = data[i-1];

      if(prevClose !== undefined){
        var prev = datum0 ? datum0[1] : prevClose;
        color = options[prev > datum[1] ? 'downFillColor' : 'upFillColor'];
        
      } else {
        color = options[open > close ? 'downFillColor' : 'upFillColor'];
      }

      if (shadowSize) {
        context.save();
        context.fillStyle = 'rgba(0,0,0,0.05)';
        context.fillRect(left + shadowSize, top + shadowSize, width, height);
        context.restore();
      }
      if(datum0 && prevClose === undefined){
        open0 = datum0[1];
        close0 = datum0[4];
        fill = open > close ? ( close <= close0 && close <= open0 ) : (close >= close0 && close >= open0);
      }
      if (forceFill || fill) {
        context.save();
        context.globalAlpha = options.fillOpacity;
        context.fillStyle = color;
        context.fillRect(left, top + lineWidth, width, height);
        context.restore();
      }
      if (options.lineWidth) {
        context.save();
        context.strokeStyle = color;
        context.strokeRect(left, top + lineWidth, width, height);
        context.restore();
      }
    }
  },

  getBarGeometry : function (x, y, options) {

    var
      barWidth      = options.barWidth,
      lineWidth     = options.lineWidth,
      bisection     = barWidth / 2,
      xScale        = options.xScale,
      yScale        = options.yScale,
      xValue        = x,
      yValue        = y,
      left, right, top, bottom;

    left    = xScale(xValue - bisection);
    right   = xScale(xValue + bisection);
    top     = yScale(yValue);
    bottom  = yScale(0);

    // TODO for test passing... probably looks better without this
    if (bottom < 0) bottom = 0;

    // TODO Skipping...
    // if (right < xa.min || left > xa.max || top < ya.min || bottom > ya.max) continue;

    return (x === null || y === null) ? null : {
      x         : xValue,
      y         : yValue,
      xScale    : xScale,
      yScale    : yScale,
      top       : top,
      left      : Math.min(left, right) ,
      width     : Math.abs(right - left),
      height    : bottom - top
    };
  },

  hit : function (options) {
    var
      data = options.data,
      args = options.args,
      mouse = args[0],
      n = args[1],
      x = options.xInverse(mouse.relX),
      y = options.yInverse(mouse.relY),
      hitGeometry = this.getBarGeometry(x, y, options),
      width = hitGeometry.width / 2,
      left = hitGeometry.left,
      height = hitGeometry.y,
      yi = options.yi,
      geometry, i;

    for (i = data.length; i--;) {
      geometry = this.getBarGeometry(data[i][0], data[i][yi], options);
      if (
        // Height:
        (
          // Positive Bars:
          (height > 0 && height < geometry.y) ||
          // Negative Bars:
          (height < 0 && height > geometry.y)
        ) &&
        // Width:
        (Math.abs(left - geometry.left) < width)
      ) {
        n.x = data[i][0];
        n.y = data[i][yi];
        n.index = i;
        n.seriesIndex = options.index;
      }
    }
  },

  drawHit : function (options) {

    var
      context     = options.context,
      args        = options.args,
      lineWidth   = options.lineWidth,
      geometry    = this.getBarGeometry(args.x, args.y, options),
      left        = geometry.left,
      top         = geometry.top,
      width       = geometry.width,
      height      = geometry.height;

    context.save();
    context.strokeStyle = options.color;
    context.lineWidth = lineWidth * 2,

    // Draw highlight
    context.beginPath();
    
    context.moveTo(left, top + height);
    context.lineTo(left, top);
    context.lineTo(left + width, top);
    context.lineTo(left + width, top + height);

    context.stroke();
    
    context.closePath();

    context.restore();
  },

  clearHit: function (options) {
    var
      context     = options.context,
      args        = options.args,
      geometry    = this.getBarGeometry(args.x, args.y, options),
      left        = geometry.left,
      width       = geometry.width,
      top         = geometry.top,
      height      = geometry.height,
      lineWidth   = 2 * options.lineWidth;

    context.save();
    context.clearRect(
      left - lineWidth,
      Math.min(top, top + height) - lineWidth,
      width + 2 * lineWidth,
      Math.abs(height) + 2 * lineWidth
    );
    context.restore();
  },

  // extendXRange : function (axis, data, options, bars) {
  //   if (!_.isNumber(axis.options.max)) {
  //     axis.max = Math.max(axis.datamax + 0.5, axis.max);
  //     axis.min = Math.min(axis.datamin - 0.5, axis.min);
  //   }
  // },

  extendYRange : function (axis, data, options, bars, series) {
    if (!_.isNumber(axis.options.max)) {
      var
      length = data.length,
      ymin = Number.MAX_VALUE,
      ymax = Number.MIN_VALUE,
      o = axis.options,
      yi = series.yi,
      y, i;

      for (i = 0; i < length; i++){
        y = data[i][yi];
        ymin = y < ymin ? y : ymin;
        ymax = y > ymax ? y : ymax;
      }
      axis.datamin = ymin;
      axis.datamax = ymax;
      axis.min = ymin*0.95;
      axis.max = ymax*1.05;
      axis.tickSize = Flotr.getTickSize(o.noTicks, axis.min, axis.max, o.tickDecimals);
    }
  }

});

