/* author: mako yass */
"strict mode";

//depends combinatorics.js

function getNthFromGenerator(generator, n){
	if(generator.nth){
		return generator.nth(n)
	}else{
		for(var i=0; i<n-1; ++i){ generator.next() }
		return generator.next()
	}
}
function fillArray(el, n){
	var ret = []
	for(var i=0; i<n; ++i){
		ret.push(el)
	}
	return ret
}
function numberRange(lb, ub){ // numberRange(1,4) == [1,2,3]
	var ret = []
	while(lb < ub){
		ret.push(lb)
		++lb
	}
	return ret
}

/*
class Branch
	generate: (i)=> Specimen
	count:()=> number
*/
function BranchOfBranches(branches){
	this.branches = branches
	this.sumCount = 0
	for(var i=0; i<branches.length; ++i){
		this.sumCount += branches[i].count()
	}
}
BranchOfBranches.prototype = {
	generate: function(ind){
		var prog = ind
		var innerResult = null
		var i=0
		while(i<this.branches.length){
			var tc = this.branches[i].count()
			if(tc > prog){
				innerResult = this.branches[i].generate(prog)
				break
			}else{
				prog -= tc
			}
			++i
		}
		return {
			chosenBranch: i,
			res: innerResult
		}
	},
	count: function(){ return this.sumCount }
}
function branchOfBranches(){ return new BranchOfBranches(arguments) }

// function ChooseGenerator(ary, nelem){
// 	this.ary = ary
// 	this.nelem = nelem
// }
// ChooseGenerator.prototype = {
// 	generate: function(i){ return getNthFromGenerator(Combinatorics.combination(this.ary, this.nelem), i) },
// 	count: function(){ return Combinatorics.combination(this.ary, this.nelem).length }
// }
// function chooseGenerator(ary, nelem){ return new ChooseGenerator(ary, nelem) }

function MappingOfGenerator(generator, mapFunction){
	this.generator = generator; this.mapFunction = mapFunction
}
MappingOfGenerator.prototype = {
	generate: function(ind){
		return this.mapFunction(this.generator.generate(ind))
	},
	count: function(){ return this.generator.count() }
}
function mapGenerator(generator, mapFunction){ return new MappingOfGenerator(generator, mapFunction) }

function CombinedGenerators(generatorMap){
	this.generators = Object.keys(generatorMap).map(function(k){ return [k, generatorMap[k]] })
	this.totalSize = this.generators.reduce(function(t, gp){ return t * gp[1].count() }, 1)
}
CombinedGenerators.prototype = {
	generate: function(ind){
		var out = {}
		var divisors = [1]
		for(var i=1; i<this.generators.length; ++i){
			divisors.push(this.generators[i-1][1].count()*divisors[divisors.length-1])
		}
		this.generators.forEach(function(g, i){
			out[g[0]] = g[1].generate(Math.floor(ind/divisors[i])%g[1].count())
		})
		return out
	},
	count: function(){ return this.totalSize }
}
function combinedGenerators(generatorMap){ return new CombinedGenerators(generatorMap) }

function RepeatedGenerator(generator, n){
	this.generator = generator
	this.n = n
}
RepeatedGenerator.prototype = {
	generate: function(ind){
		var gn = this.generator.count()
		var ret = []
		for(var i=0; i<this.n; ++i){ //for each digit
			var pow = Math.pow(gn, i)
			var digit = Math.floor((ind/pow)%gn)
			ret.push(this.generator.generate(digit))
		}
		return ret
	},
	count: function(){ return Math.pow(this.generator.count(), this.n) }
};
function repeatedGenerator(generator, repetitions){
	return new RepeatedGenerator(generator, repetitions)
}

//generates one of the items in the arr
function GeneratorFromArr(arr){
	this.arr = arr
}
GeneratorFromArr.prototype = {
	generate:function(i){ return this.arr[i] },
	count:function(){ return this.arr.length }
}
function generatorFromArr(arr){ return new GeneratorFromArr(arr) }

//generates just one thing
function OneNoteGenerator(note){
	this.note = note
}
OneNoteGenerator.prototype = {
	generate:function(i){ return this.note },
	count:function(){ return 1 }
}
function oneNoteGenerator(note){ return new OneNoteGenerator(note) }

