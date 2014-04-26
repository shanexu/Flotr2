/**
 * Flotr Graph class that plots a graph on creation.
 */
(function () {
  var
  _     = Flotr._;

  var init = function(options){
    Flotr.merge(options, this);
    this.maxSampleSize = this.maxSampleSize ? this.maxSampleSize : this.length * 2;
    this.minSampleSize = this.minSampleSize ? this.minSampleSize : this.length / 2;
  };

  var sampleSize = function(s){
    if (arguments.length > 0) {
      var min = this.minSampleSize,
          max = this.maxSampleSize;
      s = s < min ? min : (s > max ? max : s);
      this.length = s;
    }
    return this.length;
  };

  /**
   * DataSource.
   * @param {RawDataSource} ds - raw data source
   * @param {int} ss - sample size
   */
  DataSource = function(options){
    this.sampleSize = sampleSize; 
    this.init = init;
    this.init(options);
  };

  DataSource.prototype = [];

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
      e = this.cursor + step + this.length;
      
      if(s < 0){
        s = 0;
        e = s + this.length;
      }
      if(e > length) {
        e = length;
        s = length - this.length;
      }
      
      if(s !== this.cursor || _.isNull(this[this.length - 1]) || _.isUndefined(this[this.length - 1])){
        this.cursor = s;
        var data = this.data.slice(s, e);
        for(var i = s ; i<e; i++){
          var d = this.data[i];
          d[0] = i-s;
          this[i-s] = d;
        }
      } 
      if(_.isFunction(callback)) callback(this);
      return this;
    }
  });
  Flotr.DataSource = DataSource;
  Flotr.ArrayDataSource = ArrayDataSource;
})();


