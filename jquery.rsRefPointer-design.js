/**
* jQuery RefPointer (design more)
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
    var runtime = $.fn.rsRefPointer,
        defaults = $.fn.rsRefPointer.defaults;

    if (!runtime) {
        console.error('jquery.rsRefPointer.js not loaded! Please, include jquery.rsRefPointer.js before the jquery.rsRefPointer-design.js.');
        return;
    }

    $.fn.rsRefPointer = function (options) {
        // Seems that this goes against all plug-in good practices, but in design mode, makes no sense at all to accept more than one element.
        // Design mode has a GUI. How could I display GUI for several instances simultaneously? I could implement some kind of tab control, but let's keep it simple.
        if (this.length > 1) {
            alert('Design-time mode cannot run for ' + this.length + ' plug-in instances!\n' +
                  'Make sure you invoke design mode for one instance only.\n\nE.g. if you have 2 anchors on your page, then this fails:\n' + 
                  '   $("a").rsRefPointer();\n' + 
                  'What you need is to run for the first instance:\n' +
                  '   $("a").eq(0).rsRefPointer();\n' +
                  'then edit previous line and re-run for the second instance:\n' +
                  '   $("a").eq(1).rsRefPointer();\n\n' +
                  'This restriction only applies in design-time mode.\nAt run-time mode, you can run multiple instances at once. ');
            return;
        }

        options = options || {};
        options.overrideGetBoundsRect = function () {
            var $document = $(document);
            return {
                left: 0,
                top: 0,
                right: $document.width(),
                bottom: $document.height()
            };
        };
        runtime.call(this, options);
        var allData = $.fn.rsRefPointer.designData,
            opts = allData.opts,
            data = allData.data,
            DOM = allData.DOM,
            events = allData.events,
            designMode = {
                UI: {
                    activeArrow: {
                        idx: null,
                        strokeSelected: '3px',
                        strokeUnselected: '1px',
                        select: function (newIndex) {
                            if (newIndex !== this.idx) {
                                if (this.idx !== null) {
                                    designMode.UI.points[this.idx].css('stroke-width', this.strokeUnselected);
                                }
                                DOM.arrows[newIndex].add(data.outline ? DOM.arrows[newIndex].prev() : null).detach().appendTo(DOM.$svg);
                                designMode.UI.points[newIndex].css('stroke-width', this.strokeSelected).detach().appendTo(DOM.$svg);
                                this.idx = newIndex;
                                $('ul li', designMode.UI.menu.$menu).removeClass('selected').eq(this.idx).addClass('selected');
                            }
                        }
                    },
                    dragInfo: {
                        $point: null,       // Represents the point currently being dragged.
                        pointType: null     // Either 'start', 'mid' or 'end'
                    },
                    points: null, // Array of jQuery set. Each jQuery object contains the points (start, end, mid) that belong to each arrow and their length is >= 2
                    menu: {
                        $menu: null,
                        positionX: 0,
                        positionY: 0,
                        dragInfo: { // dragging the menu
                            dragging: false,
                            startX: 0,
                            startY: 0
                        },
                        init: function () {
                            this.$menu = $('<menu class="refPointer design">' +
                                            '<header>Draggable Menu</header>' +
                                            '<hr>' +
                                            '<a href="#">New Line</a>' +
                                            '<a href="#">New Bezier Curve</a>' +
                                            '<ul></ul>' +
                                            '<a href="#" class="disabled">Add Middle Point</a>' +
                                            '<aside>Double click on point to delete it</aside>' +
                                            '<hr>' +
                                            '<a href="#">Generate Code to Console</a>' +
                                          '</menu>');
                            $('head').append(
                                '<style> ' + 
                                    'menu.refPointer.design {' +
                                        'background-color: #ddd;' +
                                        'box-shadow: 0 0 10px black;' +
                                        'border-radius: 3%/10%;' +
                                        'font-size: 12px;' +
                                        'font-family: arial;' +
                                        'display: inline-block;' +
                                        'position: absolute;' +
                                        'left: 5px;' +
                                        'top: 50px;' +
                                        'padding: 5px;' +
                                        '-moz-user-select: none;' +
                                        '-ms-user-select: none;' +
                                        '-webkit-user-select: none;' +
                                        'user-select: none;' +
                                    '}' +
                                    'menu.refPointer.design header {' +
                                        'cursor: move;' +
                                        'padding: 3px 5px 0;' +
                                    '}' +
                                    'menu.refPointer.design aside {' +
                                        'font-size: 9px;' +
                                        'color: grey;' +
                                        'padding-left: 5px;' +
                                    '}' +
                                    'menu.refPointer.design > a {' +
                                        'display: block;' +
                                        'padding: 5px;' +
                                        'text-decoration: none;' +
                                        'line-height: 12px;' +
                                        'border-radius: 2px;' +
                                    '}' +
                                    'menu.refPointer.design > a:hover {' +
                                        'background-color: grey;' +
                                        'color: white;' +
                                    '}' +
                                    'menu.refPointer.design ul {' +
                                        'border: 1px #777 solid;' +
                                        'overflow: auto;' +
                                        'height: 200px;' +
                                        'margin: 5px;' +
                                        'padding: 0;' +
                                        'list-style: none' +
                                    '}' +
                                    'menu.refPointer.design ul li {' +
                                        'margin: 5px;' +
                                        'padding: 3px;' +
                                        'background-color: #eee;' +
                                        'border-radius: 2px;' +
                                        'border: 1px #eee solid;' +
                                    '}' +
                                    'menu.refPointer.design ul li.selected {' +
                                        'border-color: red;' +
                                    '}' +
                                    'menu.refPointer.design ul li > a {' +
                                        'display: none;' +
                                        'float: right;' +
                                        'border-radius: 2px;' +
                                        'color: grey;' +
                                        'text-decoration: none;' +
                                        'width: 16px;' +
                                        'text-align: center;' +
                                    '}' +
                                    'menu.refPointer.design ul li:hover {' +
                                        'background-color: white;' +
                                    '}' +
                                    'menu.refPointer.design ul li:hover > a {' +
                                        'display: block;' +
                                    '}' +
                                    'menu.refPointer.design ul li > a:hover {' +
                                        'background-color: #ddd;' +
                                        'color: red;' +
                                    '}' +
                                    'menu.refPointer.design > a.disabled {' +
                                        'color: grey;' +
                                    '}' +
                                    'menu.refPointer.design > a.disabled:hover {' +
                                        'background-color: inherit;' +
                                        'cursor: default;' +
                                    '}' +
                                '</style>'
                            );
                            $('body').append(this.$menu);
                            var finishMenuDragging = function (e) {
                                designMode.UI.menu.dragInfo.dragging = false;
                                var pos = designMode.UI.menu.$menu.position();
                                designMode.UI.menu.positionX = pos.left;
                                designMode.UI.menu.positionY = pos.top;
                            };
                            $('header', designMode.UI.menu.$menu).mousedown(function (e) {
                                designMode.UI.menu.dragInfo.dragging = true;
                                designMode.UI.menu.dragInfo.startX = e.pageX;
                                designMode.UI.menu.dragInfo.startY = e.pageY;
                                var pos = designMode.UI.menu.$menu.position();
                                designMode.UI.menu.positionX = pos.left;
                                designMode.UI.menu.positionY = pos.top;
                            }).mousemove(function (e) {
                                if (designMode.UI.menu.dragInfo.dragging) {
                                    designMode.UI.menu.$menu.css({
                                        'left': (e.pageX - designMode.UI.menu.dragInfo.startX + designMode.UI.menu.positionX) + 'px',
                                        'top': (e.pageY - designMode.UI.menu.dragInfo.startY + designMode.UI.menu.positionY) + 'px'
                                    });
                                }
                            }).mouseup(finishMenuDragging).mouseleave(finishMenuDragging);
                            $('a.disabled', designMode.UI.menu.$menu).click(function (e) {
                                e.preventDefault();
                            });

                            data.arrowTypes.forEach(function () {
                                designMode.UI.menu.addArrowLink();
                            });
                        },
                        addArrowLink: function () {
                            var $a = $('<a href="#">&#x2715;</a>'),
                                $li = $('<li>').text('arrow').append($a);
                            $('ul', designMode.UI.menu.$menu).append($li);
                            $li.click(function () {
                                designMode.UI.activeArrow.select($(this).index());
                            });
                        }
                    },
                    init: function () {
                        this.menu.init();

                        DOM.$svg.add(designMode.UI.menu.$menu).mousemove(function (e) {
                            if (designMode.UI.dragInfo.$point) {
                                designMode.UI.dragInfo.$point.attr({
                                    'cx': e.pageX,
                                    'cy': e.pageY
                                });
                                switch (designMode.UI.dragInfo.pointType) {
                                    case 'start':
                                        var offset = data.points.layout.fromOffset[designMode.UI.activeArrow.idx];
                                        offset.dx = e.pageX - data.points.start.x;
                                        offset.dy = e.pageY - data.points.start.y; 
                                        break;
                                    case 'mid':
                                        var midPoints = data.points.mid[designMode.UI.activeArrow.idx],
                                            // subtracting 2 because the first two are the start and end points
                                            idx = designMode.UI.points[designMode.UI.activeArrow.idx].index(designMode.UI.dragInfo.$point) - 2;
                                        if (idx > -1) {
                                            midPoints[idx].x = e.pageX;
                                            midPoints[idx].y = e.pageY;
                                        }
                                        break;
                                    case 'end':
                                        var offset = data.points.layout.toOffset[designMode.UI.activeArrow.idx];
                                        offset.dx = e.pageX - data.points.end[designMode.UI.activeArrow.idx].x;
                                        offset.dy = e.pageY - data.points.end[designMode.UI.activeArrow.idx].y; 
                                }
                                DOM.updateArrow(designMode.UI.activeArrow.idx);
                            }
                        }).mouseup(function () {
                            designMode.UI.dragInfo.$point = designMode.UI.dragInfo.pointType = null;
                        });

                        // insert point anchors to the DOM
                        designMode.UI.points = [];
                        data.points.end.forEach(function (pnt, index) {
                            var $startEndPoints = DOM.markers.getDesignModePoint(data.points.start, index, data.points.layout.fromOffset).
                                                    add(DOM.markers.getDesignModePoint(pnt, index, data.points.layout.toOffset));
                            designMode.UI.points.push($startEndPoints);
                            DOM.$svg.append($startEndPoints);
                        });
                        data.points.mid.forEach(function (pnts, index) {
                            for(var pnt in pnts) {
                                pnts[pnt] = data.points.getMidPoint(pnts[pnt], index);
                                $pointMid = DOM.markers.getDesignModePoint(pnts[pnt], index);
                                designMode.UI.points[index] = designMode.UI.points[index].add($pointMid);
                            }
                            DOM.$svg.append(designMode.UI.points[index].filter(function(i) { return i > 1; })); // skip the first two. They are the start and end points
                        });
                        data.points.getMidPoint = function (relativePnt) {
                            return relativePnt; // in design mode, the mid points are absolute, not relative
                        };
                        $('ul li:first-child', designMode.UI.menu.$menu).click(); // initializes the active arrow
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
                    DOM.$svg.css({
                        'background-color': 'rgba(255,255,255,.7)',
                        'pointer-events': ''
                    });
                    $window.resize(doResize);
                    doResize();
                    events.onShow();
                    this.UI.init();
                }
            };
        DOM.markers.getDesignModePoint = function (pnt, arrowIdx, offsetArray) {
            var maxSize = Math.max(opts.arrows.startMarker.size, Math.max(opts.arrows.midMarker.size, opts.arrows.endMarker.size)),
                $point = DOM.createSvgDom('circle', {
                    cx: pnt.x + (offsetArray === undefined ? 0 : offsetArray[arrowIdx].dx),
                    cy: pnt.y + (offsetArray === undefined ? 0 : offsetArray[arrowIdx].dy),
                    r: maxSize/1.5,
                    style: 'fill:transparent; stroke:rgba(255,0,0,.3); stroke-width:' + (arrowIdx === 0 ? designMode.UI.activeArrow.strokeSelected : designMode.UI.activeArrow.strokeUnselected)
                });
            return $point.mouseover(function () {
                if (!designMode.UI.dragInfo.$point) {
                    $point.css({
                        'stroke': 'red',
                        'cursor': 'move'
                    });
                }
            }).mousedown(function () {
                var dragInfo = designMode.UI.dragInfo,
                    indexPoint = designMode.UI.points[arrowIdx].index($point);
                dragInfo.$point = $point;
                dragInfo.pointType = indexPoint === 0 ? 'start' : (indexPoint === 1 ? 'end' : 'mid');
                designMode.UI.activeArrow.select(arrowIdx);
                $point.css('cursor', 'none');
            }).mouseup(function () {
                $point.css('cursor', 'move');
            }).mouseleave(function () {
                if (!designMode.UI.dragInfo.$point) {
                    $point.css({
                        'stroke': 'rgba(255,0,0,.3)',
                        'cursor': ''
                    });
                }
            });
        };
        designMode.init();
    };

    $.fn.rsRefPointer.defaults = defaults;
})(jQuery);