//generates numbers [lb... ub-1]
function NumberRangeGenerator(lb, ub){
	this.lb = lb
	this.ub = ub
}
NumberRangeGenerator.prototype = {
	generate:function(i){ return this.lb + i },
	count:function(){ return this.ub - this.lb }
}
function numberRangeGenerator(lb,ub){ return new NumberRangeGenerator(lb,ub) }

function randomSpecimen(generator){ return generator.generate(Math.floor(Math.random()*generator.count())) }


function branchForPoints(nPoints){
	return combinedGenerators({
		lineThicknesses: repeatedGenerator(
			generatorFromArr(['noconnection', 'thinline', 'thickline', 'thickarc']),
			nPoints ),
		holePositions: branchOfBranches(
			oneNoteGenerator([]), //0 holes
			mapGenerator(numberRangeGenerator(0,nPoints), function(p){return [p] }) //1 hole
		)
	})
}
function xinGenerator(){ return branchOfBranches(
	branchForPoints(4),
	branchForPoints(3),
	branchForPoints(3)
)}


// permutationTree.count()
// >2684 or something

// permutationTree.generate(0) //generate the first icon
// >{
// >	chosenBranch:0
// >	res:{
// >		lineThicknesses:['noconnection', 'noconnection', 'noconnection'],
// >		holePositions:{chosenBranch:0, res:[]}
// >	}
// >}

// permutationTree.generate(345) //generate the 345th icon
// >{
// >	chosenBranch:2
// >	res:{
// >		lineThicknesses:['thickline', 'thickline', 'thickarc', 'noconnection'],
// >		holePositions:{chosenBranch:2, res:[0,2]}
// >	}
// >}, or something like that



var angleOfPoint = function(pointar){
	var r = Math.atan2(pointar[1],pointar[0])
	if(r > 0){
		return r
	}else{
		return Math.PI*2 + r
	}
}

function drawFace(con, spec, col, backCol /*needs for the holes*/, dotRadius, dotSeparation, thinLineThickness){
	//bind spec
	var pointVariant = spec.chosenBranch
	var edgeTypes = spec.res.lineThicknesses
	var holeDistribution = spec.res.holePositions.res
	
	//points may have three or four points
	var polygonRadius
	var arc
	var points
	if(pointVariant == 0){
		//four point version
		var halfsep = dotSeparation/2
		polygonRadius = Math.sqrt(2*halfsep*halfsep)
		arc = Math.PI/2
		points = [
			[polygonRadius, 0],
			[0, polygonRadius],
			[-polygonRadius, 0],
			[0, -polygonRadius]
		]
	}else{
		var initial = pointVariant == 1 ? Math.PI/2 : -Math.PI/2
		polygonRadius = dotSeparation/(2*Math.sqrt(3/4))
		arc = Math.PI*2/3
		points = []
		for(var i = 0; i < 3; ++i){
			var ang = initial + i*Math.PI*2/3
			points.push([Math.cos(ang)*polygonRadius, Math.sin(ang)*polygonRadius])
		}
	}
	
	var nodeTypes = fillArray(1, 4) //0:empty 1:full
	for(var i = 0; i < holeDistribution.length; ++i){
		nodeTypes[holeDistribution[i]] = 0
	}
	
	//now draw the thing
	for(var i = 0; i < points.length; ++i){
		var thisPoint = points[i]
		var nextPoint = points[(i+1)%points.length]
		//now the dot
		con.beginPath()
		con.fillStyle = col
		con.arc(thisPoint[0], thisPoint[1], dotRadius, 0, Math.PI*2, false)
		con.fill()
		//now the connecting line
		var tet = edgeTypes[i]
		if(tet != 'noconnection'){
			con.beginPath()
			con.strokeStyle = col
			var isThin = tet == 'thinline'
			var isRound = tet == 'thickarc'
			if(isThin){
				con.lineWidth = thinLineThickness
			}else{
				con.lineWidth = dotRadius*2
			}
			if(isRound){
				con.arc(0,0, polygonRadius, angleOfPoint(thisPoint), angleOfPoint(nextPoint), false)
			}else{
				con.moveTo(thisPoint[0], thisPoint[1])
				con.lineTo(nextPoint[0], nextPoint[1])
			}
			con.stroke()
		}
	}
	//draw the holes
	for(var i = 0; i < points.length; ++i){
		var thisPoint = points[i]
		if(nodeTypes[i] == 0){
			con.beginPath()
			con.fillStyle = backCol
			con.arc(thisPoint[0], thisPoint[1], dotRadius - thinLineThickness, 0, Math.PI*2, false)
			con.fill()
		}
	}
}