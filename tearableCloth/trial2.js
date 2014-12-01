var T = TypedObject;
var physics_accuracy = 3,
    mouse_influence = 20,
    mouse_cut = 5,
    gravity = 1200,
    cloth_height = 40,
    cloth_width = 60,
    start_y = 20,
    spacing = 7,
    tear_distance = 60,
    delta_time = .016;


window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
};

var canvas,
    ctx,
    cloth,
    boundsx,
    boundsy,
    mouse = {
        down: false,
        button: 1,
        x: 0,
        y: 0,
        px: 0,
        py: 0,
    };

var TPoint = new T.StructType({
    x : T.float32,
    y : T.float32,
    px : T.float32,
    py : T.float32,
    ax : T.float32,
    ay : T.float32,
    anchor : T.int8, //subsitute for a boolean type :-(
    
    constraints : new T.ArrayType(T.Object, 2)
});


var Point = function (x, y) {

    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.ax = 0;
    this.ay = 0;
    this.anchor = false;

    this.constraints = [];
};

TPoint.prototype.simulate = function (options) {
    this.fix_bounds(boundsx, boundsy);
    if(this.anchor) return;

    if (options.mouse_down) {

        var diff_x = this.x - options.mouse_x,
            diff_y = this.y - options.mouse_y,
            dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);

        if (options.mouse_button == 1) {

            if (dist < options.mouse_influence) {
                this.px = this.x - (options.mouse_x - options.mouse_px) * 1.8;
                this.py = this.y - (options.mouse_y - options.mouse_py) * 1.8;
            }

        } else if (dist < options.mouse_cut) {
            var i = this.constraints.length;
            while(i--) this.remove_constraint(this.constraints[i]);
        }
    }
    this.accelerate(0, options.gravity);
    deltaSquared = options.delta * options.delta;
    nx = this.x + ((this.x - this.px) * .99) + ((this.ax / 2) * deltaSquared);
    ny = this.y + ((this.y - this.py) * .99) + ((this.ay / 2) * deltaSquared);

    this.px = this.x;
    this.py = this.y;

    this.x = nx;
    this.y = ny;

    this.ay = this.ax = 0;
};

TPoint.prototype.draw = function () {

    if (this.constraints.length <= 0) return;

    var i = this.constraints.length;
    while (i--) this.constraints[i].draw();
};

TPoint.prototype.resolve_constraints = function () {
    var i = this.constraints.length;
    while (i--) this.constraints[i].resolve();
};

TPoint.prototype.fix_bounds = function(bx, by){
    if(this.anchor) return;
    if (this.x > bx) {
        this.x = 2 * bx - this.x;
    } else if (this.x < 1) {
        this.x = 2 - this.x;
    }

    if (this.y > by) {
        this.y = 2 * by - this.y;
    } else if (this.y < 1) {
        this.y = 2 - this.y;
    }
};

TPoint.prototype.attach = function (point) {
    var c = new Constraint(this, point);
    this.constraints.push(c);
    return c;
};

TPoint.prototype.remove_constraint = function (lnk) {
    var i = this.constraints.length;
    while (i--)
        if (this.constraints[i] == lnk) this.constraints.splice(i, 1);
    lnk.remove = true;
};

TPoint.prototype.accelerate = function (x, y) {
    this.ax += x;
    this.ay += y;
};

var TConstraint = new T.StructType({
    p1 : T.Object,
    p2 : T.Object,
    length : T.int32,
    remove : T.int8
});

var Constraint = function (p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = spacing;
    this.remove = false;
};

TPoint.prototype.move =  function(dx, dy){
    if(this.anchor) return;
    this.x += dx;
    this.y += dy;
};
    
TConstraint.prototype.resolve = function () {

    var diff_x = this.p1.x - this.p2.x,
        diff_y = this.p1.y - this.p2.y,
        dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y),
        diff = (this.length - dist) / dist;

    if (dist > tear_distance) {
        this.p1.remove_constraint(this);
    }

    var px = diff_x * diff * 0.5;
    var py = diff_y * diff * 0.5;

    this.p1.move(px, py);
    this.p2.move(-px, -py);
};

