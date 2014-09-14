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
                $svg: null,
                points: {
                    from: null, // Starting point of all arrows
                    $to: null,  // jQuery set that contains all destination points (the points where arrows appear)
                    init: function () {
                        this.from = $elem.offset();
                        this.$to = (opts.targetSelector ? $(opts.targetSelector) : $()).map(function (index, e) {
                            var targetPos = $(e).offset();
                            return {
                                x: targetPos.left,
                                y: targetPos.top
                            }
                        });
                    }
                },
                createSvgDom: function (tag, attrs) {
                    var el = document.createElementNS(this.ns, tag);
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
                    getMarkerType: function (type, id, usesStroke) {
                        var $marker,
                            getNewId = function () {
                                return data.markers.ids[id] = 'refP' + $('svg.' + data.svgClass).length + id.charAt(0) + (+ new Date());
                            },
                            optsMarker = opts.arrows[id + 'Marker'];
                        if (optsMarker) {
                            var style = 'fill:' + opts.arrows.strokeColor + (usesStroke ? '; stroke:' + opts.arrows.borderColor : '');
                            switch (type) {
                                case 'circle':
                                    this.ids[id] = getNewId();
                                    $marker = data.createSvgDom('marker', {
                                        id: this.ids[id],
                                        markerWidth: optsMarker.size,
                                        markerHeight: optsMarker.size,
                                        refX: optsMarker.size/2,
                                        refY: optsMarker.size/2
                                    });
                                    return $marker.append(data.createSvgDom('circle', {
                                        cx: optsMarker.size/2,
                                        cy: optsMarker.size/2,
                                        r: optsMarker.size/2 - opts.arrows.borderWidth,
                                        style: style
                                    }));

                                case 'square':
                                    this.ids[id] = getNewId();
                                    $marker = data.createSvgDom('marker', {
                                        id: this.ids[id],
                                        markerWidth: optsMarker.size,
                                        markerHeight: optsMarker.size,
                                        refX: optsMarker.size/2,
                                        refY: optsMarker.size/2
                                    });
                                    return $marker.append(data.createSvgDom('rect', {
                                        x: 0,
                                        y: 0,
                                        width: optsMarker.size,
                                        height: optsMarker.size,
                                        style: style + (usesStroke ? '; stroke-width:' + opts.arrows.borderWidth : '')
                                    }));

                                case 'triangle':
                                    this.ids[id] = getNewId();
                                    $marker = data.createSvgDom('marker', {
                                        id: this.ids[id],
                                        markerWidth: optsMarker.size,
                                        markerHeight: optsMarker.size/1.25,
                                        refX: optsMarker.size - opts.arrows.borderWidth,
                                        refY: optsMarker.size/2.5,
                                        orient: 'auto'
                                    });
                                    return $marker.append(data.createSvgDom('path', {
                                        d: 'M0,0 L0,' + (optsMarker.size/1.25) + ' L' + optsMarker.size + ',' + (optsMarker.size/2.5) + ' L0,0',
                                        style: style
                                    }));
                            }
                        }
                        return null;
                    },
                    initMarker: function (type, id, usesSecondLayer) {
                        var $marker = this.getMarkerType(type, id, usesSecondLayer);
                        if ($marker) {
                            if (!this.$defs) {
                                this.$defs = data.createSvgDom('defs');
                            }
                            this.$defs.append($marker);
                        }
                    },
                    init: function (usesSecondLayer) {
                        this.initMarker(opts.arrows.startMarker.type, 'start', usesSecondLayer);
                        this.initMarker(opts.arrows.midMarker.type, 'mid', usesSecondLayer);
                        this.initMarker(opts.arrows.endMarker.type, 'end', usesSecondLayer);
                        return this.$defs;
                    }
                },
                getBoundRect: function () {
                    var bounds = {
                            top: this.points.from.top,
                            right: this.points.from.left,
                            bottom: this.points.from.top,
                            left: this.points.from.left
                        },
                        maxOffset = Math.max(opts.arrows.startMarker.size, Math.max(opts.arrows.midMarker.size, opts.arrows.endMarker.size));
                    this.points.$to.each(function (index, e) {
                        bounds.top = Math.min(bounds.top, e.y);
                        bounds.right = Math.max(bounds.right, e.x);
                        bounds.bottom = Math.max(bounds.bottom, e.y);
                        bounds.left = Math.min(bounds.left, e.x);
                    });
                    bounds.top -= maxOffset;
                    bounds.left -= maxOffset;
                    bounds.right += maxOffset;
                    bounds.bottom += maxOffset;
                    return bounds;
                },
                init: function () {
                    this.points.init();
                    var $arrows = $(),
                        bounds = this.getBoundRect(),
                        usesSecondLayer = opts.arrows.borderWidth && opts.arrows.borderColor !== 'transparent';
                    this.$svg = this.createSvgDom('svg', {
                        width: (bounds.right - bounds.left) + 'px',
                        height: (bounds.bottom - bounds.top) + 'px',
                        xmlns: this.ns,
                        version: '1.1',
                        class: data.svgClass
                    }).css({
                        position: 'absolute',
                        'pointer-events': 'none',
                        left: bounds.left + 'px',
                        top: bounds.top + 'px'
                    });
                    this.$svg.append(this.markers.init(usesSecondLayer));

                    this.points.$to.each(function (index, e) {
                        var attrs = {
                                x1: Math.round(data.points.from.left - bounds.left) + .5,
                                y1: Math.round(data.points.from.top - bounds.top) + .5,
                                x2: Math.round(e.x - bounds.left) + .5,
                                y2: Math.round(e.y - bounds.top) + .5,
                                'stroke-linecap': 'round'
                            };
                        if (usesSecondLayer) {
                            attrs.stroke = opts.arrows.borderColor;
                            attrs['stroke-width'] = opts.arrows.borderWidth + opts.arrows.strokeWidth;
                            $arrows = $arrows.add(data.createSvgDom('line', attrs));
                        }
                        attrs.stroke = opts.arrows.strokeColor;
                        attrs['stroke-width'] = opts.arrows.strokeWidth;
                        ['start', 'mid', 'end'].forEach(function (e) { 
                            if (data.markers.ids[e]) {
                                attrs['marker-' + e] = 'url(#' + data.markers.ids[e] + ')';
                            }
                        });
                        $arrows = $arrows.add(data.createSvgDom('line', attrs));
                    });
                    this.$svg.append($arrows).hide();
                    this.$svg.insertAfter($elem);
                }
            },
            designMode = {
                UI: {
                    $dots: null
                }
            },
            events = {
                onShow: function () {
                    data.$svg.show();
                },
                onHide: function () {
                    data.$svg.hide();
                },
                onDestroy: function () {
                    $elem.
                        unbind('mouseenter.rsRefPointer focus.rsRefPointer', events.onShow).
                        unbind('mouseleave.rsRefPointer blur.rsRefPointer', events.oneHide).
                        unbind('destroy.rsRefPointer', events.onDestroy);
                }
            };
        $elem.
            bind('mouseenter.rsRefPointer focus.rsRefPointer', events.onShow).
            bind('mouseleave.rsRefPointer blur.rsRefPointer', events.onHide).
            bind('destroy.rsRefPointer', events.onDestroy);
        data.init();
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
            borderWidth: 2,
            borderColor: 'white',
            startMarker: {
                type: 'circle',
                size: 8
            },
            midMarker: {
                type: null,
                size: 8
            },
            endMarker: {
                type: 'triangle',
                size: 8
            }
        }
    };
})(jQuery);