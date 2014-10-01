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
                    start: null,   // Starting point for all arrows. Each row starts from a point that is points.start + points.layout.fromOffset.
                                   //   {x, y}. The following is an example for 3 arrows: one bezier, a straight line and a polyline.
                    mid: null,     // Array of arrays of middle points, if any. The inner array represents the middle points for each arrow,
                                   //   [ [{x, y}, {x, y}], [], [{x, y}] ]
                    end: null,     // Destinations point for all arrows. Each row ends in a point that is points.end[i] + points.layout.toOffset[i].
                                   //   [{x, y}, {x, y}, {x, y}]
                    // The length of arrowTypes, mid, end, layout.fromOffset, layout.toOffset, layout.topLeft, layout.bottomRight are always the same.

                    // The below data structure is used to compute layout changes, i.e. if the from/to location changes, the arrows should follow these elements.
                    layout: {
                        fromOffset: [],   // Array of offsets {dx, dy}. Each arrow starting point is data.points.start + points.layout.fromOffset[i]
                        toOffset: [],     // Array of offsets {dx, dy}. Each arrow ending point is data.points.end + points.layout.toOffset[i]
                        topLeft: [],      // Array of {x, y}
                        bottomRight: []   // Array of {x, y}
                    },
                    refreshPositions: function () {
                        var oldStartPos = {
                                x: data.points.start.x,
                                y: data.points.start.y
                            },
                            newStartPos = $elem.offset(),
                            fromPositionChanged = !util.samePoint(oldStartPos.x, newStartPos.left) || !util.samePoint(oldStartPos.y, newStartPos.top),
                            somePositionChanged = fromPositionChanged;

                        data.points.start.x = newStartPos.left;
                        data.points.start.y = newStartPos.top;
                        data.$targets.each(function (index, e) {
                            var $target = $(e),
                                targetPos = $target.offset(),
                                toPositionChanged = !util.samePoint(targetPos.left, data.points.end[index].x) ||
                                                    !util.samePoint(targetPos.top, data.points.end[index].y),
                                before = {
                                    top: Math.min(oldStartPos.y, data.points.end[index].y),
                                    left: Math.min(oldStartPos.x, data.points.end[index].x)
                                },
                                after = {
                                    top: Math.min(newStartPos.top, targetPos.top),
                                    left: Math.min(newStartPos.left, targetPos.left)
                                },
                                pnt;

                            before.width = Math.max(oldStartPos.x, data.points.end[index].x) - before.left;
                            before.height = Math.max(oldStartPos.y, data.points.end[index].y) - before.top;
                            after.width = Math.max(newStartPos.left, targetPos.left) - after.left;
                            after.height = Math.max(newStartPos.top, targetPos.top) - after.top;
                            var widthFactor = util.areTheSame(before.width, 0) ? 1 : after.width / before.width,
                                heightFactor = util.areTheSame(before.height, 0) ? 1 : after.height / before.height,
                                center = {
                                    x: util.areTheSame(widthFactor, 1) ? 0 : (after.left - before.left*widthFactor)/(1 - widthFactor),
                                    y: util.areTheSame(heightFactor, 1) ? 0 : (after.top - before.top*heightFactor)/(1 - heightFactor)
                                };

                            if (!util.areTheSame(widthFactor, 1) || !util.areTheSame(heightFactor, 1)) {
                                for (var pntIdx in data.points.mid[index]) {
                                    pnt = data.points.mid[index][pntIdx];
                                    pnt.x = center.x + (pnt.x - center.x)*widthFactor;
                                    pnt.y = center.y + (pnt.y - center.y)*heightFactor;
                                }
                            }

                            if (toPositionChanged) {
                                data.points.end[index].x = targetPos.left;
                                data.points.end[index].y = targetPos.top;
                            }
                            somePositionChanged = somePositionChanged || toPositionChanged;
                        });

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
                            };
                        this.start = {
                            x: pos.left,
                            y: pos.top
                        };
                        this.mid = [];
                        this.end = [];
                        data.$targets.each(function (index, e) {
                            // TODO
                            if (data.arrowTypes.length == 0) {
                                data.arrowTypes.push('polyline');
                            } else {
                                data.arrowTypes.push('line');
                            }
                            data.points.layout.fromOffset.push(fromOffset);

                            // TODO
                            if (data.arrowTypes.length == 1) {
                                data.points.mid.push([{x: 100, y: 10}, {x: 150, y: 0}]);
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
                                x: targetPos.left,
                                y: targetPos.top
                            });

                            var topLeft = {
                                    x: data.points.start.x + data.points.layout.fromOffset[index].dx,
                                    y: data.points.start.y + data.points.layout.fromOffset[index].dy
                                }, bottomRight = {
                                    x: topLeft.x,
                                    y: topLeft.y
                                };
                            data.points.mid[index].forEach(function (e) {
                                topLeft.x = Math.min(topLeft.x, e.x);
                                topLeft.y = Math.min(topLeft.y, e.y);
                                bottomRight.x = Math.max(bottomRight.x, e.x);
                                bottomRight.y = Math.max(bottomRight.y, e.y);
                            });
                            topLeft.x = Math.min(topLeft.x, data.points.end[index].x + data.points.layout.toOffset[index].dx);
                            topLeft.y = Math.min(topLeft.y, data.points.end[index].y + data.points.layout.toOffset[index].dy);
                            bottomRight.x = Math.max(bottomRight.x, data.points.end[index].x + data.points.layout.toOffset[index].dx);
                            bottomRight.y = Math.max(bottomRight.y, data.points.end[index].y + data.points.layout.toOffset[index].dy);
                            data.points.layout.topLeft.push(topLeft);
                            data.points.layout.bottomRight.push(bottomRight);
                        });
                    }
                },
                getBoundsRect: opts.overrideGetBoundsRect || function () {
                    var bounds = {},
                        maxOffset = Math.max(opts.arrows.startMarker.size, Math.max(opts.arrows.midMarker.size, opts.arrows.endMarker.size)),
                        setBounds = function (pnt, index, offsetArray) {
                            var x = pnt.x + (offsetArray === undefined ? 0 : offsetArray[index].dx),
                                y = pnt.y + (offsetArray === undefined ? 0 : offsetArray[index].dy);

                            bounds.left = Math.min(bounds.left === undefined ? x : bounds.left, x);
                            bounds.top = Math.min(bounds.top === undefined ? y : bounds.top, y);
                            bounds.bottom = Math.max(bounds.bottom === undefined ? y : bounds.bottom, y);
                            bounds.right = Math.max(bounds.right === undefined ? x : bounds.right, x);
                        };
                    this.points.mid.forEach(function (pnts, index) {
                        for(var pnt in pnts) {
                            setBounds(pnts[pnt]);
                        }
                    });
                    this.points.end.forEach(function (pnt, index) {
                        setBounds(data.points.start, index, data.points.layout.fromOffset);
                        setBounds(pnt, index, data.points.layout.toOffset);
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
                    var getX = function (pnt, offset) {
                            return Math.round(pnt.x + (offset ? offset.dx : 0) - data.svgPos.x) + .5;
                        },
                        getY = function (pnt, offset) {
                            return Math.round(pnt.y + (offset ? offset.dy : 0) - data.svgPos.y) + .5;
                        },
                        pointToStr = function (pnt, offset) {
                            return getX(pnt, offset) + ',' + getY(pnt, offset);
                        };
                    switch (data.arrowTypes[index]) {
                        case 'line':
                            return {
                                x1: getX(data.points.start, data.points.layout.fromOffset[index]),
                                y1: getY(data.points.start, data.points.layout.fromOffset[index]),
                                x2: getX(data.points.end[index], data.points.layout.toOffset[index]),
                                y2: getY(data.points.end[index], data.points.layout.toOffset[index])
                            };
                        case 'polyline':
                            return {
                                points: pointToStr(data.points.start, data.points.layout.fromOffset[index]) +
                                        ',' + 
                                        data.points.mid[index].map(function(e) {
                                            return pointToStr(e);
                                        }).join(",") +
                                        ',' +
                                        pointToStr(data.points.end[index], data.points.layout.fromOffset[index])
                            };
                    }
                },
                updateArrow: function (index) {
                    this.arrows[index].add(data.outline ? this.arrows[index].prev() : null).attr(this.getShapeAttrs(index));
                }
            },
            events = {
                onShow: function () {
                    data.points.refreshPositions();
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