var Node = function(i){
	this.val = i;
	this.outgoing = [];
};

var Edge = function(from, to){
	this.from = from;
	this.to = to;
	this.weight = 1;
};

Node.prototype.linkTo = function(node){
	var edge = new Edge(this, node);
	this.outgoing.push(edge);
	return edge;
};

Node.prototype.computeCost = function(){
	var i = this.outgoing.length;
	var cost = 0;
	while(i--) cost += this.outgoing[i].weight;
	this.cost = cost;
};

Node.prototype.removeEdge = function(edge){
	edge.remove = true;
	var l = this.outgoing.length;
	while(l--) 
		if(this.outgoing[l] == edge) this.outgoing.splice(l, 1);
};

Node.prototype.alterEdges = function(){
	if(this.val %2 == 0){
		var l = this.outgoing.length;
		while(l--) this.removeEdge(this.outgoing[l]);
	}
};


var Graph = function(N){
	var i = 1;
	this.nodes = [];
	this.edges = [];

	console.log("init");
	while(i++ && i <= N){
	 	var node = new Node(i);
	 	if(i > 0){
	 		this.link(node, node[node.length - 1]);
	 	}
	 	if(i > 1){
	 		this.link(node, node[node.length - 2]);
	 	}
	 	this.nodes.push(node);
	}
	console.log("Init");
};

Graph.prototype.link = function(n1, n2){
	var edge = n1.linkTo(n2);
	this.edges.push(edge);
};

Graph.prototype.computeCost = function(){
	console.log("costs");
	console.log(this.nodes.length);
	this.nodes.mapPar(function(node){
		node.computeCost();
	});

	console.log("costs ready");

	this.nodes.mapPar(function(node){
		node.alterEdges();
	});
	console.log("edges pruned");
	var l = this.edges.length;
	while(l--) if(this.edges[l].remove) this.edges.splice(l, 1);
	console.log("Rest");
	
};

var g = new Graph(1000);
g.computeCost();