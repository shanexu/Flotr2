/** trends **/
Flotr.addType('stock_trends', {
  options: {
    show: false,           // => setting to true will show lines, false will hide
    lineWidth: 1.5,          // => line width in pixels
    fill: false,           // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillBorder: false,     // => draw a border around the fill
    fillColor: null,       // => fill color
    fillOpacity: 0.7,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    steps: false           // => draw steps
  },

  /**
   * Draws lines series in the canvas element.
   * @param {Object} options
   */
  draw : function (options) {

    var
      context     = options.context,
      lineWidth   = options.lineWidth,
      shadowSize  = options.shadowSize,
      offset;

    context.save();
    context.lineJoin = 'round';

    if (shadowSize) {

      context.lineWidth = shadowSize / 2;
      offset = lineWidth / 2 + context.lineWidth / 2;
      
      // @TODO do this instead with a linear gradient
      context.strokeStyle = "rgba(0,0,0,0.1)";
      this.plot(options, offset + shadowSize / 2);

      context.strokeStyle = "rgba(0,0,0,0.2)";
      this.plot(options, offset);
    }

    context.lineWidth = lineWidth;
    context.strokeStyle = options.color;

    this.plot(options, 0);

    context.restore();
  },

  plot : function (options, shadowOffset) {

    var
      context   = options.context,
      width     = options.width, 
      height    = options.height,
      xScale    = options.xScale,
      yScale    = options.yScale,
      data      = options.data, 
      length    = data.length - 1,
      prevx     = null,
      prevy     = null,
      zero      = yScale(0),
      start     = null,
      x1, x2, y1, y2, i;
      
    if (length < 1) return;

    context.beginPath();

    for (i = 0; i < length; ++i) {

      // To allow empty values
      if (data[i][1] === null || data[i+1][1] === null) {
        if (options.fill) {
          if (i > 0 && data[i][1] !== null) {
            context.stroke();
            fill();
            start = null;
            context.closePath();
            context.beginPath();
          }
        }
        continue;
      }

      // Zero is infinity for log scales
      // TODO handle zero for logarithmic
      // if (xa.options.scaling === 'logarithmic' && (data[i][0] <= 0 || data[i+1][0] <= 0)) continue;
      // if (ya.options.scaling === 'logarithmic' && (data[i][1] <= 0 || data[i+1][1] <= 0)) continue;
      
      x1 = xScale(data[i][0]);
      x2 = xScale(data[i+1][0]);

      if (start === null) start = data[i];

      y1 = yScale(data[i][1]);
      y2 = yScale(data[i+1][1]);

      if (
        (y1 > height && y2 > height) ||
        (y1 < 0 && y2 < 0) ||
        (x1 < 0 && x2 < 0) ||
        (x1 > width && x2 > width)
      ) continue;

      if ((prevx != x1) || (prevy != y1 + shadowOffset)) {
        context.moveTo(x1, y1 + shadowOffset);
      }
      
      prevx = x2;
      prevy = y2 + shadowOffset;
      if (options.steps) {
        context.lineTo(prevx + shadowOffset / 2, y1 + shadowOffset);
        context.lineTo(prevx + shadowOffset / 2, prevy);
      } else {
        context.lineTo(prevx, prevy);
      }
    }
    
    if (!options.fill || options.fill && !options.fillBorder) context.stroke();

    fill();

    function fill () {
      if(!shadowOffset && options.fill && start){
        x1 = xScale(start[0]);
        context.fillStyle = options.fillStyle;
        context.lineTo(x2, zero);
        context.lineTo(x1, zero);
        context.lineTo(x1, yScale(start[1]));
        context.fill();
        if (options.fillBorder) {
          context.stroke();
        }
      }
    }

    context.closePath();
  },

  extendYRange : function (axis, data, options, lines) {

    var o = axis.options;

    if(o.prevClose){
      var abs =  Math.max(Math.abs(axis.min - o.prevClose), Math.abs(axis.max - o.prevClose)) * 1.05;
      axis.min = o.prevClose - abs;
      axis.max = o.prevClose + abs;
      axis.tickSize = Flotr.getTickSize(o.noTicks, axis.min, axis.max, o.tickDecimals);
    }
    
    if (options.steps) {

      this.hit = function (options) {
        var
          data = options.data,
          args = options.args,
          yScale = options.yScale,
          mouse = args[0],
          length = data.length,
          n = args[1],
          x = options.xInverse(mouse.relX),
          relY = mouse.relY,
          i;

        for (i = 0; i < length - 1; i++) {
          if (x >= data[i][0] && x <= data[i+1][0]) {
            if (Math.abs(yScale(data[i][1]) - relY) < 8) {
              n.x = data[i][0];
              n.y = data[i][1];
              n.index = i;
              n.seriesIndex = options.index;
            }
            break;
          }
        }
      };

      this.drawHit = function (options) {
        var
          context = options.context,
          args    = options.args,
          data    = options.data,
          xScale  = options.xScale,
          index   = args.index,
          x       = xScale(args.x),
          y       = options.yScale(args.y),
          x2;

        if (data.length - 1 > index) {
          x2 = options.xScale(data[index + 1][0]);
          context.save();
          context.strokeStyle = options.color;
          context.lineWidth = options.lineWidth;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x2, y);
          context.stroke();
          context.closePath();
          context.restore();
        }
      };

      this.clearHit = function (options) {
        var
          context = options.context,
          args    = options.args,
          data    = options.data,
          xScale  = options.xScale,
          width   = options.lineWidth,
          index   = args.index,
          x       = xScale(args.x),
          y       = options.yScale(args.y),
          x2;

        if (data.length - 1 > index) {
          x2 = options.xScale(data[index + 1][0]);
          context.clearRect(x - width, y - width, x2 - x + 2 * width, 2 * width);
        }
      };
    }
  }

});
