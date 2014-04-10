/** Stock_Volumes **/
Flotr.addType('stock_volumes', {

  options: {
    show: false,           // => setting to true will show bars, false will hide
    lineWidth: 1,          // => in pixels
    barWidth: 0.6,           // => in units of the x axis
    fill: true,            // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillColor: null,       // => fill color
	upFillColor: '#ff413a',// => up sticks fill color
    downFillColor: '#15a645',// => down sticks fill color
    fillOpacity: 0.90,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    horizontal: false,     // => horizontal bars (x and y inverted)
    centered: true,        // => center the bars to their x axis value
    topPadding: 0.1        // => top padding in percent
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
    if (options.fill) context.fillStyle = options.fillStyle;
    
    this.plot(options);

    context.restore();
  },

  plot : function (options) {

    var
      data            = options.data,
      context         = options.context,
      shadowSize      = options.shadowSize,
      i, geometry, left, top, width, height,
	  datum, open, close, color;

    if (data.length < 1) return;

    this.translate(context, options.horizontal);

    for (i = 0; i < data.length; i++) {

      geometry = this.getBarGeometry(data[i][0], data[i][5], options);
      if (geometry === null) continue;
	  
      left    = geometry.left;
      top     = geometry.top;
      width   = geometry.width;
      height  = geometry.height;
	  datum   = data[i];
	  open    = datum[1];
      close   = datum[4];

	  color = options[open > close ? 'downFillColor' : 'upFillColor'];

      if (options.fill) {
		context.save();
		context.globalAlpha = options.fillOpacity;
		context.fillStyle = color;
		context.fillRect(left, top, width, height);
		context.restore();
	  }
      if (shadowSize) {
        context.save();
        context.fillStyle = 'rgba(0,0,0,0.05)';
        context.fillRect(left + shadowSize, top + shadowSize, width, height);
        context.restore();
      }
      if (options.lineWidth) {
		context.save();
		context.strokeStyle = color;
        context.strokeRect(left, top, width, height);
		context.restore();
      }
    }
  },

  translate : function (context, horizontal) {
    if (horizontal) {
      context.rotate(-Math.PI / 2);
      context.scale(-1, 1);
    }
  },

  getBarGeometry : function (x, y, options) {

    var
      horizontal    = options.horizontal,
      barWidth      = options.barWidth,
      centered      = options.centered,
      lineWidth     = options.lineWidth,
      bisection     = centered ? barWidth / 2 : 0,
      xScale        = horizontal ? options.yScale : options.xScale,
      yScale        = horizontal ? options.xScale : options.yScale,
      xValue        = horizontal ? y : x,
      yValue        = horizontal ? x : y,
      left, right, top, bottom;

    left    = xScale(xValue - bisection);
    right   = xScale(xValue + barWidth - bisection);
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
      left      : Math.min(left, right) - lineWidth / 2,
      width     : Math.abs(right - left) - lineWidth,
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
      geometry, i;

    for (i = data.length; i--;) {
      geometry = this.getBarGeometry(data[i][0], data[i][5], options);
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
        n.y = data[i][5];
        n.index = i;
        n.seriesIndex = options.index;
      }
    }
  },

  drawHit : function (options) {
    var
      context     = options.context,
      args        = options.args,
      geometry    = this.getBarGeometry(args.x, args.y, options),
      left        = geometry.left,
      top         = geometry.top,
      width       = geometry.width,
      height      = geometry.height;

    context.save();
    context.strokeStyle = options.color;
    context.lineWidth = options.lineWidth;
    this.translate(context, options.horizontal);

    // Draw highlight
    context.beginPath();
    context.moveTo(left, top + height);
    context.lineTo(left, top);
    context.lineTo(left + width, top);
    context.lineTo(left + width, top + height);
    if (options.fill) {
      context.fillStyle = options.fillStyle;
      context.fill();
    }
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
    this.translate(context, options.horizontal);
    context.clearRect(
      left - lineWidth,
      Math.min(top, top + height) - lineWidth,
      width + 2 * lineWidth,
      Math.abs(height) + 2 * lineWidth
    );
    context.restore();
  },

  extendXRange : function (axis, data, options, bars) {
	if (axis.options.max === null) {
      axis.max = Math.max(axis.datamax + 0.5, axis.max);
      axis.min = Math.min(axis.datamin - 0.5, axis.min);
    }
  },

  extendYRange : function (axis, data, options, bars) {
	if (axis.options.max === null) {
      var
	  length = data.length,
	  ymin = Number.MAX_VALUE,
	  ymax = Number.MIN_VALUE,
	  o = axis.options,
	  y, i;
	  for (i = 0; i < length; i++){
	  	y = data[i][5];
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










