/**
* jQuery RefPointer
* ===============================================================
*
* Licensed under The MIT License
* 
* @version   1 
* @author    Jose Rui Santos
*
* For info, please scroll to the bottom.
*/
(function ($, undefined) {
    var RefPointerClass = function ($elem, opts) {
        var data = {
                ns: 'http://www.w3.org/2000/svg',
                svgClass: 'refPointer',
                arrowTypes: null,  // Specifies the type of each arrow: 'line', 'polyline' and 'path' (for bezier arrows)
                outline: false,    // Whether each row has an outline border
                points: {

                    start: null,   // Starting points for all arrows, e.g. points for 3 arrows, consisting of a bezier, a straight line and a polyline, is
                                   // [ {x: 4, y: 6}, {x: 4, y: 6}, {x: 9, y: 8} ]. By default, all arrows start from the same point.
                    mid: null,     // Array of arrays of middle points, if any. The inner array represents the middle points for each arrow,
                                   //   [ [{x:3, y:2}, {x:10, y:10}], [], [{x:50, y:40}] ]
                    end: null,     // Array for all destinations points, e.g.
                                   //   [ {x:15, y:15}, {x:18, y:-6}, {x:55, y:45} ]

                                   // The length of arrowTypes, start, mid and end is always the same.
                    init: function () {
                        var pos = $elem.offset(),
                            $targets = opts.targetSelector ? $(opts.targetSelector) : $(),
                            startPoint = {
                                x: pos.left + $elem.width()/2,
                                y: pos.top + $elem.height()/2
                            };
                        data.arrowTypes = [];
                        this.start = [];
                        this.mid = [];
                        $targets.each(function () {
                            data.arrowTypes.push('line');
                            data.points.start.push(startPoint);
                            data.points.mid.push([]);
                        });
                        this.end = $targets.map(function (index, e) {
                            var $target = $(e),
                                targetPos = $target.offset(),
                                // this is way to retrieve the content dimensions for blocked elements
                                $targetSpan = $target.wrapInner("<span style='display: inline;'>").children("span");
                            try {
                                return {
                                    x: targetPos.left + $targetSpan.width()/2,
                                    y: targetPos.top + $targetSpan.height()/2
                                }
                            } finally {
                                $targetSpan.contents().unwrap();
                            }
                        }).get();
                    }
                },
                getBoundsRect: opts.overrideGetBoundsRect || function () {
                    var bounds = {},
                        maxOffset = Math.max(opts.arrows.startMarker.size, Math.max(opts.arrows.midMarker.size, opts.arrows.endMarker.size)),
                        setBounds = function (pnt) {
                            bounds.top = Math.min(bounds.top === undefined ? pnt.y : bounds.top, pnt.y);
                            bounds.right = Math.max(bounds.right === undefined ? pnt.x : bounds.right, pnt.x);
                            bounds.bottom = Math.max(bounds.bottom === undefined ? pnt.y : bounds.bottom, pnt.y);
                            bounds.left = Math.min(bounds.left === undefined ? pnt.x : bounds.left, pnt.x);
                        };
                    this.points.start.forEach(setBounds);
                    this.points.end.forEach(setBounds);
                    this.points.mid.forEach(function (pnts) {
                        for(var pnt in pnts) {
                            setBounds(pnts[pnt]);
                        }
                    });
                    bounds.top -= maxOffset;
                    bounds.left -= maxOffset;
                    bounds.right += maxOffset;
                    bounds.bottom += maxOffset;
                    return bounds;
                },
                init: function () {
                    this.points.init();
                    this.outline = opts.arrows.borderWidth && opts.arrows.borderColor !== 'transparent';
                    var bounds = this.getBoundsRect(),
                        css = {
                            position: 'absolute',
                            left: bounds.left + 'px',
                            top: bounds.top + 'px',
                            'pointer-events': 'none'
                        };
                    DOM.$svg = DOM.createSvgDom('svg', {
                        width: (bounds.right - bounds.left) + 'px',
                        height: (bounds.bottom - bounds.top) + 'px',
                        xmlns: this.ns,
                        version: '1.1',
                        class: this.svgClass
                    }).css(css);

                    DOM.$svg.append(DOM.markers.init());

                    this.points.end.forEach(function (e, index) {
                        if (data.arrowTypes[index] === 'line') {
                            var attrs = {
                                    x1: Math.round(data.points.start[index].x - bounds.left) + .5,
                                    y1: Math.round(data.points.start[index].y - bounds.top) + .5,
                                    x2: Math.round(e.x - bounds.left) + .5,
                                    y2: Math.round(e.y - bounds.top) + .5,
                                    'stroke-linecap': 'round'
                                },
                                $arrow;
                            if (data.outline) {
                                attrs.stroke = opts.arrows.borderColor;
                                attrs['stroke-width'] = opts.arrows.borderWidth*2 + opts.arrows.strokeWidth;
                                DOM.$svg.append(DOM.createSvgDom('line', attrs));
                            }
                            attrs.stroke = opts.arrows.strokeColor;
                            attrs['stroke-width'] = opts.arrows.strokeWidth;
                            ['start', 'mid', 'end'].forEach(function (e) { 
                                if (DOM.markers.ids[e]) {
                                    attrs['marker-' + e] = 'url(#' + DOM.markers.ids[e] + ')';
                                }
                            });
                            $arrow = DOM.createSvgDom('line', attrs);
                            DOM.$svg.append($arrow);
                            DOM.arrows.push($arrow);
                        }
                    });
                    DOM.$svg.hide();
                    $("body").append(DOM.$svg);
                    events.bindAll();
                }
            },
            DOM = {
                $svg: null,
                arrows: [],
                createSvgDom: function (tag, attrs) {
                    var el = document.createElementNS(data.ns, tag);
                    for (var k in attrs)
                        el.setAttribute(k, attrs[k]);
                    return $(el);
                },
                markers: {
                    $defs: null,
                    ids: {
                        start: null,
                        mid: null,
                        end: null
                    },
                    getMarker: function (type, id) {
                        var $marker = null,
                            getNewId = function () {
                                return DOM.markers.ids[id] = 'refP' + $('svg.' + data.svgClass).length + id.charAt(0) + (+ new Date());
                            },
                            optsMarker = opts.arrows[id + 'Marker'];
                        if (optsMarker) {
                            switch (type) {
                                case 'circle':
                                    this.ids[id] = getNewId();
                                    $marker = DOM.createSvgDom('marker', {
                                        id: this.ids[id],
                                        markerWidth: optsMarker.size,
                                        markerHeight: optsMarker.size,
                                        refX: Math.round(optsMarker.size/2),
                                        refY: Math.round(optsMarker.size/2)
                                    });
                                    break;
                                case 'square':
                                    this.ids[id] = getNewId();
                                    $marker = DOM.createSvgDom('marker', {
                                        id: this.ids[id],
                                        markerWidth: optsMarker.size,
                                        markerHeight: optsMarker.size,
                                        refX: Math.round(optsMarker.size/2),
                                        refY: Math.round(optsMarker.size/2)
                                    });
                                    break;
                                case 'triangle':
                                    this.ids[id] = getNewId();
                                    $marker = DOM.createSvgDom('marker', {
                                        id: this.ids[id],
                                        markerWidth: optsMarker.size,
                                        markerHeight: optsMarker.size/1.25,
                                        refX: Math.round(optsMarker.size - opts.arrows.borderWidth),
                                        refY: Math.round(optsMarker.size/2.5),
                                        orient: 'auto'
                                    });
                            }
                            if ($marker) {
                                return $marker.append(this.getMarkerShape(type, optsMarker));
                            }
                        }
                        return null;
                    },
                    getMarkerShape: function (type, optsMarker) {
                        var style = 'fill:' + opts.arrows.strokeColor +
                            (data.outline ? '; stroke:' + opts.arrows.borderColor + '; stroke-width:' + opts.arrows.borderWidth/2 : '');
                        switch (type) {
                            case 'circle':
                                return DOM.createSvgDom('circle', {
                                    cx: optsMarker.size/2,
                                    cy: optsMarker.size/2,
                                    r: optsMarker.size/2 - 1,
                                    style: style
                                });

                            case 'square':
                                return DOM.createSvgDom('rect', {
                                    x: 0,
                                    y: 0,
                                    width: optsMarker.size,
                                    height: optsMarker.size,
                                    style: style
                                });

                            case 'triangle':
                                return DOM.createSvgDom('path', {
                                    d: 'M0,0 L0,' + (optsMarker.size/1.25) + ' L' + optsMarker.size + ',' + (optsMarker.size/2.5) + ' z',
                                    style: style
                                });
                        }
                        return null;
                    },
                    initMarker: function (type, id) {
                        var $marker = this.getMarker(type, id);
                        if ($marker) {
                            if (!this.$defs) {
                                this.$defs = DOM.createSvgDom('defs');
                            }
                            this.$defs.append($marker);
                        }
                    },
                    init: function () {
                        this.initMarker(opts.arrows.startMarker.type, 'start');
                        this.initMarker(opts.arrows.midMarker.type, 'mid');
                        this.initMarker(opts.arrows.endMarker.type, 'end');
                        return this.$defs;
                    }
                }
            },
            events = {
                onShow: function () {
                    DOM.$svg.show();
                },
                onHide: function () {
                    DOM.$svg.hide();
                },
                onDestroy: function () {
                    this.unbindAll();
                    DOM.$svg.remove(); 
                },
                bindAll: function () {
                    $elem.
                        bind('mouseenter.rsRefPointer focus.rsRefPointer', this.onShow).
                        bind('mouseleave.rsRefPointer blur.rsRefPointer', this.onHide).
                        bind('destroy.rsRefPointer', this.onDestroy);
                },
                unbindAll: function () {
                    $elem.
                        unbind('mouseenter.rsRefPointer focus.rsRefPointer', this.onShow).
                        unbind('mouseleave.rsRefPointer blur.rsRefPointer', this.onHide).
                        unbind('destroy.rsRefPointer', this.onDestroy);
                }
            };

        data.init();
        return {
            data: data,
            DOM: DOM,
            events: events
        };
    };

    $.fn.rsRefPointer = function (options) {
        var option = function (options) {
                if (typeof arguments[0] === 'string') {
                    var op = arguments.length == 1 ? 'getter' : (arguments.length == 2 ? 'setter' : null);
                    if (op) {
                        return this.eq(0).triggerHandler(op + '.rsRefPointer', arguments);
                    }
                }
            },
            destroy = function () {
                this.trigger('destroy.rsRefPointer');
            };


        if (typeof options === 'string') {
            var otherArgs = Array.prototype.slice.call(arguments, 1);
            switch (options) {
                case 'option': return option.apply(this, otherArgs);
                case 'destroy': return destroy.call(this);
                default: return this;
            }
        }
        var opts = $.extend({}, $.fn.rsRefPointer.defaults, options);
        opts.arrows = $.extend({}, $.fn.rsRefPointer.defaults.arrows, options ? options.arrows : options);
        opts.arrows.markers = $.extend({}, $.fn.rsRefPointer.defaults.arrows.markers, options ? (options.arrows ? options.arrows.markers : options.arrows) : options);
        
        var $allRefPointers = this.each(function () {
            // designData is used by the design time version of this plugin, to grab this specific instance of the runtime
            $.fn.rsRefPointer.designData = new RefPointerClass($(this), opts);
        });
        if ($.fn.rsRefPointer.designData) {
            $.fn.rsRefPointer.designData.opts = opts;
        }
        return $allRefPointers;
    };

    // public access to the default input parameters
    $.fn.rsRefPointer.defaults = {
        targetSelector: ".target",
        arrows: {
            strokeWidth: 2,
            strokeColor: 'black',
            borderWidth: 1,
            borderColor: 'yellow',
            startMarker: {
                type: 'circle',
                size: 6
            },
            midMarker: {
                type: null,
                size: 6
            },
            endMarker: {
                type: 'triangle',
                size: 8
            }
        }
    };
})(jQuery);