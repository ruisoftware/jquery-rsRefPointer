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
                        $point: null,       // Represents the point currently being dragged
                        pointType: null,    // Either 'start', 'mid' or 'end'
                        midRef: null,
                        midIndex: null
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
                                    '<a href="#">New Quadratic Bezier</a>' +
                                    '<a href="#">New Cubic Bezier</a>' +
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
                            $('> a:first-of-type + a + a + a', designMode.UI.menu.$menu).removeClass(data.arrowTypes.length > 0 ? 'disabled' : null).click(function (e) {
                                e.preventDefault();
                                designMode.UI.addPoint();
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
                    addPoint: function () {
                        var arrowIdx = designMode.UI.activeArrow.idx,
                            sets = {
                                controlPoints: $([]),
                                controlLines: $([])
                            },
                            midPoints = data.points.mid[arrowIdx],
                            lastPntIdx = midPoints.length - 1;
                        switch(data.arrowTypes[arrowIdx]) {
                            case 'bezierQ':
                                var newBezierPoint = { // new bezier point is the average of the last mid point with the last point
                                        x: (midPoints[lastPntIdx].x + data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx)/2.0,
                                        y: (midPoints[lastPntIdx].y + data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy)/2.0
                                    },
                                    newControlPoint = {
                                        x: 2*newBezierPoint.x - midPoints[lastPntIdx].x,
                                        y: 2*newBezierPoint.y - midPoints[lastPntIdx].y
                                    };
                                this.addPointAndControlLinesBezierQ(newBezierPoint, arrowIdx, sets);
                                this.addPointAndControlLinesBezierQ(newControlPoint, arrowIdx, sets);
                                break;
                            case 'bezierC':
                                var endPoint = {
                                        x: data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx,
                                        y: data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy
                                    },
                                    newBezierPoint = { // new bezier point is the average of the last four points (two last control points + two last anchor points)
                                        x: (midPoints[lastPntIdx].x +
                                            midPoints[lastPntIdx - 1].x +
                                            endPoint.x +
                                            (lastPntIdx > 1 ? midPoints[lastPntIdx - 2].x : data.points.start.x + data.points.layout.fromOffset[arrowIdx].dx)
                                            )/4.0,
                                        y: (midPoints[lastPntIdx].y +
                                            midPoints[lastPntIdx - 1].y +
                                            endPoint.y +
                                            (lastPntIdx > 1 ? midPoints[lastPntIdx - 2].y : data.points.start.y + data.points.layout.fromOffset[arrowIdx].dy)
                                            )/4.0
                                    },
                                    delta = {
                                        dx: midPoints[lastPntIdx].x - endPoint.x,
                                        dy: midPoints[lastPntIdx].y - endPoint.y
                                    };
                                midPoints[lastPntIdx].x = newBezierPoint.x + delta.dx;
                                midPoints[lastPntIdx].y = newBezierPoint.y + delta.dy;
                                designMode.UI.$points[arrowIdx].eq(lastPntIdx + 2).attr({
                                    'cx': midPoints[lastPntIdx].x,
                                    'cy': midPoints[lastPntIdx].y
                                });
                                DOM.bezier.bezierControlLines[arrowIdx][DOM.bezier.bezierControlLines[arrowIdx].length - 1].attr({
                                    x1: midPoints[lastPntIdx].x,
                                    y1: midPoints[lastPntIdx].y,
                                    x2: newBezierPoint.x,
                                    y2: newBezierPoint.y
                                });
                                this.addPointAndControlLinesBezierC(newBezierPoint, arrowIdx, sets, false, lastPntIdx++);
                                this.addPointAndControlLinesBezierC({
                                    x: newBezierPoint.x - delta.dx,
                                    y: newBezierPoint.y - delta.dy
                                }, arrowIdx, sets, true, lastPntIdx);
                                this.addPointAndControlLinesBezierC({
                                    x: endPoint.x - delta.dx,
                                    y: endPoint.y - delta.dy
                                }, arrowIdx, sets, true, null);
                        }
                        DOM.$svg.append(sets.controlPoints);
                        DOM.markers.$defs.next('g').append(sets.controlLines);
                        DOM.updateArrow(arrowIdx);
                    },
                    addPointAndControlLinesBezierQ: function (newPnt, arrowIdx, sets) {
                        var $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true),
                            $controlLine = DOM.bezier.createControlLine({
                                x1: newPnt.x,
                                y1: newPnt.y,
                                x2: data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx,
                                y2: data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy
                            });
                        data.points.mid[arrowIdx].push(newPnt);
                        designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].add($controlPoint);
                        sets.controlPoints = sets.controlPoints.add($controlPoint);

                        // the previous last control line should point to the new control point, not to the target point
                        DOM.bezier.bezierControlLines[arrowIdx][DOM.bezier.bezierControlLines[arrowIdx].length - 1].attr({
                            x2: newPnt.x,
                            y2: newPnt.y
                        });
                        DOM.bezier.bezierControlLines[arrowIdx].push($controlLine);
                        sets.controlLines = sets.controlLines.add($controlLine);
                    },
                    addPointAndControlLinesBezierC: function (newPnt, arrowIdx, sets, createLine, lastMidPntIdx) {
                        var $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true),
                            $controlLine = createLine ? DOM.bezier.createControlLine({
                                x1: newPnt.x,
                                y1: newPnt.y,
                                x2: lastMidPntIdx === null ? data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx : data.points.mid[arrowIdx][lastMidPntIdx].x,
                                y2: lastMidPntIdx === null ? data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy : data.points.mid[arrowIdx][lastMidPntIdx].y
                            }) : null;
                        data.points.mid[arrowIdx].push(newPnt);
                        designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].add($controlPoint);
                        sets.controlPoints = sets.controlPoints.add($controlPoint);

                        if ($controlLine) {
                            DOM.bezier.bezierControlLines[arrowIdx].push($controlLine);
                            sets.controlLines = sets.controlLines.add($controlLine);
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
                        DOM.bezier.bezierControlLines[index].forEach(function ($e) {
                            $e.remove();
                        });
                        DOM.bezier.bezierControlLines.splice(index, 1);
                        if (opts.shadow.visible) {
                            DOM.arrowsShadow[index].remove();
                            DOM.arrowsShadow.splice(index, 1);
                        }
                        $('ul li', designMode.UI.menu.$menu).eq(index).remove();
                        if ($('ul li', designMode.UI.menu.$menu).length === 0) {
                            $('> a:first-of-type + a + a + a', designMode.UI.menu.$menu).addClass('disabled');
                        }
                    },
                    init: function () {
                        this.menu.init();

                        var pts = data.points;
                        DOM.$svg.add(designMode.UI.menu.$menu).
                            mousemove(this.moveControlPoint).
                            mouseup(function () {
                                designMode.UI.dragInfo.$point = designMode.UI.dragInfo.pointType = designMode.UI.dragInfo.midRef = null;
                            });

                        // insert point anchors to the DOM
                        designMode.UI.$points = [];
                        pts.end.forEach(function (pnt, index) {
                            var $startEndPoints = DOM.markers.getDesignModePoint(pts.start, index, index === 0, pts.layout.fromOffset).
                                                    add(DOM.markers.getDesignModePoint(pnt, index, index === 0, pts.layout.toOffset));
                            designMode.UI.$points.push($startEndPoints);
                            DOM.$svg.append($startEndPoints);
                            DOM.bezier.bezierControlLines.push([]);
                        });

                        var $controlLinesSvgGroup = null, $controlLine;
                        pts.mid.forEach(function (midPnts, index) {
                            if (data.arrowTypes[index] === 'bezierQ' || data.arrowTypes[index] === 'bezierC') {
                                if ($controlLinesSvgGroup === null) {
                                    $controlLinesSvgGroup = DOM.createSvgDom('g');
                                    DOM.markers.$defs.after($controlLinesSvgGroup);
                                }
                            }
                            for(var pnt = 0, last = midPnts.length - 1; pnt <= last; ++pnt) {
                                // this assignment changes the data.points.mid values
                                midPnts[pnt] = pts.getMidPoint(midPnts[pnt], index);
                                designMode.UI.$points[index] = designMode.UI.$points[index].add(DOM.markers.getDesignModePoint(midPnts[pnt], index, index === 0));
                                $controlLine = null;

                                switch (data.arrowTypes[index]) {
                                    case 'bezierQ':
                                        $controlLine = DOM.bezier.createControlLine({
                                            x1: (pnt === 0 ? pts.start.x + pts.layout.fromOffset[index].dx : midPnts[pnt - 1].x),
                                            y1: (pnt === 0 ? pts.start.y + pts.layout.fromOffset[index].dy : midPnts[pnt - 1].y),
                                            x2: midPnts[pnt].x,
                                            y2: midPnts[pnt].y
                                        });
                                        break;
                                    case 'bezierC':
                                        if (pnt === 0 || (pnt + 1) % 3 !== 0) {
                                            var isPrev = (pnt + 2) % 3 === 0;
                                            $controlLine = DOM.bezier.createControlLine({
                                                x1: (pnt === 0 ? pts.start.x + pts.layout.fromOffset[index].dx : midPnts[pnt].x),
                                                y1: (pnt === 0 ? pts.start.y + pts.layout.fromOffset[index].dy : midPnts[pnt].y),
                                                x2: pnt === last ? pts.end[index].x + pts.layout.toOffset[index].dx : midPnts[pnt === 0 ? 0 : (isPrev ? pnt + 1 : pnt - 1)].x,
                                                y2: pnt === last ? pts.end[index].y + pts.layout.toOffset[index].dy : midPnts[pnt === 0 ? 0 : (isPrev ? pnt + 1 : pnt - 1)].y
                                            });
                                        }
                                }
                                if ($controlLine) {
                                    DOM.bezier.bezierControlLines[index].push($controlLine);
                                    $controlLinesSvgGroup.append($controlLine);
                                }
                            }
                            if (data.arrowTypes[index] === 'bezierQ') {
                                $controlLine = DOM.bezier.createControlLine({
                                    x1: pts.mid[index][last].x,
                                    y1: pts.mid[index][last].y,
                                    x2: pts.end[index].x + pts.layout.toOffset[index].dx,
                                    y2: pts.end[index].y + pts.layout.toOffset[index].dy
                                });
                                DOM.bezier.bezierControlLines[index].push($controlLine);
                                $controlLinesSvgGroup.append($controlLine);
                            }
                            DOM.$svg.append(designMode.UI.$points[index].filter(function(i) { return i > 1; })); // skip the first two. They are the start and end points
                        });
                        data.points.getMidPoint = function (relativePnt) {
                            return relativePnt; // in design mode, the mid points are absolute, not relative
                        };
                        $('ul li:first-child', designMode.UI.menu.$menu).click(); // initializes the active arrow
                    },
                    moveControlPoint: function (e) {
                        if (designMode.UI.dragInfo.$point) {
                            var dragInfo = designMode.UI.dragInfo,
                                pts = data.points;
                            dragInfo.$point.attr({
                                'cx': e.pageX,
                                'cy': e.pageY
                            });
                            switch (dragInfo.pointType) {
                                case 'start':
                                    var offset = pts.layout.fromOffset[designMode.UI.activeArrow.idx];
                                    offset.dx = e.pageX - pts.start.x;
                                    offset.dy = e.pageY - pts.start.y; 
                                    switch (data.arrowTypes[designMode.UI.activeArrow.idx]) {
                                        case 'bezierQ':
                                        case 'bezierC':
                                            DOM.bezier.updateBezierControlLines(designMode.UI.activeArrow.idx, 'start');
                                    }
                                    break;
                                case 'mid':
                                    dragInfo.midRef.x = e.pageX;
                                    dragInfo.midRef.y = e.pageY;
                                    switch (data.arrowTypes[designMode.UI.activeArrow.idx]) {
                                        case 'bezierQ':
                                            if (designMode.UI.dragInfo.midIndex % 2 === 0) {
                                                // user is dragging a control point
                                                DOM.bezier.changeControlPointPositions(
                                                    pts.mid[designMode.UI.activeArrow.idx],
                                                    designMode.UI.$points[designMode.UI.activeArrow.idx],
                                                    designMode.UI.dragInfo.midIndex,
                                                    e.pageX,
                                                    e.pageY
                                                );
                                            } else {
                                                // user is dragging an anchor point
                                                var nextControlPoint = pts.mid[designMode.UI.activeArrow.idx][designMode.UI.dragInfo.midIndex + 1];
                                                nextControlPoint.x = 2*dragInfo.midRef.x - pts.mid[designMode.UI.activeArrow.idx][designMode.UI.dragInfo.midIndex - 1].x;
                                                nextControlPoint.y = 2*dragInfo.midRef.y - pts.mid[designMode.UI.activeArrow.idx][designMode.UI.dragInfo.midIndex - 1].y;
                                                designMode.UI.$points[designMode.UI.activeArrow.idx].eq(designMode.UI.dragInfo.midIndex + 3).attr({
                                                    'cx': nextControlPoint.x,
                                                    'cy': nextControlPoint.y
                                                });
                                                DOM.bezier.changeControlPointPositions(
                                                    pts.mid[designMode.UI.activeArrow.idx],
                                                    designMode.UI.$points[designMode.UI.activeArrow.idx],
                                                    designMode.UI.dragInfo.midIndex + 1,
                                                    nextControlPoint.x,
                                                    nextControlPoint.y
                                                );
                                            }
                                            break;
                                        case 'bezierC':
                                            if (designMode.UI.dragInfo.midIndex === 0) {
                                                // user is dragging the first control point
                                                DOM.bezier.updateBezierControlLines(designMode.UI.activeArrow.idx, 'start');
                                            } else {
                                                if (designMode.UI.dragInfo.midIndex === pts.mid[designMode.UI.activeArrow.idx].length - 1) {
                                                    // user is dragging the last control point
                                                    DOM.bezier.updateBezierControlLines(designMode.UI.activeArrow.idx, 'end');
                                                } else {
                                                    if ((designMode.UI.dragInfo.midIndex + 1) % 3 !== 0) {
                                                        // user is dragging other control point
                                                        console.log('mid');
                                                        DOM.bezier.changeControlPointPositions(
                                                            pts.mid[designMode.UI.activeArrow.idx],
                                                            designMode.UI.$points[designMode.UI.activeArrow.idx],
                                                            designMode.UI.dragInfo.midIndex,
                                                            e.pageX,
                                                            e.pageY
                                                        );
                                                    } else {
                                                        console.log('acnhor');
                                                        // user is dragging an anchor point
                                                    }
                                                }
                                            }
                                    }
                                    break;
                                case 'end':
                                    var offset = pts.layout.toOffset[designMode.UI.activeArrow.idx];
                                    offset.dx = e.pageX - pts.end[designMode.UI.activeArrow.idx].x;
                                    offset.dy = e.pageY - pts.end[designMode.UI.activeArrow.idx].y; 
                                    switch (data.arrowTypes[designMode.UI.activeArrow.idx]) {
                                        case 'bezierQ':
                                        case 'bezierC':
                                            DOM.bezier.updateBezierControlLines(designMode.UI.activeArrow.idx, 'end');
                                    }
                            }
                            DOM.updateArrow(designMode.UI.activeArrow.idx);
                        }
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
        DOM.markers.getDesignModePoint = function (pnt, arrowIdx, selected, offsetArray) {
            var maxSize = Math.max(data.shapeRelSize.circle, Math.max(data.shapeRelSize.square, data.shapeRelSize.pointer)),
                $point = DOM.createSvgDom('circle', {
                    cx: pnt.x + (offsetArray === undefined ? 0 : offsetArray[arrowIdx].dx),
                    cy: pnt.y + (offsetArray === undefined ? 0 : offsetArray[arrowIdx].dy),
                    r: ((opts.marker.size - 1)*0.25 + 1)*maxSize/1.5 + 1,
                    style: 'fill:transparent; stroke:rgba(255,0,0,.3); stroke-width:' + (selected ? designMode.UI.activeArrow.strokeSelected : designMode.UI.activeArrow.strokeUnselected)
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
                    getArrowInfo = function () {
                        var indexPoint;
                        for (var idx = 0, qtArrows = data.arrowTypes.length; idx < qtArrows; ++idx) {
                            indexPoint = designMode.UI.$points[idx].index($point);
                            if (indexPoint > -1) {
                                return {
                                    arrow: idx,
                                    point: indexPoint
                                }
                            }
                        }
                        return null;
                    },
                    arrowInfo = getArrowInfo();
                if (arrowInfo) {
                    dragInfo.$point = $point;
                    dragInfo.pointType = arrowInfo.point === 0 ? 'start' : (arrowInfo.point === 1 ? 'end' : 'mid');
                    designMode.UI.activeArrow.select(arrowInfo.arrow);
                    $point.css('cursor', 'none');
                    if (dragInfo.pointType === 'mid') {
                        dragInfo.midIndex = arrowInfo.point - 2;
                        dragInfo.midRef = data.points.mid[arrowInfo.arrow][dragInfo.midIndex];
                    }
                }
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
        DOM.bezier = {
            bezierControlLines: [],
            createControlLine: function (pnts) {
                return DOM.createSvgDom('line', {
                    x1: pnts.x1,
                    y1: pnts.y1,
                    x2: pnts.x2,
                    y2: pnts.y2,
                    stroke: '#f7abab',
                    'stroke-dasharray': '3,6'
                });
            },
            changeControlPointPositions: function (midPoints, $points, midIndex, x, y) {
                var less = midIndex - 2,
                    more = midIndex + 2,
                    pnt = {
                        less: {x: x, y: y},
                        more: {x: x, y: y}
                    },
                    qtMidPoints = midPoints.length,
                    anchorPnt;
                while (less > -1 || more < qtMidPoints) {
                    if (less > -1) {
                        anchorPnt = midPoints[less + 1];
                        pnt.less.x = 2*anchorPnt.x - pnt.less.x;
                        pnt.less.y = 2*anchorPnt.y - pnt.less.y;
                        midPoints[less].x = pnt.less.x;
                        midPoints[less].y = pnt.less.y;
                        $points.eq(less + 2).attr({
                            'cx': pnt.less.x,
                            'cy': pnt.less.y
                        });
                        this.updateBezierControlLines(designMode.UI.activeArrow.idx, 'mid', less);
                        less -= 2;
                    }
                    if (more < qtMidPoints) {
                        anchorPnt = midPoints[more - 1];
                        pnt.more.x = 2*anchorPnt.x - pnt.more.x;
                        pnt.more.y = 2*anchorPnt.y - pnt.more.y;
                        midPoints[more].x = pnt.more.x;
                        midPoints[more].y = pnt.more.y;
                        $points.eq(more + 2).attr({
                            'cx': pnt.more.x,
                            'cy': pnt.more.y
                        });
                        this.updateBezierControlLines(designMode.UI.activeArrow.idx, 'mid', more);
                        more += 2;
                    }
                }
                this.updateBezierControlLines(designMode.UI.activeArrow.idx, 'mid', midIndex);
            },
            updateBezierControlLines: function (arrowIdx, pointType, midPointerIdx) {
                var isBezierQ = data.arrowTypes[designMode.UI.activeArrow.idx] === 'bezierQ';
                switch (pointType) {
                    case 'start':
                        this.bezierControlLines[arrowIdx][0].attr({
                            x1: data.points.start.x + data.points.layout.fromOffset[arrowIdx].dx,
                            y1: data.points.start.y + data.points.layout.fromOffset[arrowIdx].dy,
                            x2: data.points.mid[arrowIdx][0].x,
                            y2: data.points.mid[arrowIdx][0].y
                        });
                        break;
                    case 'mid':
                        if (midPointerIdx === 0) {
                            this.updateBezierControlLines(arrowIdx, 'start');
                        } else {
                            // TODO bezierC
                            this.bezierControlLines[arrowIdx][midPointerIdx].attr({
                                x1: data.points.mid[arrowIdx][midPointerIdx - 1].x,
                                y1: data.points.mid[arrowIdx][midPointerIdx - 1].y,
                                x2: data.points.mid[arrowIdx][midPointerIdx].x,
                                y2: data.points.mid[arrowIdx][midPointerIdx].y
                            });
                        }
                        if (midPointerIdx === data.points.mid[arrowIdx].length - 1) {
                            this.updateBezierControlLines(arrowIdx, 'end');
                        } else {
                            // TODO bezierC
                            this.bezierControlLines[arrowIdx][midPointerIdx + 1].attr({
                                x1: data.points.mid[arrowIdx][midPointerIdx].x,
                                y1: data.points.mid[arrowIdx][midPointerIdx].y,
                                x2: data.points.mid[arrowIdx][midPointerIdx + 1].x,
                                y2: data.points.mid[arrowIdx][midPointerIdx + 1].y
                            });
                        }
                        break;
                    case 'end':
                        midPointerIdx = data.points.mid[arrowIdx].length - 1;
                        this.bezierControlLines[arrowIdx][isBezierQ ? midPointerIdx + 1 : (midPointerIdx + 2)/1.5 - 1].attr({
                            x1: data.points.mid[arrowIdx][midPointerIdx].x,
                            y1: data.points.mid[arrowIdx][midPointerIdx].y,
                            x2: data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx,
                            y2: data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy
                        });
                }
            }
        };
        designMode.init();
    };

    $.fn.rsRefPointer.defaults = defaults;
})(jQuery);