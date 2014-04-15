/**
 * Flotr Graph class that plots a graph on creation.
 */
(function () {
  var
  _     = Flotr._;
  /**
   * DataSource.
   * @param {RawDataSource} ds - raw data source
   * @param {int} ss - sample size
   */
  DataSource = function(options){
    this.init = function(options){
      Flotr.merge(options || {}, this);
      this.setSampleSize(this.sampleSize);
    };
    this.move = function(){
      return this;
    };
    this.setSampleSize = function(sampleSize){
      this.length = sampleSize;
    };
    this.sampleSize = 50;
    this.init(options);
  };


  DataSource.prototype = {
    move: function(step, callback){
    },
    sampleSize: 50,
    init: function(options){
      Flotr.merge(options, this);
    }
  };

  DataSource.prototype = Array.Prototype;

  ArrayDataSource = function(array, opts){
    this.cursor = 0;
    this.data = array;
    this.init(opts||{});
    this.move(0);
  };

  ArrayDataSource.prototype = new DataSource({
    move: function(step, callback){
      var
      length = this.data.length,
      s,e;
      step = step || 0;
      s = this.cursor + step;
      e = this.cursor + step + this.sampleSize;
      
      if(s < 0){
        s = 0;
        e = s + this.sampleSize;
      }
      if(e > length) {
        e = length;
        s = length - this.sampleSize;
      }
      
      if(s !== this.cursor || this[0] == null){
        this.cursor = s;
        var data = this.data.slice(s, e);
        for(var i = s ; i<e; i++){
          this[i-s] = this.data[i];
        }
      } 
      if(_.isFunction(callback)) callback(this);
      return this;
    }
  });

})();


