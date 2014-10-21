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
                shapeRelSize: {
                    circle: 6.5,
                    square: 6.5,
                    pointer: 8
                },
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
                        toOffset: [],     // Array of offsets {dx, dy}. Each arrow ending point is data.points.end[i] + points.layout.toOffset[i]
                        topLeft: [],      // Array of {x, y}
                        size: []          // Array of {width, height}
                    },
                    refreshPositions: function () {
                        var oldStartPos = {
                                x: data.points.start.x,
                                y: data.points.start.y
                            },
                            newStartPos = $elem.offset(),
                            fromPositionChanged = !util.samePoint(oldStartPos.x, newStartPos.left) || !util.samePoint(oldStartPos.y, newStartPos.top);

                        data.points.start.x = newStartPos.left;
                        data.points.start.y = newStartPos.top;
                        data.$targets.each(function (index, e) {
                            var $target = $(e),
                                targetPos = $target.offset(),
                                toPositionChanged = !util.samePoint(targetPos.left, data.points.end[index].x) ||
                                                    !util.samePoint(targetPos.top, data.points.end[index].y);

                            if (fromPositionChanged || toPositionChanged) {
                                var newTopLeft = data.points.layout.topLeft[index];
                                newTopLeft.x = Math.min(newStartPos.left + data.points.layout.fromOffset[index].dx,
                                                        targetPos.left + data.points.layout.toOffset[index].dx);
                                newTopLeft.y = Math.min(newStartPos.top + data.points.layout.fromOffset[index].dy,
                                                        targetPos.top + data.points.layout.toOffset[index].dy);
                                var newSize = data.points.layout.size[index];
                                newSize.width = Math.max(newStartPos.left + data.points.layout.fromOffset[index].dx,
                                                         targetPos.left + data.points.layout.toOffset[index].dx) - newTopLeft.x;
                                newSize.height = Math.max(newStartPos.top + data.points.layout.fromOffset[index].dy,
                                                          targetPos.top + data.points.layout.toOffset[index].dy) - newTopLeft.y;
                            }

                            if (toPositionChanged) {
                                data.points.end[index].x = targetPos.left;
                                data.points.end[index].y = targetPos.top;
                            }
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
                            if (data.arrowTypes.length == 1) {
                                data.arrowTypes.push('polyline');
                            } else {
                                data.arrowTypes.push('line');
                            }
                            data.points.layout.fromOffset.push({
                                dx: fromOffset.dx,
                                dy: fromOffset.dy
                            });

                            // TODO
                            if (data.arrowTypes.length == 2) {
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
                                    x: Math.min(data.points.start.x + data.points.layout.fromOffset[index].dx,
                                                data.points.end[index].x + data.points.layout.toOffset[index].dx),
                                    y: Math.min(data.points.start.y + data.points.layout.fromOffset[index].dy,
                                                data.points.end[index].y + data.points.layout.toOffset[index].dy)
                                },
                                size = {
                                    width: Math.max(data.points.start.x + data.points.layout.fromOffset[index].dx,
                                                    data.points.end[index].x + data.points.layout.toOffset[index].dx) - topLeft.x,
                                    height: Math.max(data.points.start.y + data.points.layout.fromOffset[index].dy,
                                                     data.points.end[index].y + data.points.layout.toOffset[index].dy) - topLeft.y
                                };

                            // middle points are relative to the width and height, e.g., a point(.2, .5) means that is located 20% (of size.width) to the right of topLeft.x,
                            // and 50% (of size.height) below topLeft.y. Using relative middle points allows an efficient and simple way to repositionate these points,
                            // when the start and end points change (when size and topLeft changes)
                            data.points.mid[index].forEach(function (e) {
                                e.x = util.areTheSame(size.width, 0) ? 0 : (e.x - topLeft.x)/size.width;
                                e.y = util.areTheSame(size.height, 0) ? 0 : (e.y - topLeft.y)/size.height;
                            });
                            data.points.layout.topLeft.push(topLeft);
                            data.points.layout.size.push(size);
                        });
                    },
                    getMidPoint: function (relativePnt, index) {
                        return {
                            x: data.points.layout.topLeft[index].x + relativePnt.x*data.points.layout.size[index].width,
                            y: data.points.layout.topLeft[index].y + relativePnt.y*data.points.layout.size[index].height
                        };
                    }
                },
                getBoundsRect: opts.overrideGetBoundsRect || function () {
                    var bounds = {},
                        setBounds = function (pnt, index, offsetArray) {
                            var x = pnt.x + (offsetArray === undefined ? 0 : offsetArray[index].dx),
                                y = pnt.y + (offsetArray === undefined ? 0 : offsetArray[index].dy);

                            bounds.left = Math.min(bounds.left === undefined ? x : bounds.left, x);
                            bounds.top = Math.min(bounds.top === undefined ? y : bounds.top, y);
                            bounds.bottom = Math.max(bounds.bottom === undefined ? y : bounds.bottom, y);
                            bounds.right = Math.max(bounds.right === undefined ? x : bounds.right, x);
                        },
                        maxSize = Math.max(data.shapeRelSize.circle, Math.max(data.shapeRelSize.square, data.shapeRelSize.pointer));
                    this.points.mid.forEach(function (pnts, index) {
                        for(var pnt in pnts) {
                            setBounds(data.points.getMidPoint(pnts[pnt], index));
                        }
                    });
                    this.points.end.forEach(function (pnt, index) {
                        setBounds(data.points.start, index, data.points.layout.fromOffset);
                        setBounds(pnt, index, data.points.layout.toOffset);
                    });
                    bounds.top -= opts.marker.size*maxSize;
                    bounds.left -= opts.marker.size*maxSize;
                    bounds.right += opts.marker.size*maxSize;
                    bounds.bottom += opts.marker.size*maxSize;
                    return bounds;
                },
                init: function () {
                    this.points.init();
                    this.outline = opts.outline.width && opts.outline.color !== 'transparent';
                    var bounds = this.getBoundsRect(),
                        css = {
                            position: 'absolute',
                            left: bounds.left + 'px',
                            top: bounds.top + 'px',
                            'pointer-events': 'none'


                            // for debuging purposes only
                            ,'background-color': 'rgba(100,0,0,.1)'
                        },
                        $lastShadow = null;
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
                        var attrs = DOM.getShapeAttrs(index),
                            attrsShade = DOM.getShapeAttrs(index, {
                                dx: opts.shadow.offsetX,
                                dy: opts.shadow.offsetY
                            }),
                            $arrow;

                        switch (data.arrowTypes[index]) {
                            case 'polyline':
                                attrs.fill = 'none';
                                attrs['stroke-linejoin'] = 'round';
                                attrsShade.fill = 'none';
                                attrsShade['stroke-linejoin'] = 'round';
                                // yes, no break here
                            case 'line':
                                attrs['stroke-linecap'] = 'round';
                                attrsShade['stroke-linecap'] = 'round';
                                break;
                        }

                        if (opts.shadow.visible) {
                            attrsShade.stroke = opts.shadow.color;
                            attrsShade.filter = 'url(#' + DOM.markers.ids.filter.shadow + ')';
                            attrsShade['stroke-width'] = opts.stroke.width;
                            ['Start', 'Mid', 'End'].forEach(function (e) { 
                                if (DOM.markers.ids.filter[e]) {
                                    attrsShade['marker-' + e.toLowerCase()] = 'url(#' + DOM.markers.ids.filter[e] + ')';
                                }
                            });
                            if ($lastShadow === null) {
                                $lastShadow = DOM.createSvgDom(data.arrowTypes[index], attrsShade).appendTo(DOM.$svg);
                            } else {
                                $lastShadow = DOM.createSvgDom(data.arrowTypes[index], attrsShade).insertAfter($lastShadow);
                            }
                            DOM.arrowsShadow.push($lastShadow);
                        }

                        if (data.outline) {
                            attrs.stroke = opts.outline.color;
                            attrs['stroke-width'] = opts.outline.width*2 + opts.stroke.width;
                            DOM.$svg.append(DOM.createSvgDom(data.arrowTypes[index], attrs));
                        }

                        attrs.stroke = opts.stroke.color;
                        attrs['stroke-width'] = opts.stroke.width;
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
                arrowsShadow: [],
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
                        end: null,
                        filter: {
                            shadow: null,
                            Start: null,
                            Mid: null,
                            End: null
                        }
                    },
                    getMarker: function (type, id, getIdsCallback, shade) {
                        var $marker = null,
                            ids = getIdsCallback(),
                            getNewId = function () {
                                return ids[id] = 'refP' + $('svg.' + data.svgClass).length + id.charAt(0) + (+ new Date());
                            },
                            size = ((opts.marker.size - 1)*0.25 + 1)*data.shapeRelSize[opts.marker[id.toLowerCase()]];
                        switch (opts.marker[id.toLowerCase()]) {
                            case 'circle':
                                ids[id] = getNewId();
                                $marker = DOM.createSvgDom('marker', {
                                    id: ids[id],
                                    markerWidth: size,
                                    markerHeight: size,
                                    refX: Math.round(size/2),
                                    refY: Math.round(size/2)
                                });
                                break;
                            case 'square':
                                ids[id] = getNewId();
                                $marker = DOM.createSvgDom('marker', {
                                    id: ids[id],
                                    markerWidth: size,
                                    markerHeight: size,
                                    refX: Math.round(size/2),
                                    refY: Math.round(size/2)
                                });
                                break;
                            case 'pointer':
                                ids[id] = getNewId();
                                $marker = DOM.createSvgDom('marker', {
                                    id: ids[id],
                                    markerWidth: size,
                                    markerHeight: size/1.25,
                                    refX: Math.round(size - opts.outline.width),
                                    refY: Math.round(size/2.5),
                                    orient: 'auto'
                                });
                        }
                        if ($marker) {
                            return $marker.append(this.getMarkerShape(type, shade, size));
                        }
                        return null;
                    },
                    getMarkerShape: function (type, shade, size) {
                        var style = {
                            fill: (shade ? opts.shadow.color : opts.stroke.color)
                        };
                        if (data.outline) {
                            style.stroke = shade ? opts.shadow.color : opts.outline.color;
                            style['stroke-width'] = opts.outline.width/2;
                        }
                        switch (type) {
                            case 'circle':
                                style.cx = size/2;
                                style.cy = size/2;
                                style.r = size/2 - 1;
                                return DOM.createSvgDom('circle', style);

                            case 'square':
                                style.x = 0;
                                style.y = 0;
                                style.width = size - 1;
                                style.height = size - 1;
                                style.rx = 2;
                                style.ry = 2;
                                return DOM.createSvgDom('rect', style);

                            case 'pointer':
                                style.d = 'M0,0 L0,' + (size/1.25) + ' L' + size + ',' + (size/2.5) + ' z';
                                return DOM.createSvgDom('path', style);
                        }
                        return null;
                    },
                    initMarker: function (type, id, getMarkerId, shade) {
                        var $marker = this.getMarker(type, id, getMarkerId, shade);
                        if ($marker) {
                            if (!this.$defs) {
                                this.$defs = DOM.createSvgDom('defs');
                            }
                            this.$defs.append($marker);
                        }
                    },
                    getFilter: function () {
                        this.ids.filter.shadow = 'refP' + $('svg.' + data.svgClass).length + 'f' + (+ new Date());
                        return DOM.createSvgDom('filter', {
                            id: this.ids.filter.shadow
                        }).append(DOM.createSvgDom('feGaussianBlur', {
                            in: 'SourceGraphic',
                            stdDeviation: opts.shadow.blur
                        }));
                    },
                    initFilter: function () {
                        var $filter = this.getFilter();
                        if ($filter) {
                            if (!this.$defs) {
                                this.$defs = DOM.createSvgDom('defs');
                            }
                            this.$defs.append($filter);
                        }
                    },
                    init: function () {
                        var getMarkerId = function () { return DOM.markers.ids; };
                        this.initMarker(opts.marker.start, 'start', getMarkerId);
                        this.initMarker(opts.marker.mid, 'mid', getMarkerId);
                        this.initMarker(opts.marker.end, 'end', getMarkerId);
                        if (opts.shadow.visible) {
                            this.initFilter();
                            getMarkerId = function () { return DOM.markers.ids.filter; };
                            this.initMarker(opts.marker.start, 'Start', getMarkerId, true);
                            this.initMarker(opts.marker.mid, 'Mid', getMarkerId, true);
                            this.initMarker(opts.marker.end, 'End', getMarkerId, true);
                        }
                        return this.$defs;
                    }
                },
                getShapeAttrs: function (index, shadeOffset) {
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
                                            var point = data.points.getMidPoint(e, index);
                                            return shadeOffset ? pointToStr(point, shadeOffset) : pointToStr(point);
                                        }).join(",") +
                                        ',' +
                                        pointToStr(data.points.end[index], data.points.layout.toOffset[index])
                            };
                    }
                },
                getArrow: function (index) {
                    if (data.outline) {
                        return this.arrows[index].add(this.arrows[index].prev());
                    }
                    return this.arrows[index];
                },
                updateArrow: function (index) {
                    this.getArrow(index).attr(this.getShapeAttrs(index));
                    if (opts.shadow.visible) {
                        DOM.arrowsShadow[index].attr(this.getShapeAttrs(index, {
                            dx: opts.shadow.offsetX,
                            dy: opts.shadow.offsetY
                        }));
                    }
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


                    // TODO: clean all data structures


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
        opts.marker = $.extend({}, $.fn.rsRefPointer.defaults.marker, options ? options.marker : options);
        opts.stroke = $.extend({}, $.fn.rsRefPointer.defaults.stroke, options ? options.stroke : options);
        opts.outline = $.extend({}, $.fn.rsRefPointer.defaults.outline, options ? options.outline : options);
        opts.shadow = $.extend({}, $.fn.rsRefPointer.defaults.shadow, options ? options.shadow : options);
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
        targetSelector: '.target',
        marker: {
            start: 'circle',
            mid: 'square',
            end: 'pointer',
            size: 1
        },
        stroke: {
            color: 'black',
            width: 2
        },
        outline: {
            color: '#ddd',
            width: 1.5
        },
        shadow: {
            visible: true,
            color: 'rgba(85,85,85,.75)',
            offsetX: 8,
            offsetY: 8,
            blur: 1
        }
    };
})(jQuery);