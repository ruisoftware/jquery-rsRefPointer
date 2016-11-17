/**
* jQuery RefPointer
* ===============================================================
* @author Jose Rui Santos
* For info, please scroll to the bottom.
*/
(function ($, undefined) {
    'use strict';
    var RefPointerClass = function ($elem, opts) {
        var DOM,
            events,
            util,
            data = {
                ns: 'http://www.w3.org/2000/svg',
                svgClass: 'refPointer',
                arrowTypes: [],    // Specifies the type of each arrow: 'line', 'polyline', 'bezierQ' and 'bezierC'
                outline: false,    // Whether each row has an outline border
                $targets: null,
                $window: $(window),
                shapeRelSize: {
                    pointer: 8,
                    pointer2: 8,
                    circle: 4,
                    square: 4,
                    getSize: function (type) {
                        return ((opts.marker.size - 1)*0.25 + 1)*this[type];
                    }
                },
                svgPos: {},
                points: {
                    start: null,   // Starting point for all arrows. Each arrow starts from a point that is points.start + points.layout.fromOffset.
                                   //   {x, y}. The following is an example for 3 arrows: one bezier, a straight line and a polyline.
                    mid: null,     // Array of arrays of middle points, if any. The inner array represents the middle points for each arrow,
                                   //   [ [{x, y}, {x, y}], [], [{x, y}] ]
                    end: null,     // Array of indexes pointing to the allTargetPos positions. Each arrow ends in a point that is points.allTargetPos[points.end[i]] + points.layout.toOffset[i].
                                   //   [targetIdx, targetIdx, targetIdx]
                    allTargetPos: null, // Position of all targets
                                        //   [{x, y}, {x, y}, {x, y}]
                    
                    // The length of arrowTypes, mid, end, layout.fromOffset, layout.toOffset, layout.originalStartPos, layout.originalHypotenuse and layout.hypotenuse are always the same. They match the number of arrows.
                    // The length of allTargetPos and endSize are always the same. They match the number of targets.

                    startSize: null,  // {with, height} representing the dimension of the start element.
                    endSize: [],      // Array of to size {with, height}. Each element represents each target dimension.

                    // The below data structure is used to compute layout changes, i.e. if the from/to location changes, the arrows should follow these elements.
                    layout: {
                        fromOffset: [[], []], // Array with two elements. Represents the start point for each arrow.
                                              // The first element is an Array of absolute offsets {dx, dy}.
                                              // The second element is an Array of relative offsets {dx, dy}.
                        toOffset: [[], []],   // Array with two elements.  Represents the end point for each arrow.
                                              // The first element is an Array of absolute offsets {dx, dy}.
                                              // The second element is an Array of relative offsets {dx, dy}.

                        originalStartPos: [],   // Array of {x, y}. Start point defined as points.start + fromOffset
                        originalHypotenuse: [], // Array of number. Represents the initial hypotenuse of the right-angle triangle with vertices on the Start and End points.
                        hypotenuse: [],         // Array of number. Represents the hypotenuse of the right-angle triangle with vertices on the Start and End points.

                        fromRelativeOffset: [], // Array of boolean. false: The fromOffset is in absolute pixels; true: The fromOffset is in relative pixels
                        toRelativeOffset: [],   // Array of boolean. false: The fromOffset is in absolute pixels; true: The fromOffset is in relative pixels
                        getFromOffsetX: function (idx, size) {
                            return this.fromRelativeOffset[idx] ? this.fromOffset[1][idx].dx*size.width : this.fromOffset[0][idx].dx;
                        },
                        getFromOffsetY: function (idx, size) {
                            return this.fromRelativeOffset[idx] ? this.fromOffset[1][idx].dy*size.height : this.fromOffset[0][idx].dy;
                        },
                        getToOffsetX: function (idx, size) {
                            return this.toRelativeOffset[idx] ? this.toOffset[1][idx].dx*size.width : this.toOffset[0][idx].dx;
                        },
                        getToOffsetY: function (idx, size) {
                            return this.toRelativeOffset[idx] ? this.toOffset[1][idx].dy*size.height : this.toOffset[0][idx].dy;
                        }
                    },
                    getElementRect: function ($element) {
                        var clientRect = ($element || $elem)[0].getBoundingClientRect();
                        return {
                            x: clientRect.left + window.pageXOffset,
                            y: clientRect.top + window.pageYOffset,
                            width: clientRect.width,
                            height: clientRect.height
                        };
                    },
                    getElementPos: function ($element) {
                        var rect = this.getElementRect($element);
                        return {
                            x: Math.round(rect.x),
                            y: Math.round(rect.y)
                        };
                    },
                    getElementSize: function ($element) {
                        var rect = this.getElementRect($element);
                        return {
                            width: rect.width,
                            height: rect.height
                        };
                    },
                    getElementCenterPos: function ($element, size) {
                        var rect = size || this.getElementRect($element);
                        return {
                            dx: Math.round(rect.width/2*100)/100,
                            dy: Math.round(rect.height/2*100)/100
                        };
                    },
                    getTargetOffsets: function () {
                        return data.$targets.map(function () {
                            return data.points.getElementPos($(this));
                        });
                    },
                    refreshPositions: function (onlyUpdateArrowBounds, resizeDesignTime) {
                        var newStartRect = this.getElementRect(),
                            startPosChanged = !util.samePoint(this.start, newStartRect),
                            startSizeChanged = !util.sameDimension(this.startSize, newStartRect),
                            newTargetPositions = this.getTargetOffsets(),
                            pts = this,
                            changesDone = false;

                        this.start.x = newStartRect.x;
                        this.start.y = newStartRect.y;
                        this.startSize.width = newStartRect.width;
                        this.startSize.height = newStartRect.height;
                        this.end.forEach(function (targetIdx, index) {
                            var newTargetPos = newTargetPositions[targetIdx],
                                newTargetSize = pts.getElementSize(data.$targets.eq(targetIdx)),
                                posOrSizeChanged = startPosChanged ||
                                    startSizeChanged && pts.layout.fromRelativeOffset[index] ||
                                    !util.samePoint(pts.allTargetPos[targetIdx], newTargetPos) ||
                                    pts.layout.toRelativeOffset[index] && !util.sameDimension(pts.endSize[targetIdx], newTargetSize);

                            changesDone = changesDone || posOrSizeChanged;
                            if (posOrSizeChanged || onlyUpdateArrowBounds) {
                                pts.endSize[targetIdx] = newTargetSize;
                                var newStartPnt = pts.getStartPoint(index, newStartRect),
                                    newEndPnt = pts.getEndPoint(newTargetPos, index, newTargetSize);
                                pts.layout.hypotenuse[index] = util.getHypotenuse(newStartPnt, newEndPnt);
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
                        if (onlyUpdateArrowBounds !== true || changesDone && resizeDesignTime === true) {
                            // targetIdx is not used in the function below, but is required by the forEach signature
                            this.end.forEach(function (targetIdx, index) {
                                DOM.updateArrow(index);
                            });
                        }
                        return changesDone;
                    },
                    init: function () {
                        data.$targets = opts.targetSelector ? $(opts.targetSelector) : $();
                        var pts = this,
                            lastTarget = data.$targets.length - 1;

                        if (lastTarget > -1) {
                            // index is not used in the function below, but is required by the each signature
                            $elem.add(data.$targets).each(function () {
                                var $e = $(this);
                                if ($e.css('white-space') !== 'nowrap') {
                                    $e.css('white-space', 'nowrap');
                                }
                            });

                            this.start = this.getElementPos();
                            this.mid = [];
                            this.end = [];
                            this.allTargetPos = this.getTargetOffsets();
                            this.startSize = this.getElementSize();
                            data.$targets.each(function () {
                                pts.endSize.push(pts.getElementSize($(this)));
                            });

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
                                        arrow.offset = [[0, 0, 0, 0], [0, 0, 0, 0]];
                                    }
                                    if (!(arrow.offset instanceof Array) || arrow.offset.length !== 2) {
                                        util.error('Invalid arrows[' + index + '].offset! Should be an Array with 2 Arrays.');
                                        return;
                                    }

                                    if (!(arrow.offset[0] instanceof Array) || arrow.offset[0].length !== 4) {
                                        util.error('Invalid arrows[' + index + '].offset[0]! Should be an Array with 4 numbers.');
                                        return;
                                    }

                                    if (!(arrow.offset[1] instanceof Array) || arrow.offset[1].length !== 4) {
                                        util.error('Invalid arrows[' + index + '].offset[1]! Should be an Array with 4 numbers.');
                                        return;
                                    }

                                    if (!arrow.from) {
                                        util.error('Missing arrows[' + index + '].from! Should be an Array with 2 numbers.');
                                        return;
                                    }
                                    if (!arrow.to) {
                                        util.error('Missing arrows[' + index + '].to! Should be an Array with 2 numbers.');
                                        return;
                                    }
                                    if (!(arrow.from instanceof Array) || arrow.from.length !== 2) {
                                        util.error('Invalid arrows[' + index + '].from! Should be an Array with 2 numbers.');
                                        return;
                                    }
                                    if (!(arrow.to instanceof Array) || arrow.to.length !== 2) {
                                        util.error('Invalid arrows[' + index + '].to! Should be an Array with 2 numbers.');
                                        return;
                                    }

                                    if (arrow.type !== 'line') {
                                        if (!arrow.mid) {
                                            util.error('Missing arrows[' + index + '].mid! Mid should be an Array with middle points.');
                                            return;
                                        }
                                        if (!(arrow.mid instanceof Array)) {
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
                                    // absolute fromOffset
                                    pts.layout.fromOffset[0].push({
                                        dx: arrow.offset[0][0],
                                        dy: arrow.offset[0][1]
                                    });
                                    // absolute toOffset
                                    pts.layout.toOffset[0].push({
                                        dx: arrow.offset[0][2],
                                        dy: arrow.offset[0][3]
                                    });
                                    // relative fromOffset
                                    pts.layout.fromOffset[1].push({
                                        dx: arrow.offset[1][0],
                                        dy: arrow.offset[1][1]
                                    });
                                    // relative toOffset
                                    pts.layout.toOffset[1].push({
                                        dx: arrow.offset[1][2],
                                        dy: arrow.offset[1][3]
                                    });
                                    pts.layout.fromRelativeOffset.push(arrow.sourceRelativeOffset === true);
                                    pts.layout.toRelativeOffset.push(arrow.targetRelativeOffset === true);
                                    pts.end.push(arrow.target);
                                    pts.layout.originalStartPos.push({
                                        x: arrow.from[0],
                                        y: arrow.from[1]
                                    });
                                    pts.layout.originalHypotenuse.push(util.getHypotenuse({
                                        x: arrow.from[0],
                                        y: arrow.from[1]
                                    } , {
                                        x: arrow.to[0],
                                        y: arrow.to[1]
                                    }));
                                    pts.layout.hypotenuse.push(util.getHypotenuse(
                                        pts.getStartPoint(index, pts.startSize),
                                        pts.getEndPoint(pts.allTargetPos[arrow.target], index, pts.endSize[arrow.target])
                                    ));

                                    if (arrow.type === 'line') {
                                        pts.mid.push([]);
                                    } else {
                                        var midPoints = [], i, qt;
                                        for (i = 0, qt = arrow.mid.length; i < qt; i += 2) {
                                            midPoints.push({
                                                x: arrow.mid[i],
                                                y: arrow.mid[i + 1]
                                            });
                                        }
                                        if (opts.processMidPoints) {
                                            opts.processMidPoints(pts, arrow.type, midPoints);
                                        }
                                        pts.mid.push(midPoints);
                                    }
                                });
                            } else {
                                var fromOffset = this.getElementCenterPos();
                                data.$targets.each(function (index) {
                                    data.arrowTypes.push('line');
                                    pts.layout.fromOffset[0].push({ dx: fromOffset.dx, dy: fromOffset.dy });
                                    pts.layout.fromOffset[1].push({ dx: 0.5, dy: 0.5 });
                                    var $target = $(this),
                                        destSize = pts.getElementSize($target),
                                        from, to;
                                    pts.layout.toOffset[0].push(pts.getElementCenterPos($target, destSize));
                                    pts.layout.toOffset[1].push({ dx: 0.5, dy: 0.5 });
                                    pts.layout.fromRelativeOffset.push(false);
                                    pts.layout.toRelativeOffset.push(false);
                                    from = {
                                        x: pts.start.x + fromOffset.dx,
                                        y: pts.start.y + fromOffset.dy
                                    };
                                    to = {
                                        x: pts.allTargetPos[index].x + pts.layout.getToOffsetX(index, destSize),
                                        y: pts.allTargetPos[index].y + pts.layout.getToOffsetY(index, destSize)
                                    };
                                    pts.mid.push([]);
                                    pts.end.push(index);
                                    pts.layout.originalStartPos.push({
                                        x: from.x,
                                        y: from.y
                                    });
                                    var h = util.getHypotenuse(from, to);
                                    pts.layout.originalHypotenuse.push(h);
                                    pts.layout.hypotenuse.push(h);
                                });
                            }
                            return true;
                        }
                        return false;
                    },
                    getStartPoint: function (index, currSize) {
                        if (this.layout.fromRelativeOffset[index] && !currSize) {
                            currSize = this.getElementSize();
                        }
                        return {
                            x: this.start.x + this.layout.getFromOffsetX(index, currSize),
                            y: this.start.y + this.layout.getFromOffsetY(index, currSize)
                        };
                    },
                    getMidPoint: function (midPnt, index) {
                        var factor = this.layout.hypotenuse[index]/this.layout.originalHypotenuse[index],
                            startPnt = this.getStartPoint(index, this.startSize);
                        return {
                            x: (midPnt.x - this.layout.originalStartPos[index].x)*factor + startPnt.x,
                            y: (midPnt.y - this.layout.originalStartPos[index].y)*factor + startPnt.y
                        };
                    },
                    getEndPoint: function (endPos, index, currSize) {
                        if (this.layout.toRelativeOffset[index] && !currSize) {
                            currSize = this.getElementSize(data.$targets.eq(this.end[index]));
                        }
                        return {
                            x: endPos.x + this.layout.getToOffsetX(index, currSize),
                            y: endPos.y + this.layout.getToOffsetY(index, currSize)
                        };
                    }
                },
                getBoundsRect: opts.overrideGetBoundsRect || function () {
                    var bounds = {},
                        setBounds = function (pnt) {
                            bounds.left = Math.min(bounds.left === undefined ? pnt.x : bounds.left, pnt.x);
                            bounds.top = Math.min(bounds.top === undefined ? pnt.y : bounds.top, pnt.y);
                            bounds.bottom = Math.max(bounds.bottom === undefined ? pnt.y : bounds.bottom, pnt.y);
                            bounds.right = Math.max(bounds.right === undefined ? pnt.x : bounds.right, pnt.x);
                        },
                        maxSize = Math.max(data.shapeRelSize.circle, Math.max(data.shapeRelSize.square, data.shapeRelSize.pointer)),
                        pts = this.points;
                    this.points.mid.forEach(function (pnts, index) {
                        for(var pnt in pnts) {
                            setBounds(pts.getMidPoint(pnts[pnt], index));
                        }
                    });
                    this.points.end.forEach(function (targetIdx, index) {
                        setBounds(pts.getStartPoint(index, pts.startSize));
                        setBounds(pts.getEndPoint(pts.allTargetPos[targetIdx], index, pts.endSize[targetIdx]));
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
            };
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
                        Mid: null
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
                        this.initMarker(opts.marker.mid, 'Mid', getMarkerId, true);
                    }
                    return this.$defs;
                }
            },
            getShapeAttrsMidPointsBezierQ: opts.overrideShapeAttrsBezierQ || function (pts, index, util, shadeOffset) {
                return pts.mid[index].map(function (e, i) {
                    var point = pts.getMidPoint(e, index),
                        pointStr = util.pointToStrMid(point, shadeOffset);
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
                        pointStr = util.pointToStrMid(point, shadeOffset);
                    switch (i) {
                        case 0: return 'C' + pointStr + ' ';
                        case 1:
                        case 2: return pointStr + ' ';
                        default: return (i % 3 === 0 ? 'S' : '') + pointStr + ' ';
                    } 
                }).join('');
            },
            getShapeAttrs: function (index, shadeOffset) {
                var pts = data.points,
                    targetIdx = pts.end[index];
                switch (data.arrowTypes[index]) {
                    case 'line':
                        var startPoint = pts.getStartPoint(index, pts.startSize),
                            endPoint = pts.getEndPoint(pts.allTargetPos[targetIdx], index, pts.endSize[targetIdx]);
                        return {
                            x1: util.getX(startPoint),
                            y1: util.getY(startPoint),
                            x2: util.getX(endPoint),
                            y2: util.getY(endPoint)
                        };
                    case 'bezierQ':
                        return {
                            d:  'M' + util.pointToStrStart(index, pts.startSize) + ' ' +
                                this.getShapeAttrsMidPointsBezierQ(pts, index, util, shadeOffset) +
                                (pts.mid[index].length === 1 ? '' : 'T') +
                                util.pointToStrEnd(pts.allTargetPos[pts.end[index]], index, pts.endSize[targetIdx])
                        };
                    case 'bezierC':
                        return {
                            d:  'M' + util.pointToStrStart(index, pts.startSize) + ' ' +
                                this.getShapeAttrsMidPointsBezierC(pts, index, util, shadeOffset) +
                                util.pointToStrEnd(pts.allTargetPos[pts.end[index]], index, pts.endSize[targetIdx])
                        };
                    case 'polyline':
                        return {
                            points: util.pointToStrStart(index, pts.startSize) + ', ' + 
                                    pts.mid[index].map(function (e) {
                                        return util.pointToStrMid(pts.getMidPoint(e, index), shadeOffset);
                                    }).join(',') + ', ' +
                                    util.pointToStrEnd(pts.allTargetPos[pts.end[index]], index, pts.endSize[targetIdx])
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
                    if (DOM.markers.ids.filter.Mid) {
                        attrsShade['marker-mid'] = 'url(#' + DOM.markers.ids.filter.Mid + ')';
                    }
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
                var opacityDelay = noDelay === true ? 0 : (isShowing ? opts.mouseHover.opacityTimeShowing : opts.mouseHover.opacityTimeHidding),
                    done = function () {
                        /*jshint -W030 */
                        isShowing ? DOM.$svg.css('opacity', 1).show() : DOM.$svg.css('opacity', 0).hide();
                        if (isShowing) {
                            $elem.addClass(opts.sourceClassVisible);
                            data.$targets.addClass(opts.targetClassVisible);
                        }
                    };
                this.$svg.stop(true);
                if (!isShowing) {
                    $elem.removeClass(opts.sourceClassVisible);
                    data.$targets.removeClass(opts.targetClassVisible);
                }
                if (opacityDelay > 0) {
                    this.$svg.show().animate(isShowing ? { opacity: 1 } : { opacity: 0 }, opacityDelay, done);
                } else {
                    done();
                }
            }
        };
        events = {
            resizeTimeoutId: null,
            resize: function () {
                if (!events.resizeTimeoutId) {
                    events.resizeTimeoutId = setTimeout(function () {
                        data.points.refreshPositions();
                        events.resizeTimeoutId = null;
                    }, 25);
                }
            },
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
                    delay = noDelay === true ? 0 : (opts.mouseHover.showAfter || 0);
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
                    delay = noDelay === true ? 0 : (opts.mouseHover.hideAfter || 0);
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
                    data.$window.bind('resize', events.resize);
                }
            },
            onHide: function () {
                if (DOM.$svg.css('display') !== 'none') {
                    events.bindMouseFocusEvents();
                    events.onHideByMouse(true);
                    data.$window.unbind('resize', events.resize);
                }
            },
            onDestroy: function () {
                events.unbindAll();
                DOM.$svg.remove();
            },
            bindMouseFocusEvents: function () {
                if (opts.mouseHover.show) {
                    $elem.
                        bind('mouseenter.rsRefPointer focus.rsRefPointer', this.onShowByMouse).
                        bind('mouseleave.rsRefPointer blur.rsRefPointer', this.onHideByMouse);
                }
            },
            bindAll: function () {
                events.bindMouseFocusEvents();
                $elem.
                    bind('show.rsRefPointer', this.onShow).
                    bind('hide.rsRefPointer', this.onHide).
                    bind('destroy.rsRefPointer', this.onDestroy);
            },
            unbindMouseFocusEvents: function () {
                if (opts.mouseHover.show) {
                    $elem.
                        unbind('mouseenter.rsRefPointer focus.rsRefPointer show.rsRefPointer', this.onShowByMouse).
                        unbind('mouseleave.rsRefPointer blur.rsRefPointer', this.onHideByMouse);
                }
            },
            unbindAll: function () {
                events.unbindMouseFocusEvents();
                $elem.
                    unbind('show.rsRefPointer', this.onShow).
                    unbind('hide.rsRefPointer', this.onHide).
                    unbind('destroy.rsRefPointer', this.onDestroy);
            }
        };
        util = {
            areTheSame: function (a, b, precision) {
                return Math.abs(a - b) < (precision ? precision : 0.000005);
            },
            isZero: function (a, precision) {
                return this.areTheSame(a, 0, precision);
            },
            samePoint: function (pnt1, pnt2) {
                return this.areTheSame(pnt1.x, pnt2.x, 0.5) && this.areTheSame(pnt1.y, pnt2.y, 0.5);
            },
            sameDimension: function (dim1, dim2) {
                return this.areTheSame(dim1.width, dim2.width, 0.5) && this.areTheSame(dim1.height, dim2.height, 0.5);
            },
            byteToHex: function (byte) {
                return (byte > 15 ? '' : '0') + byte.toString(16);
            },
            getX: function (pnt) {
                return Math.round(pnt.x - data.svgPos.x) + 0.5;
            },
            getY: function (pnt) {
                return Math.round(pnt.y - data.svgPos.y) + 0.5;
            },
            pointToStr: function (pnt) {
                return this.getX(pnt) + ',' + this.getY(pnt);
            },
            pointToStrStart: function (index, currSize) {
                return this.pointToStr(data.points.getStartPoint(index, currSize));
            },
            pointToStrMid: function (pnt, offset) {
                return this.pointToStr({
                    x: pnt.x + (offset ? offset.dx : 0),
                    y: pnt.y + (offset ? offset.dy : 0)
                });
            },
            pointToStrEnd: function (endPos, index, currSize) {
                return this.pointToStr(data.points.getEndPoint(endPos, index, currSize));
            },
            getHypotenuse: function (pnt1, pnt2) {
                return Math.sqrt(Math.pow(pnt1.x - pnt2.x, 2) + Math.pow(pnt1.y - pnt2.y, 2));
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
        opts.mouseHover = $.extend({}, $.fn.rsRefPointer.defaults.mouseHover, options ? options.mouseHover : options);
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
        targetSelector: '.target',  // Selector for the target selector.
        sourceClassVisible: 'refPointerSource',   // Class(es) added to the source elements, when the arrow becomes visible. They are removed once the arrow is hidden. Multiple classes are separated by a space. They are not prefixed by a dot.
        targetClassVisible: 'refPointerTarget',   // Class(es) added to the target elements, when the arrow becomes visible. They are removed once the arrow is hidden. Multiple classes are separated by a space. They are not prefixed by a dot.
        mouseHover: {
            show: true,     // Whether arrows appear when the mouse overs the source element. Type: boolean.
                            // true: The arrows appear when mouse overs the source element.
                            // false: Nothing happens. The arrows do not appear when mouse overs the source element.
                            //        The arrows only appear if the method 'show' is called: $refPointerObj.rsRefPointer('show');
            showAfter: 50,              // Milliseconds it takes for the fadein animation to start. Use 0 for no delay. N/A if show is false.
            opacityTimeShowing: 50,     // Duration of the fadein animation. Use 0 for no animation. N/A if show is false.
            hideAfter: 100,             // Milliseconds it takes for the fadeout animation to start. Use 0 for no delay. N/A if show is false.
            opacityTimeHidding: 100     // Duration of the fadeout animation. Use 0 for no animation. N/A if show is false.
        },
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