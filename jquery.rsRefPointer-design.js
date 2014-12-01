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
        if (typeof options === 'string') {
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
                        dasharray: '3,6',
                        select: function (newIndex) {
                            if (newIndex !== this.idx) {
                                if (this.idx !== null) {
                                    designMode.UI.$points[this.idx].css('stroke-width', this.strokeUnselected);
                                    DOM.bezier.controlLines[this.idx].forEach(function ($e) {
                                        $e.attr('stroke-dasharray', designMode.UI.activeArrow.dasharray);
                                    });
                                }
                                DOM.getArrow(newIndex).detach().appendTo(DOM.$svg);
                                designMode.UI.$points[newIndex].css('stroke-width', this.strokeSelected).detach().appendTo(DOM.$svg);
                                this.idx = newIndex;
                                $('ul li', designMode.UI.menu.$menu).removeClass('selected').eq(this.idx).addClass('selected');
                                DOM.bezier.controlLines[newIndex].forEach(function ($e) {
                                    $e.removeAttr('stroke-dasharray');
                                });
                            }
                        }
                    },
                    dragInfo: {
                        $point: null,       // Represents the point currently being dragged
                        pointType: null,    // Either 'start', 'mid' or 'end'
                        midRef: null,
                        midIndex: null,
                        bezierAnchorPointDelta: null
                    },
                    $points: null, // Array of jQuery set. Each jQuery object contains the points (start, end, mid) that belong to each arrow and their length is >= 2
                    menu: {
                        $menu: null,
                        multipleTargets: {
                            $subMenu: null,
                            firstMouseover: true,
                            type: null,
                            showMenu: function (top) {
                                this.firstMouseover = true;
                                this.$subMenu.css('top', top + 'px').show();
                            },
                            hideMenu: function () {
                                this.$subMenu.hide();
                            }
                        },
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
                                    '<menu>Pointing to?<div></div></menu>' +
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
                                    'menu.refPointer.design menu,' +
                                    'menu.refPointer.design + div > div {' +
                                        'box-shadow: 0 0 10px black;' +
                                        'border-radius: 20px/15px;' +
                                        'position: absolute;' +
                                    '}' +
                                    'menu.refPointer.design,' +
                                    'menu.refPointer.design menu {' +
                                        'background-color: #ddd;' +
                                        'font-size: 12px;' +
                                        'font-family: arial;' +
                                        'display: block;' +
                                        'left: 5px;' +
                                        'top: 50px;' +
                                        'padding: 8px;' +
                                        '-moz-user-select: none;' +
                                        '-ms-user-select: none;' +
                                        '-webkit-user-select: none;' +
                                        'user-select: none;' +
                                    '}' +
                                    'menu.refPointer.design menu {' +
                                        'display: none;' +
                                        'width: 85px;' +
                                        'left: 172px;' +
                                        'border-radius: 0;' +
                                        'border-top-right-radius: 20px 15px;' +
                                        'border-bottom-right-radius: 20px 15px;' +
                                        'padding: 10px;' +
                                    '}' +
                                    'menu.refPointer.design:after {' +
                                        'content: "";' +
                                        'position: absolute;' +
                                        'right: 0;' +
                                        'top: 40px;' +
                                        'width: 13px;' +
                                        'height: 350px;' +
                                        'background-color: #ddd;' +
                                    '}' +
                                    'menu.refPointer.design menu a {' +
                                        'display: block;' +
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
                                    'menu.refPointer.design > a,' +
                                    'menu.refPointer.design menu a {' +
                                        'display: block;' +
                                        'padding: 5px;' +
                                        'text-decoration: none;' +
                                        'line-height: 12px;' +
                                        'border-radius: 2px;' +
                                    '}' +
                                    'menu.refPointer.design > a:first-of-type {' +
                                        'margin-top: 13px;' +
                                    '}' +
                                    'menu.refPointer.design menu div {' +
                                        'margin-top: 8px;' +
                                        'overflow: auto;' +
                                        'max-height: 250px;' +
                                    '}' +
                                    'menu.refPointer.design > a:hover,' +
                                    'menu.refPointer.design menu a:hover {' +
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
                                        'margin: 0 5px;' +
                                        'padding: 3px;' +
                                        'background-color: #eee;' +
                                        'border-radius: 5px;' +
                                        'cursor: pointer;' +
                                        'border: 3px solid #ddd;' +
                                        'border-width: 3px 0;' +
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
                                        'line-height: 16px;' +
                                        'height: 14px;' +
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
                                },
                                addArrowMenuClick = function (e, type, $menuOption) {
                                    e.preventDefault();
                                    if (data.$targets.length > 1) {
                                        designMode.UI.menu.multipleTargets.type = type;
                                        designMode.UI.menu.multipleTargets.showMenu($menuOption.position().top);
                                    } else {
                                        designMode.UI.addArrow(type, 0);
                                    }
                                },
                                $newLineLink = $('> a:first-of-type', designMode.UI.menu.$menu);
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

                            data.points.end.forEach(function (pnt, index) {
                                designMode.UI.menu.addArrowLink();
                            });
                            $newLineLink.click(function (e) {
                                addArrowMenuClick(e, 'line', $(this));
                            });
                            $newLineLink.next().click(function (e) {
                                addArrowMenuClick(e, 'bezierQ', $(this));
                            });
                            $newLineLink.next().next().click(function (e) {
                                addArrowMenuClick(e, 'bezierC', $(this));
                            });
                            $newLineLink.next().next().next().removeClass(data.arrowTypes.length > 0 ? 'disabled' : null).click(function (e) {
                                e.preventDefault();
                                designMode.UI.addPoint();
                            });
                            this.multipleTargets.$subMenu = $('menu', this.$menu).mouseleave(function () {
                                if (!designMode.UI.menu.multipleTargets.firstMouseover) {
                                    designMode.UI.cancelVirtualArrow();
                                }
                                designMode.UI.menu.multipleTargets.hideMenu();
                            });
                            data.$targets.each(function (index) {
                                var $a = $('<a href="#">Target #' + (index + 1) + '</a>').mouseover(function () {
                                    if (designMode.UI.menu.multipleTargets.firstMouseover) {
                                        designMode.UI.menu.multipleTargets.firstMouseover = false;
                                        designMode.UI.addVirtualArrow(designMode.UI.menu.multipleTargets.type, index);
                                    } else {
                                        designMode.UI.changeVirtualArrow(index);
                                    }
                                }).click(function (e) {
                                    e.preventDefault();
                                    designMode.UI.menu.multipleTargets.firstMouseover = true;
                                    designMode.UI.saveVirtualArrow();
                                    designMode.UI.menu.multipleTargets.hideMenu();
                                })
                                $('div', designMode.UI.menu.multipleTargets.$subMenu).append($a);
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
                                controlPoints: $([]),   // used in polylines and beziers
                                controlLines: $([])     // used in beziers
                            },
                            midPoints = data.points.mid[arrowIdx];
                        switch(data.arrowTypes[arrowIdx]) {
                            case 'line':
                                DOM.line.addPoint(arrowIdx, midPoints, sets);
                                break;
                            case 'polyline':
                                DOM.polyline.addPoint(arrowIdx, midPoints, sets);
                                break;
                            case 'bezierQ':
                                DOM.bezier.Q.addPoint(arrowIdx, midPoints, sets);
                                DOM.markers.$defs.next('g').append(sets.controlLines);
                                break;
                            case 'bezierC':
                                DOM.bezier.C.addPoint(arrowIdx, midPoints, sets);
                                DOM.markers.$defs.next('g').append(sets.controlLines);
                        }
                        DOM.$svg.append(sets.controlPoints);
                        DOM.updateArrow(arrowIdx);
                    },
                    deletePoint: function ($point) {
                        var arrowInfo = DOM.markers.getArrowInfo($point);
                        if (arrowInfo) {
                            designMode.UI.activeArrow.select(arrowInfo.arrow);
                            switch(data.arrowTypes[arrowInfo.arrow]) {
                                case 'line':
                                    this.deleteArrow(arrowInfo.arrow);
                                    break;
                                case 'polyline':
                                    DOM.polyline.deletePoint(arrowInfo.arrow, arrowInfo.point);
                                    break;
                                case 'bezierQ':
                                    DOM.bezier.Q.deletePoint(arrowInfo.arrow, arrowInfo.point);
                                    break;
                                case 'bezierC':
                                    DOM.bezier.C.deletePoint(arrowInfo.arrow, arrowInfo.point);
                            }
                        }
                    },
                    /* Virtual arrows are those whose end point is still unknown when this function is called.
                       The end point is known only when the user selects one of the multiple targets available.
                       On the GUI, this happens when a submenu appears after clicking on any of the "new arrow" buttons.
                       If only one target is available, then there is no need to handle virtual arrows, and a
                       plain arrow is immediatelly created (with a known end point).
                    */
                    doAddArrow: function (type, targetIdx, virtual) {
                        var $window = $(window),
                            windowWidth = $window.width(),
                            windowHeight = $window.height(),
                            getRandomPoint = function () {
                                return {
                                    x: windowWidth/2 + Math.random()*windowWidth/2.5 - windowWidth/5,
                                    y: windowHeight/2 + Math.random()*windowHeight/2.5 - windowHeight/5
                                };
                            };

                        data.arrowTypes.push(type);
                        switch (type) {
                            case 'bezierQ':
                                data.points.mid.push([getRandomPoint()]);
                                break;
                            case 'bezierC':
                                data.points.mid.push([getRandomPoint(), getRandomPoint()]);
                                break;
                            default:
                                data.points.mid.push([]);
                        }
                        data.points.end.push({
                            x: data.points.end[targetIdx].x,
                            y: data.points.end[targetIdx].y
                        });
                        data.points.layout.fromOffset.push({ dx: 0, dy: 0 });
                        data.points.layout.toOffset.push({ dx: 0, dy: 0 });
                        data.points.layout.topLeft.push({ x: 0, y: 0 });
                        data.points.layout.size.push({ width: 0, height: 0 });
                        var lastArrowIdx = data.arrowTypes.length - 1;
                        DOM.createArrow(lastArrowIdx);
                        if (!virtual) {
                            this.addControlPointsAndLines(lastArrowIdx);
                        }
                    },
                    addControlPointsAndLines: function (idx) {
                        this.menu.addArrowLink();
                        this.addStartEndControlPoints(data.points, data.points.end[idx], idx);
                        this.addMidControlPointsAndLines(data.points, data.points.mid[idx], idx);
                    },
                    deleteArrow: function (arrowIdx, virtual) {
                        if (!virtual) {
                            if (designMode.UI.activeArrow.idx === arrowIdx) {
                                if (arrowIdx === 0) {
                                    if (data.arrowTypes.length > 1) {
                                        designMode.UI.activeArrow.select(1); // will run the if statement below
                                    } else {
                                        designMode.UI.activeArrow.idx = null;
                                    }
                                } else {
                                    designMode.UI.activeArrow.select(arrowIdx - 1)
                                }
                            }
                            if (designMode.UI.activeArrow.idx > arrowIdx) {
                                designMode.UI.activeArrow.idx--;
                            }
                            designMode.UI.$points[arrowIdx].remove();
                            designMode.UI.$points.splice(arrowIdx, 1);
                            DOM.bezier.controlLines[arrowIdx].forEach(function ($e) {
                                $e.remove();
                            });
                            DOM.bezier.controlLines.splice(arrowIdx, 1);
                            $('ul li', designMode.UI.menu.$menu).eq(arrowIdx).remove();
                            if ($('ul li', designMode.UI.menu.$menu).length === 0) {
                                $('> a:first-of-type + a + a + a', designMode.UI.menu.$menu).addClass('disabled');
                            }
                        }

                        data.arrowTypes.splice(arrowIdx, 1);
                        data.points.mid.splice(arrowIdx, 1);
                        data.points.end.splice(arrowIdx, 1);
                        data.points.layout.fromOffset.splice(arrowIdx, 1);
                        data.points.layout.toOffset.splice(arrowIdx, 1);
                        data.points.layout.topLeft.splice(arrowIdx, 1);
                        data.points.layout.size.splice(arrowIdx, 1);
                        DOM.getArrow(arrowIdx).remove();
                        DOM.arrows.splice(arrowIdx, 1);
                        if (opts.shadow.visible) {
                            DOM.arrowsShadow[arrowIdx].remove();
                            DOM.arrowsShadow.splice(arrowIdx, 1);
                        }
                    },
                    addArrow: function (type, targetIdx) {
                        this.doAddArrow(type, targetIdx);
                    },
                    addVirtualArrow:  function (type, targetIdx) {
                        this.doAddArrow(type, targetIdx, true);
                    },
                    changeVirtualArrow: function (targetIdx) {
                        var lastArrowIdx = data.arrowTypes.length - 1;
                        data.points.end[lastArrowIdx].x = data.points.end[targetIdx].x;
                        data.points.end[lastArrowIdx].y = data.points.end[targetIdx].y;
                        DOM.updateArrow(lastArrowIdx);
                    },
                    saveVirtualArrow: function () {
                        this.addControlPointsAndLines(data.arrowTypes.length - 1);
                    },
                    cancelVirtualArrow: function () {
                        this.deleteArrow(data.arrowTypes.length - 1, true);
                    },
                    addStartEndControlPoints: function (pts, pnt, index) {
                        var $startEndPoints = DOM.markers.getDesignModePoint(pts.start, index, index === 0, pts.layout.fromOffset).
                                                add(DOM.markers.getDesignModePoint(pnt, index, index === 0, pts.layout.toOffset));
                        designMode.UI.$points.push($startEndPoints);
                        DOM.$svg.append($startEndPoints);
                        DOM.bezier.controlLines.push([]);
                    },
                    addMidControlPointsAndLines: function (pts, midPnts, index) {
                        if (data.arrowTypes[index] === 'bezierQ' || data.arrowTypes[index] === 'bezierC') {
                            if (DOM.$controlLinesSvgGroup === null) {
                                DOM.$controlLinesSvgGroup = DOM.createSvgDom('g', { stroke: '#f7abab' });
                                DOM.markers.$defs.after(DOM.$controlLinesSvgGroup);
                            }
                        }
                        for(var $controlLine, pnt = 0, last = midPnts.length - 1; pnt <= last; ++pnt) {
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
                                DOM.bezier.controlLines[index].push($controlLine);
                                DOM.$controlLinesSvgGroup.append($controlLine);
                            }
                        }
                        if (data.arrowTypes[index] === 'bezierQ') {
                            $controlLine = DOM.bezier.createControlLine({
                                x1: pts.mid[index][last].x,
                                y1: pts.mid[index][last].y,
                                x2: pts.end[index].x + pts.layout.toOffset[index].dx,
                                y2: pts.end[index].y + pts.layout.toOffset[index].dy
                            });
                            DOM.bezier.controlLines[index].push($controlLine);
                            DOM.$controlLinesSvgGroup.append($controlLine);
                        }
                        DOM.$svg.append(designMode.UI.$points[index].filter(function(i) { return i > 1; })); // skip the first two. They are the start and end points
                    },
                    init: function () {
                        this.menu.init();

                        var pts = data.points;
                        DOM.$svg.add(this.menu.$menu).
                            mousemove(this.movePoint).
                            mouseup(function () {
                                designMode.UI.dragInfo.$point = designMode.UI.dragInfo.pointType = designMode.UI.dragInfo.midRef = designMode.UI.dragInfo.bezierAnchorPointDelta = null;
                            });

                        // insert point anchors to the DOM
                        designMode.UI.$points = [];
                        pts.mid.forEach(function (midPnts, index) {
                            designMode.UI.addStartEndControlPoints(pts, pts.end[index], index);
                            designMode.UI.addMidControlPointsAndLines(pts, midPnts, index);
                        });
                        data.points.getMidPoint = function (relativePnt) {
                            return relativePnt; // in design mode, the mid points are absolute, not relative
                        };
                        $('ul li:first-child', designMode.UI.menu.$menu).click(); // initializes the active arrow
                    },
                    movePoint: function (e) {
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
                                            DOM.bezier.Q.updateControlLines(designMode.UI.activeArrow.idx, 'start');
                                            break;
                                        case 'bezierC':
                                            DOM.bezier.C.updateControlLines(designMode.UI.activeArrow.idx, 'start');
                                    }
                                    break;
                                case 'mid':
                                    dragInfo.midRef.x = e.pageX;
                                    dragInfo.midRef.y = e.pageY;
                                    switch (data.arrowTypes[designMode.UI.activeArrow.idx]) {
                                        case 'bezierQ':
                                            if (designMode.UI.dragInfo.midIndex % 2 === 0) {
                                                // user is dragging a control point
                                                DOM.bezier.Q.changeControlPointPositions(
                                                    pts.mid[designMode.UI.activeArrow.idx],
                                                    designMode.UI.$points[designMode.UI.activeArrow.idx],
                                                    designMode.UI.dragInfo.midIndex,
                                                    e.pageX,
                                                    e.pageY
                                                );
                                            } else {
                                                // user is dragging an anchor point
                                                designMode.UI.moveAnchorPoint(DOM.bezier.Q.changeControlPointPositions);
                                            }
                                            break;
                                        case 'bezierC':
                                            if (designMode.UI.dragInfo.midIndex === 0) {
                                                // user is dragging the first control point
                                                DOM.bezier.C.updateControlLines(designMode.UI.activeArrow.idx, 'start');
                                            } else {
                                                if (designMode.UI.dragInfo.midIndex === pts.mid[designMode.UI.activeArrow.idx].length - 1) {
                                                    // user is dragging the last control point
                                                    DOM.bezier.C.updateControlLines(designMode.UI.activeArrow.idx, 'end');
                                                } else {
                                                    if ((designMode.UI.dragInfo.midIndex + 1) % 3 !== 0) {
                                                        // user is dragging other control point
                                                        DOM.bezier.C.changeControlPointPositions(
                                                            pts.mid[designMode.UI.activeArrow.idx],
                                                            designMode.UI.$points[designMode.UI.activeArrow.idx],
                                                            designMode.UI.dragInfo.midIndex,
                                                            e.pageX,
                                                            e.pageY
                                                        );
                                                    } else {
                                                        // user is dragging an anchor point
                                                        designMode.UI.moveAnchorPoint(DOM.bezier.C.changeControlPointPositions);
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
                                            DOM.bezier.Q.updateControlLines(designMode.UI.activeArrow.idx, 'end');
                                            break;
                                        case 'bezierC':
                                            DOM.bezier.C.updateControlLines(designMode.UI.activeArrow.idx, 'end');
                                    }
                            }
                            DOM.updateArrow(designMode.UI.activeArrow.idx);
                        }
                    },
                    moveAnchorPoint: function (callback) {
                        var dragInfo = designMode.UI.dragInfo,
                            nextControlPoint = data.points.mid[designMode.UI.activeArrow.idx][designMode.UI.dragInfo.midIndex + 1];
                        if (designMode.UI.dragInfo.bezierAnchorPointDelta === null) {
                            designMode.UI.dragInfo.bezierAnchorPointDelta = {
                                dx: dragInfo.midRef.x - nextControlPoint.x,
                                dy: dragInfo.midRef.y - nextControlPoint.y
                            }
                        } else {
                            nextControlPoint.x = dragInfo.midRef.x - designMode.UI.dragInfo.bezierAnchorPointDelta.dx;
                            nextControlPoint.y = dragInfo.midRef.y - designMode.UI.dragInfo.bezierAnchorPointDelta.dy;
                            designMode.UI.$points[designMode.UI.activeArrow.idx].eq(designMode.UI.dragInfo.midIndex + 3).attr({
                                'cx': nextControlPoint.x,
                                'cy': nextControlPoint.y
                            });
                        }
                        callback(
                            data.points.mid[designMode.UI.activeArrow.idx],
                            designMode.UI.$points[designMode.UI.activeArrow.idx],
                            designMode.UI.dragInfo.midIndex + 1,
                            nextControlPoint.x,
                            nextControlPoint.y
                        );
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
        DOM.$controlLinesSvgGroup = null;
        DOM.markers.getArrowInfo = function ($point) {
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
            }).mousedown(function (e) {
                e.preventDefault();
                var dragInfo = designMode.UI.dragInfo,
                    arrowInfo = DOM.markers.getArrowInfo($point);
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
            }).dblclick(function () {
                designMode.UI.deletePoint($point);
            })
        };
        DOM.line = {
            addPoint: function (arrowIdx, midPoints, sets) {
                var newPnt = { // new point is the average of the first and last points
                        x: (data.points.start.x + data.points.layout.fromOffset[arrowIdx].dx +
                            data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx)/2,
                        y: (data.points.start.y + data.points.layout.fromOffset[arrowIdx].dy +
                            data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy)/2
                    },
                    $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true);
                data.points.mid[arrowIdx].push(newPnt);
                designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].add($controlPoint);
                sets.controlPoints = sets.controlPoints.add($controlPoint);
                data.arrowTypes[arrowIdx] = 'polyline';
                // This is no more a line, since a mid point was added. So, change the arrow from line to polyline
                DOM.replaceArrow(arrowIdx);
            }
        },
        DOM.polyline = {
            addPoint: function (arrowIdx, midPoints, sets) {
                var lastPntIdx = midPoints.length - 1,
                    newPnt = { // new point is the average of the last mid point with the last point
                        x: (midPoints[lastPntIdx].x + data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx)/2,
                        y: (midPoints[lastPntIdx].y + data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy)/2
                    },
                    $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true);
                data.points.mid[arrowIdx].push(newPnt);
                designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].add($controlPoint);
                sets.controlPoints = sets.controlPoints.add($controlPoint);
            },
            deletePoint: function (arrowIdx, pntIndex) {
                switch (pntIndex) {
                    case 0: this.deleteStartPoint(arrowIdx); break;
                    case 1: this.deleteEndPoint(arrowIdx); break;
                    default: this.deleteMidPoint(arrowIdx, pntIndex - 2);
                }
                DOM.updateArrow(arrowIdx);
            },
            deleteStartPoint: function (arrowIdx) {
                data.points.layout.fromOffset[arrowIdx].dx = data.points.mid[arrowIdx][0].x - data.points.start.x;
                data.points.layout.fromOffset[arrowIdx].dy = data.points.mid[arrowIdx][0].y - data.points.start.y;
                data.points.mid[arrowIdx].splice(0, 1);
                designMode.UI.$points[arrowIdx].eq(0).remove();
                var $newStartPoint = designMode.UI.$points[arrowIdx].eq(2).detach();
                designMode.UI.$points[arrowIdx].eq(1).before($newStartPoint);
                designMode.UI.$points[arrowIdx].splice(2, 1);
                designMode.UI.$points[arrowIdx] = $newStartPoint.add(designMode.UI.$points[arrowIdx].slice(1));
                if (data.arrowTypes[arrowIdx] === 'polyline' && data.points.mid[arrowIdx].length === 0) {
                    data.arrowTypes[arrowIdx] = 'line';
                    // Removed the last mid point of a polyline. So now, change it to a line.
                    DOM.replaceArrow(arrowIdx);
                }
            },
            deleteEndPoint: function (arrowIdx) {
                var lastMid = data.points.mid[arrowIdx].length - 1;
                data.points.layout.toOffset[arrowIdx].dx = data.points.mid[arrowIdx][lastMid].x - data.points.end[arrowIdx].x;
                data.points.layout.toOffset[arrowIdx].dy = data.points.mid[arrowIdx][lastMid].y - data.points.end[arrowIdx].y;
                data.points.mid[arrowIdx].splice(lastMid, 1);
                designMode.UI.$points[arrowIdx].eq(1).remove();
                var $newEndPoint = designMode.UI.$points[arrowIdx].eq(lastMid + 2).detach();
                designMode.UI.$points[arrowIdx].eq(0).after($newEndPoint);
                designMode.UI.$points[arrowIdx].splice(lastMid + 2, 1);
                designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].eq(0).add($newEndPoint).add(designMode.UI.$points[arrowIdx].slice(2));
                if (data.arrowTypes[arrowIdx] === 'polyline' && lastMid === 0) {
                    data.arrowTypes[arrowIdx] = 'line';
                    // Removed the last mid point of a polyline. So now, change it to a line.
                    DOM.replaceArrow(arrowIdx);
                }
            },
            deleteMidPoint: function (arrowIdx, midIndex) {
                data.points.mid[arrowIdx].splice(midIndex, 1);
                designMode.UI.$points[arrowIdx].eq(midIndex + 2).remove();
                designMode.UI.$points[arrowIdx].splice(midIndex + 2, 1);
                if (data.arrowTypes[arrowIdx] === 'polyline' && data.points.mid[arrowIdx].length === 0) {
                    data.arrowTypes[arrowIdx] = 'line';
                    // Removed the last mid point of a polyline. So now, change it to a line.
                    DOM.replaceArrow(arrowIdx);
                }
            }
        },
        DOM.bezier = {
            controlLines: [],
            createControlLine: function (attrs, active) {
                if (!active) {
                    attrs['stroke-dasharray'] = designMode.UI.activeArrow.dasharray;
                }
                return DOM.createSvgDom('line', attrs);
            },
            Q: { // Quadratic beziers
                addPoint: function (arrowIdx, midPoints, sets) {
                    var lastPntIdx = midPoints.length - 1,
                        newBezierPoint = { // new bezier point is the average of the last mid point with the last point
                            x: (midPoints[lastPntIdx].x + data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx)/2,
                            y: (midPoints[lastPntIdx].y + data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy)/2
                        },
                        newControlPoint = {
                            x: 2*newBezierPoint.x - midPoints[lastPntIdx].x,
                            y: 2*newBezierPoint.y - midPoints[lastPntIdx].y
                        };
                    this.addPointAndControlLines(newBezierPoint, arrowIdx, sets);
                    this.addPointAndControlLines(newControlPoint, arrowIdx, sets);
                },
                addPointAndControlLines: function (newPnt, arrowIdx, sets) {
                    var $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true),
                        $controlLine = DOM.bezier.createControlLine({
                            x1: newPnt.x,
                            y1: newPnt.y,
                            x2: data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx,
                            y2: data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy
                        }, true);
                    data.points.mid[arrowIdx].push(newPnt);
                    designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].add($controlPoint);
                    sets.controlPoints = sets.controlPoints.add($controlPoint);

                    // the previous last control line should point to the new control point, not to the target point
                    DOM.bezier.controlLines[arrowIdx][DOM.bezier.controlLines[arrowIdx].length - 1].attr({
                        x2: newPnt.x,
                        y2: newPnt.y
                    });
                    DOM.bezier.controlLines[arrowIdx].push($controlLine);
                    sets.controlLines = sets.controlLines.add($controlLine);
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
                            DOM.bezier.Q.updateControlLines(designMode.UI.activeArrow.idx, 'mid', less);
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
                            DOM.bezier.Q.updateControlLines(designMode.UI.activeArrow.idx, 'mid', more);
                            more += 2;
                        }
                    }
                    DOM.bezier.Q.updateControlLines(designMode.UI.activeArrow.idx, 'mid', midIndex);
                },
                updateControlLines: function (arrowIdx, pointType, midPointerIdx) {
                    switch (pointType) {
                        case 'start':
                            DOM.bezier.updateBezierStartControlLines(arrowIdx);
                            break;
                        case 'mid':
                            if (midPointerIdx === 0) {
                                DOM.bezier.updateBezierStartControlLines(arrowIdx);
                            } else {
                                DOM.bezier.controlLines[arrowIdx][midPointerIdx].attr({
                                    x1: data.points.mid[arrowIdx][midPointerIdx - 1].x,
                                    y1: data.points.mid[arrowIdx][midPointerIdx - 1].y,
                                    x2: data.points.mid[arrowIdx][midPointerIdx].x,
                                    y2: data.points.mid[arrowIdx][midPointerIdx].y
                                });
                            }
                            if (midPointerIdx === data.points.mid[arrowIdx].length - 1) {
                                this.updateControlLines(arrowIdx, 'end');
                            } else {
                                DOM.bezier.controlLines[arrowIdx][midPointerIdx + 1].attr({
                                    x1: data.points.mid[arrowIdx][midPointerIdx].x,
                                    y1: data.points.mid[arrowIdx][midPointerIdx].y,
                                    x2: data.points.mid[arrowIdx][midPointerIdx + 1].x,
                                    y2: data.points.mid[arrowIdx][midPointerIdx + 1].y
                                });
                            }
                            break;
                        case 'end':
                            midPointerIdx = data.points.mid[arrowIdx].length - 1;
                            DOM.bezier.controlLines[arrowIdx][midPointerIdx + 1].attr({
                                x1: data.points.mid[arrowIdx][midPointerIdx].x,
                                y1: data.points.mid[arrowIdx][midPointerIdx].y,
                                x2: data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx,
                                y2: data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy
                            });
                    }
                },
                deletePoint: function (arrowIdx, pntIndex) {
                    var lastMid = data.points.mid[arrowIdx].length - 1;
                    if (lastMid === 0) {
                        designMode.UI.deleteArrow(arrowIdx);
                    } else {
                        switch (pntIndex) {
                            case 0: this.deleteStartPoint(arrowIdx); break;
                            case 1: this.deleteEndPoint(arrowIdx, lastMid); break;
                            default: this.deleteMidPoint(arrowIdx, pntIndex - 2, lastMid);
                        }
                        DOM.updateArrow(arrowIdx);
                    }
                },
                deleteStartPoint: function (arrowIdx) {
                    data.points.layout.fromOffset[arrowIdx].dx = data.points.mid[arrowIdx][1].x - data.points.start.x;
                    data.points.layout.fromOffset[arrowIdx].dy = data.points.mid[arrowIdx][1].y - data.points.start.y;
                    data.points.mid[arrowIdx].splice(0, 2);
                    designMode.UI.$points[arrowIdx].eq(0).remove();
                    designMode.UI.$points[arrowIdx].eq(2).remove();
                    var $newStartPoint = designMode.UI.$points[arrowIdx].eq(3).detach();
                    designMode.UI.$points[arrowIdx].eq(1).before($newStartPoint);
                    designMode.UI.$points[arrowIdx].splice(2, 2);
                    designMode.UI.$points[arrowIdx] = $newStartPoint.add(designMode.UI.$points[arrowIdx].slice(1));
                    DOM.bezier.controlLines[arrowIdx][0].remove();
                    DOM.bezier.controlLines[arrowIdx][1].remove();
                    DOM.bezier.controlLines[arrowIdx].splice(0, 2);
                },
                deleteEndPoint: function (arrowIdx, lastMid) {
                    data.points.layout.toOffset[arrowIdx].dx = data.points.mid[arrowIdx][lastMid - 1].x - data.points.end[arrowIdx].x;
                    data.points.layout.toOffset[arrowIdx].dy = data.points.mid[arrowIdx][lastMid - 1].y - data.points.end[arrowIdx].y;
                    data.points.mid[arrowIdx].splice(lastMid - 1, 2);
                    designMode.UI.$points[arrowIdx].eq(1).remove();
                    designMode.UI.$points[arrowIdx].eq(lastMid + 2).remove();
                    var $newEndPoint = designMode.UI.$points[arrowIdx].eq(lastMid + 1).detach();
                    designMode.UI.$points[arrowIdx].eq(0).after($newEndPoint);
                    designMode.UI.$points[arrowIdx].splice(lastMid + 1, 2);
                    designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].eq(0).add($newEndPoint).add(designMode.UI.$points[arrowIdx].slice(2));
                    DOM.bezier.controlLines[arrowIdx][lastMid + 1].remove();
                    DOM.bezier.controlLines[arrowIdx][lastMid].remove();
                    DOM.bezier.controlLines[arrowIdx].splice(lastMid, 2);
                },
                deleteMidPoint: function (arrowIdx, midIndex, lastMid) {
                    var midPoints = data.points.mid[arrowIdx],
                        delAfter = true,  // true: deletes mid[midIndex] and mid[midIndex + 1]; false: deletes mid[midIndex - 1] and mid[midIndex]
                        deletePointsAndControlLines = function (index) {
                            midPoints.splice(index, 2);
                            designMode.UI.$points[arrowIdx].slice(index + 2, index + 4).remove();
                            designMode.UI.$points[arrowIdx].splice(index + 2, 2);
                            DOM.bezier.controlLines[arrowIdx][index + 1].remove();
                            DOM.bezier.controlLines[arrowIdx][index + 2].remove();
                            DOM.bezier.controlLines[arrowIdx].splice(index + 1, 2);
                        };
                    if (midIndex % 2 === 0) {
                        delAfter = midIndex === lastMid;
                        midIndex += delAfter ? -1 : 1;
                    }
                    // midIndex is an anchor point
                    deletePointsAndControlLines(midIndex + (delAfter ? 0 : -1));
                    // simulate a mouse drag on the previous control point, in order to realign the control lines
                    this.changeControlPointPositions(
                        midPoints,
                        designMode.UI.$points[arrowIdx],
                        midIndex - 1,
                        midPoints[midIndex - 1].x,
                        midPoints[midIndex - 1].y
                    );
                }
            },
            C: { // Cubic beziers
                addPoint: function (arrowIdx, midPoints, sets) {
                    var lastPntIdx = midPoints.length - 1,
                        endPoint = {
                            x: data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx,
                            y: data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy
                        },
                        newBezierPoint = { // new bezier point is the average of the last four points (two last control points + two last anchor points)
                            x: (midPoints[lastPntIdx].x +
                                midPoints[lastPntIdx - 1].x +
                                endPoint.x +
                                (lastPntIdx > 1 ? midPoints[lastPntIdx - 2].x : data.points.start.x + data.points.layout.fromOffset[arrowIdx].dx)
                                )/4,
                            y: (midPoints[lastPntIdx].y +
                                midPoints[lastPntIdx - 1].y +
                                endPoint.y +
                                (lastPntIdx > 1 ? midPoints[lastPntIdx - 2].y : data.points.start.y + data.points.layout.fromOffset[arrowIdx].dy)
                                )/4
                        },
                        delta = {
                            dx: endPoint.x - midPoints[lastPntIdx].x,
                            dy: endPoint.y - midPoints[lastPntIdx].y
                        };
                    midPoints[lastPntIdx].x = newBezierPoint.x + delta.dx;
                    midPoints[lastPntIdx].y = newBezierPoint.y + delta.dy;
                    designMode.UI.$points[arrowIdx].eq(lastPntIdx + 2).attr({
                        'cx': midPoints[lastPntIdx].x,
                        'cy': midPoints[lastPntIdx].y
                    });
                    DOM.bezier.controlLines[arrowIdx][DOM.bezier.controlLines[arrowIdx].length - 1].attr({
                        x1: midPoints[lastPntIdx].x,
                        y1: midPoints[lastPntIdx].y,
                        x2: newBezierPoint.x,
                        y2: newBezierPoint.y
                    });
                    this.addPointAndControlLines(newBezierPoint, arrowIdx, sets, false, lastPntIdx++);
                    this.addPointAndControlLines({
                        x: newBezierPoint.x - delta.dx,
                        y: newBezierPoint.y - delta.dy
                    }, arrowIdx, sets, true, lastPntIdx);
                    this.addPointAndControlLines({
                        x: endPoint.x - delta.dx,
                        y: endPoint.y - delta.dy
                    }, arrowIdx, sets, true, null);
                },
                addPointAndControlLines: function (newPnt, arrowIdx, sets, createLine, lastMidPntIdx) {
                    var $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true),
                        $controlLine = createLine ? DOM.bezier.createControlLine({
                            x1: newPnt.x,
                            y1: newPnt.y,
                            x2: lastMidPntIdx === null ? data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx : data.points.mid[arrowIdx][lastMidPntIdx].x,
                            y2: lastMidPntIdx === null ? data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy : data.points.mid[arrowIdx][lastMidPntIdx].y
                        }, true) : null;
                    data.points.mid[arrowIdx].push(newPnt);
                    designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].add($controlPoint);
                    sets.controlPoints = sets.controlPoints.add($controlPoint);

                    if ($controlLine) {
                        DOM.bezier.controlLines[arrowIdx].push($controlLine);
                        sets.controlLines = sets.controlLines.add($controlLine);
                    }
                },
                changeControlPointPositions: function (midPoints, $points, midIndex, x, y) {
                    var twinPointIsAfter = midIndex % 3 !== 0,
                        anchorPnt = midPoints[midIndex + (twinPointIsAfter ? 1: -1)],
                        twinPointIdx = midIndex + (twinPointIsAfter ? 2: -2);
                    midPoints[twinPointIdx].x = 2*anchorPnt.x - x;
                    midPoints[twinPointIdx].y = 2*anchorPnt.y - y;
                    $points.eq(twinPointIdx + 2).attr({
                        'cx': midPoints[twinPointIdx].x,
                        'cy': midPoints[twinPointIdx].y
                    });
                    DOM.bezier.C.updateControlLines(designMode.UI.activeArrow.idx, 'mid', midIndex, twinPointIsAfter);
                },
                updateControlLines: function (arrowIdx, pointType, midPointerIdx, bezierCtwinPointIsAfter) {
                    switch (pointType) {
                        case 'start':
                            DOM.bezier.updateBezierStartControlLines(arrowIdx);
                            break;
                        case 'mid':
                            if (midPointerIdx === 0) {
                                DOM.bezier.updateBezierStartControlLines(arrowIdx);
                            } else {
                                DOM.bezier.controlLines[arrowIdx][Math.ceil(midPointerIdx/3*2)].attr({
                                    x1: data.points.mid[arrowIdx][midPointerIdx].x,
                                    y1: data.points.mid[arrowIdx][midPointerIdx].y,
                                    x2: data.points.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 1 : -1)].x,
                                    y2: data.points.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 1 : -1)].y
                                });
                            }
                            if (midPointerIdx === data.points.mid[arrowIdx].length - 1) {
                                this.updateControlLines(arrowIdx, 'end');
                            } else {
                                DOM.bezier.controlLines[arrowIdx][Math.ceil(midPointerIdx/3*2) + (bezierCtwinPointIsAfter ? 1 : -1)].attr({
                                    x1: data.points.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 2 : -2)].x,
                                    y1: data.points.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 2 : -2)].y,
                                    x2: data.points.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 1 : -1)].x,
                                    y2: data.points.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 1 : -1)].y
                                });
                            }
                            break;
                        case 'end':
                            midPointerIdx = data.points.mid[arrowIdx].length - 1;
                            DOM.bezier.controlLines[arrowIdx][(midPointerIdx + 2)/1.5 - 1].attr({
                                x1: data.points.mid[arrowIdx][midPointerIdx].x,
                                y1: data.points.mid[arrowIdx][midPointerIdx].y,
                                x2: data.points.end[arrowIdx].x + data.points.layout.toOffset[arrowIdx].dx,
                                y2: data.points.end[arrowIdx].y + data.points.layout.toOffset[arrowIdx].dy
                            });
                    }
                },
                deletePoint: function (arrowIdx, pntIndex) {
                    var lastMid = data.points.mid[arrowIdx].length - 1;
                    if (lastMid === 1) {
                        designMode.UI.deleteArrow(arrowIdx);
                    } else {
                        switch (pntIndex) {
                            case 0:
                            case 2: this.deleteStartPoint(arrowIdx); break;
                            case 1:
                            case lastMid + 2: this.deleteEndPoint(arrowIdx, lastMid); break;
                            default: this.deleteMidPoint(arrowIdx, pntIndex - 2, lastMid);
                        }
                        DOM.updateArrow(arrowIdx);
                    }
                },
                deleteStartPoint: function (arrowIdx) {
                    data.points.layout.fromOffset[arrowIdx].dx = data.points.mid[arrowIdx][2].x - data.points.start.x;
                    data.points.layout.fromOffset[arrowIdx].dy = data.points.mid[arrowIdx][2].y - data.points.start.y;
                    data.points.mid[arrowIdx].splice(0, 3);
                    designMode.UI.$points[arrowIdx].eq(0).remove();
                    designMode.UI.$points[arrowIdx].slice(2, 4).remove();
                    var $newStartPoint = designMode.UI.$points[arrowIdx].eq(4).detach();
                    designMode.UI.$points[arrowIdx].eq(1).before($newStartPoint);
                    designMode.UI.$points[arrowIdx].splice(2, 3);
                    designMode.UI.$points[arrowIdx] = $newStartPoint.add(designMode.UI.$points[arrowIdx].slice(1));
                    DOM.bezier.controlLines[arrowIdx][0].remove();
                    DOM.bezier.controlLines[arrowIdx][1].remove();
                    DOM.bezier.controlLines[arrowIdx].splice(0, 2);
                },
                deleteEndPoint: function (arrowIdx, lastMid) {
                    data.points.layout.toOffset[arrowIdx].dx = data.points.mid[arrowIdx][lastMid - 2].x - data.points.end[arrowIdx].x;
                    data.points.layout.toOffset[arrowIdx].dy = data.points.mid[arrowIdx][lastMid - 2].y - data.points.end[arrowIdx].y;
                    data.points.mid[arrowIdx].splice(lastMid - 2, 3);
                    designMode.UI.$points[arrowIdx].eq(1).remove();
                    designMode.UI.$points[arrowIdx].slice(lastMid + 1, lastMid + 3).remove();
                    var $newEndPoint = designMode.UI.$points[arrowIdx].eq(lastMid).detach();
                    designMode.UI.$points[arrowIdx].eq(0).after($newEndPoint);
                    designMode.UI.$points[arrowIdx].splice(lastMid + 1, 2);
                    designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].eq(0).add($newEndPoint).add(designMode.UI.$points[arrowIdx].slice(2));
                    var controlLineIdx = Math.ceil(lastMid/1.5);
                    DOM.bezier.controlLines[arrowIdx][controlLineIdx - 1].remove();
                    DOM.bezier.controlLines[arrowIdx][controlLineIdx].remove();
                    DOM.bezier.controlLines[arrowIdx].splice(controlLineIdx - 1, 2);
                },
                deleteMidPoint: function (arrowIdx, midIndex, lastMid) {
                    var midPoints = data.points.mid[arrowIdx],
                        deletePointsAndControlLines = function (index) {
                            midPoints.splice(index - 1, 3);
                            designMode.UI.$points[arrowIdx].slice(index + 1, index + 4).remove();
                            designMode.UI.$points[arrowIdx].splice(index + 1, 3);
                            var controlLineIdx = Math.ceil(index/1.5);
                            DOM.bezier.controlLines[arrowIdx][controlLineIdx - 1].remove();
                            DOM.bezier.controlLines[arrowIdx][controlLineIdx].remove();
                            DOM.bezier.controlLines[arrowIdx].splice(controlLineIdx - 1, 2);
                        };
                    if ((midIndex - 1) % 3 === 0) {
                        ++midIndex;
                    } else {
                        if (midIndex % 3 === 0) {
                            --midIndex;
                        }
                    }
                    // midIndex is an anchor point
                    deletePointsAndControlLines(midIndex);
                }
            },
            updateBezierStartControlLines: function (arrowIdx) {
                this.controlLines[arrowIdx][0].attr({
                    x1: data.points.start.x + data.points.layout.fromOffset[arrowIdx].dx,
                    y1: data.points.start.y + data.points.layout.fromOffset[arrowIdx].dy,
                    x2: data.points.mid[arrowIdx][0].x,
                    y2: data.points.mid[arrowIdx][0].y
                });
            }
        };
        designMode.init();
    };

    $.fn.rsRefPointer.defaults = defaults;
})(jQuery);