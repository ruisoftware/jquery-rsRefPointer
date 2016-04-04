#jquery-rsRefPointer
Ease the navigation on your pages, through the use of visual relationships (arrows) between page elements.

This might be usefull in situations where there is a need to show to the user relationships between content that are related.

#Key Features
 - Arrows makes a visual connection from a start element to an end element, even when the position/size of these elements change.
 - Non intrusive. The arrows are hidden by default and only are shown when the mouse overs the start element (or on focus for mobile devices). Alternatively they can be always visible;
 - Shapes available: Line, Polyline, Quadratic Bezier curves and Cubic Bezier curves;
 - Powerfull design-time mode that provides a Photoshop alike GUI. The tool generates JS code with all the parameters filled for you;
 - Small footprint, excluding the design-time mode file, that should never be used in production anyway.
 
#Table of Contents
- [jquery-rsRefPointer](#jquery-rsrefpointer)
- [Key Features](#key-features)
- [Installation and Usage](#installation-and-usage)
- [Design-time mode](#design-time-mode)

**[Back to top](#table-of-contents)**

##Installation and Usage

You can install from [npm](https://www.npmjs.com/):
````bash
npm install jquery-rsRefPointer --save
````
or directly from git:
````javascript
<script src="http://rawgit.com/ruisoftware/jquery-rsrefPointer/master/jquery.rsRefPointer.js"></script>
````
or you downlowd the Zip archive from github, clone or fork this repository and include `jquery.rsRefPointer.js` from your local machine.

You also need to download jQuery. In the example below, jQuery is downloaded from Google cdn.
````javascript
<!doctype html>
<html>
<head>
  <title>jquery-rsRefPointer plug-in</title>
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
  <script src="http://rawgit.com/ruisoftware/jquery-rsrefPointer/master/jquery.rsRefPointer.js"></script>
  <script>
    $(document).ready(function () {
      $('.source').rsRefPointer();
    });
  </script>
  
  <style>
    .source {
      background-color: cyan;
    }
  </style>
</head>
<body>
  Mouse over <span class="source">here</span> to see two arrows pointing to <span class="target">[this target]</span> and this image
  <img width="400" height="200" class="target" src="http://lorempixel.com/400/200/sports">
  <p>Shrink your browser width to cause a line break on the image.<br>Watch how the arrow follows the target new location.</p>
<body>
</html>
`````
You can check it out [here](http://codepen.io/ruisoftware/pen/qZVadX "on CodePen") on CodePen.<br>
In this example, you can see two arrows, one for each `.target` element. Because there is one `.source` element, only one instance of the plug-in is binded to the `.source` element.<br>
If there was three `.source` elements and two `.target` elements, then three instances of the plug-in would be created (one for each `.source`) and each instance would show 2 arrows. You can test this, by adding more `.source` elements in the CodePen link.
