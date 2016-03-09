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
    'use strict';
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
                    circle: 4,
                    square: 4,
                    getSize: function (type) {
                        return ((opts.marker.size - 1) * 0.25 + 1) * this[type];
                    }
                },
                svgPos: {},
                points: {
                    start: null,   // Starting point for all arrows. Each row starts from a point that is points.start + points.layout.fromOffset.
                                   //   {x, y}. The following is an example for 3 arrows: one bezier, a straight line and a polyline.
                    mid: null,     // Array of arrays of middle points, if any. The inner array represents the middle points for each arrow,
                                   //   [ [{x, y}, {x, y}], [], [{x, y}] ]
                    end: null,     // Array of indexes pointing to the allTargetPos positions. Each row ends in a point that is points.allTargetPos[points.end[i]] + points.layout.toOffset[i].
                                   //   [targetIdx, targetIdx, targetIdx]
                    allTargetPos: null, // Position of all targets
                                   //   [{x, y}, {x, y}, {x, y}]
                    // The length of arrowTypes, mid, end, allTargetPos, layout.fromOffset, layout.toOffset, layout.topLeft, layout.bottomRight are always the same.

                    // The below data structure is used to compute layout changes, i.e. if the from/to location changes, the arrows should follow these elements.
                    layout: {
                        fromOffset: [],   // Array of offsets {dx, dy}. Each arrow starting point is points.start + points.layout.fromOffset[i]
                        toOffset: [],     // Array of offsets {dx, dy}. Each arrow ending point is points.allTargetPos[points.end[i]] + points.layout.toOffset[i]
                        topLeft: [],      // Array of {x, y}
                        size: []          // Array of {width, height}
                    },
                    getElementOffset: function ($e) {
                        var pos = ($e || $elem).offset();
                        return {
                            x: Math.round(pos.left),
                            y: Math.round(pos.top)
                        };
                    },
                    getTargetOffsets: function () {
                        return data.$targets.map(function () {
                            return data.points.getElementOffset($(this));
                        });
                    },
                    refreshPositions: function (onlyUpdateArrowBounds, resizeDesignTime) {
                        var newStartPos = this.getElementOffset(),
                            fromPositionChanged = !util.samePoint(this.start, newStartPos),
                            newTargetPositions = this.getTargetOffsets(),
                            pts = this,
                            changesDone = false;

                        this.start = newStartPos;
                        this.end.forEach(function (targetIdx, index) {
                            var newTargetPos = newTargetPositions[targetIdx],
                                posChanged = fromPositionChanged || !util.samePoint(pts.allTargetPos[targetIdx], newTargetPos);
                            changesDone = changesDone || posChanged;
                            if (posChanged || onlyUpdateArrowBounds) {
                                var newTopLeft = pts.layout.topLeft[index];
                                newTopLeft.x = Math.min(newStartPos.x + pts.layout.fromOffset[index].dx,
                                                        newTargetPos.x + pts.layout.toOffset[index].dx);
                                newTopLeft.y = Math.min(newStartPos.y + pts.layout.fromOffset[index].dy,
                                                        newTargetPos.y + pts.layout.toOffset[index].dy);
                                var newSize = pts.layout.size[index];
                                newSize.width = Math.max(newStartPos.x + pts.layout.fromOffset[index].dx,
                                                         newTargetPos.x + pts.layout.toOffset[index].dx) - newTopLeft.x;
                                newSize.height = Math.max(newStartPos.y + pts.layout.fromOffset[index].dy,
                                                          newTargetPos.y + pts.layout.toOffset[index].dy) - newTopLeft.y;
                            }
                        });
                        this.allTargetPos = newTargetPositions;
                        if (onlyUpdateArrowBounds !== true && resizeDesignTime !== true) {
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
                        }
                        if (onlyUpdateArrowBounds !== true || (changesDone && resizeDesignTime === true)) {
                            // targetIdx is not used in the function below, but is required by the forEach signature
                            this.end.forEach(function (targetIdx, index) {
                                DOM.updateArrow(index);
                            });
                        }
                        return changesDone;
                    },
                    getElementCenterPos: function ($element) {
                        var $e = $element || $elem;
                        return {
                            dx: Math.round($e.width() / 2),
                            dy: Math.round($e.height() / 2)
                        };
                    },
                    init: function () {
                        data.$targets = opts.targetSelector ? $(opts.targetSelector) : $();
                        var pts = this,
                            lastTarget = data.$targets.length - 1;

                        if (lastTarget > -1) {
                            // index is not used in the function below, but is required by the each signature
                            $elem.add(data.$targets).each(function (index, e) {
                                var $e = $(e);
                                if ($e.css('white-space') !== 'nowrap') {
                                    $e.css('white-space', 'nowrap');
                                }
                            });

                            this.start = this.getElementOffset();
                            this.mid = [];
                            this.end = [];
                            this.allTargetPos = this.getTargetOffsets();

                            if (opts.arrows && opts.arrows instanceof Array && opts.arrows.length > 0) {
                                opts.arrows.forEach(function (arrow, index) {
                                    if (!arrow) {
                                        util.error('Parameter arrows[' + index + '] is undefined! Skipping it.');
                                        return;
                                    }
                                    if (!arrow.type) {
                                        util.error('Parameter arrows[' + index + '].type is undefined! Skipping it.');
                                        return;
                                    }
                                    if (arrow.type !== 'line' && arrow.type !== 'polyline' && arrow.type !== 'bezierQ' && arrow.type !== 'bezierC') {
                                        util.error('Invalid arrows[' + index + '].type! Only "line", "polyline", "bezierQ" and "bezierC" are allowed.');
                                        return;
                                    }

                                    if (arrow.target === undefined || arrow.target === null) {
                                        arrow.target = 0;
                                    }
                                    if (arrow.target < 0 || arrow.target > lastTarget) {
                                        if (lastTarget === 0) {
                                            util.warn('Invalid arrows[' + index + '].target! Target should be 0. Setting it to zero.');
                                            arrow.target = 0;
                                        } else {
                                            util.error('Invalid arrows[' + index + '].target! Target should be between 0 and ' + lastTarget + '.');
                                            return;
                                        }
                                    }

                                    if (arrow.offset === undefined || arrow.offset === null) {
                                        arrow.offset = [0, 0, 0, 0];
                                    }
                                    if (!arrow.offset instanceof Array || arrow.offset.length !== 4) {
                                        util.error('Invalid arrows[' + index + '].offset! Should be an Array with 4 integers.');
                                        return;
                                    }

                                    if (arrow.bounds === undefined || arrow.bounds === null) {
                                        util.error('Missing arrows[' + index + '].bounds! Bounds should be an Array with 4 integers.');
                                        return;
                                    }
                                    if (!arrow.bounds instanceof Array || arrow.bounds.length !== 4) {
                                        util.error('Invalid arrows[' + index + '].bounds! Bounds should be an Array with 4 integers.');
                                        return;
                                    }

                                    if (arrow.type !== 'line') {
                                        if (!arrow.mid) {
                                            util.error('Missing arrows[' + index + '].mid! Mid should be an Array with middle points.');
                                            return;
                                        }
                                        if (!arrow.mid instanceof Array) {
                                            util.error('Invalid arrows[' + index + '].mid! Mid hould be an Array with middle points.');
                                            return;
                                        }
                                        if (arrow.type !== 'bezierC' && (!arrow.mid.length || arrow.mid.length % 2 !== 0)) {
                                            util.error('Invalid arrows[' + index + '].mid! Mid should be an Array with an even number elements, greater than zero. E.g. 2, 4, 6, 8, etc.');
                                            return;
                                        }
                                        if (arrow.type === 'bezierC' && (!arrow.mid.length || arrow.mid.length % 4 !== 0)) {
                                            util.error('Invalid arrows[' + index + '].mid! Mid should be an Array with a quantity of multiples of 4, greater than zero. E.g. 4, 8, 12, 16, etc.');
                                            return;
                                        }
                                    }

                                    data.arrowTypes.push(arrow.type);
                                    pts.layout.fromOffset.push({
                                        dx: arrow.offset[0],
                                        dy: arrow.offset[1]
                                    });
                                    pts.layout.toOffset.push({
                                        dx: arrow.offset[2],
                                        dy: arrow.offset[3]
                                    });

                                    if (arrow.type === 'line') {
                                        pts.mid.push([]);
                                    } else {
                                        var midPoints = [], i, qt;
                                        for (i = 0, qt = arrow.mid.length; i < qt; i += 2) {
                                            // middle points are relative to the width and height, e.g., a point(.2, .5) means that is located 20% (of size.width) to the right of topLeft.x,
                                            // and 50% (of size.height) below topLeft.y. Using relative middle points allows an efficient and simple way to repositionate these points,
                                            // when the start and end points change (when size and topLeft changes)
                                            midPoints.push({
                                                x: util.areTheSame(arrow.bounds[2], 0) ? 0 : (arrow.mid[i] - arrow.bounds[0]) / arrow.bounds[2],
                                                y: util.areTheSame(arrow.bounds[3], 0) ? 0 : (arrow.mid[i + 1] - arrow.bounds[1]) / arrow.bounds[3]
                                            });
                                        }
                                        if (opts.processMidPoints) {
                                            opts.processMidPoints(arrow.type, midPoints);
                                        }
                                        pts.mid.push(midPoints);
                                    }
                                    pts.end.push(arrow.target);
                                    pts.layout.topLeft.push({
                                        x: arrow.bounds[0],
                                        y: arrow.bounds[1]
                                    });
                                    pts.layout.size.push({
                                        width: arrow.bounds[2],
                                        height: arrow.bounds[3]
                                    });
                                });
                            } else {
                                var fromOffset = this.getElementCenterPos($elem),
                                    topLeft;
                                data.$targets.each(function (index, e) {
                                    data.arrowTypes.push('line');
                                    pts.layout.fromOffset.push({
                                        dx: fromOffset.dx,
                                        dy: fromOffset.dy
                                    });
                                    pts.layout.toOffset.push(pts.getElementCenterPos($(e)));
                                    pts.mid.push([]);
                                    pts.end.push(index);
                                    topLeft = {
                                        x: Math.min(pts.start.x + fromOffset.dx,
                                                    pts.allTargetPos[index].x + pts.layout.toOffset[index].dx),
                                        y: Math.min(pts.start.y + fromOffset.dy,
                                                    pts.allTargetPos[index].y + pts.layout.toOffset[index].dy)
                                    };
                                    pts.layout.topLeft.push(topLeft);
                                    pts.layout.size.push({
                                        width: Math.max(pts.start.x + fromOffset.dx,
                                                        pts.allTargetPos[index].x + pts.layout.toOffset[index].dx) - topLeft.x,
                                        height: Math.max(pts.start.y + fromOffset.dy,
                                                         pts.allTargetPos[index].y + pts.layout.toOffset[index].dy) - topLeft.y
                                    });
                                });
                            }
                            return true;
                        }
                        return false;
                    },
                    getMidPoint: function (relativePnt, index) {
                        var layout = this.layout,
                            topLeft = layout.topLeft[index],
                            size = layout.size[index];
                        return {
                            x: topLeft.x + relativePnt.x * size.width,
                            y: topLeft.y + relativePnt.y * size.height
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
                        maxSize = Math.max(data.shapeRelSize.circle, Math.max(data.shapeRelSize.square, data.shapeRelSize.pointer)),
                        pts = this.points;
                    this.points.mid.forEach(function (pnts, index) {
                        var pnt;
                        for (pnt in pnts) {
                            if (pnts.hasOwnProperty(pnt)) {
                                setBounds(pts.getMidPoint(pnts[pnt], index));
                            }
                        }
                    });
                    this.points.end.forEach(function (targetIdx, index) {
                        setBounds(pts.start, index, pts.layout.fromOffset);
                        setBounds(pts.allTargetPos[targetIdx], index, pts.layout.toOffset);
                    });
                    bounds.top -= opts.marker.size * maxSize;
                    bounds.left -= opts.marker.size * maxSize;
                    bounds.right += opts.marker.size * maxSize;
                    bounds.bottom += opts.marker.size * maxSize;
                    if (opts.shadow.visible) {
                        bounds.top -= opts.shadow.offsetY > 0 ? 0 : -opts.shadow.offsetY - opts.shadow.blur;
                        bounds.left -= opts.shadow.offsetX > 0 ? 0 : -opts.shadow.offsetX - opts.shadow.blur;
                        bounds.right += opts.shadow.offsetX > 0 ? opts.shadow.offsetX + opts.shadow.blur : 0;
                        bounds.bottom += opts.shadow.offsetY > 0 ? opts.shadow.offsetY + opts.shadow.blur : 0;
                    }
                    bounds.top = Math.floor(bounds.top);
                    bounds.left = Math.floor(bounds.left);
                    bounds.right = Math.ceil(bounds.right);
                    bounds.bottom = Math.ceil(bounds.bottom);
                    return bounds;
                },
                init: function () {
                    if (this.points.init()) {
                        this.outline = opts.outline.size && opts.outline.color !== 'transparent';
                        var bounds = this.getBoundsRect();
                        data.svgPos.x = bounds.left;
                        data.svgPos.y = bounds.top;
                        DOM.$svg = DOM.createSvgDom('svg', {
                            width: (bounds.right - bounds.left) + 'px',
                            height: (bounds.bottom - bounds.top) + 'px',
                            xmlns: this.ns,
                            version: '1.1',
                            class: this.svgClass
                        }).css({
                            position: 'absolute',
                            left: bounds.left + 'px',
                            top: bounds.top + 'px',
                            'pointer-events': 'none',
                            opacity: 0
                        });

                        DOM.$svg.append(DOM.markers.init());
                        // e is not used in the function below, but is required by the forEach signature
                        this.points.end.forEach(function (e, index) {
                            DOM.createArrow(index);
                        });
                        DOM.$svg.hide();
                        $('body').append(DOM.$svg);
                        events.bindAll();
                    }
                }
            },
            DOM = {
                $svg: null,
                arrows: [],
                arrowsShadow: [],
                $shadowGroup: null,
                createSvgDom: function (tag, attrs) {
                    var el = document.createElementNS(data.ns, tag), k;
                    for (k in attrs) {
                        if (attrs.hasOwnProperty(k)) {
                            el.setAttribute(k, attrs[k]);
                        }
                    }
                    return $(el);
                },
                updateSvgAttrs: function (svgElem, attrs) {
                    var k;
                    for (k in attrs) {
                        if (attrs.hasOwnProperty(k)) {
                            svgElem.setAttribute(k, attrs[k]);
                        }
                    }
                },
                getStrokeWidthForOutlineArrow: function () {
                    return opts.outline.size * opts.stroke.size + opts.stroke.size;
                },
                getStrokeWidthForShape: function () {
                    return opts.outline.size / 2;
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
                        var ids = getIdsCallback(),
                            getNewId = function () {
                                return 'refP' + $('svg.' + data.svgClass).length + id.charAt(0) + (+new Date());
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
                                    height: size
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
                        this.ids.filter.shadow = 'refP' + $('svg.' + data.svgClass).length + 'f' + (+new Date());
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
                getShapeAttrsMidPointsBezierQ: opts.overrideShapeAttrsBezierQ || function (pts, index, util, shadeOffset) {
                    return pts.mid[index].map(function (e, i) {
                        var point = pts.getMidPoint(e, index),
                            pointStr = util.pointToStr(point, shadeOffset);
                        switch (i) {
                            case 0: return 'Q' + pointStr + ' ';
                            case 1: return pointStr + ' ';
                            default: return 'T' + pointStr + ' ';
                        } 
                    }).join('');
                },
                getShapeAttrsMidPointsBezierC: opts.overrideShapeAttrsBezierC || function (pts, index, util, shadeOffset) {
                    return pts.mid[index].map(function (e, i) {
                        var point = pts.getMidPoint(e, index),
                            pointStr = util.pointToStr(point, shadeOffset);
                        switch (i) {
                            case 0: return 'C' + pointStr + ' ';
                            case 1:
                            case 2: return pointStr + ' ';
                            default: return (i % 3 === 0 ? 'S' : '') + pointStr + ' ';
                        } 
                    }).join('');
                },
                getShapeAttrs: function (index, shadeOffset) {
                    var pts = data.points;
                    switch (data.arrowTypes[index]) {
                        case 'line':
                            return {
                                x1: util.getX(pts.start, pts.layout.fromOffset[index]),
                                y1: util.getY(pts.start, pts.layout.fromOffset[index]),
                                x2: util.getX(pts.allTargetPos[pts.end[index]], pts.layout.toOffset[index]),
                                y2: util.getY(pts.allTargetPos[pts.end[index]], pts.layout.toOffset[index])
                            };
                        case 'bezierQ':
                            return {
                                d:  'M' + util.pointToStr(pts.start, pts.layout.fromOffset[index]) + ' ' +
                                    this.getShapeAttrsMidPointsBezierQ(pts, index, util, shadeOffset) +
                                    (pts.mid[index].length === 1 ? '' : 'T') + util.pointToStr(pts.allTargetPos[pts.end[index]], pts.layout.toOffset[index])
                            };
                        case 'bezierC':
                            return {
                                d:  'M' + util.pointToStr(pts.start, pts.layout.fromOffset[index]) + ' ' +
                                    this.getShapeAttrsMidPointsBezierC(pts, index, util, shadeOffset) +
                                    util.pointToStr(pts.allTargetPos[pts.end[index]], pts.layout.toOffset[index])
                            };
                        case 'polyline':
                            return {
                                points: util.pointToStr(pts.start, pts.layout.fromOffset[index]) + ', ' + 
                                        pts.mid[index].map(function (e) {
                                            return util.pointToStr(pts.getMidPoint(e, index), shadeOffset);
                                        }).join(',') + ', ' +
                                        util.pointToStr(pts.allTargetPos[pts.end[index]], pts.layout.toOffset[index])
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
                createOrReplaceArrow: function (index, createShadow, createOutline, createStroke, replace) {
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
                            /* falls through */
                        case 'bezierQ':
                            /* falls through */
                        case 'bezierC':
                            attrs.fill = 'none';
                            attrsShade.fill = 'none';
                            /* falls through */
                        case 'line':
                            attrs['stroke-linecap'] = 'round';
                            attrsShade['stroke-linecap'] = 'round';
                    }

                    if (createShadow) {
                        attrsShade.stroke = opts.shadow.color;
                        attrsShade.filter = 'url(#' + this.markers.ids.filter.shadow + ')';
                        attrsShade['stroke-width'] = opts.stroke.size;
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

                    if (createOutline) {
                        attrs.stroke = opts.outline.color;
                        attrs['stroke-width'] = this.getStrokeWidthForOutlineArrow();
                        $arrowElement = this.createSvgDom(this.getSVGtag(data.arrowTypes[index]), attrs);
                        if (replace === true) {
                            this.arrows[index].prev().replaceWith($arrowElement);
                        } else {
                            this.$svg.append($arrowElement);
                        }
                    }

                    if (createStroke) {
                        attrs.stroke = opts.stroke.color;
                        attrs['stroke-width'] = opts.stroke.size;
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
                    }
                },
                createArrow: function (index) {
                    this.createOrReplaceArrow(index, opts.shadow.visible, data.outline, true);
                },
                replaceArrow: function (index) {
                    this.createOrReplaceArrow(index, opts.shadow.visible, data.outline, true, true);
                },
                show: function (noDelay) {
                    this.doShowHide(true, noDelay);
                },
                hide: function (noDelay) {
                    this.doShowHide(false, noDelay);
                },
                doShowHide: function (isShowing, noDelay) {
                    var opacityDelay = noDelay === true ? 0 : (isShowing ? opts.opacityTimeShowing : opts.opacityTimeHidding),
                        done = function () {
                            /*jshint -W030 */
                            isShowing ? DOM.$svg.css('opacity', 1).show() : DOM.$svg.css('opacity', 0).hide();
                        };
                    if (opacityDelay > 0) {
                        this.$svg.stop(true).show().animate(isShowing ? { opacity: 1 } : { opacity: 0 }, opacityDelay, done);
                    } else {
                        done();
                    }
                }
            },
            events = {
                showTimeoutId: null,
                clearShowTimeout: function () {
                    if (events.showTimeoutId) {
                        clearTimeout(events.showTimeoutId);
                        events.showTimeoutId = null;
                    }
                },
                hideTimeoutId: null,
                clearHideTimeout: function () {
                    if (events.hideTimeoutId) {
                        clearTimeout(events.hideTimeoutId);
                        events.hideTimeoutId = null;
                    }
                },
                onShowByMouse: function (noDelay) {
                    events.clearHideTimeout();
                    var show = function () {
                            events.showTimeoutId = null;
                            data.points.refreshPositions();
                            DOM.show(noDelay);
                        },
                        delay = noDelay === true ? 0 : (opts.showAfter || 0);
                    if (delay) {
                        events.clearShowTimeout();
                        events.showTimeoutId = setTimeout(show, delay);
                    } else {
                        show();
                    }
                },
                onHideByMouse: function (noDelay) {
                    events.clearShowTimeout();
                    var hide = function () {
                            events.hideTimeoutId = null;
                            DOM.hide(noDelay);
                        },
                        delay = noDelay === true ? 0 : (opts.hideAfter || 0);
                    if (delay) {
                        events.clearHideTimeout();
                        events.hideTimeoutId = setTimeout(hide, delay);
                    } else {
                        hide();
                    }
                },
                onShow: function () {
                    if (DOM.$svg.css('display') === 'none') {
                        events.unbindMouseFocusEvents();
                        events.onShowByMouse(true);
                    }
                },
                onHide: function () {
                    if (DOM.$svg.css('display') !== 'none') {
                        events.bindMouseFocusEvents();
                        events.onHideByMouse(true);
                    }
                },
                onDestroy: function () {
                    events.unbindAll();
                    DOM.$svg.remove();
                },
                bindMouseFocusEvents: function () {
                    $elem.
                        bind('mouseenter.rsRefPointer focus.rsRefPointer', this.onShowByMouse).
                        bind('mouseleave.rsRefPointer blur.rsRefPointer', this.onHideByMouse);
                },
                bindAll: function () {
                    events.bindMouseFocusEvents();
                    $elem.
                        bind('show.rsRefPointer', this.onShow).
                        bind('hide.rsRefPointer', this.onHide).
                        bind('destroy.rsRefPointer', this.onDestroy);
                },
                unbindMouseFocusEvents: function () {
                    $elem.
                        unbind('mouseenter.rsRefPointer focus.rsRefPointer show.rsRefPointer', this.onShowByMouse).
                        unbind('mouseleave.rsRefPointer blur.rsRefPointer', this.onHideByMouse);
                },
                unbindAll: function () {
                    events.unbindMouseFocusEvents();
                    $elem.
                        unbind('show.rsRefPointer', this.onShow).
                        unbind('hide.rsRefPointer', this.onHide).
                        unbind('destroy.rsRefPointer', this.onDestroy);
                }
            },
            util = {
                areTheSame: function (a, b, precision) {
                    return Math.abs(a - b) < (precision ? precision : 0.000005);
                },
                samePoint: function (pnt1, pnt2) {
                    return this.areTheSame(pnt1.x, pnt2.x, 0.5) && this.areTheSame(pnt1.y, pnt2.y, 0.5);
                },
                byteToHex: function (byte) {
                    return (byte > 15 ? '' : '0') + byte.toString(16);
                },
                getX: function (pnt, offset) {
                    return Math.round(pnt.x + (offset ? offset.dx : 0) - data.svgPos.x) + 0.5;
                },
                getY: function (pnt, offset) {
                    return Math.round(pnt.y + (offset ? offset.dy : 0) - data.svgPos.y) + 0.5;
                },
                pointToStr: function (pnt, offset) {
                    return this.getX(pnt, offset) + ',' + this.getY(pnt, offset);
                },
                init: function () {
                    this.log = window.console && window.console.log ? function (msg, noPrefix) { window.console.log((noPrefix ? '' : 'rsRefPointer: ') + msg); } : function (msg, noPrefix) { window.alert((noPrefix ? '' : 'rsRefPointer Log:\n\n') + msg); };
                    this.warn = window.console && window.console.warn ? function (msg, noPrefix) { window.console.warn((noPrefix ? '' : 'rsRefPointer: ') + msg); } : function (msg, noPrefix) { window.alert((noPrefix ? '' : 'rsRefPointer Warning:\n\n') + msg); };
                    this.error = window.console && window.console.error ? function (msg, noPrefix) { window.console.error((noPrefix ? '': 'rsRefPointer: ') + msg); } : function (msg, noPrefix) { window.alert((noPrefix ? '' : 'rsRefPointer Error:\n\n') + msg); };
                }
            };

        util.init();
        data.init();
        return {
            data: data,
            DOM: DOM,
            events: events,
            util: util
        };
    };

    $.fn.rsRefPointer = function (options) {
        var show = function () {
                return this.trigger('show.rsRefPointer');
            },
            hide = function () {
                return this.trigger('hide.rsRefPointer');
            },
            destroy = function () {
                return this.trigger('destroy.rsRefPointer');
            };

        if (typeof options === 'string') {
            switch (options) {
                case 'show': return show.call(this);
                case 'hide': return hide.call(this);
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
        showAfter: 50,              // Milliseconds it takes for the fadein animation to start
        opacityTimeShowing: 50,     // Duration of the fadein animation
        hideAfter: 150,             // Milliseconds it takes for the fadeout animation to start
        opacityTimeHidding: 100,    // Duration of the fadeout animation
        marker: {
            start: 'circle',
            mid: 'square',
            end: 'pointer2',
            size: 1
        },
        stroke: {
            color: 'black',
            size: 2
        },
        outline: {
            color: 'white',
            size: 1
        },
        shadow: {
            visible: true,
            color: 'rgba(95,95,95,0.7)',
            offsetX: 8,
            offsetY: 8,
            blur: 1
        }
    };
})(jQuery);