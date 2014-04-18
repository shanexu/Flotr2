(function(){
  var i = 0,
      datum;
  TREND_DATA_ARRAY = [];
  
  for (i = 0; i<TREND_DATA.items.length; i++){
    datum = TREND_DATA.items[i];
    TREND_DATA_ARRAY.push([i, datum.price/1000, datum.vol]);
  }

  KLINE_DATA_ARRAY = [];
  for (i = 0; i<KLINE_DATA.length; i++){
    datum = KLINE_DATA[i];
    KLINE_DATA_ARRAY.push([i, datum.open/1000.0, datum.high/1000.0, datum.low/1000.0, datum.close/1000.0, datum.volume, datum.date]);
  }
  
})();
