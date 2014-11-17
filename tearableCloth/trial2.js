/*
Copyright (c) 2013 Suffick at Codepen (http://codepen.io/suffick) and GitHub (https://github.com/suffick)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// settings

var physics_accuracy = 3,
    mouse_influence = 20,
    mouse_cut = 5,
    gravity = 1200,
    cloth_height = 30,
    cloth_width = 50,
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
        py: 0
    };

var Point = function (x, y) {

    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.ax = 0;
    this.ay = 0;
    this.anchor = false;

    this.constraints = [];
    this.remove = false;
};

Point.prototype.simulate = function (delta) {
    if(this.anchor) return;
    this.fix_bounds();
    if (mouse.down) {

        var diff_x = this.x - mouse.x,
            diff_y = this.y - mouse.y,
            dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);

        if (mouse.button == 1) {

            if (dist < mouse_influence) {
                this.px = this.x - (mouse.x - mouse.px) * 1.8;
                this.py = this.y - (mouse.y - mouse.py) * 1.8;
            }

        } else if (dist < mouse_cut) {
            var i = this.constraints.length;
            while(i--) this.remove_constraint(this.constraints[i]);
        }
    }
    this.accelerate(0, gravity);
    deltaSquared = delta * delta;
    nx = this.x + ((this.x - this.px) * .99) + ((this.ax / 2) * deltaSquared);
    ny = this.y + ((this.y - this.py) * .99) + ((this.ay / 2) * deltaSquared);

    this.px = this.x;
    this.py = this.y;

    this.x = nx;
    this.y = ny;

    this.ay = this.ax = 0
};

Point.prototype.draw = function () {

    if (this.constraints.length <= 0) return;

    var i = this.constraints.length;
    while (i--) this.constraints[i].draw();
};

Point.prototype.resolve_constraints = function () {
    var i = this.constraints.length;
    while (i--) this.constraints[i].resolve();
};

Point.prototype.fix_bounds = function(){
    if (this.x > boundsx) {

        this.x = 2 * boundsx - this.x;
        
    } else if (this.x < 1) {

        this.x = 2 - this.x;
    }

    if (this.y > boundsy) {

        this.y = 2 * boundsy - this.y;
        
    } else if (this.y < 1) {

        this.y = 2 - this.y;
    }
};

Point.prototype.attach = function (point) {
    var c = new Constraint(this, point);
    this.constraints.push(c);
    return c;
};

Point.prototype.remove_constraint = function (lnk) {
    var i = this.constraints.length;
    while (i--)
        if (this.constraints[i] == lnk) this.constraints.splice(i, 1);
    lnk.remove = true;
};

Point.prototype.accelerate = function (x, y) {
    this.ax += x;
    this.ay += y;
};

var Constraint = function (p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = spacing;
    this.remove = false;
};

Point.prototype.move =  function(dx, dy){
    if(this.anchor) return;
    this.x += dx;
    this.y += dy;
};
    
Constraint.prototype.resolve = function () {

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

Constraint.prototype.draw = function () {

    ctx.moveTo(this.p1.x, this.p1.y);
    ctx.lineTo(this.p2.x, this.p2.y);
};

var Cloth = function () {

    this.points = [];
    this.constraints_list = [];

    var start_x = canvas.width / 2 - cloth_width * spacing / 2;

    for (var y = 0; y <= cloth_height; y++) {

        for (var x = 0; x <= cloth_width; x++) {

            var p = new Point(start_x + x * spacing, start_y + y * spacing);
            p.anchor = (y == 0);

            x != 0 && this.attach(p, this.points[this.points.length - 1]);
            y != 0 && this.attach(p, this.points[x + (y - 1) * (cloth_width + 1)])

            this.points.push(p);
        }
    }
    console.log(this.constraints_list.length);
};

Cloth.prototype.attach = function(p1, p2){
    var constraint = p1.attach(p2);
    this.constraints_list.push(constraint);
};

Cloth.prototype.update = function () {

    var i = physics_accuracy;

    while (i--) {
        var p = this.points.length;
        while (p--) this.points[p].resolve_constraints();
        this.recomputeConstraints();
    }

    p = this.points.length;
    while(p--){
        var pt = this.points[p];
        pt.simulate(delta_time);
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

Cloth.prototype.drawPoints = function(){
    var i = cloth.points.length;
    while(i--) cloth.points[i].draw();
}

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