(function () {

var
  D = Flotr.DOM,
  E = Flotr.EventAdapter;

Flotr.addPlugin('datacrosslabel', {
  options: {
    show:false
  },
  callbacks: {
    'flotr:dataIndex': function(map){
      var options = this.options.datacrosslabel;
      if (!options.show) return;
      var el = this.datacrosslabel.labelEl();
      if(map.dataIndex === -1){
        D.hide(el);
      } else {
        el.innerHTML = map.yvalue;
        el.style.top = (map.y - this.axes.y.maxLabel.height / 2) + 'px';
        D.show(el);
      }
    }
  },

  showLabel: function(){

  },

  hideLabel: function(){

  },

  labelEl: function(){
    if(!this.datacrosslabel.el){
      var
      el = D.create('div'),
      p = this.el.getElementsByClassName('flotr-labels')[0],
      w = parseInt(p.getElementsByClassName('flotr-grid-label-y')[0].style.width),
      width = this.axes.y.maxLabel.width;
      D.addClass(el, 'flotr-grid-label');
      D.addClass(el, 'flotr-grid-lable-y');
      D.addClass(el, 'datacrosslabel');
      D.setStyles(el, {
        position: 'absolute',
        textAlign: 'right',
        width: width + 'px',
        left: (w - width)+'px',
        fontSize: 'smaller'
      });
      this.datacrosslabel.el = el;
      D.insert(this.el, el);
      D.hide(el);
    }
    return this.datacrosslabel.el;
  }
});
})();

