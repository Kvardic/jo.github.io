/*
 * L.Control.Loading is a control that shows a loading indicator when tiles are
 * loading or when map-related AJAX requests are taking place.
 */

(function () {

    var console = window.console || {
        error: function () {},
        warn: function () {}
    };

    function defineLeafletLoading(L) {
        L.Control.Loading = L.Control.extend({
            options: {
                delayIndicator: null,
                position: 'topleft',
                separate: true,
                zoomControl: null,
                spinjs: false,
                spin: {
                    lines: 7,
                    length: 3,
                    width: 3,
                    radius: 5,
                    rotate: 13,
                    top: "83%"
                }
            },

            initialize: function(options) {
                L.setOptions(this, options);
                this._dataLoaders = {};

                if (this.options.zoomControl !== null) {
                    this.zoomControl = this.options.zoomControl;
                }
            },

            onAdd: function(map) {
                if (this.options.spinjs && (typeof Spinner !== 'function')) {
                    return console.error("Leaflet.loading cannot load because you didn't load spin.js (http://fgnass.github.io/spin.js/), even though you set it in options.");
                }
                this._addLayerListeners(map);
                this._addMapListeners(map);

                if (!this.options.separate && !this.zoomControl) {
                    if (map.zoomControl) {
                        this.zoomControl = map.zoomControl;
                    } else if (map.zoomsliderControl) {
                        this.zoomControl = map.zoomsliderControl;
                    }
                }

           
                var classes = 'leaflet-control-loading';
                var container;
                if (this.zoomControl && !this.options.separate) {
                 
                    container = this.zoomControl._container;
                   
                    classes += ' leaflet-bar-part-bottom leaflet-bar-part last';

            
                    L.DomUtil.addClass(this._getLastControlButton(), 'leaflet-bar-part-bottom');
                }
                else {
                   
                    container = L.DomUtil.create('div', 'leaflet-control-zoom leaflet-control-layer-container leaflet-bar');
                }
                this._indicatorContainer = container;
                this._indicator = L.DomUtil.create('a', classes, container);
                if (this.options.spinjs) {
                    this._spinner = new Spinner(this.options.spin).spin();
                    this._indicator.appendChild(this._spinner.el);
                }
                return container;
            },

            onRemove: function(map) {
                this._removeLayerListeners(map);
                this._removeMapListeners(map);
            },

            removeFrom: function (map) {
                if (this.zoomControl && !this.options.separate) {
                  
                    this._container.removeChild(this._indicator);
                    this._map = null;
                    this.onRemove(map);
                    return this;
                }
                else {
                   
                    return L.Control.prototype.removeFrom.call(this, map);
                }
            },

            addLoader: function(id) {
                this._dataLoaders[id] = true;
                if (this.options.delayIndicator && !this.delayIndicatorTimeout) {
                   
                    var that = this;
                    this.delayIndicatorTimeout = setTimeout(function () {
                        that.updateIndicator();
                        that.delayIndicatorTimeout = null;
                    }, this.options.delayIndicator);
                }
                else {
                   
                    this.updateIndicator();
                }
            },

            removeLoader: function(id) {
                delete this._dataLoaders[id];
                this.updateIndicator();

               
                if (this.options.delayIndicator && this.delayIndicatorTimeout && !this.isLoading()) {
                    clearTimeout(this.delayIndicatorTimeout);
                    this.delayIndicatorTimeout = null;
                }
            },

            updateIndicator: function() {
                if (this.isLoading()) {
                    this._showIndicator();
                }
                else {
                    this._hideIndicator();
                }
            },

            isLoading: function() {
                return this._countLoaders() > 0;
            },

            _countLoaders: function() {
                var size = 0, key;
                for (key in this._dataLoaders) {
                    if (this._dataLoaders.hasOwnProperty(key)) size++;
                }
                return size;
            },

            _showIndicator: function() {
            
                L.DomUtil.addClass(this._indicator, 'is-loading');
                L.DomUtil.addClass(this._indicatorContainer, 'is-loading');

              
                if (!this.options.separate) {
                    if (this.zoomControl instanceof L.Control.Zoom) {
                        L.DomUtil.removeClass(this._getLastControlButton(), 'leaflet-bar-part-bottom');
                    }
                    else if (typeof L.Control.Zoomslider === 'function' && this.zoomControl instanceof L.Control.Zoomslider) {
                        L.DomUtil.removeClass(this.zoomControl._ui.zoomOut, 'leaflet-bar-part-bottom');
                    }
                }
            },

            _hideIndicator: function() {
              
                L.DomUtil.removeClass(this._indicator, 'is-loading');
                L.DomUtil.removeClass(this._indicatorContainer, 'is-loading');

              
                if (!this.options.separate) {
                    if (this.zoomControl instanceof L.Control.Zoom) {
                        L.DomUtil.addClass(this._getLastControlButton(), 'leaflet-bar-part-bottom');
                    }
                    else if (typeof L.Control.Zoomslider === 'function' && this.zoomControl instanceof L.Control.Zoomslider) {
                        L.DomUtil.addClass(this.zoomControl._ui.zoomOut, 'leaflet-bar-part-bottom');
                    }
                }
            },

            _getLastControlButton: function() {
                var container = this.zoomControl._container,
                    index = container.children.length - 1;

         
                while (index > 0) {
                    var button = container.children[index];
                    if (!(this._indicator === button || button.offsetWidth === 0 || button.offsetHeight === 0)) {
                        break;
                    }
                    index--;
                }

                return container.children[index];
            },

            _handleLoading: function(e) {
                this.addLoader(this.getEventId(e));
            },

            _handleBaseLayerChange: function (e) {
                var that = this;

          
                if (e.layer && e.layer.eachLayer && typeof e.layer.eachLayer === 'function') {
                    e.layer.eachLayer(function (layer) {
                        that._handleBaseLayerChange({ layer: layer });
                    });
                }
                else {
                 
                    if (!(L.TileLayer.Canvas && e.layer instanceof L.TileLayer.Canvas)) {
                        that._handleLoading(e);
                    }
                }
            },

            _handleLoad: function(e) {
                this.removeLoader(this.getEventId(e));
            },

            getEventId: function(e) {
                if (e.id) {
                    return e.id;
                }
                else if (e.layer) {
                    return e.layer._leaflet_id;
                }
                return e.target._leaflet_id;
            },

            _layerAdd: function(e) {
                if (!e.layer || !e.layer.on) return
                try {
                    e.layer.on({
                        loading: this._handleLoading,
                        load: this._handleLoad
                    }, this);
                }
                catch (exception) {
                    console.warn('L.Control.Loading: Tried and failed to add ' +
                                 ' event handlers to layer', e.layer);
                    console.warn('L.Control.Loading: Full details', exception);
                }
            },

            _layerRemove: function(e) {
                if (!e.layer || !e.layer.off) return;
                try {
                    e.layer.off({
                        loading: this._handleLoading,
                        load: this._handleLoad
                    }, this);
                }
                catch (exception) {
                    console.warn('L.Control.Loading: Tried and failed to remove ' +
                                 'event handlers from layer', e.layer);
                    console.warn('L.Control.Loading: Full details', exception);
                }
            },

            _addLayerListeners: function(map) {
             
                map.eachLayer(function(layer) {
                    if (!layer.on) return;
                    layer.on({
                        loading: this._handleLoading,
                        load: this._handleLoad
                    }, this);
                }, this);

              
                map.on('layeradd', this._layerAdd, this);
                map.on('layerremove', this._layerRemove, this);
            },

            _removeLayerListeners: function(map) {
               
                map.eachLayer(function(layer) {
                    if (!layer.off) return;
                    layer.off({
                        loading: this._handleLoading,
                        load: this._handleLoad
                    }, this);
                }, this);

              
                map.off('layeradd', this._layerAdd, this);
                map.off('layerremove', this._layerRemove, this);
            },

            _addMapListeners: function(map) {
            
                map.on({
                    baselayerchange: this._handleBaseLayerChange,
                    dataloading: this._handleLoading,
                    dataload: this._handleLoad,
                    layerremove: this._handleLoad
                }, this);
            },

            _removeMapListeners: function(map) {
                map.off({
                    baselayerchange: this._handleBaseLayerChange,
                    dataloading: this._handleLoading,
                    dataload: this._handleLoad,
                    layerremove: this._handleLoad
                }, this);
            }
        });

        L.Map.addInitHook(function () {
            if (this.options.loadingControl) {
                this.loadingControl = new L.Control.Loading();
                this.addControl(this.loadingControl);
            }
        });

        L.Control.loading = function(options) {
            return new L.Control.Loading(options);
        };
    }

    if (typeof define === 'function' && define.amd) {
     
        define(['leaflet'], function (L) {
            defineLeafletLoading(L);
        });
    }
    else {
      
        defineLeafletLoading(L);
    }

})();