/* vim: set et sw=2: */
Flotr.addType('stock_candles', {
/** Stock_Candles **/
  options: {
    shadowSize: 0,
    show: false,           // => setting to true will show candle sticks, false will hide
    lineWidth: 1,          // => in pixels
    wickLineWidth: 1,      // => in pixels
    candleWidth: 0.6,      // => in units of the x axis
    upFillColor: '#ff413a',// => up sticks fill color
    downFillColor: '#15a645',// => down sticks fill color
    fillOpacity: 1.0      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
  },

  draw : function (options) {

    var
      context = options.context;

    context.save();
    context.lineJoin = 'miter';
    context.lineCap = 'butt';
    // @TODO linewidth not interpreted the right way.
    context.lineWidth = options.wickLineWidth || options.lineWidth;

    this.plot(options);

    context.restore();
  },

  plot : function (options) {

    var
      data          = options.data,
      context       = options.context,
      xScale        = options.xScale,
      yScale        = options.yScale,
      width         = options.candleWidth / 2,
      shadowSize    = options.shadowSize,
      lineWidth     = options.lineWidth,
      wickLineWidth = options.wickLineWidth,
      pixelOffset   = (wickLineWidth % 2) / 2,
      color,
      datum, x, y,
      open, high, low, close,
      left, right, bottom, top, bottom2, top2, reverseLines,
      i,fill, datum0, open0, close0;

    if (data.length < 1) return;

    for (i = 0; i < data.length; i++) {
      datum   = data[i];
      x       = datum[0];
      open    = datum[1];
      high    = datum[2];
      low     = datum[3];
      close   = datum[4];
      left    = xScale(x - width);
      right   = xScale(x + width);
      bottom  = yScale(low);
      top     = yScale(high);
      bottom2 = yScale(Math.min(open, close));
      top2    = yScale(Math.max(open, close));
      datum0  = data[i-1];
      
      /*
      // TODO skipping
      if(right < xa.min || left > xa.max || top < ya.min || bottom > ya.max)
        continue;
      */

      color = options[open > close ? 'downFillColor' : 'upFillColor'];
      if(datum0){
        open0 = datum0[1];
        close0 = datum0[4];
        fill = open > close ? ( close <= close0 && close <= open0 ) : (close >= close0 && close >= open0);
      }
      // Fill the candle.
      if (fill) {
        context.fillStyle = 'rgba(0,0,0,0.05)';
        context.fillRect(left + shadowSize, top2 + shadowSize, right - left, bottom2 - top2);
        context.save();
        context.globalAlpha = options.fillOpacity;
        context.fillStyle = color;
        context.fillRect(left, top2 + lineWidth, right - left, bottom2 - top2);
        context.restore();
      }

      // Draw candle outline/border, high, low.
      if (lineWidth || wickLineWidth) {

        x = Math.floor((left + right) / 2) + pixelOffset;

        context.strokeStyle = color;
        context.beginPath();

        context.strokeRect(left, top2 + lineWidth, right - left, bottom2 - top2);
        context.moveTo(x, Math.floor(top2 + lineWidth));
        context.lineTo(x, Math.floor(top + lineWidth));
        context.moveTo(x, Math.floor(bottom2 + lineWidth));
        context.lineTo(x, Math.floor(bottom + lineWidth));

        context.closePath();
        context.stroke();
      }
    }
  },

  hit : function (options) {
    var
      xScale = options.xScale,
      yScale = options.yScale,
      data = options.data,
      args = options.args,
      mouse = args[0],
      width = options.candleWidth / 2,
      n = args[1],
      x = mouse.relX,
      y = mouse.relY,
      length = data.length,
      i, datum,
      high, low,
      left, right, top, bottom;

    for (i = 0; i < length; i++) {
      datum   = data[i],
      high    = datum[2];
      low     = datum[3];
      left    = xScale(datum[0] - width);
      right   = xScale(datum[0] + width);
      bottom  = yScale(low);
      top     = yScale(high);

      if (x > left && x < right && y > top && y < bottom) {
        n.x = datum[0];
        n.index = i;
        n.seriesIndex = options.index;
        return;
      }
    }
  },

  drawHit : function (options) {
    var
      context = options.context;
    context.save();
    this.plot(
      _.defaults({
        fill : !!options.fillColor,
        upFillColor : options.color,
        downFillColor : options.color,
        data : [options.data[options.args.index]]
      }, options)
    );
    context.restore();
  },

  clearHit : function (options) {
    var
      args = options.args,
      context = options.context,
      xScale = options.xScale,
      yScale = options.yScale,
      lineWidth = options.lineWidth,
      width = options.candleWidth / 2,
      bar = options.data[args.index],
      left = xScale(bar[0] - width) - lineWidth,
      right = xScale(bar[0] + width) + lineWidth,
      top = yScale(bar[2]),
      bottom = yScale(bar[3]) + lineWidth;
    context.clearRect(left, top, right - left, bottom - top);
  },

  extendXRange: function (axis, data, options) {
    if (!_.isNumber(axis.options.max)) {
      axis.max = Math.max(axis.datamax + 0.5, axis.max);
      axis.min = Math.min(axis.datamin - 0.5, axis.min);
    }
  },

  extendYRange: function (axis, data, options) {
    if (!_.isNumber(axis.options.max)) {
      var
      length = data.length,
      ymin = Number.MAX_VALUE,
      ymax = Number.MIN_VALUE,
      o = axis.options,
      y, i, j;
      for (i = 0; i < length; i++) {
        for(j = 1; j<5; j++){
          y = data[i][j];
          if (y < ymin) { ymin = y; }
          if (y > ymax) { ymax = y; }
        }
        if(!data[i][7]) return;
        for(j = 6; j<9; j++){
          y = data[i][j];
          if (y < ymin) { ymin = y; }
          if (y > ymax) { ymax = y; }
        }
      }
      axis.max = Math.ceil(ymax * 2)/2.0;
      axis.min = Math.floor(ymin * 2)/2.0;
      axis.tickSize = Flotr.getTickSize(o.noTicks, axis.min, axis.max, o.tickDecimals);
    }
  }
  
});

