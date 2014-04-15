(function(){
  var
  D     = Flotr.DOM,
  E     = Flotr.EventAdapter,
  _     = Flotr._,
  flotr = Flotr;

  Chart = function(el, data, options, dataSource){
    this.el = el;
    this.data = data;
    this.options = options;
    this.dataSource = dataSource;
    var graph = null;
    var drawGraph = function(){
      graph = Flotr.draw(el, data, options);
      graph.observe(el, "flotr:datacursor", function(dx){
        dataSource.move(dx, function(d){
          graph = drawGraph();
        });
      });
    };

    graph = drawGraph();
    
    this.getGraph = function(){
      return graph;
    };

    this.redraw = function(){
      graph = drawGraph();
    };

  };
})();

