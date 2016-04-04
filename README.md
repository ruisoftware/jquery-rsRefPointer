#jquery-rsRefPointer
Ease the navigation on your pages, through the use of visual relationships (arrows) between page elements.

Can be usefull to help the user cross-reference content that might not be noticeable at first sight.

#Key Features
 - Arrows makes a visual connection from a start element to an end element, even when the position/size of these elements change.
 - Non intrusive. The arrows are hidden by default and only appear when the mouse overs the start element (or when the start element receives focus for mobile devices). Alternatively they can be always visible;
 - Shapes available: Line, Polyline, Quadratic Bezier curves and Cubic Bezier curves;
 - Powerfull design-time mode that provides a Photoshop alike GUI. The tool generates JS code with all the parameters filled for you;
 - Small footprint, excluding the design-time mode file, that should never be used in production anyway.
 
#Table of Contents
- [jquery-rsRefPointer](#jquery-rsrefpointer)
- [Key Features](#key-features)
- [Installation and Usage](#installation-and-usage)
- [Design-time mode](#design-time-mode)

**[Back to top](#table-of-contents)**

#Installation and Usage

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

#Design-time mode
This mode is nothing more than a tool to help you configure the arrows the way you wish.<br>
The workflow is:
 1. Enter Design-time mode
 2. Edit your arrows
 3. Generate code and copy it
 4. Paste the new code into your page
 5. Exit Design-time mode

### Enter Design-time mode
Add the `jquery.rsRefPointer-design.js` script **after** the `jquery.rsRefPointer.js` script:
````javascript
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
  <script src="http://rawgit.com/ruisoftware/jquery-rsrefPointer/master/jquery.rsRefPointer.js"></script>
  <script src="http://rawgit.com/ruisoftware/jquery-rsrefPointer/master/jquery.rsRefPointer-design.js"></script>
````
Save your html and refresh your page.<br>
Now, you have entered Design-time mode. [Sample](http://codepen.io/ruisoftware/pen/wGPzjw "on CodePen") on CodePen.

### Edit your arrows
You can add new arrows, add middle points to the selected arrow, delete arrows or points and drag points to new positions.<br>
You might change several arrow style properties, as well.<br>
![screen shot 2016-04-05 at 01 00 20](https://cloud.githubusercontent.com/assets/428736/14265099/dafed496-fac9-11e5-846b-3e8c7182c46e.png)

### Generate code and copy it
When you are done, click on "Generate Code", click on "Select all" and copy it.
![screen shot 2016-04-05 at 01 03 47](https://cloud.githubusercontent.com/assets/428736/14265470/4bf964cc-faca-11e5-81b2-6d4201d7cb6d.png)

### Paste the new code into your page
Back to your editor, replace your old code<br>
![screen shot 2016-04-05 at 01 31 43](https://cloud.githubusercontent.com/assets/428736/14266063/45cd56d6-face-11e5-82c7-04424ab77116.png)
<br>with the new one<br>
![screen shot 2016-04-05 at 01 05 57](https://cloud.githubusercontent.com/assets/428736/14265527/a2520cca-faca-11e5-97c5-a73e640159a0.png)

### Exit Design-time mode
Remove the `jquery.rsRefPointer-design.js` script.
````javascript
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
  <script src="http://rawgit.com/ruisoftware/jquery-rsrefPointer/master/jquery.rsRefPointer.js"></script>
````
Refresh your page. Design-time is gone and now you have your fancy arrows running.<br>[Check it out here](http://codepen.io/ruisoftware/pen/mPqORy "on CodePen")

As you can see, design-time is a temporary tool that should be used to fecth the correct parameters.<br>
It is not intended to be deployed into production.
