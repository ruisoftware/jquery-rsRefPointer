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
                arrowTypes: [],    // Specifies the type of each arrow: 'line', 'polyline' and 'path' (for bezier arrows)
                outline: false,    // Whether each row has an outline border
                $targets: null,
                svgPos: {},
                points: {
                    start: null,   // Starting points for all arrows, e.g. points for 3 arrows, consisting of a bezier, a straight line and a polyline, is
                                   // [ {x: 4, y: 6}, {x: 4, y: 6}, {x: 9, y: 8} ]. By default, all arrows start from the same point.
                    mid: null,     // Array of arrays of middle points, if any. The inner array represents the middle points for each arrow,
                                   //   [ [{x:3, y:2}, {x:10, y:10}], [], [{x:50, y:40}] ]
                    end: null,     // Array for all destinations points, e.g.
                                   //   [ {x:15, y:15}, {x:18, y:-6}, {x:55, y:45} ]
                    // The length of arrowTypes, start, mid, end and offsets is always the same.

                    // The below data structure is used to compute layout changes, i.e. if the from/to location changes, the arrows should follow these elements.
                    layout: {
                        fromOffset: [],   // Array of offsets {dx, dy}. Each arrow starting point (data.points.start) equals to $elem.position() + points.layout.fromOffset[i]
                        toOffset: [],     // Array of offsets {dx, dy}. Each arrow ending point (data.points.end) equals to $target.offset() + points.layout.toOffset[i]
                        topLeft: [],      // Array of {x, y}
                        bottomRight: []   // Array of {x, y}
                    },
                    refreshPositions: function () {
                        if (this.points.start.length > 0) {
                            var oldPos = {
                                    x: this.points.start[0].x - this.layout.fromOffset[0].dx,
                                    y: this.points.start[0].y - this.layout.fromOffset[0].dy
                                },
                                newPos = $elem.offset(),
                                matrix = [],
                                fromPositionChanged = !util.samePoint(oldPos.x, newPos.left) || !util.samePoint(oldPos.y, newPos.top),
                                somePositionChanged = fromPositionChanged;

                            data.$targets.each(function (index, e) {
                                data.points.start[index].x = newPos.left + data.points.layout.fromOffset[index].dx;
                                data.points.start[index].y = newPos.top + data.points.layout.fromOffset[index].dy;
                                var $target = $(e),
                                    targetPos = $target.offset(),
                                    toPositionChanged = !util.samePoint(targetPos.left, data.points.end[index].x - data.points.layout.toOffset[index].dx) ||
                                                        !util.samePoint(targetPos.top, data.points.end[index].y - data.points.layout.toOffset[index].dy),
                                    before = {
                                        top: Math.min(oldPos.y, this.points.end[index].y - this.layout.toOffset[index].dy),
                                        left: Math.min(oldPos.x, this.points.end[index].x - this.layout.toOffset[index].dx)
                                    },
                                    after = {
                                        top: Math.min(newPos.top, targetPos.top),
                                        left: Math.min(newPos.left, targetPos.left)
                                    };
                                    before.width = Math.max(oldPos.x, data.points.to.point[index].x) - before.left;
                                    before.height = Math.max(oldPos.y, data.points.to.point[index].y) - before.top;
                                    after.width = Math.max(newPos.left, targetPos.left) - after.left;
                                    after.height = Math.max(newPos.top, targetPos.top) - after.top;
                                    var widthFactor = util.areTheSame(before.width, 0) ? 1 : after.width / before.width,
                                        heightFactor = util.areTheSame(before.height, 0) ? 1 : after.height / before.height;

                                matrix.push({
                                    factor: {
                                        x: widthFactor,
                                        y: heightFactor
                                    },
                                    center: {
                                        x: util.areTheSame(widthFactor, 1) ? 0 : (after.left - before.left*widthFactor)/(1 - widthFactor),
                                        y: util.areTheSame(heightFactor, 1) ? 0 : (after.top - before.top*heightFactor)/(1 - heightFactor)
                                    },
                                    translation: {
                                        x: after.left - before.left,
                                        y: after.top - before.top
                                    }
                                });
                                if (toPositionChanged) {
                                    data.points.to.point[index].x = targetPos.left;
                                    data.points.to.point[index].y = targetPos.top;
                                    data.points.end[index].x = targetPos.left + data.points.to.offset[index].dx;
                                    data.points.end[index].y = targetPos.top + data.points.to.offset[index].dy;
                                }
                                somePositionChanged = somePositionChanged || toPositionChanged;
                            });
                        }
                        return somePositionChanged ? matrix : null;
                    },
                    transformMidPoints: function (matrix) {
                        if (matrix !== null) {
                            var arrowMatrix, pnt;
                            for (var i in matrix) {
                                arrowMatrix = matrix[i];
                                if (!util.areTheSame(arrowMatrix.factor.x, 1) || !util.areTheSame(arrowMatrix.factor.y, 1)) {
                                    for (var pntIdx in this.mid[i]) {
                                        pnt = this.mid[i][pntIdx];
                                        if (!util.areTheSame(arrowMatrix.factor.x, 1)) {
                                            pnt.x = arrowMatrix.center.x + (pnt.x - arrowMatrix.center.x)*arrowMatrix.factor.x;
                                        }
                                        if (!util.areTheSame(arrowMatrix.factor.y, 1)) {
                                            pnt.y = arrowMatrix.center.y + (pnt.y - arrowMatrix.center.y)*arrowMatrix.factor.y;
                                        }
                                        //pnt.x += arrowMatrix.translation.x;
                                        //pnt.y += arrowMatrix.translation.y;
                                    }
                                }
                            }
                            var bounds = data.getBoundsRect();
                            data.svgPos.x = bounds.left;
                            data.svgPos.y = bounds.top;
                            DOM.$svg.css({
                                left: bounds.left + 'px',
                                top: bounds.top + 'px'
                            }).attr({
                                width: (bounds.right - bounds.left) + 'px',
                                height: (bounds.bottom - bounds.top) + 'px'
                            });
                            data.$targets.each(function (index) {
                                DOM.updateArrow(index);
                            });
                        }
                    },
                    init: function () {
                        data.$targets = opts.targetSelector ? $(opts.targetSelector) : $();
                        $elem.add(data.$targets).each(function (index, e) {
                            var $e = $(e);
                            if ($e.css('white-space') !== 'nowrap') {
                                $e.css('white-space', 'nowrap');
                            }
                        });

                        var pos = $elem.offset(),
                            fromOffset = {
                                dx: $elem.width()/2,
                                dy: $elem.height()/2
                            },
                            startPoint = {
                                x: pos.left + fromOffset.dx,
                                y: pos.top + fromOffset.dy
                            };
                        this.start = [];
                        this.mid = [];
                        this.end = [];
                        data.$targets.each(function (index, e) {
                            // TODO
                            if (data.arrowTypes.length == 1) {
                                data.arrowTypes.push('polyline');
                            } else {
                                data.arrowTypes.push('line');
                            }

                            data.points.start.push(startPoint);
                            data.points.layout.fromOffset.push(fromOffset);
                            
                            // TODO
                            if (data.arrowTypes.length == 2) {
                                data.points.mid.push([{x: 10, y: 10}, {x: 50, y: 0}]);
                            } else {
                                data.points.mid.push([]);
                            }

                            var $target = $(e),
                                targetPos = $target.offset(),
                                // this is way to retrieve the content dimensions for blocked elements
                                $targetSpan = $target.wrapInner("<span style='display: inline;'>").children("span"),
                                toOffset = {
                                    dx: $targetSpan.width()/2,
                                    dy: $targetSpan.height()/2
                                };
                            $targetSpan.contents().unwrap();
                            data.points.layout.toOffset.push(toOffset);
                            data.points.end.push({
                                x: targetPos.left + toOffset.dx,
                                y: targetPos.top + toOffset.dy
                            });

                            var topLeft = {
                                    x: data.points.start[index].x,
                                    y: data.points.start[index].y
                                }, bottomRight = {
                                    x: data.points.start[index].x,
                                    y: data.points.start[index].y
                                };
                            data.points.mid[index].forEach(function (e) {
                                topLeft.x = Math.min(topLeft.x, e.x);
                                topLeft.y = Math.min(topLeft.y, e.y);
                                bottomRight.x = Math.max(bottomRight.x, e.x);
                                bottomRight.y = Math.max(bottomRight.y, e.y);
                            });
                            topLeft.x = Math.min(topLeft.x, data.points.end[index].x);
                            topLeft.y = Math.min(topLeft.y, data.points.end[index].y);
                            bottomRight.x = Math.max(bottomRight.x, data.points.end[index].x);
                            bottomRight.y = Math.max(bottomRight.y, data.points.end[index].y);
                            data.points.layout.topLeft.push(topLeft);
                            data.points.layout.bottomRight.push(bottomRight);
                        });
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
                            'pointer-events': 'none',


                            // for debuging purposes only
                            'background-color': 'rgba(100,0,0,.1)'
                        };
                    data.svgPos.x = bounds.left;
                    data.svgPos.y = bounds.top;
                    DOM.$svg = DOM.createSvgDom('svg', {
                        width: (bounds.right - bounds.left) + 'px',
                        height: (bounds.bottom - bounds.top) + 'px',
                        xmlns: this.ns,
                        version: '1.1',
                        class: this.svgClass
                    }).css(css);

                    DOM.$svg.append(DOM.markers.init());

                    this.points.end.forEach(function (e, index) {
                        var attrs = DOM.getShapeAttrs(index), $arrow;
                        switch (data.arrowTypes[index]) {
                            case 'polyline':
                                attrs.fill = 'none';
                                attrs['stroke-linejoin'] = 'round';
                                // yes, no break here
                            case 'line':
                                attrs['stroke-linecap'] = 'round';
                                break;
                        }
                        if (data.outline) {
                            attrs.stroke = opts.arrows.borderColor;
                            attrs['stroke-width'] = opts.arrows.borderWidth*2 + opts.arrows.strokeWidth;
                            DOM.$svg.append(DOM.createSvgDom(data.arrowTypes[index], attrs));
                        }
                        attrs.stroke = opts.arrows.strokeColor;
                        attrs['stroke-width'] = opts.arrows.strokeWidth;
                        ['start', 'mid', 'end'].forEach(function (e) { 
                            if (DOM.markers.ids[e]) {
                                attrs['marker-' + e] = 'url(#' + DOM.markers.ids[e] + ')';
                            }
                        });
                        $arrow = DOM.createSvgDom(data.arrowTypes[index], attrs);
                        DOM.$svg.append($arrow);
                        DOM.arrows.push($arrow);
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
                },
                getShapeAttrs: function (index) {
                    var pointToStr = function (pnt) {
                        return (Math.round(pnt.x - data.svgPos.x) + .5) + ',' + 
                               (Math.round(pnt.y - data.svgPos.y) + .5);
                    };
                    switch (data.arrowTypes[index]) {
                        case 'line':
                            return {
                                x1: Math.round(data.points.start[index].x - data.svgPos.x) + .5,
                                y1: Math.round(data.points.start[index].y - data.svgPos.y) + .5,
                                x2: Math.round(data.points.end[index].x - data.svgPos.x) + .5,
                                y2: Math.round(data.points.end[index].y - data.svgPos.y) + .5
                            };
                        case 'polyline':
                            return {
                                points: pointToStr(data.points.start[index]) +
                                        ',' + 
                                        data.points.mid[index].map(function(e) {
                                            return pointToStr(e);
                                        }).join(",") +
                                        ',' +
                                        pointToStr(data.points.end[index])
                            };
                    }
                },
                updateArrow: function (index) {
                    this.arrows[index].add(data.outline ? this.arrows[index].prev() : null).attr(this.getShapeAttrs(index));
                }
            },
            events = {
                onShow: function () {
                    data.points.transformMidPoints(data.points.refreshPositions());
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
            },
            util = {
                areTheSame: function (a, b, precision) {
                    return Math.abs(a - b) < (precision ? precision : 0.000005);
                },
                samePoint: function (a, b) {
                    return this.areTheSame(a, b, .5);
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