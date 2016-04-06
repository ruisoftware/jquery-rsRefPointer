$(document).ready(function () {

    var $from = $('aside ol li'); // $from is jQuery Object containing 3 elements
    // I could call $from.rsRefPointer(...) to create 3 instances,
    // but because they have different parameters, I need to invoke each one separately

    // As I said, they have different parameters, but the targetSelector, marker and stroke are the same for all of them.
    // I can redefine the defaults to use that subset of common parameters.
    // This way, we avoid repeating these common parameters for each .rsRefPointer() invocation.
    $.extend(true, $.fn.rsRefPointer.defaults, {
        targetSelector: "img",
        marker: {
            start: null,
            end: "circle"
        },
        stroke: {
            color: "#0080ff",
            size: 3
        }
    });

    // Compound eyes
    $from.eq(0).rsRefPointer({
        arrows: [{
            type: "line",
            target: 0,
            sourceRelativeOffset: false,
            targetRelativeOffset: false,
            offset: [
                [59.31,9,118.375,128.125],
                [0.5,0.5,0.29,0.46]
            ]
        }, {
            type: "line",
            target: 0,
            sourceRelativeOffset: false,
            targetRelativeOffset: false,
            offset: [
                [59.31,9,302.375,137.125],
                [0.5,0.5,0.73,0.5]
            ]
        }]
    });

    // Frons
    $from.eq(1).rsRefPointer({
        arrows: [{
            type: "bezierQ",
            target: 0,
            sourceRelativeOffset: false,
            targetRelativeOffset: false,
            offset: [
                [59.31,9,192.375,124.125],
                [0.5,0.5,0.46,0.45]
            ],
            mid: [0.52,0.89]
        }, {
            type: "bezierQ",
            target: 0,
            sourceRelativeOffset: false,
            targetRelativeOffset: false,
            offset: [
                [59.31,9,247.375,123.125],
                [0.5,0.5,0.6,0.45]
            ],
            mid: [0.84,-0.05]
        }]
    });

    // Labium
    $from.eq(2).rsRefPointer({
        arrows: [{
            type: "bezierC",
            target: 0,
            sourceRelativeOffset: false,
            targetRelativeOffset: false,
            offset: [
                [59.31,9,211.375,209.125],
                [0.5,0.5,0.51,0.76]
            ],
            mid: [0.06,-0.67,1.08,-0.03]
        }]
    });


    var $taxonomy = $("#taxonomy li");
    $.extend(true, $.fn.rsRefPointer.defaults, {
        mouseHover: {
            show: false
        },
        marker: {
            start: "circle",
            end: "pointer2"
        }
    });

    $taxonomy.eq(0).rsRefPointer({
        targetSelector: "#taxonomy li:eq(1)",
        arrows: [{
            type: "line",
            target: 0,
            sourceRelativeOffset: true,
            targetRelativeOffset: true,
            offset: [
                [160,48.125,8.703125,48.125],
                [0.95,0.5,0.05,0.5]
            ]
        }]
    });
    $taxonomy.eq(1).rsRefPointer({
        targetSelector: "#taxonomy li:eq(2)",
        arrows: [{
            type: "line",
            target: 0,
            sourceRelativeOffset: true,
            targetRelativeOffset: true,
            offset: [
                [168.703125,48.125,8.703125,48.125],
                [0.95,0.5,0.05,0.5]
            ]
        }]
    });

    $taxonomy.eq(2).rsRefPointer({
        targetSelector: "#taxonomy li:eq(3)",
        arrows: [{
            type: "line",
            target: 0,
            sourceRelativeOffset: true,
            targetRelativeOffset: true,
            offset: [
                [186,48.125,18,54.125],
                [0.95,0.5,0.05,0.5]
            ]
        }]
    });


    $taxonomy.eq(3).rsRefPointer({
        targetSelector: "#taxonomy li:eq(4)",
        arrows: [{
            type: "line",
            target: 0,
            sourceRelativeOffset: true,
            targetRelativeOffset: true,
            offset: [
                [249.9375,51.125,8.25,49.125],
                [0.95,0.5,0.05,0.5]
            ]
        }]
    });
    $taxonomy.rsRefPointer('show'); // call the show method
});
