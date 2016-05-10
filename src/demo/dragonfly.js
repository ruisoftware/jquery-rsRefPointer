/*global $ */
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
                [59,9,113,134],
                [0.5,0.5,0.27,0.49]
            ],
            from: [139,345],
            to: [380,250]
        }, {
            type: "line",
            target: 0,
            sourceRelativeOffset: false,
            targetRelativeOffset: false,
            offset: [
                [59,9,303,134],
                [0.5,0.5,0.73,0.49]
            ],
            from: [139,345],
            to: [570,250]
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
                [59,9,250,119],
                [0.5,0.5,0.6,0.43]
            ],
            from: [139,366],
            mid: [534,385],
            to: [517,235]
        }, {
            type: "bezierQ",
            target: 0,
            sourceRelativeOffset: false,
            targetRelativeOffset: false,
            offset: [
                [59,9,186,115],
                [0.5,0.5,0.45,0.42]
            ],
            from: [139,366],
            mid: [269,247],
            to: [453,231]
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
                [59,9,212,208],
                [0.5,0.5,0.51,0.75]
            ],
            from: [139,387],
            mid: [153,439,516,408],
            to: [479,324]
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
                [180,60,-6,60],
                [1,0.5,0,0.5]
            ],
            from: [260,520],
            to: [321,520]
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
                [174,60,-12,60],
                [1,0.5,0,0.5]
            ],
            from: [501,520],
            to: [560,520]
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
                [188,60,1,60],
                [1,0.5,0,0.5]
            ],
            from: [759,520],
            to: [821,520]
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
                [181,60,20,56],
                [1,0.5,0,0.5]
            ],
            from: [1000,520],
            to: [100,680]
        }]
    });
    $taxonomy.rsRefPointer('show'); // call the show method
});
