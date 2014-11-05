var CANVAS_WIDTH = 600;
var CANVAS_HEIGHT = 800;
var CANVAS_LEFT = 450;
var CANVAS_TOP = 85;
var canvas = $('#sketch')[0];
var e = $.Event('mousemove');
var mouseOverEvent = document.createEvent("MouseEvents");
var mouseDownEvent = document.createEvent("MouseEvents");

var fireEvents = function(){
	var xOffset = Math.floor(Math.random() * CANVAS_WIDTH);
	var yOffset = Math.floor(Math.random() * CANVAS_HEIGHT);

	var xPoint = CANVAS_LEFT + xOffset;
	var yPoint = CANVAS_TOP + yOffset;

	mouseOverEvent.initMouseEvent("mouseover", 
	true, true, 
	window, null, 
	xPoint, yPoint, xPoint, yPoint,
	null, null, null, null, null, null);
	canvas.dispatchEvent(mouseOverEvent);

	e.pageX = xPoint;
	e.pageY = yPoint;
	$(window).trigger(e);

	mouseDownEvent.initMouseEvent("mousedown", true, true, 
	window, null, 
	xPoint, yPoint, xPoint, yPoint, 
	null, null, null, null, null, canvas);
	canvas.dispatchEvent(mouseDownEvent);
	//console.log(xPoint, yPoint);
	
};
var MAX_COUNT = 100;
var current_count = 0;
var benchmark = function(){
	current_count++;
	fireEvents();
	if(current_count <= MAX_COUNT)
		setTimeout(benchmark, 1000);
	else
		{
			clearTimeout(benchmark, 1000);
			console.log("Sequential : ");
			console.log(Processing.prototype.metrics);
		}
};
benchmark();





