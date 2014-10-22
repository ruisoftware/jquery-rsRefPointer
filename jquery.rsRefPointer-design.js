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

//TODO Design mode should ouput the topLeft and size. Othewise, the arrows will not have the designed shape if the page is reloaded with a size different than the designed page size.

    if (!runtime) {
        console.error('jquery.rsRefPointer.js not loaded! Please, include jquery.rsRefPointer.js before the jquery.rsRefPointer-design.js.');
        return;
    }

    $.fn.rsRefPointer = function (options) {
        if (typeof options === "string") {
            alert('Not allowed in design-time mode.');
            return;
        }
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
                  'This restriction only applies in design-time mode.\nAt run-time mode, you can run multiple instances at once.');
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
                                    designMode.UI.$points[this.idx].css('stroke-width', this.strokeUnselected);
                                }
                                DOM.getArrow(newIndex).detach().appendTo(DOM.$svg);
                                designMode.UI.$points[newIndex].css('stroke-width', this.strokeSelected).detach().appendTo(DOM.$svg);
                                this.idx = newIndex;
                                $('ul li', designMode.UI.menu.$menu).removeClass('selected').eq(this.idx).addClass('selected');
                            }
                        }
                    },
                    dragInfo: {
                        $point: null,       // Represents the point currently being dragged.
                        pointType: null     // Either 'start', 'mid' or 'end'
                    },
                    $points: null, // Array of jQuery set. Each jQuery object contains the points (start, end, mid) that belong to each arrow and their length is >= 2
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
                            this.$menu = $(
                                '<menu class="refPointer design">' +
                                    '<header>Draggable Menu</header>' +
                                    '<hr>' +
                                    '<a href="#">New Line</a>' +
                                    '<a href="#">New Bezier Curve</a>' +
                                    '<a href="#" class="disabled">Add Middle Point</a>' +
                                    '<aside>Double click on point to delete it</aside>' +
                                    '<ul></ul>' +
                                    '<a href="#">Arrow Properties</a>' +
                                    '<hr>' +
                                    '<a href="#">Generate Code to Console</a>' +
                                '</menu>'
/*
                                +

                                '<div>' +
                                    '<div>Arrow Properties<a href="#" title="Discard changes and close popup">&#x2715;</a>' +
                                        '<hr><label>Preview</label><label>Markers</label><label>Stroke</label><label>Outline</label>' +
                                        '<input type="color" value="#000000"><input type="color" value="#000000"><input type="color" value="#ffff00"><input type="range" min="0" max="4" value="0" step="1" name="power" list="powers">' +
                                        '<svg width="150px" height="100px" xmlns="http://www.w3.org/2000/svg" version="1.1">' +
                                            '<defs>' +
                                                '<marker id="rsRefPMarkerPointer" markerWidth="8" markerHeight="6" refX="3" refY="3" orient="auto">' +
                                                    '<path d="M0,0 L0,6 L8,3 z" fill="white" stroke="black"></path>' +
                                                '</marker>' +

                                                '<marker id="rsRefPMarkerPointer2" markerWidth="8" markerHeight="6" refX="3" refY="3" orient="auto">' +
                                                    '<path d="M2,3 L0,6 L8,3 L0,0 z" fill="black"></path>' +
                                                '</marker>' +

                                                '<marker id="rsRefPMarkerCircle" markerWidth="5" markerHeight="5" refX="3" refY="3" orient="auto">' +
                                                    '<circle cx="3" cy="3" r="2" fill="black"></circle>' +
                                                '</marker>' +
                                                '<marker id="rsRefPMarkerCircle2" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">' +
                                                    '<circle cx="3.5" cy="3.5" r="3" fill="black"></circle>' +
                                                '</marker>' +
                                                '<marker id="rsRefPMarkerCircle3" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">' +
                                                    '<circle cx="4.5" cy="4.5" r="4" fill="black"></circle>' +
                                                '</marker>' +

                                                '<marker id="rsRefPMarkerRect" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">' +
                                                    '<rect x="0" y="0" width="4" height="4" rx="1" ry="1" fill="black"></rect>' +
                                                '</marker>' +
                                            '</defs>' +
                                            '<path d="M18,16.5 L74,16.5 L128,16.5" stroke="black" stroke-width="1" marker-start="url(#rsRefPMarkerPointer)" marker-mid="url(#rsRefPMarkerCircle2)" marker-end="url(#rsRefPMarkerCircle2)"></path>' +
                                            '<text x="7" y="36">none</text>' +
                                            '<text x="68" y="36">none</text>' +
                                            '<text x="130" y="36">none</text>' +
                                            // pointer
                                            '<path d="M7,45 L7,57 L23,51 z"></path>' +
                                            '<path d="M68,45 L68,57 L84,51 z"></path>' +
                                            '<path d="M130,45 L130,57 L146,51 z"></path>' +
                                            // pointer2
                                            '<path d="M11,69 L7,75 L23,69 L7,63 z"></path>' +
                                            '<path d="M72,69 L68,75 L84,69 L68,63 z"></path>' +
                                            '<path d="M134,69 L130,75 L146,69 L130,63 z"></path>' +
                                            // сircle
                                            '<circle cx="13" cy="87" r="6"></circle>' +
                                            '<circle cx="74" cy="87" r="6"></circle>' +
                                            '<circle cx="136" cy="87" r="6"></circle>' +
                                            // rect
                                            '<rect x="6" y="110" width="12" height="12" rx="1" ry="1"></rect>' +
                                            '<rect x="68" y="110" width="12" height="12" rx="1" ry="1"></rect>' +
                                            '<rect x="130" y="110" width="12" height="12" rx="1" ry="1"></rect>' +

                                            '<g>' +
                                                '<text x="7" y="136">Size:</text>' +
                                                '<text x="7" y="146">Fill:</text>' +
                                                '<text x="7" y="156">Size:</text>' +
                                                '<text x="7" y="166">Color:</text>' +
                                                '<text x="7" y="176">Size:</text>' +
                                                '<text x="7" y="186">Color:</text>' +
                                            '</g>' +
                                        '</svg>' +
                                        '<button>Apply Changes</button>' +
                                    '</div>' +
                                '</div>'
*/
                            );
                            $('head').append(
                                '<style> ' + 
                                    'menu.refPointer.design,' +
                                    'menu.refPointer.design + div > div {' +
                                        'box-shadow: 0 0 10px black;' +
                                        'border-radius: 20px/15px;' +
                                        'position: absolute;' +
                                    '}' +
                                    'menu.refPointer.design {' +
                                        'background-color: #ddd;' +
                                        'font-size: 12px;' +
                                        'font-family: arial;' +
                                        'display: inline-block;' +
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
                                        'padding: 3px 5px 6px;' +
                                        'text-align: center;' +
                                    '}' +
                                    'menu.refPointer.design aside {' +
                                        'font-size: 9px;' +
                                        'color: grey;' +
                                        'padding-left: 5px;' +
                                        'margin-bottom: 10px;' +
                                    '}' +
                                    'menu.refPointer.design > a {' +
                                        'display: block;' +
                                        'padding: 5px;' +
                                        'text-decoration: none;' +
                                        'line-height: 12px;' +
                                        'border-radius: 2px;' +
                                    '}' +
                                    'menu.refPointer.design > a:first-of-type {' +
                                        'margin-top: 13px;' +
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
                                        'cursor: pointer;' +
                                    '}' +
                                    'menu.refPointer.design ul li.selected {' +
                                        'background-color: #f7abab;' +
                                    '}' +
                                    'menu.refPointer.design ul li > a {' +
                                        'display: none;' +
                                        'float: right;' +
                                        'border-radius: 2px;' +
                                        'color: black;' +
                                        'text-decoration: none;' +
                                        'width: 16px;' +
                                        'text-align: center;' +
                                    '}' +
                                    'menu.refPointer.design ul li:hover {' +
                                        'background-color: white;' +
                                    '}' +
                                    'menu.refPointer.design ul li.selected:hover {' +
                                        'background-color: #ed9494;' +
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
                                    'menu.refPointer.design + div {' +
                                        'position: absolute;' +
                                        'top: 0;' +
                                        'right: 0;' +
                                        'bottom: 0;' +
                                        'left: 0;' +
                                        'background-color: rgba(0, 0, 0, .5);' +
                                    '}' +
                                    'menu.refPointer.design + div > div {' +
                                        'position: absolute;' +
                                        'left: 50%;' +
                                        'top: 50%;' +
                                        'margin-left: -90px;' +
                                        'margin-top: -110px;' +
                                        'font-family: arial;' +
                                        'font-size: 12px;' +
                                        'padding: 10px;' +
                                        'background-color: #eee;' +
                                    '}' +
                                    'menu.refPointer.design + div > div a:first-of-type {' +
                                        'position: absolute;' +
                                        'right: 10px;' +
                                        'font-size: 15px;' +
                                        'text-decoration: none;' +
                                        'color: grey;' +
                                    '}' +
                                    'menu.refPointer.design + div > div a:first-of-type:hover {' +
                                        'color: red;' +
                                    '}' +
                                    'menu.refPointer.design + div > div label {' +
                                        'font-size: 8px;' +
                                        'text-shadow: 1px 1px white;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > svg {' +
                                        'display: block;' +
                                        'fill: grey;' +
                                        'font-size: 9px;' +
                                    '}' +
                                    'menu.refPointer.design + div svg > text:hover,' +
                                    'menu.refPointer.design + div svg > path:hover,' +
                                    'menu.refPointer.design + div svg > circle:hover,' +
                                    'menu.refPointer.design + div svg > rect:hover {' +
                                        'cursor: pointer;' +
                                        'fill: black;' +
                                    '}' +
                                    'menu.refPointer.design + div svg > g > text {' +
                                        'font-size: 11px;' +
                                    '}' +
                                    'menu.refPointer.design + div label,' +
                                    'menu.refPointer.design + div input {' +
                                        'position: absolute;' +
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

                            data.arrowTypes.forEach(function (e, index) {
                                designMode.UI.menu.addArrowLink();
                            });
                        },
                        addArrowLink: function () {
                            var $a = $('<a href="#" title="Delete arrow">&#x2715;</a>'),
                                $li = $('<li>').text('arrow').append($a);
                            $('ul', designMode.UI.menu.$menu).append($li);
                            $li.click(function (e) {
                                e.preventDefault();
                                designMode.UI.activeArrow.select($(this).index());
                            });
                            $a.click(function (e) {
                                e.preventDefault();
                                designMode.UI.deleteArrow($(this).parent().index());
                            });
                        }
                    },
                    deleteArrow: function (index) {
                        if (designMode.UI.activeArrow.idx === index) {
                            if (index === 0) {
                                if (data.arrowTypes.length > 1) {
                                    designMode.UI.activeArrow.select(1); // will run the if statement below
                                } else {
                                    designMode.UI.activeArrow.idx = null;
                                }
                            } else {
                                designMode.UI.activeArrow.select(index - 1)
                            }
                        }
                        if (designMode.UI.activeArrow.idx > index) {
                            designMode.UI.activeArrow.idx--;
                        }
                        designMode.UI.$points[index].remove();
                        designMode.UI.$points.splice(index, 1);

                        data.arrowTypes.splice(index, 1);
                        data.points.mid.splice(index, 1);
                        data.points.end.splice(index, 1);
                        data.points.layout.fromOffset.splice(index, 1);
                        data.points.layout.toOffset.splice(index, 1);
                        data.points.layout.topLeft.splice(index, 1);
                        data.points.layout.size.splice(index, 1);
                        DOM.getArrow(index).remove();
                        DOM.arrows.splice(index, 1);
                        if (opts.shadow.visible) {
                            DOM.arrowsShadow[index].remove();
                            DOM.arrowsShadow.splice(index, 1);
                        }
                        $('ul li', designMode.UI.menu.$menu).eq(index).remove();
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
                                            idx = designMode.UI.$points[designMode.UI.activeArrow.idx].index(designMode.UI.dragInfo.$point) - 2;
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

                                switch (data.arrowTypes[designMode.UI.activeArrow.idx]) {
                                    case 'bezierQ':
                                    case 'bezierC':
                                        if (designMode.UI.dragInfo.pointType === 'mid') {
                                            DOM.updateBezierControlLines(designMode.UI.activeArrow.idx, designMode.UI.dragInfo.pointType, designMode.UI.$points[designMode.UI.activeArrow.idx].index(designMode.UI.dragInfo.$point) - 2);
                                        } else {
                                            DOM.updateBezierControlLines(designMode.UI.activeArrow.idx, designMode.UI.dragInfo.pointType);
                                        }
                                }
                            }
                        }).mouseup(function () {
                            designMode.UI.dragInfo.$point = designMode.UI.dragInfo.pointType = null;
                        });

                        // insert point anchors to the DOM
                        designMode.UI.$points = [];
                        DOM.bezierControlLines = [];
                        data.points.end.forEach(function (pnt, index) {
                            var $startEndPoints = DOM.markers.getDesignModePoint(data.points.start, index, data.points.layout.fromOffset).
                                                    add(DOM.markers.getDesignModePoint(pnt, index, data.points.layout.toOffset));
                            designMode.UI.$points.push($startEndPoints);
                            DOM.$svg.append($startEndPoints);
                            DOM.bezierControlLines.push([]);
                        });

                        var $controlLinesSvgGroup = null, $controlLine;
                        data.points.mid.forEach(function (pnts, index) {
                            if (data.arrowTypes[index] === 'bezierQ' || data.arrowTypes[index] === 'bezierC') {
                                if ($controlLinesSvgGroup === null) {
                                    $controlLinesSvgGroup = DOM.createSvgDom('g');
                                    DOM.$svg.append($controlLinesSvgGroup);
                                }
                            }
                            for(var pnt in pnts) {
                                // this assignment changes the data.points.mid values
                                pnts[pnt] = data.points.getMidPoint(pnts[pnt], index);
                                designMode.UI.$points[index] = designMode.UI.$points[index].add(DOM.markers.getDesignModePoint(pnts[pnt], index));

                                if (data.arrowTypes[index] === 'bezierQ' || data.arrowTypes[index] === 'bezierC') {
                                    $controlLine = DOM.createSvgDom('line', {
                                        x1: (pnt == 0 ? data.points.start.x + data.points.layout.fromOffset[index].dx : data.points.mid[index][i - 1].x),
                                        y1: (pnt == 0 ? data.points.start.y + data.points.layout.fromOffset[index].dy : data.points.mid[index][i - 1].y),
                                        x2: pnts[pnt].x,
                                        y2: pnts[pnt].y,
                                        stroke: '#f7abab',
                                        'stroke-dasharray': '5'
                                    });
                                    DOM.bezierControlLines[index].push($controlLine);
                                    $controlLinesSvgGroup.append($controlLine);
                                }
                            }
                            if (data.arrowTypes[index] === 'bezierQ' || data.arrowTypes[index] === 'bezierC') {
                                $controlLine = DOM.createSvgDom('line', {
                                    x1: data.points.mid[index][pnts.length - 1].x,
                                    y1: data.points.mid[index][pnts.length - 1].y,
                                    x2: data.points.end[index].x + data.points.layout.toOffset[index].dx,
                                    y2: data.points.end[index].y + data.points.layout.toOffset[index].dy,
                                    stroke: '#f7abab',
                                    'stroke-dasharray': '5'
                                });
                                DOM.bezierControlLines[index].push($controlLine);
                                $controlLinesSvgGroup.append($controlLine);
                            }
                            DOM.$svg.append(designMode.UI.$points[index].filter(function(i) { return i > 1; })); // skip the first two. They are the start and end points
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
            var maxSize = Math.max(data.shapeRelSize.circle, Math.max(data.shapeRelSize.square, data.shapeRelSize.pointer)),
                $point = DOM.createSvgDom('circle', {
                    cx: pnt.x + (offsetArray === undefined ? 0 : offsetArray[arrowIdx].dx),
                    cy: pnt.y + (offsetArray === undefined ? 0 : offsetArray[arrowIdx].dy),
                    r: ((opts.marker.size - 1)*0.25 + 1)*maxSize/1.5,
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
                    indexPoint = designMode.UI.$points[arrowIdx].index($point);
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
        DOM.updateBezierControlLines = function (arrowIdx, pointType, midPointerIdx) {
            switch (pointType) {
                case 'start':
                    DOM.bezierControlLines[arrowIdx][0].attr({
                        x1: data.points.start.x + data.points.layout.fromOffset[arrowIdx].dx,
                        y1: data.points.start.y + data.points.layout.fromOffset[arrowIdx].dy,
                        x2: data.points.mid[arrowIdx][0].x,
                        y2: data.points.mid[arrowIdx][0].y
                    });
                    break;
                case 'mid':
                    if (midPointerIdx === 0) {
                        DOM.updateBezierControlLines(arrowIdx, 'start');
                    } else {
                        DOM.bezierControlLines[arrowIdx][midPointerIdx].attr({
                            x1: data.points.mid[arrowIdx][midPointerIdx - 1].x,
                            y1: data.points.mid[arrowIdx][midPointerIdx - 1].x,
                            x2: data.points.mid[arrowIdx][midPointerIdx].x,
                            y2: data.points.mid[arrowIdx][midPointerIdx].y
                        });
                    }
                    if (midPointerIdx === data.points.mid[arrowIdx].length - 1) {
                        DOM.updateBezierControlLines(arrowIdx, 'end');
                    } else {
                        DOM.bezierControlLines[arrowIdx][midPointerIdx + 1].attr({
                            x1: data.points.mid[arrowIdx][midPointerIdx].x,
                            y1: data.points.mid[arrowIdx][midPointerIdx].x,
                            x2: data.points.mid[arrowIdx][midPointerIdx + 1].x,
                            y2: data.points.mid[arrowIdx][midPointerIdx + 1].y
                        });
                    }
                    break;
                case 'end':
                    midPointerIdx = data.points.mid[arrowIdx].length - 1;
                    DOM.bezierControlLines[arrowIdx][midPointerIdx + 1].attr({
                        x1: data.points.mid[arrowIdx][midPointerIdx].x,
                        y1: data.points.mid[arrowIdx][midPointerIdx].y,
                        x2: data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx,
                        y2: data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy
                    });
            }
        };
        designMode.init();
    };

    $.fn.rsRefPointer.defaults = defaults;
})(jQuery);