TConstraint.prototype.draw = function () {
    ctx.moveTo(this.p1.x, this.p1.y);
    ctx.lineTo(this.p2.x, this.p2.y);
};


var slice = function(arr, count){
    var slice_length = Math.floor(arr.length / (count));
    var slices = [];
    for(var i=1; i<=count-1 ; i++){
        var array_slice = arr.slice((i-1) * slice_length, i * slice_length);
        slices.push(array_slice);
    }
    slices.push(arr.slice((i-1) * slice_length, arr.length));
    return slices;
};

TPoint.prototype.init = function(x, y){
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
};

var size = (cloth_height + 1) * (cloth_width + 1);
var PointArray = new T.ArrayType(TPoint, size);
var constraintLength = 2*cloth_width*cloth_height + cloth_width + cloth_height;
var ConstraintArray = new T.ArrayType(TConstraint, constraintLength);

var Cloth = function () {

    this.points = new PointArray();
    this.constraints_list = new ConstraintArray;

    var start_x = canvas.width / 2 - cloth_width * spacing / 2;

    for(var i=0 ; i<size; i++){
        var y = i % (cloth_height+1);
        var x = i-(y * (cloth_height + 1));

        var p = this.points[i];
        p.init(start_x + x*spacing, start_y + y*spacing);
        
        x != 0 && this.attach(p, this.points[this.points.length - 1]);
        y != 0 && this.attach(p, this.points[x + (y - 1) * (cloth_width + 1)]);
    }

    debugger;
    this.slices = slice(this.points, 10);
};

Cloth.prototype.attach = function(p1, p2){
    var constraint = p1.attach(p2);
    this.constraints_list.push(constraint);
};

Cloth.prototype.update = function () {

    var i = physics_accuracy;

    while (i--) {
        var c = this.constraints_list.length;
        while (c--) this.constraints_list[c].resolve();
        this.recomputeConstraints();
    }
    var options = {
        mouse_down : mouse.down,
        mouse_influence : mouse_influence,
        mouse_button : mouse.button,
        mouse_x : mouse.x,
        mouse_y : mouse.y,
        mouse_px : mouse.px,
        mouse_py : mouse.py,
        mouse_cut : mouse_cut,
        gravity : gravity,
        delta : delta_time
    };
    
    for(var i=0; i<this.slices.length; i++){
        var slice = this.slices[i];
        console.log("A2");
        slice.mapPar(function(pt){
            pt.simulate(options);
        });
        console.log("B2");
    }
    this.recomputeConstraints();
};

Cloth.prototype.recomputeConstraints = function(){
    var new_constraints_list = [];
    var c = this.constraints_list.length;
    while(c--){
        var constraint = this.constraints_list[c];
        if(!constraint.remove) new_constraints_list.push(constraint);
    }
    this.constraints_list = new_constraints_list;
};

Cloth.prototype.drawConstraints = function(){
    var i = cloth.constraints_list.length;
    while (i--) cloth.constraints_list[i].draw();
}

Cloth.prototype.draw = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    cloth.drawConstraints();
    ctx.stroke();
};

function simulateNextTime() {
    cloth.update();
    cloth.draw();
    requestAnimFrame(simulateNextTime);
}
var initMouseEvents = function(){
     canvas.onmousedown = function (e) {
        mouse.button = e.which;
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left,
        mouse.y = e.clientY - rect.top,
        mouse.down = true;
        e.preventDefault();
    };

    canvas.onmouseup = function (e) {
        mouse.down = false;
        e.preventDefault();
    };

    canvas.onmousemove = function (e) {
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left,
        mouse.y = e.clientY - rect.top,
        e.preventDefault();
    };

    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
};

var initCanvas = function(){
    boundsx = canvas.width - 1;
    boundsy = canvas.height - 1;
    ctx.strokeStyle = '#888';    
};

function init() {

   initMouseEvents();
   initCanvas();
    cloth = new Cloth();
    simulateNextTime();
}

window.onload = function () {

    canvas = document.getElementById('c');
    ctx = canvas.getContext('2d');

    canvas.width = 560;
    canvas.height = 350;

    init();
};