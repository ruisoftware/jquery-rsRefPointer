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
        // Seems that this goes against all plug-in good practices, but in design mode, we really cannot accept more than one element.
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
                    dragInfo: {
                        $point: null,       // Represents the point currently being dragged.
                        pointType: null,    // Either 'start', 'mid' or 'end'
                        arrowIdx: null      // Dragging the DOM.arrows[arrowIdx] arrow. Type: integer
                    },
                    points: {
                        $start: null,   // jQuery set containing 1 or more DOM starting drag-and-drop points
                        $mid: null,     // jQuery set containing 0 or more DOM middle drag-and-drop points
                        $end: null      // jQuery set containing 1 or more DOM ending drag-and-drop points
                    },
                    menu: {
                        positionX: 0,
                        positionY: 0,
                        dragInfo: { // dragging the menu
                            dragging: false,
                            startX: 0,
                            startY: 0
                        },
                        init: function () {
                            var $menu = $('<menu class="refPointer design">' +
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
                            $('body').append($menu);
                            var finishMenuDragging = function (e) {
                                designMode.UI.menu.dragInfo.dragging = false;
                                var pos = $menu.position();
                                designMode.UI.menu.positionX = pos.left;
                                designMode.UI.menu.positionY = pos.top;
                            };
                            $('menu.refPointer.design header').mousedown(function (e) {
                                designMode.UI.menu.dragInfo.dragging = true;
                                designMode.UI.menu.dragInfo.startX = e.pageX;
                                designMode.UI.menu.dragInfo.startY = e.pageY;
                                var pos = $menu.position();
                                designMode.UI.menu.positionX = pos.left;
                                designMode.UI.menu.positionY = pos.top;
                            }).mousemove(function (e) {
                                if (designMode.UI.menu.dragInfo.dragging) {
                                    $menu.css({
                                        'left': (e.pageX - designMode.UI.menu.dragInfo.startX + designMode.UI.menu.positionX) + 'px',
                                        'top': (e.pageY - designMode.UI.menu.dragInfo.startY + designMode.UI.menu.positionY) + 'px'
                                    });
                                }
                            }).mouseup(finishMenuDragging).mouseleave(finishMenuDragging);
                            $('menu.refPointer.design a.disabled').click(function (e) {
                                e.preventDefault();
                            });
                            data.points.start.forEach(function () {
                                designMode.UI.menu.addArrowLink();
                            });
                        },
                        addArrowLink: function () {
                            var $a = $('<a href="#">&#x2715;</a>');
                            $('menu.refPointer.design ul').append($a);
                            $a.wrap('<li>');
                            // TODO click event
                        }
                    },
                    init: function () {
                        this.menu.init();

                        DOM.$svg.add($("menu.refPointer.design")).mousemove(function (e) {
                            if (designMode.UI.dragInfo.$point) {
                                designMode.UI.dragInfo.$point.attr({
                                    'cx': e.pageX,
                                    'cy': e.pageY
                                });
                                var $arrow = DOM.arrows[designMode.UI.dragInfo.arrowIdx];
                                if (data.outline) { // also drag the previous arrow, the one that represents the outline
                                    $arrow = $arrow.add($arrow.prev());
                                }
                                switch (designMode.UI.dragInfo.pointType) {
                                    case 'start':
                                        $arrow.attr({
                                            'x1': e.pageX,
                                            'y1': e.pageY
                                        });
                                        break;
                                    case 'mid':
                                        // TODO
                                        break;
                                    case 'end':
                                        $arrow.attr({
                                            'x2': e.pageX,
                                            'y2': e.pageY
                                        });
                                }
                            }
                        }).mouseup(function () {
                            designMode.UI.dragInfo.$point = designMode.UI.dragInfo.pointType = designMode.UI.dragInfo.arrowIdx = null;
                        });

                        // insert point anchors to the DOM
                        this.points.$start = $([]);
                        this.points.$mid = $([]);
                        this.points.$end = $([]);
                        var points = designMode.UI.points;
                        data.points.start.forEach(function (pnt, index) {
                            points.$start = points.$start.add(DOM.markers.getDesignModePoint(pnt, index));
                        });
                        data.points.mid.forEach(function (pnts, index) {
                            for(var pnt in pnts) {
                                points.$mid = points.$mid.add(DOM.markers.getDesignModePoint(pnt, index));
                            }
                        });
                        data.points.end.forEach(function (pnt, index) {
                            points.$end = points.$end.add(DOM.markers.getDesignModePoint(pnt, index));
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
        DOM.markers.getDesignModePoint = function (pnt, arrowIdx) {
            var maxSize = Math.max(opts.arrows.startMarker.size, Math.max(opts.arrows.midMarker.size, opts.arrows.endMarker.size)),
                $point = DOM.createSvgDom('circle', {
                    cx: pnt.x,
                    cy: pnt.y,
                    r: maxSize/1.5,
                    style: 'fill:transparent; stroke:rgba(255,0,0,.3); stroke-width:3'
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
                    dragPoints = designMode.UI.points;
                dragInfo.$point = $point;
                dragInfo.pointType = dragPoints.$start.is($point) ? 'start' : (dragPoints.$mid.is($point) ? 'mid' : 'end');
                dragInfo.arrowIdx = arrowIdx;
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