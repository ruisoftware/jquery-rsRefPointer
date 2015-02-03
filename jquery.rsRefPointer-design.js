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
    var runtime = $.fn.rsRefPointer;
    if (!runtime) {
        (function (msg) {
            console && console.error ? console.error(msg) : alert('Error:\n\n' + msg);
        })('jquery.rsRefPointer.js not loaded!\nPlease, include jquery.rsRefPointer.js before jquery.rsRefPointer-design.js.');
        return;
    }
    var defaults = runtime.defaults;
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
        options.overrideShapeAttrsBezierQ = function (pts, index, util, shadeOffset) {
            return pts.mid[index].map(function (e, i) {
                var point = pts.getMidPoint(e, index),
                    pointStr = util.pointToStr(point, shadeOffset);
                switch (i) {
                    case 0: return 'Q' + pointStr + ' ';
                    case 1: return pointStr + ' ';
                    default: return i % 2 === 1 ? 'T' + pointStr + ' ': '';
                } 
            }).join('');
        };
        options.overrideShapeAttrsBezierC = function (pts, index, util, shadeOffset) {
            return pts.mid[index].map(function (e, i) {
                var point = pts.getMidPoint(e, index),
                    pointStr = util.pointToStr(point, shadeOffset);
                switch (i) {
                    case 0: return 'C' + pointStr + ' ';
                    case 1:
                    case 2: return pointStr + ' ';
                    default: return i % 3 === 0 ? '': (((i - 1) % 3 === 0 ? 'S' : '') + pointStr + ' ');
                } 
            }).join('');
        };

        options.processMidPoints = function (arrowType, midPoints) {
            switch (arrowType) {
                case 'bezierQ':
                    for(var i = 2, len = midPoints.length; i < ++len; i += 2) {
                        midPoints.splice(i, 0, {
                            x: 2*midPoints[i -  1].x - midPoints[i -  2].x,
                            y: 2*midPoints[i -  1].y - midPoints[i -  2].y
                        });
                    }
                    break;
                case 'bezierC':
                    for(var i = 3, len = midPoints.length; i < ++len; i += 3) {
                        midPoints.splice(i, 0, {
                            x: 2*midPoints[i -  1].x - midPoints[i -  2].x,
                            y: 2*midPoints[i -  1].y - midPoints[i -  2].y
                        });
                    }
            }
        };
        runtime.call(this, options);
        var allData = $.fn.rsRefPointer.designData,
            opts = allData.opts,
            data = allData.data,
            DOM = allData.DOM,
            events = allData.events,
            util = allData.util,
            callerFunction = arguments && arguments.callee && arguments.callee.caller ? arguments.callee.caller.toString() : null,
            designMode = {
                UI: {
                    activeArrow: {
                        $backgroundArrowsRect: null, // svg rectangle that hides the unselected arrows in order to visually hightlight the selected arrow
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
                                    DOM.getArrow(this.idx).detach().insertBefore(this.$backgroundArrowsRect);
                                }
                                DOM.getArrow(newIndex).detach().insertAfter(this.$backgroundArrowsRect);
                                designMode.UI.$points[newIndex].css('stroke-width', this.strokeSelected);
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
                        $popupProperties: null,
                        $generatedCode: null,
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
                            var getRgbaColor = function (hexColor, opacity) {
                                    if (Math.abs(opacity - 1) > 1e-5) {
                                        var tokens = /^#([0-9A-Fa-f][0-9A-Fa-f])([0-9A-Fa-f][0-9A-Fa-f])([0-9A-Fa-f][0-9A-Fa-f])$/g.exec(hexColor);
                                        if (tokens && tokens.length === 4) {
                                            return 'rgba(' + parseInt(tokens[1], 16) + ',' + parseInt(tokens[2], 16) + ',' + parseInt(tokens[3], 16) + ',' + opacity + ')';
                                        }
                                    }
                                    return hexColor;
                                },
                                getShadowPoints = function (value, isX, offset) {
                                    return value + (isX ? offset.offsetX : offset.offsetY);
                                },
                                getMidPointsPolyline = function () {
                                    return [200,70, 230,30];
                                },
                                getMidPointsBezier = function (stringify) {
                                    return [130,170, 220*(stringify? - 1 : 1),115];
                                },
                                getShadowPointsPolyline = function () {
                                    return getMidPointsPolyline().map(function (value, index) {
                                        return getShadowPoints(value, !(index % 2), opts.shadow);
                                    }).join(',');
                                },
                                getShadowPointsBezier = function () {
                                    return getMidPointsBezier().map(function (value, index) {
                                        var isX = !(index % 2);
                                        value = getShadowPoints(value, isX, opts.shadow);
                                        return isX && index ? - value : value;  // use the minus as a place for whitespace, not comma
                                    }).join(',').replace(/,-/g, ' '); 
                                },
                                getPolylinePoints = function (shadow) {
                                    return '180,32, ' + (shadow ? getShadowPointsPolyline() : getMidPointsPolyline().join(',')) + ', 290,60';
                                };
                                getBezierPoints = function (shadow) {
                                    return 'M170,90 Q' + (shadow ? getShadowPointsBezier() : getMidPointsBezier(true).join(',').replace(/,-/g, ' ')) + ' T270,130';
                                };

                            this.$menu = $(
                                '<menu class="refPointer design">' +
                                    '<header>Draggable Menu</header>' +
                                    '<hr>' +
                                    '<menu>Pointing to?<div></div></menu>' +
                                    '<a href="#">New Line</a>' +
                                    '<a href="#">New Quadratic Bezier</a>' +
                                    '<a href="#">New Cubic Bezier</a>' +
                                    '<a href="#" class="disabled">Add Middle Point</a>' +
                                    '<ul></ul>' +
                                    '<a href="#">Arrow Properties</a>' +
                                    '<hr>' +
                                    '<a href="#">Generate Code</a>' +
                                '</menu>');
                            this.$popupProperties = $(
                                '<div>' +
                                    '<div><header>Arrow Properties<a href="#" title="Discard changes and close popup">&#x2715;</a></header>' +
                                        '<hr>' +
                                        '<aside>' +
                                            '<div>Markers</div>' +
                                            '<span>Size</span>' +
                                            '<input type="range" min="0.1" max="5" step="0.1"><var></var>' +
                                            '<span>Shapes</span><label></label><label></label><label></label>' +
                                            '<svg width="340px" height="170px" xmlns="http://www.w3.org/2000/svg" version="1.1">' +
                                                '<defs>' +
                                                    '<marker id="rsRefPMarkerPointer" orient="auto">' +
                                                        '<path></path>' +
                                                    '</marker>' +
                                                    '<marker id="rsRefPMarkerPointer2" orient="auto">' +
                                                        '<path></path>' +
                                                    '</marker>' +
                                                    '<marker id="rsRefPMarkerCircle" orient="auto">' +
                                                        '<circle></circle>' +
                                                    '</marker>' +
                                                    '<marker id="rsRefPMarkerRect" orient="auto">' +
                                                        '<rect></rect>' +
                                                    '</marker>' +

                                                    '<filter id="rsRefPMarkerFilter" x="-100%" y="-100%" width="300%" height="300%">' +
                                                        '<feGaussianBlur in="SourceGraphic"></feGaussianBlur>' +
                                                    '</filter>' +

                                                    '<marker id="rsRefPfMarkerPointer" orient="auto">' +
                                                        '<path></path>' +
                                                    '</marker>' +
                                                    '<marker id="rsRefPfMarkerPointer2" orient="auto">' +
                                                        '<path></path>' +
                                                    '</marker>' +
                                                    '<marker id="rsRefPfMarkerCircle" orient="auto">' +
                                                        '<circle></circle>' +
                                                    '</marker>' +
                                                    '<marker id="rsRefPfMarkerRect" orient="auto">' +
                                                        '<rect></rect>' +
                                                    '</marker>' +
                                                '</defs>' +
                                                // shade
                                                '<polyline points="' + getPolylinePoints(true) + '" stroke="black" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" fill="none" filter="url(#rsRefPMarkerFilter)"></polyline>' +
                                                '<path d="' + getBezierPoints(true) + '" fill="none" stroke-linecap="round" stroke="black" stroke-width="1" filter="url(#rsRefPMarkerFilter)"></path>' +
                                                // outline
                                                '<polyline points="' + getPolylinePoints() + '" stroke="black" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" fill="none"></polyline>' +
                                                '<path d="' + getBezierPoints() + '" fill="none" stroke-linecap="round" stroke="black" stroke-width="1"></path>' +
                                                // stroke
                                                '<polyline points="' + getPolylinePoints() + '" stroke="black" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" fill="none"></polyline>' +
                                                '<path d="' + getBezierPoints() + '" fill="none" stroke-linecap="round" stroke="black" stroke-width="1"></path>' +
                                                '<g>' +
                                                    '<text x="4" y="68">none</text>' +
                                                    '<text x="38" y="68">none</text>' +
                                                    '<text x="74" y="68">none</text>' +
                                                    // pointer
                                                    '<path d="M7,76 L7,88 L23,82 z"></path>' +
                                                    '<path d="M42,76 L42,88 L58,82 z"></path>' +
                                                    '<path d="M77,76 L77,88 L93,82 z"></path>' +
                                                    // pointer2
                                                    '<path d="M10,102 L6,108 L22,102 L6,96 z"></path>' +
                                                    '<path d="M45,102 L41,108 L57,102 L41,96 z"></path>' +
                                                    '<path d="M80,102 L76,108 L92,102 L76,96 z"></path>' +
                                                    // сircle
                                                    '<circle cx="14" cy="122" r="6"></circle>' +
                                                    '<circle cx="49" cy="122" r="6"></circle>' +
                                                    '<circle cx="84" cy="122" r="6"></circle>' +
                                                    // rect
                                                    '<rect x="8" y="136" width="12" height="12"></rect>' +
                                                    '<rect x="43" y="136" width="12" height="12"></rect>' +
                                                    '<rect x="78" y="136" width="12" height="12"></rect>' +
                                                '</g>' +
                                            '</svg>' +
                                        '</aside>' +
                                        '<aside>' +
                                            '<div>Preview</div>' +
                                        '</aside>' +
                                        '<aside>' +
                                            '<div>Stroke</div>' +
                                            '<span>Size</span><input type="range" min="0.5" max="4" step="0.25"><var></var>' +
                                            '<span>Color</span><input type="color"><br>' +
                                            '<span>Opacity</span><input type="range" min="0" max="1" step="0.025"><var></var>' +
                                        '</aside>' +
                                        '<aside>' +
                                            '<div>Outline</div>' +
                                            '<span>Size</span><input type="range" min="0" max="4" step="0.25"><var></var>' +
                                            '<span>Color</span><input type="color"><br>' +
                                            '<span>Opacity</span><input type="range" min="0" max="1" step="0.025"><var></var>' +
                                        '</aside>' +
                                        '<aside>' +
                                            '<div>Shadow</div>' +
                                            '<input type="checkbox" id="rsRefPointerChk3020-201f0"><label for="rsRefPointerChk3020-201f0">Visible</label>' +
                                            '<span>Color</span><input type="color"><br>' +
                                            '<span>X Offset</span><input type="range" min="-20" max="20"><var></var>' +
                                            '<span>Opacity</span><input type="range" min="0" max="1" step="0.025"><var></var>' +
                                            '<span>Y Offset</span><input type="range" min="-20" max="20"><var></var>' +
                                            '<span>Blur</span><input type="range" min="0" max="5" step="0.025"><var></var>' +
                                        '</aside>' +
                                        '<button>Apply Changes</button>' +
                                    '</div>' +
                                '</div>'
                            );
                            this.$generatedCode = $(
                                '<div>' +
                                    '<div><header>Generated Code<a href="#">&#x2715;</a></header>' +
                                        '<hr>' +
                                        '<header>Replace your current <pre>rsRefPointer(...)</pre> call with this one:</header>' +
                                        '<code>' +
                                        '</code>' +
                                        '<ul>' +
                                            '<li><button>Select all</button> the text and copy it, by pressing <kbd><kbd>Ctrl</kbd>+<kbd>C</kbd></kbd> or <kbd><kbd>Cmd</kbd>+<kbd>C</kbd></kbd> if you are on a Mac;</li>' +
                                            '<li>Paste it to your page, to replace your current plug-in call with this new code snippet;</li>' +
                                            '<li>Remove the design-time library <pre>&lt;script src="jquery.rsRefPointer-design.js"&gt;&lt;/script&gt;</pre> from your page.</li>' +
                                        '</ul>' +
                                        '<button>Close</button>' +
                                    '</div>' +
                                '</div>'
                            );
                            $('head').append(
                                '<style> ' + 
                                    'menu.refPointer.design,' +
                                    'menu.refPointer.design menu,' +
                                    'menu.refPointer.design + div > div,' +
                                    'menu.refPointer.design + div + div > div {' +
                                        'box-shadow: 0 0 6px black;' +
                                        'border-radius: 5px;' +
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
                                        'width: 140px;' +
                                        '-moz-user-select: none;' +
                                        '-ms-user-select: none;' +
                                        '-webkit-user-select: none;' +
                                        'user-select: none;' +
                                    '}' +
                                    'menu.refPointer.design menu {' +
                                        'display: none;' +
                                        'width: 85px;' +
                                        'left: 156px;' +
                                        'border-radius: 0;' +
                                        'border-top-right-radius: 20px 15px;' +
                                        'border-bottom-right-radius: 20px 15px;' +
                                        'padding: 10px;' +
                                        'margin: 0;' +
                                    '}' +
                                    'menu.refPointer.design:after {' +
                                        'content: "";' +
                                        'position: absolute;' +
                                        'right: 0;' +
                                        'top: 40px;' +
                                        'width: 7px;' +
                                        'height: 350px;' +
                                        'background-color: #ddd;' +
                                    '}' +
                                    'menu.refPointer.design menu a {' +
                                        'display: block;' +
                                        'font-size: 11px;' +
                                    '}' +
                                    'menu.refPointer.design header {' +
                                        'cursor: move;' +
                                        'padding: 3px 5px 6px;' +
                                        'text-align: center;' +
                                    '}' +
                                    'menu.refPointer.design > a,' +
                                    'menu.refPointer.design menu a {' +
                                        'display: block;' +
                                        'padding: 5px;' +
                                        'text-decoration: none;' +
                                        'line-height: 12px;' +
                                        'border-radius: 2px;' +
                                        'white-space: nowrap;' +
                                    '}' +
                                    'menu.refPointer.design menu div {' +
                                        'margin-top: 8px;' +
                                        'overflow: auto;' +
                                        'max-height: 250px;' +
                                    '}' +
                                    'menu.refPointer.design > a:hover,' +
                                    'menu.refPointer.design > a.selecting.thisone,' +
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
                                        'font-size: 10px;' +
                                        'line-height: 14px;' +
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
                                    'menu.refPointer.design + div,' +
                                    'menu.refPointer.design + div + div {' +
                                        'display: none;' +
                                        'position: absolute;' +
                                        'top: 0;' +
                                        'right: 0;' +
                                        'bottom: 0;' +
                                        'left: 0;' +
                                        'background-color: rgba(0, 0, 0, .5);' +
                                    '}' +
                                    'menu.refPointer.design + div > div,' +
                                    'menu.refPointer.design + div + div > div {' +
                                        'position: absolute;' +
                                        'left: 50%;' +
                                        'top: 50%;' +
                                        'width: 400px;' +
                                        'height: 520px;' +
                                        'margin-left: -200px;' +
                                        'margin-top: -260px;' +
                                        'font-family: arial;' +
                                        'font-size: 12px;' +
                                        'padding: 10px;' +
                                        'background-color: #eee;' +
                                        'box-shadow: 0 0 10px 2px black;' +
                                    '}' +
                                    'menu.refPointer.design + div + div > div {' +
                                        'margin-left: -400px;' +
                                        'margin-top: -255px;' +
                                        'width: 800px;' +
                                        'height: 510px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div a:first-of-type,' +
                                    'menu.refPointer.design + div + div > div a:first-of-type {' +
                                        'position: absolute;' +
                                        'right: 10px;' +
                                        'font-size: 15px;' +
                                        'text-decoration: none;' +
                                        'color: grey;' +
                                        'top: 7px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div a:first-of-type:hover,' +
                                    'menu.refPointer.design + div + div > div a:first-of-type:hover {' +
                                        'color: red;' +
                                    '}' +
                                    'menu.refPointer.design + div > div header,' +
                                    'menu.refPointer.design + div + div > div header:first-of-type {' +
                                        'cursor: move;' +
                                    '}' +
                                    'menu.refPointer.design + div > div header + hr {' +
                                        'margin-bottom: 25px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside {' +
                                        'width: 46%;' +
                                        'display: inline-block;' +
                                        'margin: 0 2%;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside div {' +
                                        'font-size: 11px;' +
                                        'text-shadow: 1px 1px white;' +
                                        'left: 10px;' +
                                        'border-bottom: 1px solid #ccc;' +
                                        'font-weight: bold;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside span,' +
                                    'menu.refPointer.design + div > div > aside input[type=checkbox] {' +
                                        'width: 25%;' +
                                        'font-size: 9px;' +
                                        'text-align: right;' +
                                        'margin-right: 5px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside span,' +
                                    'menu.refPointer.design + div > div > aside input,' +
                                    'menu.refPointer.design + div > div > aside label {' +
                                        'display: inline-block;' +
                                        'vertical-align: middle;' +
                                        'height: 30px;' +
                                        'line-height: 30px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside input[type=range] {' +
                                        'width: 90px;' +
                                        'margin: 2px;' +
                                        'padding: 0;' +
                                        'border: none;' +
                                    '}' +
                                    'menu.refPointer.design + div > div var {' +
                                        'width: 30px;' +
                                        'display: inline-block;' +
                                        'font-size: 9px;' +
                                        'font-style: normal;' +
                                        'margin-left: 2px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:first-of-type input:first-of-type {' +
                                        'z-index: 1;' +
                                        'position: relative;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:first-of-type label {' +
                                        'border-radius: 15px 2px 2px 8px;' +
                                        'font-size: 9px;' +
                                        'width: 31px;' +
                                        'text-align: center;' +
                                        'background-color: #fff;' +
                                        'height: 110px;' +
                                        'position: absolute;' +
                                        'border: 1px #ccc solid;' +
                                        'border-width: 18px 1px 1px 1px;' +
                                        'display: inline-block;' +
                                        'margin-top: 4px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:first-of-type label + label {' +
                                        'border-radius: 2px;' +
                                        'left: 104px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:first-of-type label + label + label {' +
                                        'border-radius: 2px 15px 8px 2px;' +
                                        'left: 139px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:first-of-type label:before {' +
                                        'content: "start";' +
                                        'position: absolute;' +
                                        'text-align: center;' +
                                        'left: 0;' +
                                        'right: 0;' +
                                        'top: -22px;' +
                                        'color: grey;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:first-of-type label + label:before {' +
                                        'content: "mid";' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:first-of-type label + label + label:before {' +
                                        'content: "end";' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside input[type=checkbox] {' +
                                        'width: auto;' +
                                        'margin-left: 9.5%;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside input[type=checkbox] + label {' +
                                        'font-style: normal;' +
                                        'width: auto;' +
                                        'margin-right: 30.8%;' +
                                        'line-height: 32px;' +
                                        'font-size: 9px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside label:first-of-type {' +
                                        'margin-left: 0;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:last-of-type span {' +
                                        'width: 12%;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:last-of-type input[type=range]:nth-of-type(2n - 1) + var {' +
                                        'width: 53px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div svg {' +
                                        'display: block;' +
                                        'fill: #ddd;' +
                                        'font-size: 9px;' +
                                        'position: relative;' +
                                        'left: 54px;' +
                                        'top: -57px;' +
                                    '}' +
                                    'menu.refPointer.design + div svg > g > text,' +
                                    'menu.refPointer.design + div svg > g > path,' +
                                    'menu.refPointer.design + div svg > g > circle,' +
                                    'menu.refPointer.design + div svg > g > rect {' +
                                        '-webkit-transition: .1s fill;' +
                                        '-moz-transition: .1s fill;' +
                                        'transition: .1s fill;' +
                                    '}' +
                                    'menu.refPointer.design + div svg > g > text:hover,' +
                                    'menu.refPointer.design + div svg > g > path:hover,' +
                                    'menu.refPointer.design + div svg > g > circle:hover,' +
                                    'menu.refPointer.design + div svg > g > rect:hover {' +
                                        'cursor: pointer;' +
                                        'fill: black;' +
                                    '}' +
                                    'menu.refPointer.design + div svg > g > text.selected,' +
                                    'menu.refPointer.design + div svg > g > path.selected,' +
                                    'menu.refPointer.design + div svg > g > circle.selected,' +
                                    'menu.refPointer.design + div svg > g > rect.selected {' +
                                        'fill: black;' +
                                    '}' +
                                    'menu.refPointer.design + div > div svg > g > text {' +
                                        'font-size: 9px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside ~ aside {' +
                                        'position: relative;' +
                                        'top: -55px;' +
                                    '}' +
                                    'menu.refPointer.design + div > div > aside:last-of-type {' +
                                        'top: -32px;' +
                                        'width: 96%;' +
                                    '}' +
                                    'menu.refPointer.design + div button {' +
                                        'position: absolute;' +
                                        'right: 20px;' +
                                        'bottom: 10px;' +
                                    '}' +
                                    'menu.refPointer.design + div + div header {' +
                                        'font-size: 14px;' +
                                        'margin-left: 10px;' +
                                    '}' +
                                    'menu.refPointer.design + div + div header:first-of-type {' +
                                        'margin-left: auto;' +
                                    '}' +
                                    'menu.refPointer.design + div + div header:first-of-type + hr {' +
                                        'margin-bottom: 25px;' +
                                    '}' +
                                    'menu.refPointer.design + div + div ul {' +
                                        'line-height: 20px;' +
                                        'list-style: none;' +
                                        'padding-left: 20px;' +
                                    '}' +
                                    'menu.refPointer.design + div + div li:before {' +
                                        'content: "1";' +
                                        'color: #eee;' +
                                        'font-size: 10px;' + 
                                        'background-color: #aaa;' +
                                        'border-radius: 50%;' +
                                        'width: 12px;' +
                                        'height: 12px;' +
                                        'line-height: 12px;' +
                                        'display: inline-block;' +
                                        'text-align: center;' +
                                        'margin-right: 6px;' +
                                        'vertical-align: 1px;' +
                                    '}' +
                                    'menu.refPointer.design + div + div li + li:before {' +
                                        'content: "2";' +
                                    '}' +
                                    'menu.refPointer.design + div + div li + li + li:before {' +
                                        'content: "3";' +
                                    '}' +
                                    'menu.refPointer.design + div + div pre {' +
                                        'display: inline-block;' +
                                        'margin: 0;' +
                                    '}' +
                                    'menu.refPointer.design + div + div code pre {' +
                                        'display: block;' +
                                    '}' +
                                    'menu.refPointer.design + div + div header pre,' +
                                    'menu.refPointer.design + div + div ul pre {' +
                                        'border: 1px #ccc solid;' +
                                        'padding: 0 5px;' +
                                        'border-radius: 3px;' +
                                    '}' +
                                    'menu.refPointer.design + div + div code {' +
                                        'display: block;' +
                                        'background-color: white;' +
                                        'border: 1px #ccc solid;' +
                                        'border-radius: 3px;' +
                                        'padding: 5px 10px;' +
                                        'margin: 10px;' +
                                        'height: 305px;' +
                                        'overflow: auto;' +
                                    '}' +
                                    'menu.refPointer.design + div + div > div > button {' +
                                        'position: absolute;' +
                                        'right: 18px;' +
                                    '}' +
                                '</style>'
                            );
                            $('body').append(this.$menu).append(this.$popupProperties).append(this.$generatedCode);
                            var $newLineLink = $('> a:first-of-type', designMode.UI.menu.$menu),
                                $newLinks = $newLineLink.add($newLineLink.next()).add($newLineLink.next().next()),
                                finishMenuDragging = function (e) {
                                    designMode.UI.menu.dragInfo.dragging = false;
                                    var pos = $(this).parent().position();
                                    designMode.UI.menu.positionX = pos.left;
                                    designMode.UI.menu.positionY = pos.top;
                                },
                                addArrowMenuClick = function (e, type, $menuOption) {
                                    e.preventDefault();
                                    if (data.$targets.length > 1) {
                                        $newLinks.removeClass('selecting');
                                        $menuOption.addClass('selecting');
                                        designMode.UI.menu.multipleTargets.type = type;
                                        designMode.UI.menu.multipleTargets.showMenu($menuOption.position().top);
                                    } else {
                                        designMode.UI.addArrow(type, 0);
                                    }
                                },
                                initModel = function () {
                                    var $colorPicker = $('<span>').hide(),
                                        getHexColor = function (color) {
                                            $colorPicker[0].style.color = color;
                                            var rgb = window.getComputedStyle($colorPicker[0]).color.replace(/rgb\(|rgba\(| |\)/g, '').split(',');
                                            return '#' + util.byteToHex(parseInt(rgb[0])) + util.byteToHex(parseInt(rgb[1])) + util.byteToHex(parseInt(rgb[2]));
                                        },
                                        getColorOpacity = function (color) {
                                            var tokens = /(rgba|hsla)\((.*),(.*),(.*),(.*)\)/.exec(color);
                                            if (tokens && tokens.length === 6) {
                                                return parseFloat(tokens[5]);
                                            }
                                            return 1;
                                        },
                                        getShapeIdx = function(type) {
                                            var index = [null, 'pointer', 'pointer2', 'circle', 'square'].indexOf(type);
                                            return index < 0 ? 0 : index;
                                        };
                                    $('body').append($colorPicker);
                                    try {
                                        selector.marker.$size.val(opts.marker.size).triggerHandler('input');
                                        $('> div svg > g > ' + ['text', 'path', 'path:gt(2)', 'circle', 'rect'][getShapeIdx(opts.marker.start)], designMode.UI.menu.$popupProperties).eq(0).click();
                                        $('> div svg > g > ' + ['text', 'path', 'path:gt(2)', 'circle', 'rect'][getShapeIdx(opts.marker.mid)], designMode.UI.menu.$popupProperties).eq(1).click();
                                        $('> div svg > g > ' + ['text', 'path', 'path:gt(2)', 'circle', 'rect'][getShapeIdx(opts.marker.end)], designMode.UI.menu.$popupProperties).eq(2).click();
                                        selector.stroke.$size.val(opts.stroke.size).triggerHandler('input');
                                        selector.stroke.$color.val(getHexColor(opts.stroke.color));
                                        selector.stroke.$opacity.val(getColorOpacity(opts.stroke.color)).triggerHandler('input');
                                        selector.outline.$size.val(opts.outline.size).triggerHandler('input');
                                        selector.outline.$color.val(getHexColor(opts.outline.color));
                                        selector.outline.$opacity.val(getColorOpacity(opts.outline.color)).triggerHandler('input');
                                        selector.shadow.$color.val(getHexColor(opts.shadow.color));
                                        selector.shadow.$opacity.val(getColorOpacity(opts.shadow.color)).triggerHandler('input');
                                        selector.shadow.$visible[0].checked = opts.shadow.visible;
                                        selector.shadow.$visible.triggerHandler('change');
                                        selector.shadow.$ranges.eq(0).val(opts.shadow.offsetX).triggerHandler('input');
                                        selector.shadow.$ranges.eq(2).val(opts.shadow.offsetY).triggerHandler('input');
                                        selector.shadow.$ranges.eq(3).val(opts.shadow.blur).triggerHandler('input');
                                    } finally {
                                        $colorPicker.remove();
                                    }
                                },
                                selector = {
                                    marker: {
                                        $size: $(".refPointer.design + div > div > aside:first-of-type input"),
                                        shapes: {
                                            $start: $('> div svg > g > text:eq(0), > div svg > g > path:eq(0), > div svg > g > path:eq(3), > div svg > g > circle:eq(0), > div svg > g > rect:eq(0)', designMode.UI.menu.$popupProperties),
                                            $mid: $('> div svg > g > text:eq(1), > div svg > g > path:eq(1), > div svg > g > path:eq(4), > div svg > g > circle:eq(1), > div svg > g > rect:eq(1)', designMode.UI.menu.$popupProperties),
                                            $end: $('> div svg > g > text:eq(2), > div svg > g > path:eq(2), > div svg > g > path:eq(5), > div svg > g > circle:eq(2), > div svg > g > rect:eq(2)', designMode.UI.menu.$popupProperties),
                                            $all: $('> div svg > g > text, > div svg > g > path, > div svg > g > circle, > div svg > g > rect', designMode.UI.menu.$popupProperties)
                                        }
                                    },
                                    stroke: {
                                        $size: $(".refPointer.design + div > div > aside:first-of-type + aside + aside input:first-of-type"),
                                        $color: $(".refPointer.design + div > div > aside:first-of-type + aside + aside input[type=color]"),
                                        $opacity: $(".refPointer.design + div > div > aside:first-of-type + aside + aside input[type=color] ~ input")
                                    },
                                    outline: {
                                        $size: $(".refPointer.design + div > div > aside:first-of-type + aside + aside + aside input:first-of-type"),
                                        $color: $(".refPointer.design + div > div > aside:first-of-type + aside + aside + aside input[type=color]"),
                                        $opacity: $(".refPointer.design + div > div > aside:first-of-type + aside + aside + aside input[type=color] ~ input")
                                    },
                                    shadow: {
                                        $visible: $('#rsRefPointerChk3020-201f0'),
                                        $color: $(".refPointer.design + div > div > aside:last-of-type input[type=color]"),
                                        $ranges: $(".refPointer.design + div > div > aside:last-of-type input[type=range]"),
                                        $opacity: $(".refPointer.design + div > div > aside:last-of-type input[type=range]").eq(1)
                                    },
                                    defs: {
                                        $normal: $("#rsRefPMarkerPointer path, #rsRefPMarkerPointer2 path, #rsRefPMarkerCircle circle, #rsRefPMarkerRect rect"),
                                        $shadow: $("#rsRefPfMarkerPointer path, #rsRefPfMarkerPointer2 path, #rsRefPfMarkerCircle circle, #rsRefPfMarkerRect rect")
                                    }
                                },
                                $previewPolyline = $('polyline', designMode.UI.menu.$popupProperties),
                                $previewBezier = $previewPolyline.next(),
                                $markers = {
                                    pointer: $('#rsRefPMarkerPointer'),
                                    pointer2: $('#rsRefPMarkerPointer2'),
                                    circle: $('#rsRefPMarkerCircle'),
                                    square: $('#rsRefPMarkerRect')
                                },
                                $filter = $('#rsRefPMarkerFilter').children(),
                                $markersShadow = {
                                    pointer: $('#rsRefPfMarkerPointer'),
                                    pointer2: $('#rsRefPfMarkerPointer2'),
                                    circle: $('#rsRefPfMarkerCircle'),
                                    square: $('#rsRefPfMarkerRect')
                                };
                            $('header', designMode.UI.menu.$menu).
                                add($('header', designMode.UI.menu.$popupProperties)).
                                add($('> div > header:first-of-type', designMode.UI.menu.$generatedCode)).mousedown(function (e) {
                                designMode.UI.menu.dragInfo.dragging = true;
                                designMode.UI.menu.dragInfo.startX = e.pageX;
                                designMode.UI.menu.dragInfo.startY = e.pageY;
                                var pos = $(this).parent().position();
                                designMode.UI.menu.positionX = pos.left;
                                designMode.UI.menu.positionY = pos.top;
                            }).mousemove(function (e) {
                                if (designMode.UI.menu.dragInfo.dragging) {
                                    var parentStyle = this.parentElement.style;
                                    parentStyle.left = (e.pageX - designMode.UI.menu.dragInfo.startX + designMode.UI.menu.positionX) + 'px';
                                    parentStyle.top = (e.pageY - designMode.UI.menu.dragInfo.startY + designMode.UI.menu.positionY) + 'px';
                                }
                            }).mouseup(finishMenuDragging).mouseleave(finishMenuDragging);
                            $('a.disabled', designMode.UI.menu.$menu).click(function (e) {
                                e.preventDefault();
                            });

                            data.points.end.forEach(function (targetIdx, index) {
                                designMode.UI.menu.addArrowLink(index);
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
                                if (!$(this).hasClass('disabled')) {
                                    designMode.UI.addPoint();
                                }
                            });
                            $newLineLink.siblings('ul').next().click(function (e) {
                                e.preventDefault();
                                initModel();
                                data.currentOpts = $.extend(true, {}, opts);
                                designMode.UI.menu.$popupProperties.show();
                            });
                            $newLineLink.siblings('ul').next().next().next().click(function (e) {
                                e.preventDefault();
                                generateCode.show();
                            });
                            $('> div > header > a', designMode.UI.menu.$popupProperties).click(function (e) {
                                e.preventDefault();
                                designMode.UI.menu.$popupProperties.hide();
                                $.extend(opts, data.currentOpts);
                            });
                            $('button', designMode.UI.menu.$popupProperties).click(function (e) {
                                e.preventDefault();
                                designMode.UI.menu.$popupProperties.hide();
                                applyChanges();
                            });
                            $('ul button', designMode.UI.menu.$generatedCode).click(function (e) {
                                e.preventDefault();
                                generateCode.selectAll();
                            });
                            $('> div > header > a, > div > button', designMode.UI.menu.$generatedCode).click(function (e) {
                                e.preventDefault();
                                designMode.UI.menu.$generatedCode.hide();
                            });
                            // marker size
                            selector.marker.$size.on('input', function (e) {
                                opts.marker.size = + this.value;
                                var size, key;
                                for(key in $markers) {
                                    size = data.shapeRelSize.getSize(key);
                                    DOM.updateSvgAttrs($markers[key][0], DOM.markers.getMarkerAttrs(key, size));
                                    DOM.updateSvgAttrs($markers[key].children()[0], DOM.markers.getMarkerShapeData(key, size));
                                }
                                for(key in $markersShadow) {
                                    size = data.shapeRelSize.getSize(key);
                                    DOM.updateSvgAttrs($markersShadow[key][0], DOM.markers.getMarkerAttrs(key, size, true));
                                    DOM.updateSvgAttrs($markersShadow[key].children()[0], DOM.markers.getMarkerShapeData(key, size, true));
                                }
                                $(this).next('var').text(opts.marker.size);
                            });

                            // shapes click
                            selector.marker.shapes.$all.click(function (e) {
                                // index is used to select the shape (0 for start, 1 for mid, 2 for end)
                                var $this = $(this),
                                    index = $this.index() % 3,
                                    setAttrs = function($elems, $shapes, attr, shadow) {
                                        var markerId = [null, 'url(#rsRefPMarkerPointer)', 'url(#rsRefPMarkerPointer2)', 'url(#rsRefPMarkerCircle)', 'url(#rsRefPMarkerRect)'][$shapes.index($this)];
                                        if (markerId === null) {
                                            $elems.removeAttr(attr);
                                        } else {
                                            $elems.attr(attr, shadow ? markerId.replace(/RefPM/, 'RefPfM') : markerId);
                                        }
                                    },
                                    getShapeName = function($shapes) {
                                        return [null, 'pointer', 'pointer2', 'circle', 'square'][$shapes.index($this)];
                                    };
                                [selector.marker.shapes.$start, selector.marker.shapes.$mid, selector.marker.shapes.$end][index].removeAttr('class');
                                $this.attr('class', 'selected');
                                switch (index) {
                                    case 0:
                                        setAttrs($previewPolyline.eq(0).add($previewBezier.eq(0)), selector.marker.shapes.$start, 'marker-start', true);
                                        setAttrs($previewPolyline.eq(2).add($previewBezier.eq(2)), selector.marker.shapes.$start, 'marker-start');
                                        opts.marker.start = getShapeName(selector.marker.shapes.$start);
                                        break;
                                    case 1:
                                        setAttrs($previewPolyline.eq(0), selector.marker.shapes.$mid, 'marker-mid', true);
                                        setAttrs($previewPolyline.eq(2), selector.marker.shapes.$mid, 'marker-mid');
                                        opts.marker.mid = getShapeName(selector.marker.shapes.$mid);
                                        break;
                                    case 2:
                                        setAttrs($previewPolyline.eq(0).add($previewBezier.eq(0)), selector.marker.shapes.$end, 'marker-end', true);
                                        setAttrs($previewPolyline.eq(2).add($previewBezier.eq(2)), selector.marker.shapes.$end, 'marker-end');
                                        opts.marker.end = getShapeName(selector.marker.shapes.$end);
                                } 
                            });

                            // stroke size
                            selector.stroke.$size.on('input', function (e) {
                                opts.stroke.size = + this.value;
                                var $outlines = $previewPolyline.eq(1).add($previewBezier.eq(1));
                                $previewPolyline.add($previewBezier).not($outlines).attr('stroke-width', opts.stroke.size);
                                $outlines.attr('stroke-width', DOM.getStrokeWidthForOutlineArrow());
                                $(this).next('var').text(opts.stroke.size);
                            });

                            // stroke color and opacity
                            selector.stroke.$color.add(selector.stroke.$opacity).on('input', function() {
                                opts.stroke.color = getRgbaColor(selector.stroke.$color.val(), + selector.stroke.$opacity.val());
                                $previewPolyline.eq(2).add($previewBezier.eq(2)).attr('stroke', opts.stroke.color);
                                selector.defs.$normal.attr('fill', opts.stroke.color);
                            });
                            selector.stroke.$opacity.on('input', function() {
                                $(this).next('var').text(selector.stroke.$opacity.val());
                            });

                            // outline size
                            selector.outline.$size.on('input', function (e) {
                                opts.outline.size = + this.value;
                                var $outlines = $previewPolyline.eq(1).add($previewBezier.eq(1));
                                $outlines.attr('stroke-width', DOM.getStrokeWidthForOutlineArrow());
                                if (Math.abs(opts.outline.size) < 1e-5) {
                                    $outlines.hide();
                                } else {
                                    $outlines.show();
                                }
                                selector.defs.$normal.add(selector.defs.$shadow).attr('stroke-width', DOM.getStrokeWidthForShape());
                                $(this).next('var').text(opts.outline.size);
                            });

                            // outline color and opacity
                            selector.outline.$color.add(selector.outline.$opacity).on('input', function() {
                                opts.outline.color = getRgbaColor(selector.outline.$color.val(), + selector.outline.$opacity.val());
                                $previewPolyline.eq(1).add($previewBezier.eq(1)).attr('stroke', opts.outline.color);
                                selector.defs.$normal.attr('stroke', opts.outline.color);
                            });
                            selector.outline.$opacity.on('input', function() {
                                $(this).next('var').text(selector.outline.$opacity.val());
                            });

                            // shadow color and opacity
                            selector.shadow.$color.add(selector.shadow.$opacity).on('input', function() {
                                opts.shadow.color = getRgbaColor(selector.shadow.$color.val(), + selector.shadow.$opacity.val());
                                $previewPolyline.eq(0).add($previewBezier.eq(0)).attr('stroke', opts.shadow.color);
                                selector.defs.$shadow.attr({
                                    'stroke': opts.shadow.color,
                                    'fill': opts.shadow.color
                                });
                            });
                            selector.shadow.$opacity.on('input', function() {
                                $(this).next('var').text(selector.shadow.$opacity.val());
                            });

                            // shadow enabled
                            selector.shadow.$visible.change(function () {
                                $('span, var', '.refPointer.design + div > div > aside:last-of-type').css('color', this.checked ? '' : 'grey');
                                opts.shadow.visible = this.checked;
                                if (this.checked) {
                                    selector.shadow.$color.add(selector.shadow.$ranges).removeAttr('disabled');
                                    $previewPolyline.eq(0).add($previewBezier.eq(0)).show();
                                } else {
                                    selector.shadow.$color.add(selector.shadow.$ranges).attr('disabled', 'disabled');
                                    $previewPolyline.eq(0).add($previewBezier.eq(0)).hide();
                                }
                            });

                            // shadow X offset
                            selector.shadow.$ranges.eq(0).on('input', function() {
                                opts.shadow.offsetX = + this.value;
                                $previewPolyline.eq(0).attr('points', getPolylinePoints(true));
                                $previewBezier.eq(0).attr('d', getBezierPoints(true));
                                $(this).next('var').text(opts.shadow.offsetX === 0 ? 0 : ((opts.shadow.offsetX > 0 ? '+' : '') + opts.shadow.offsetX));
                            });

                            // shadow Y offset
                            selector.shadow.$ranges.eq(2).on('input', function() {
                                opts.shadow.offsetY = + this.value;
                                $previewPolyline.eq(0).attr('points', getPolylinePoints(true));
                                $previewBezier.eq(0).attr('d', getBezierPoints(true));
                                $(this).next('var').text(opts.shadow.offsetY === 0 ? 0 : ((opts.shadow.offsetY > 0 ? '+' : '') + opts.shadow.offsetY));
                            });

                            // shadow blur
                            selector.shadow.$ranges.eq(3).on('input', function() {
                                opts.shadow.blur = + this.value;
                                DOM.updateSvgAttrs($filter[0], {
                                    stdDeviation: opts.shadow.blur
                                });
                                $(this).next('var').text(opts.shadow.blur);
                            });

                            this.multipleTargets.$subMenu = $('menu', this.$menu).mouseenter(function () {
                                $newLinks.filter('.selecting').addClass('thisone');
                            }).mouseleave(function () {
                                if (!designMode.UI.menu.multipleTargets.firstMouseover) {
                                    designMode.UI.cancelVirtualArrow();
                                }
                                $newLinks.removeClass('selecting thisone');
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
                                    $newLinks.removeClass('selecting thisone');
                                    designMode.UI.menu.multipleTargets.hideMenu();
                                });
                                $('div', designMode.UI.menu.multipleTargets.$subMenu).append($a);
                            });
                        },
                        getArrowName: function (idx) {
                            switch (data.arrowTypes[idx]) {
                                case 'line': return 'Line';
                                case 'polyline': return 'Polyline';
                                case 'bezierC': return 'Cubic Bezier';
                                case 'bezierQ': return 'Quadratic Bezier';
                            }
                            return 'Arrow';
                        },
                        addArrowLink: function (idx) {
                            var $a = $('<a href="#" title="Delete arrow">&#x2715;</a>'),
                                $li = $('<li>').text(this.getArrowName(idx)).append($a);
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
                                $('ul li', this.menu.$menu).eq(arrowIdx).contents().first().replaceWith(this.menu.getArrowName(arrowIdx));
                                break;
                            case 'polyline':
                                DOM.polyline.addPoint(arrowIdx, midPoints, sets);
                                break;
                            case 'bezierQ':
                                DOM.bezier.Q.addPoint(arrowIdx, midPoints, sets);
                                DOM.$controlLinesSvgGroup.append(sets.controlLines);
                                break;
                            case 'bezierC':
                                DOM.bezier.C.addPoint(arrowIdx, midPoints, sets);
                                DOM.$controlLinesSvgGroup.append(sets.controlLines);
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
                                    if (data.points.mid[arrowInfo.arrow].length === 0) {
                                        $('ul li', this.menu.$menu).eq(arrowInfo.arrow).contents().first().replaceWith(this.menu.getArrowName(arrowInfo.arrow));
                                    }
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
                        data.points.end.push(targetIdx);
                        data.points.layout.fromOffset.push(data.points.getElementCenterPos());
                        data.points.layout.toOffset.push(data.points.getElementCenterPos(data.$targets.eq(targetIdx)));
                        data.points.layout.topLeft.push({ x: 0, y: 0 });
                        data.points.layout.size.push({ width: 0, height: 0 });
                        var lastArrowIdx = data.arrowTypes.length - 1;
                        DOM.createArrow(lastArrowIdx);
                        if (!virtual) {
                            this.addControlPointsAndLines(lastArrowIdx);
                        }
                    },
                    addControlPointsAndLines: function (idx) {
                        this.menu.addArrowLink(idx);
                        this.addStartEndControlPoints(data.points, idx);
                        this.addMidControlPointsAndLines(data.points, data.points.mid[idx], idx);
                        var $li = $('ul li', designMode.UI.menu.$menu);
                        if ($li.length === 1) {
                            $('> a:first-of-type + a + a + a', designMode.UI.menu.$menu).removeClass('disabled');
                        }
                        $li.eq($li.length - 1).click();
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
                    addVirtualArrow: function (type, targetIdx) {
                        this.doAddArrow(type, targetIdx, true);
                    },
                    changeVirtualArrow: function (targetIdx) {
                        var pts = data.points,
                            lastArrowIdx = data.arrowTypes.length - 1,
                            centerArrow = pts.getElementCenterPos(data.$targets.eq(targetIdx));
                        pts.end[lastArrowIdx] = targetIdx;
                        pts.layout.toOffset[lastArrowIdx].dx = centerArrow.dx;
                        pts.layout.toOffset[lastArrowIdx].dy = centerArrow.dy;
                        DOM.updateArrow(lastArrowIdx);
                    },
                    saveVirtualArrow: function () {
                        this.addControlPointsAndLines(data.arrowTypes.length - 1);
                    },
                    cancelVirtualArrow: function () {
                        this.deleteArrow(data.arrowTypes.length - 1, true);
                    },
                    addStartEndControlPoints: function (pts, index) {
                        var $startEndPoints = DOM.markers.getDesignModePoint(pts.start, index, index === 0, pts.layout.fromOffset).
                                                add(DOM.markers.getDesignModePoint(pts.allTargetPos[pts.end[index]], index, index === 0, pts.layout.toOffset));
                        designMode.UI.$points.push($startEndPoints);
                        DOM.$svg.append($startEndPoints);
                        DOM.bezier.controlLines.push([]);
                    },
                    addMidControlPointsAndLines: function (pts, midPnts, index) {
                        if (data.arrowTypes[index] === 'bezierQ' || data.arrowTypes[index] === 'bezierC') {
                            if (DOM.$controlLinesSvgGroup === null) {
                                DOM.$controlLinesSvgGroup = DOM.createSvgDom('g', { stroke: '#f7abab' }).insertAfter(designMode.UI.activeArrow.$backgroundArrowsRect);
                            }
                        }
                        var pnt, last = midPnts.length - 1, $controlLine;
                        for(pnt = 0; pnt <= last; ++pnt) {
                            // this assignment changes the data.points.mid values
                            midPnts[pnt] = pts.getMidPoint(midPnts[pnt], index);
                        }
                        for(pnt = 0; pnt <= last; ++pnt) {
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
                                            x2: pnt === last ? pts.allTargetPos[pts.end[index]].x + pts.layout.toOffset[index].dx : midPnts[pnt === 0 ? 0 : (isPrev ? pnt + 1 : pnt - 1)].x,
                                            y2: pnt === last ? pts.allTargetPos[pts.end[index]].y + pts.layout.toOffset[index].dy : midPnts[pnt === 0 ? 0 : (isPrev ? pnt + 1 : pnt - 1)].y
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
                                x2: pts.allTargetPos[pts.end[index]].x + pts.layout.toOffset[index].dx,
                                y2: pts.allTargetPos[pts.end[index]].y + pts.layout.toOffset[index].dy
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
                            designMode.UI.addStartEndControlPoints(pts, index);
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
                                    offset.dx = e.pageX - pts.allTargetPos[pts.end[designMode.UI.activeArrow.idx]].x;
                                    offset.dy = e.pageY - pts.allTargetPos[pts.end[designMode.UI.activeArrow.idx]].y; 
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
                    if (data.$targets.length === 0) {
                        alert('No targets found!\n\nThe jQuery call $("' + opts.targetSelector + '") returned zero objects.\nPlease change the targetSelector option.');
                    } else {
                        var $window = $(window),
                            $document = $(document),
                            docWidth = $document.width(),
                            docHeight = $document.height(),
                            doResize = function () {
                                DOM.$svg.add(designMode.UI.activeArrow.$backgroundArrowsRect).attr({
                                    'width': Math.max($window.width(), docWidth) + 'px',
                                    'height': Math.max($window.height(), docHeight) + 'px'
                                });
                                var pts = data.points;
                                if (pts.resizeTimeoutId) {
                                    clearTimeout(pts.resizeTimeoutId);
                                }
                                pts.resizeTimeoutId = setTimeout(function () {
                                    if (pts.refreshPositions(false, true)) {
                                        pts.end.forEach(function (targetIdx, arrowIdx) {
                                            designMode.UI.$points[arrowIdx].eq(0).attr({
                                                'cx': pts.start.x + pts.layout.fromOffset[arrowIdx].dx,
                                                'cy': pts.start.y + pts.layout.fromOffset[arrowIdx].dy
                                            }).end().eq(1).attr({
                                                'cx': pts.allTargetPos[targetIdx].x + pts.layout.toOffset[arrowIdx].dx,
                                                'cy': pts.allTargetPos[targetIdx].y + pts.layout.toOffset[arrowIdx].dy
                                            });
                                            switch (data.arrowTypes[arrowIdx]) {
                                                case 'bezierQ':
                                                case 'bezierC':
                                                    if (data.arrowTypes[arrowIdx] === 'bezierQ') {
                                                        DOM.bezier.Q.updateBezierEndControlLine(pts, arrowIdx);
                                                    } else {
                                                        DOM.bezier.C.updateBezierEndControlLine(pts, arrowIdx);
                                                    }
                                                    DOM.bezier.updateBezierStartControlLine(pts, arrowIdx);
                                            }
                                        });
                                    };
                                    pts.resizeTimeoutId = null;
                                }, 500);
                            };
                        DOM.$svg.css('pointer-events', '');
                        designMode.UI.activeArrow.$backgroundArrowsRect = DOM.createSvgDom('rect', {
                            x: 0,
                            y: 0
                        }).css({
                            fill: 'rgba(255,255,255,.65)',
                            'pointer-events': 'none'
                        }).appendTo(DOM.$svg);
                        $window.resize(doResize);
                        doResize();
                        this.UI.init();
                        events.onShow();
                    }
                }
            },
            applyChanges = function () {
                DOM.clean();
                var hadOutline = data.outline;
                data.outline = opts.outline.size && opts.outline.color !== 'transparent';
                var fromNoOutline_ToOutline = !hadOutline && data.outline,
                    attrs = {};
                DOM.$svg.prepend(DOM.markers.init());
                
                if (fromNoOutline_ToOutline || opts.shadow.visible) {
                    for(var index in DOM.arrows) {
                        DOM.createOrReplaceArrow(index, opts.shadow.visible, fromNoOutline_ToOutline, false);
                    }
                }

                ['start', 'mid', 'end'].forEach(function (e) { 
                    if (DOM.markers.ids[e]) {
                        attrs['marker-' + e] = 'url(#' + DOM.markers.ids[e] + ')';
                    }
                });
                attrs.stroke = opts.stroke.color;
                attrs['stroke-width'] = opts.stroke.size;
                for(var index in DOM.arrows) {
                    // had outline before. Now it hasn't
                    if (hadOutline && !data.outline) {
                        DOM.arrows[index].prev().remove();
                    } else {
                        // had outline before and still has
                        if (hadOutline && data.outline) {
                            DOM.arrows[index].prev().attr({
                                stroke: opts.outline.color,
                                'stroke-width': DOM.getStrokeWidthForOutlineArrow()
                            });
                        }
                    }
                    DOM.arrows[index].removeAttr('marker-start marker-mid marker-end').attr(attrs);
                }
            },
            generateCode = {
                selectAll: function () {
                    var codeBox = $('menu.refPointer.design + div + div code')[0],
                        range, selection;
                    if (document.body.createTextRange) {
                        range = document.body.createTextRange();
                        range.moveToElementText(codeBox);
                        range.select();
                    } else {
                        if (window.getSelection) {
                            selection = window.getSelection();
                            range = document.createRange();
                            range.selectNodeContents(codeBox);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    }
                },
                getCode: function () {
                    data.points.refreshPositions(true);
                    var allOpts = $.extend(true, {}, opts);
                    allOpts.arrows = [];
                    for(var index in data.arrowTypes) {
                        var arrowOpts = {
                            type: data.arrowTypes[index],
                            target: data.points.end[index],
                            offset: [
                                data.points.layout.fromOffset[index].dx,
                                data.points.layout.fromOffset[index].dy,
                                data.points.layout.toOffset[index].dx,
                                data.points.layout.toOffset[index].dy
                            ],
                            bounds: [
                                data.points.layout.topLeft[index].x,
                                data.points.layout.topLeft[index].y,
                                data.points.layout.size[index].width,
                                data.points.layout.size[index].height
                            ]
                        };
                        switch (data.arrowTypes[index]) {
                            case 'polyline':
                                arrowOpts.mid = [];
                                data.points.mid[index].forEach(function (pnt) {
                                    arrowOpts.mid.push(pnt.x, pnt.y);
                                });
                                break;
                            case 'bezierQ':
                                arrowOpts.mid = [];
                                data.points.mid[index].forEach(function (pnt, index) {
                                    if (index < 2 || index % 2 === 1) {
                                        arrowOpts.mid.push(pnt.x, pnt.y);
                                    }
                                });
                                break;
                            case 'bezierC':
                                arrowOpts.mid = [];
                                data.points.mid[index].forEach(function (pnt, index) {
                                    if (index < 3 || index % 3 !== 0) {
                                        arrowOpts.mid.push(pnt.x, pnt.y);
                                    }
                                });
                        }
                        allOpts.arrows.push(arrowOpts);
                    }
                    return JSON.stringify(allOpts, null, '\t').
                        // remove double quotes from keys
                        replace(/^(.*)"(.*)":/gm, '$1$2:').

                        // remove the new line between [ and {
                        replace(/\[\s*{/gm, '[{').
                        
                        // remove the new line between } and ] and also remove one indentation tab
                        replace(/^(\t*)\t}\s*\]/gm, '$1}]').
                        
                        // removes the new line between }, and {
                        replace(/^(\t*)},\s*{/gm, '$1}, {').

                        // removes new lines after each array element. This causes all the array to be on a single line
                        replace(/\[((\s|\w|\.|-|,|\n)*)\]/g, function(match, g1) { return '[' + g1.replace(/\s*/g, '') + ']'; } ).
                        
                        // insert the <pre> markup to emulate new lines inside the <code> element
                        replace(/{$/gm, '{</pre><pre>').
                        replace(/,$/gm, ',</pre><pre>').

                        // remove the first { and the last }
                        replace(/^{|}$/g, '');
                },
                show: function () {
                    var userPluginCall = callerFunction ? callerFunction.match(/^\s*\S*rsRefPointer/m) : null,
                        snippet = this.getCode();
                    if (userPluginCall) {
                        userPluginCall = userPluginCall[0].trim();
                    } else {
                        userPluginCall = '$yourObj.rsRefPointer';
                    }
                    $('code', designMode.UI.menu.$generatedCode).html(userPluginCall + '({' + snippet + '});');
                    designMode.UI.menu.$generatedCode.show();
                    generateCode.selectAll();
                }
            };
        DOM.$controlLinesSvgGroup = null;
        DOM.clean = function () {
            if (this.markers.$defs) {
                this.markers.$defs.remove();
            }
            if (this.$shadowGroup) {
                this.$shadowGroup.remove();
            }
            this.markers.$defs =
            this.markers.ids.start =
            this.markers.ids.mid =
            this.markers.ids.end =
            this.markers.ids.filter.shadow =
            this.markers.ids.filter.Start =
            this.markers.ids.filter.Mid =
            this.markers.ids.filter.End =
            this.$shadowGroup = null;
            this.arrowsShadow = [];
        };
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
                    r: 6,
                    style: 'fill:transparent; stroke:rgba(255,0,0,.3); stroke-width:' + (selected ? designMode.UI.activeArrow.strokeSelected : designMode.UI.activeArrow.strokeUnselected)
                }).append(DOM.createSvgDom('title').append('Double-click to delete this point'));
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
                var pts = data.points,
                    newPnt = { // new point is the average of the first and last points
                        x: (pts.start.x + pts.layout.fromOffset[arrowIdx].dx +
                            pts.allTargetPos[pts.end[arrowIdx]].x + pts.layout.toOffset[arrowIdx].dx)/2,
                        y: (pts.start.y + pts.layout.fromOffset[arrowIdx].dy +
                            pts.allTargetPos[pts.end[arrowIdx]].y + pts.layout.toOffset[arrowIdx].dy)/2
                    },
                    $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true);
                pts.mid[arrowIdx].push(newPnt);
                designMode.UI.$points[arrowIdx] = designMode.UI.$points[arrowIdx].add($controlPoint);
                sets.controlPoints = sets.controlPoints.add($controlPoint);
                data.arrowTypes[arrowIdx] = 'polyline';
                // This is no more a line, since a mid point was added. So, change the arrow from line to polyline
                DOM.replaceArrow(arrowIdx);
            }
        },
        DOM.polyline = {
            addPoint: function (arrowIdx, midPoints, sets) {
                var pts = data.points,
                    lastPntIdx = midPoints.length - 1,
                    newPnt = { // new point is the average of the last mid point with the last point
                        x: (midPoints[lastPntIdx].x + pts.allTargetPos[pts.end[arrowIdx]].x + pts.layout.toOffset[arrowIdx].dx)/2,
                        y: (midPoints[lastPntIdx].y + pts.allTargetPos[pts.end[arrowIdx]].y + pts.layout.toOffset[arrowIdx].dy)/2
                    },
                    $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true);
                pts.mid[arrowIdx].push(newPnt);
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
                var pts = data.points;
                pts.layout.fromOffset[arrowIdx].dx = pts.mid[arrowIdx][0].x - pts.start.x;
                pts.layout.fromOffset[arrowIdx].dy = pts.mid[arrowIdx][0].y - pts.start.y;
                pts.mid[arrowIdx].splice(0, 1);
                designMode.UI.$points[arrowIdx].eq(0).remove();
                var $newStartPoint = designMode.UI.$points[arrowIdx].eq(2).detach();
                designMode.UI.$points[arrowIdx].eq(1).before($newStartPoint);
                designMode.UI.$points[arrowIdx].splice(2, 1);
                designMode.UI.$points[arrowIdx] = $newStartPoint.add(designMode.UI.$points[arrowIdx].slice(1));
                if (data.arrowTypes[arrowIdx] === 'polyline' && pts.mid[arrowIdx].length === 0) {
                    data.arrowTypes[arrowIdx] = 'line';
                    // Removed the last mid point of a polyline. So now, change it to a line.
                    DOM.replaceArrow(arrowIdx);
                }
            },
            deleteEndPoint: function (arrowIdx) {
                var pts = data.points,
                    lastMid = pts.mid[arrowIdx].length - 1;
                pts.layout.toOffset[arrowIdx].dx = pts.mid[arrowIdx][lastMid].x - pts.allTargetPos[pts.end[arrowIdx]].x;
                pts.layout.toOffset[arrowIdx].dy = pts.mid[arrowIdx][lastMid].y - pts.allTargetPos[pts.end[arrowIdx]].y;
                pts.mid[arrowIdx].splice(lastMid, 1);
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
                        pts = data.points,
                        newBezierPoint = { // new bezier point is the average of the last mid point with the last point
                            x: (midPoints[lastPntIdx].x + pts.allTargetPos[pts.end[arrowIdx]].x + pts.layout.toOffset[arrowIdx].dx)/2,
                            y: (midPoints[lastPntIdx].y + pts.allTargetPos[pts.end[arrowIdx]].y + pts.layout.toOffset[arrowIdx].dy)/2
                        },
                        newControlPoint = {
                            x: 2*newBezierPoint.x - midPoints[lastPntIdx].x,
                            y: 2*newBezierPoint.y - midPoints[lastPntIdx].y
                        };
                    this.addPointAndControlLines(newBezierPoint, arrowIdx, sets);
                    this.addPointAndControlLines(newControlPoint, arrowIdx, sets);
                },
                addPointAndControlLines: function (newPnt, arrowIdx, sets) {
                    var pts = data.points,
                        $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true),
                        $controlLine = DOM.bezier.createControlLine({
                            x1: newPnt.x,
                            y1: newPnt.y,
                            x2: pts.allTargetPos[pts.end[arrowIdx]].x + pts.layout.toOffset[arrowIdx].dx,
                            y2: pts.allTargetPos[pts.end[arrowIdx]].y + pts.layout.toOffset[arrowIdx].dy
                        }, true);
                    pts.mid[arrowIdx].push(newPnt);
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
                    var pts = data.points;
                    switch (pointType) {
                        case 'start':
                            DOM.bezier.updateBezierStartControlLine(pts, arrowIdx);
                            break;
                        case 'mid':
                            if (midPointerIdx === 0) {
                                DOM.bezier.updateBezierStartControlLine(pts, arrowIdx);
                            } else {
                                DOM.bezier.controlLines[arrowIdx][midPointerIdx].attr({
                                    x1: pts.mid[arrowIdx][midPointerIdx - 1].x,
                                    y1: pts.mid[arrowIdx][midPointerIdx - 1].y,
                                    x2: pts.mid[arrowIdx][midPointerIdx].x,
                                    y2: pts.mid[arrowIdx][midPointerIdx].y
                                });
                            }
                            if (midPointerIdx === pts.mid[arrowIdx].length - 1) {
                                this.updateControlLines(arrowIdx, 'end');
                            } else {
                                DOM.bezier.controlLines[arrowIdx][midPointerIdx + 1].attr({
                                    x1: pts.mid[arrowIdx][midPointerIdx].x,
                                    y1: pts.mid[arrowIdx][midPointerIdx].y,
                                    x2: pts.mid[arrowIdx][midPointerIdx + 1].x,
                                    y2: pts.mid[arrowIdx][midPointerIdx + 1].y
                                });
                            }
                            break;
                        case 'end':
                            this.updateBezierEndControlLine(pts, arrowIdx);
                    }
                },
                updateBezierEndControlLine: function (pts, arrowIdx) {
                    var lastPointerIdx = pts.mid[arrowIdx].length - 1;
                    DOM.bezier.controlLines[arrowIdx][lastPointerIdx + 1].attr({
                        x1: pts.mid[arrowIdx][lastPointerIdx].x,
                        y1: pts.mid[arrowIdx][lastPointerIdx].y,
                        x2: pts.allTargetPos[pts.end[arrowIdx]].x + pts.layout.toOffset[arrowIdx].dx,
                        y2: pts.allTargetPos[pts.end[arrowIdx]].y + pts.layout.toOffset[arrowIdx].dy
                    });
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
                    var pts = data.points;
                    pts.layout.fromOffset[arrowIdx].dx = pts.mid[arrowIdx][1].x - pts.start.x;
                    pts.layout.fromOffset[arrowIdx].dy = pts.mid[arrowIdx][1].y - pts.start.y;
                    pts.mid[arrowIdx].splice(0, 2);
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
                    var pts = data.points;
                    pts.layout.toOffset[arrowIdx].dx = pts.mid[arrowIdx][lastMid - 1].x - pts.allTargetPos[pts.end[arrowIdx]].x;
                    pts.layout.toOffset[arrowIdx].dy = pts.mid[arrowIdx][lastMid - 1].y - pts.allTargetPos[pts.end[arrowIdx]].y;
                    pts.mid[arrowIdx].splice(lastMid - 1, 2);
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
                        pts = data.points,
                        endPoint = {
                            x: pts.allTargetPos[pts.end[arrowIdx]].x + pts.layout.toOffset[arrowIdx].dx,
                            y: pts.allTargetPos[pts.end[arrowIdx]].y + pts.layout.toOffset[arrowIdx].dy
                        },
                        newBezierPoint = { // new bezier point is the average of the last four points (two last control points + two last anchor points)
                            x: (midPoints[lastPntIdx].x +
                                midPoints[lastPntIdx - 1].x +
                                endPoint.x +
                                (lastPntIdx > 1 ? midPoints[lastPntIdx - 2].x : pts.start.x + pts.layout.fromOffset[arrowIdx].dx)
                                )/4,
                            y: (midPoints[lastPntIdx].y +
                                midPoints[lastPntIdx - 1].y +
                                endPoint.y +
                                (lastPntIdx > 1 ? midPoints[lastPntIdx - 2].y : pts.start.y + pts.layout.fromOffset[arrowIdx].dy)
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
                    var pts = data.points,
                        $controlPoint = DOM.markers.getDesignModePoint(newPnt, arrowIdx, true),
                        $controlLine = createLine ? DOM.bezier.createControlLine({
                            x1: newPnt.x,
                            y1: newPnt.y,
                            x2: lastMidPntIdx === null ? pts.allTargetPos[pts.end[arrowIdx]].x + pts.layout.toOffset[arrowIdx].dx : pts.mid[arrowIdx][lastMidPntIdx].x,
                            y2: lastMidPntIdx === null ? pts.allTargetPos[pts.end[arrowIdx]].y + pts.layout.toOffset[arrowIdx].dy : pts.mid[arrowIdx][lastMidPntIdx].y
                        }, true) : null;
                    pts.mid[arrowIdx].push(newPnt);
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
                    var pts = data.points;
                    switch (pointType) {
                        case 'start':
                            DOM.bezier.updateBezierStartControlLine(pts, arrowIdx);
                            break;
                        case 'mid':
                            if (midPointerIdx === 0) {
                                DOM.bezier.updateBezierStartControlLine(pts, arrowIdx);
                            } else {
                                DOM.bezier.controlLines[arrowIdx][Math.ceil(midPointerIdx/3*2)].attr({
                                    x1: pts.mid[arrowIdx][midPointerIdx].x,
                                    y1: pts.mid[arrowIdx][midPointerIdx].y,
                                    x2: pts.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 1 : -1)].x,
                                    y2: pts.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 1 : -1)].y
                                });
                            }
                            if (midPointerIdx === pts.mid[arrowIdx].length - 1) {
                                this.updateControlLines(arrowIdx, 'end');
                            } else {
                                DOM.bezier.controlLines[arrowIdx][Math.ceil(midPointerIdx/3*2) + (bezierCtwinPointIsAfter ? 1 : -1)].attr({
                                    x1: pts.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 2 : -2)].x,
                                    y1: pts.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 2 : -2)].y,
                                    x2: pts.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 1 : -1)].x,
                                    y2: pts.mid[arrowIdx][midPointerIdx + (bezierCtwinPointIsAfter ? 1 : -1)].y
                                });
                            }
                            break;
                        case 'end':
                            this.updateBezierEndControlLine(pts, arrowIdx);
                    }
                },
                updateBezierEndControlLine: function (pts, arrowIdx) {
                    var lastPointerIdx = pts.mid[arrowIdx].length - 1;
                    DOM.bezier.controlLines[arrowIdx][(lastPointerIdx + 2)/1.5 - 1].attr({
                        x1: pts.mid[arrowIdx][lastPointerIdx].x,
                        y1: pts.mid[arrowIdx][lastPointerIdx].y,
                        x2: pts.allTargetPos[pts.end[arrowIdx]].x + pts.layout.toOffset[arrowIdx].dx,
                        y2: pts.allTargetPos[pts.end[arrowIdx]].y + pts.layout.toOffset[arrowIdx].dy
                    });
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
                    var pts = data.points;
                    pts.layout.fromOffset[arrowIdx].dx = pts.mid[arrowIdx][2].x - pts.start.x;
                    pts.layout.fromOffset[arrowIdx].dy = pts.mid[arrowIdx][2].y - pts.start.y;
                    pts.mid[arrowIdx].splice(0, 3);
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
                    var pts = data.points;
                    pts.layout.toOffset[arrowIdx].dx = pts.mid[arrowIdx][lastMid - 2].x - pts.allTargetPos[pts.end[arrowIdx]].x;
                    pts.layout.toOffset[arrowIdx].dy = pts.mid[arrowIdx][lastMid - 2].y - pts.allTargetPos[pts.end[arrowIdx]].y;
                    pts.mid[arrowIdx].splice(lastMid - 2, 3);
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
            updateBezierStartControlLine: function (pts, arrowIdx) {
                this.controlLines[arrowIdx][0].attr({
                    x1: pts.start.x + pts.layout.fromOffset[arrowIdx].dx,
                    y1: pts.start.y + pts.layout.fromOffset[arrowIdx].dy,
                    x2: pts.mid[arrowIdx][0].x,
                    y2: pts.mid[arrowIdx][0].y
                });
            }
        };
        designMode.init();
    };

    $.fn.rsRefPointer.defaults = defaults;
})(jQuery);