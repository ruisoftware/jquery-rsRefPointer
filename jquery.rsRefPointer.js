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
                svgClass: 'refpointer',
                points: {
                    start: null,    // Starting point of all arrows, e.g. {x: 4, y: 6}. All arrows share the same starting point.
                    $mid: null,     // Array of arrays of middle points, if any. The inner array represents the middle points for each arrow,
                                    // e.g. the middle points for 3 arrows, consisting of a bezier, a straight line and a polyline, is
                                    //   [ [{x:3, y:2}, {x:10, y:10}], [], [{x:50, y:40}] ]
                    $end: null,     // Array for all destinations points, e.g.
                                    //   [ {x:15, y:15}, {x:18, y:-6}, {x:55, y:45} ]
                    init: function () {
                        var pos = $elem.offset(),
                            $targets = opts.targetSelector ? $(opts.targetSelector) : $();
                        this.start = {
                            x: pos.left + $elem.width()/2,
                            y: pos.top + $elem.height()/2
                        };
                        this.$mid = [];
                        $targets.each(function () {
                            data.points.$mid.push([]);
                        });
                        this.$mid = $(this.$mid);
                        this.$end = $targets.map(function (index, e) {
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
                        });
                    }
                },
                getBoundRect: function () {
                    if (opts.designMode) {
                        var $document = $(document);
                        return {
                            top: 0,
                            right: $document.width(),
                            bottom: $document.height(),
                            left: 0
                        }
                    }
                    var bounds = {},
                        maxOffset = Math.max(opts.arrows.startMarker.size, Math.max(opts.arrows.midMarker.size, opts.arrows.endMarker.size)),
                        setBounds = function (index, pnt) {
                            bounds.top = Math.min(bounds.top, pnt.y);
                            bounds.right = Math.max(bounds.right, pnt.x);
                            bounds.bottom = Math.max(bounds.bottom, pnt.y);
                            bounds.left = Math.min(bounds.left, pnt.x);
                        };
                    bounds['left'] = bounds['right'] = this.points.start.x;
                    bounds['top'] = bounds['bottom'] = this.points.start.y;
                    this.points.$end.each(setBounds);
                    this.points.$mid.each(function (index, pnts) {
                        for(var pnt in pnts) {
                            setBounds(pnt, pnts[pnt]);
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
                    var bounds = this.getBoundRect(),
                        hasBorder = opts.arrows.borderWidth && opts.arrows.borderColor !== 'transparent',
                        css = {
                            position: 'absolute',
                            left: bounds.left + 'px',
                            top: bounds.top + 'px'
                        };
                    if (!opts.designMode) {
                        css['pointer-events'] = 'none';
                    }
                    DOM.$svg = DOM.createSvgDom('svg', {
                        width: (bounds.right - bounds.left) + 'px',
                        height: (bounds.bottom - bounds.top) + 'px',
                        xmlns: this.ns,
                        version: '1.1',
                        class: this.svgClass
                    }).css(css);

                    DOM.$svg.append(DOM.markers.init(hasBorder));

                    this.points.$end.each(function (index, e) {
                        var attrs = {
                                x1: Math.round(data.points.start.x - bounds.left) + .5,
                                y1: Math.round(data.points.start.y - bounds.top) + .5,
                                x2: Math.round(e.x - bounds.left) + .5,
                                y2: Math.round(e.y - bounds.top) + .5,
                                'stroke-linecap': 'round'
                            },
                            $arrow;
                        if (hasBorder) {
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
                        if (opts.designMode) {
                            designMode.arrows.push($arrow);
                        }
                    });
                    DOM.$svg.hide();
                    if (opts.designMode) {
                        designMode.UI.init();
                    }
                    $("body").append(DOM.$svg);
                }
            },
            DOM = {
                $svg: null,
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
                    getMarker: function (type, id, hasBorder) {
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
                                return $marker.append(this.getMarkerShape(type, optsMarker, hasBorder));
                            }
                        }
                        return null;
                    },
                    getMarkerShape: function (type, optsMarker, hasBorder) {
                        var style = 'fill:' + opts.arrows.strokeColor +
                            (hasBorder ? '; stroke:' + opts.arrows.borderColor + '; stroke-width:' + opts.arrows.borderWidth/2 : '');
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
                    initMarker: function (type, id, hasBorder) {
                        var $marker = this.getMarker(type, id, hasBorder);
                        if ($marker) {
                            if (!this.$defs) {
                                this.$defs = DOM.createSvgDom('defs');
                            }
                            this.$defs.append($marker);
                        }
                    },
                    init: function (hasBorder) {
                        this.initMarker(opts.arrows.startMarker.type, 'start', hasBorder);
                        this.initMarker(opts.arrows.midMarker.type, 'mid', hasBorder);
                        this.initMarker(opts.arrows.endMarker.type, 'end', hasBorder);
                        return this.$defs;
                    },
                    getDesignModePoint: function (pnt) {
                        var maxSize = Math.max(opts.arrows.startMarker.size, Math.max(opts.arrows.midMarker.size, opts.arrows.endMarker.size)),
                            $point = DOM.createSvgDom('circle', {
                                cx: pnt.x,
                                cy: pnt.y,
                                r: maxSize/1.5,
                                style: 'fill:transparent; stroke:rgba(255,0,0,.5); stroke-width:3'
                            });
                        $point.mouseover(function () {
                            $point.css({
                                'stroke': 'red',
                                'cursor': 'move'
                            });
                        }).mousedown(function (a,b) {
                            designMode.UI.dragInfo.draggingPoint = $(this);
                            $point.css('cursor', 'none');
                        }).mouseup(function (a,b) {
                            $point.css('cursor', 'move');
                        }).mouseleave(function () {
                            $point.css({
                                'stroke': 'rgba(255,0,0,.5)',
                                'cursor': ''
                            });
                        });
                        return $point;
                    }
                }
            },
            designMode = {
                arrows: [],
                UI: {
                    dragInfo: {
                        draggingPoint: null
                    },
                    points: {
                        $start: null,   // jQuery object with length 1, since all arrows share the same starting point
                        $mid: null,     // jQuery object with length 0 or greater
                        $end: null      // jQuery object with length 1 or greater
                    },
                    init: function () {
                        DOM.$svg.mousemove(function (e) {
                            if (designMode.UI.dragInfo.draggingPoint) {
                                designMode.UI.dragInfo.draggingPoint.attr({
                                    'cx': e.pageX,
                                    'cy': e.pageY
                                });
                            }
                        }).mouseup(function () {
                            designMode.UI.dragInfo.draggingPoint = null;
                        });

                        // insert point anchors to the DOM
                        this.points.$start = DOM.markers.getDesignModePoint(data.points.start);

                        data.points.$mid.each(function (index, pnts) {
                            for(var pnt in pnts) {
                                var $p = DOM.markers.getDesignModePoint(pnts[pnt]);
                                designMode.UI.points.$mid = designMode.UI.points.$mid === null ? $p : designMode.UI.points.$mid.add($p);
                            }
                        });
                        data.points.$end.each(function (index, pnt) {
                            var $p = DOM.markers.getDesignModePoint(pnt);
                            designMode.UI.points.$end = designMode.UI.points.$end === null ? $p : designMode.UI.points.$end.add($p);
                        });
                        DOM.$svg.append(this.points.$start).append(this.points.$mid).append(this.points.$end);
                    }
                },
                init: function () {
                    var $window = $(window),
                        $document = $(document),
                        docWidth = $document.width(),
                        docHeight = $document.height(),
                        doResize = function () {
                            DOM.$svg.attr({
                                'width': Math.max($window.width(), docWidth) + 'px',
                                'height': Math.max($window.height(), docHeight) + 'px'
                            });
                        };
                    DOM.$svg.css('background-color', 'rgba(255,255,255,.7)');
                    $window.resize(doResize);
                    doResize();
                    events.onShow();
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
                    $elem.
                        unbind('mouseenter.rsRefPointer focus.rsRefPointer', events.onShow).
                        unbind('mouseleave.rsRefPointer blur.rsRefPointer', events.oneHide).
                        unbind('destroy.rsRefPointer', events.onDestroy);
                    DOM.$svg.remove(); 
                }
            };

        data.init();
        if (opts.designMode) {
            designMode.init();
        } else {
            $elem.
                bind('mouseenter.rsRefPointer focus.rsRefPointer', events.onShow).
                bind('mouseleave.rsRefPointer blur.rsRefPointer', events.onHide).
                bind('destroy.rsRefPointer', events.onDestroy);
        }
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
        if (options.designMode && this.length > 1) {
            alert('Design mode is not possible for ' + this.length + ' simultaneous plug-in instances!\n' +
                  'Make sure you invoke design mode for one instance only.\n\nE.g. if you have 2 anchors on your page, then this fails:\n' + 
                  '   $("a").rsRefPointer({ designMode: true });\n' + 
                  'What you need is to run for the first only:\n' +
                  '   $("a").eq(0).rsRefPointer({ designMode: true });\n' +
                  'then edit previous line and run for the second one:\n' +
                  '   $("a").eq(1).rsRefPointer({ designMode: true });\n\n' +
                  'This restriction does not aply at run-time mode.\nMultiple instances are allowed:\n' +
                  '   $("a").rsRefPointer({ designMode: false });');
            options.designMode = false;
        }
        var opts = $.extend({}, $.fn.rsRefPointer.defaults, options);
        opts.arrows = $.extend({}, $.fn.rsRefPointer.defaults.arrows, options ? options.arrows : options);
        opts.arrows.markers = $.extend({}, $.fn.rsRefPointer.defaults.arrows.markers, options ? (options.arrows ? options.arrows.markers : options.arrows) : options);
        return this.each(function () {
            new RefPointerClass($(this), opts);
        });
    };

    // public access to the default input parameters
    $.fn.rsRefPointer.defaults = {
        designMode: false,
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