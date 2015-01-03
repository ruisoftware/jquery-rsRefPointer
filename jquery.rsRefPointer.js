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
                arrowTypes: [],    // Specifies the type of each arrow: 'line', 'polyline', 'bezierQ' and 'bezierC'
                outline: false,    // Whether each row has an outline border
                $targets: null,
                shapeRelSize: {
                    pointer: 8,
                    pointer2: 8,
                    circle: 6.5,
                    square: 6.5,
                    getSize: function (type) {
                        return ((opts.marker.size - 1)*0.25 + 1)*this[type];
                    }
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
                            // this is way to retrieve the content dimensions for blocked elements
                            $elemSpan = $elem.wrapInner('<span style="display: inline;">').children('span'),
                            fromOffset = {
                                dx: $elemSpan.width()/2,
                                dy: $elemSpan.height()/2
                            };
                        $elemSpan.contents().unwrap();
                        this.start = {
                            x: pos.left,
                            y: pos.top
                        };
                        this.mid = [];
                        this.end = [];
                        data.$targets.each(function (index, e) {
                            // TODO
                            switch (data.arrowTypes.length) {
                                case 1: data.arrowTypes.push('polyline'); break;
                                case 2: data.arrowTypes.push('bezierQ'); break;
                                case 3: data.arrowTypes.push('bezierC'); break;
                                default: data.arrowTypes.push('line');
                            }

                            data.points.layout.fromOffset.push({
                                dx: fromOffset.dx,
                                dy: fromOffset.dy
                            });

                            // TODO
                            switch (data.arrowTypes.length) {
                                case 2: data.points.mid.push([{x: 100, y: 30}, {x: 150, y: 10}]); break;
                                case 3: data.points.mid.push([{x: 400, y: 230}]); break;
                                case 4: data.points.mid.push([{x: 300, y: 330}, {x: 500, y: 320}]); break;
                                default: data.points.mid.push([]);
                            }

                            var $target = $(e),
                                targetPos = $target.offset(),
                                // this is way to retrieve the content dimensions for blocked elements
                                $targetSpan = $target.wrapInner('<span style="display: inline;">').children('span'),
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
                    if (opts.shadow.visible) {
                        bounds.top -= opts.shadow.offsetY > 0 ? 0 : - opts.shadow.offsetY - opts.shadow.blur;
                        bounds.left -= opts.shadow.offsetX > 0 ? 0: - opts.shadow.offsetX - opts.shadow.blur;
                        bounds.right += opts.shadow.offsetX > 0 ? opts.shadow.offsetX + opts.shadow.blur : 0;
                        bounds.bottom += opts.shadow.offsetY > 0 ? opts.shadow.offsetY + opts.shadow.blur: 0;
                    }
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
                        DOM.createArrow(index);
                    });
                    DOM.$svg.hide();
                    $('body').append(DOM.$svg);
                    events.bindAll();
                }
            },
            DOM = {
                $svg: null,
                arrows: [],
                arrowsShadow: [],
                $shadowGroup: null,
                createSvgDom: function (tag, attrs) {
                    var el = document.createElementNS(data.ns, tag);
                    for (var k in attrs) {
                        el.setAttribute(k, attrs[k]);
                    }
                    return $(el);
                },
                updateSvgAttrs: function (svgElem, attrs) {
                    for (var k in attrs) {
                        svgElem.setAttribute(k, attrs[k]);
                    }
                },
                getStrokeWidthForOutlineArrow: function () {
                    return opts.outline.width*opts.stroke.width + opts.stroke.width;
                },
                getStrokeWidthForShape: function () {
                    return opts.outline.width/2;
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
                    getMarkerAttrs: function (type, size) {
                        switch (type) {
                            case 'pointer':
                            case 'pointer2':
                                return {
                                    markerWidth: size + 2,
                                    markerHeight: size/1.25 + 2,
                                    refX: size/2 - 1,
                                    refY: size/2.5
                                };
                            case 'circle':
                            case 'square':
                                return {
                                    markerWidth: size + 2,
                                    markerHeight: size + 2,
                                    refX: size/2 + 1,
                                    refY: size/2 + 1
                                };
                        }
                        return null;
                    },
                    getMarker: function (type, id, getIdsCallback, shade) {
                        if (type === null) {
                            return null;
                        }
                        var $marker = null,
                            ids = getIdsCallback(),
                            getNewId = function () {
                                return ids[id] = 'refP' + $('svg.' + data.svgClass).length + id.charAt(0) + (+ new Date());
                            },
                            size = data.shapeRelSize.getSize(type),
                            attrs = this.getMarkerAttrs(type, size);
                        ids[id] = getNewId();
                        attrs.id = ids[id];
                        switch (type) {
                            case 'pointer':
                            case 'pointer2':
                                attrs.orient = 'auto';
                                break;
                            case 'circle':
                            case 'square': break;
                            default:
                                return null;
                        }
                        return DOM.createSvgDom('marker', attrs).append(this.getMarkerShape(type, size, shade));
                    },
                    getMarkerShapeData: function (type, size, shade) {
                        var attrs;
                        switch (type) {
                            case 'pointer':
                                attrs = {
                                    d: 'M1,1 L1,' + (size/1.25) + ' L' + size + ',' + (size/2.5) + ' z'
                                };
                                break;
                            case 'pointer2':
                                attrs = {
                                    d: 'M' + (size/4) + ',' + (size/2.5) + ' L1,' + (size/1.25) + ' L' + size + ',' + (size/2.5) + ' L1,1 z'
                                };
                                break;
                            case 'circle':
                                attrs = {
                                    cx: size/2 + 1,
                                    cy: size/2 + 1,
                                    r: size/2
                                };
                                break;
                            case 'square':
                                attrs = {
                                    x: 1,
                                    y: 1,
                                    width: size,
                                    height: size,
                                    rx: 2,
                                    ry: 2
                                };
                                break;
                            default:
                                return null;
                        }
                        attrs.fill = (shade ? opts.shadow.color : opts.stroke.color);
                        if (data.outline) {
                            attrs.stroke = shade ? opts.shadow.color : opts.outline.color;
                            attrs['stroke-width'] = DOM.getStrokeWidthForShape();
                        }
                        return attrs;
                    },
                    getMarkerShape: function (type, size, shade) {
                        var style = this.getMarkerShapeData(type, size, shade);
                        if (style !== null) {
                            switch (type) {
                                case 'pointer':
                                case 'pointer2':
                                    return DOM.createSvgDom('path', style);
                                case 'circle':
                                    return DOM.createSvgDom('circle', style);
                                case 'square':
                                    return DOM.createSvgDom('rect', style);
                            }
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
                getShapeAttrs : function (index, shadeOffset) {
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
                        case 'bezierQ':
                            return {
                                d:  'M' + pointToStr(data.points.start, data.points.layout.fromOffset[index]) + ' ' +
                                    data.points.mid[index].map(function (e, i) {
                                        var point = data.points.getMidPoint(e, index),
                                            pointStr = pointToStr(point, shadeOffset);
                                        switch (i) {
                                            case 0: return 'Q' + pointStr + ' ';
                                            case 1: return pointStr + ' ';
                                            default: return i % 2 === 1 ? 'T' + pointStr + ' ': '';
                                        } 
                                    }).join('') +
                                    (data.points.mid[index].length === 1 ? '' : 'T') + pointToStr(data.points.end[index], data.points.layout.toOffset[index])
                            };
                        case 'bezierC':
                            return {
                                d:  'M' + pointToStr(data.points.start, data.points.layout.fromOffset[index]) + ' ' +
                                    data.points.mid[index].map(function (e, i) {
                                        var point = data.points.getMidPoint(e, index),
                                            pointStr = pointToStr(point, shadeOffset);
                                        switch (i) {
                                            case 0: return 'C' + pointStr + ' ';
                                            case 1:
                                            case 2: return pointStr + ' ';
                                            default: return i % 3 === 0 ? '': (((i - 1) % 3 === 0 ? 'S' : '') + pointStr + ' ');
                                        } 
                                    }).join('') + pointToStr(data.points.end[index], data.points.layout.toOffset[index])
                            };
                        case 'polyline':
                            return {
                                points: pointToStr(data.points.start, data.points.layout.fromOffset[index]) + ', ' + 
                                        data.points.mid[index].map(function (e) {
                                            return pointToStr(data.points.getMidPoint(e, index), shadeOffset);
                                        }).join(',') +
                                        ', ' +
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
                },
                getSVGtag: function (arrowType) {
                    return arrowType === 'bezierQ' || arrowType === 'bezierC' ? 'path' : arrowType;
                },
                createOrReplaceArrow: function (index, replace) {
                    var attrs = this.getShapeAttrs(index),
                        attrsShade = this.getShapeAttrs(index, {
                            dx: opts.shadow.offsetX,
                            dy: opts.shadow.offsetY
                        }),
                        $arrowElement;

                    switch (data.arrowTypes[index]) {
                        case 'polyline':
                            attrs['stroke-linejoin'] = 'round';
                            attrsShade['stroke-linejoin'] = 'round';
                            // yes, no break here
                        case 'bezierQ':
                        case 'bezierC':
                            attrs.fill = 'none';
                            attrsShade.fill = 'none';
                            // yes, no break here
                        case 'line':
                            attrs['stroke-linecap'] = 'round';
                            attrsShade['stroke-linecap'] = 'round';
                    }

                    if (opts.shadow.visible) {
                        attrsShade.stroke = opts.shadow.color;
                        attrsShade.filter = 'url(#' + this.markers.ids.filter.shadow + ')';
                        attrsShade['stroke-width'] = opts.stroke.width;
                        ['Start', 'Mid', 'End'].forEach(function (e) { 
                            if (DOM.markers.ids.filter[e]) {
                                attrsShade['marker-' + e.toLowerCase()] = 'url(#' + DOM.markers.ids.filter[e] + ')';
                            }
                        });
                        if (this.$shadowGroup === null && replace !== true) {
                            this.$shadowGroup = this.createSvgDom('g');
                            this.markers.$defs.after(this.$shadowGroup);
                        }
                        $arrowElement = this.createSvgDom(this.getSVGtag(data.arrowTypes[index]), attrsShade);
                        if (replace === true) {
                            this.arrowsShadow[index].replaceWith($arrowElement);
                            this.arrowsShadow[index] = $arrowElement;
                        } else {
                            this.arrowsShadow.push($arrowElement.appendTo(this.$shadowGroup));
                        }
                        
                    }

                    if (data.outline) {
                        attrs.stroke = opts.outline.color;
                        attrs['stroke-width'] = this.getStrokeWidthForOutlineArrow();
                        $arrowElement = this.createSvgDom(this.getSVGtag(data.arrowTypes[index]), attrs);
                        if (replace === true) {
                            this.arrows[index].prev().replaceWith($arrowElement);
                        } else {
                            this.$svg.append($arrowElement);
                        }
                    }

                    attrs.stroke = opts.stroke.color;
                    attrs['stroke-width'] = opts.stroke.width;
                    ['start', 'mid', 'end'].forEach(function (e) { 
                        if (DOM.markers.ids[e]) {
                            attrs['marker-' + e] = 'url(#' + DOM.markers.ids[e] + ')';
                        }
                    });
                    $arrowElement = this.createSvgDom(this.getSVGtag(data.arrowTypes[index]), attrs);
                    if (replace === true) {
                        this.arrows[index].replaceWith($arrowElement);
                        this.arrows[index] = $arrowElement;
                    } else {
                        this.$svg.append($arrowElement);
                        this.arrows.push($arrowElement);
                    }
                },
                createArrow: function (index) {
                    this.createOrReplaceArrow(index);
                },
                replaceArrow: function (index) {
                    this.createOrReplaceArrow(index, true);
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
                },
                byteToHex: function (byte) {
                    return (byte > 15 ? '' : '0') + byte.toString(16);
                }
            };

        data.init();
        return {
            data: data,
            DOM: DOM,
            events: events,
            util: util
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
            end: 'pointer2',
            size: 1
        },
        stroke: {
            color: 'black',
            width: 1.5
        },
        outline: {
            color: '#fff',
            width: 1
        },
        shadow: {
            visible: true,
            color: 'rgba(95,95,95,.7)',
            offsetX: 8,
            offsetY: 8,
            blur: 1
        }
    };
})(jQuery);