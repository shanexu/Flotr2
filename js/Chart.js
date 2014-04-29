(function(){
  var
  D     = Flotr.DOM,
  E     = Flotr.EventAdapter,
  _     = Flotr._,
  H     = Flotr.hammer,
  flotr = Flotr;
  
  Chart = function(el, data, options, dataSource){
    this.el = el;
    this.data = data;
    this.options = options;
    this.dataSource = dataSource;
    var graph = null;
    var rid = null;
    var move = false;
    this.move = function(value){
      if(!_.isUndefined(value)){
        move = value;
      }
      return move;
    };
    var drawGraph = function(){
      graph = Flotr.draw(el, data, options);
      
      graph.observe(el, "flotr:datacursor", function(dx){
        if(!move) return;
        dataSource.move(dx, function(){
          if(rid){
            cancelAnimationFrame(rid);
          }
          rid = requestAnimationFrame(function(){
            graph = drawGraph();
          });
        });
      });
    };

    var pinch = false;

    this.pinch = function(value){
      if(!_.isUndefined(value)){
        pinch = value;
      }
      return pinch;
    };

    H(el).on('pinch', function(event) {
      if(!pinch) return;
      var sc = Math.abs(Math.log(event.gesture.scale));
      if (sc > 0.2 && sc < 0.4){
        var s = Math.round(1 / event.gesture.scale * dataSource.sampleSize());
        var os = dataSource.sampleSize();
        dataSource.sampleSize(s);
        if(os != dataSource.sampleSize()){
          dataSource.move(0, function(){
            if(rid){
              cancelAnimationFrame(rid);
            }
            rid = requestAnimationFrame(function(){
              graph = drawGraph();
            });
          });
        }
      }
    });

    drawGraph();
    
    this.getGraph = function(){
      return graph;
    };

    this.redraw = function(){
      drawGraph();
    };

  };
  flotr.Chart = Chart;
})();

