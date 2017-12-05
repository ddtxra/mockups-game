var fs = require('fs');
var parse = require('csv-parse');

function getMaxForType(blocks, type){
    return Math.max.apply(Math,blocks.filter(g => g.type === type).map(function(o){return o.length;}))
}

function getMinForType(blocks, type){
    return Math.min.apply(Math,blocks.filter(g => g.type === type).map(function(o){return o.length;}))
}

function toNonZeroLogRounded(n){ 
    var number = Math.round(Number(Math.log(n)));
    if (number == 0) 
        return 1 
    else return number * 10
};

function toIntronClassification(number){ 
    //Based on histogram in R
    //hist(log(exons$V6), breaks=5, col="lightgreen")
    if (number < 6) 
        return "small"
    if (number < 8) 
        return "medium"
    if (number < 8) 
        return "large"
    if (number < 10) 
        return "big" //Complicated spliceosome
    return "huge" //SR protein (Catapult)
};

function groupBy(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

var inputFile='gene_coordinates.txt';
var parser = parse({delimiter: '\t'}, function (err, data) {


    ////////////////// FLAT FILE //////////////////////////////////////////////////////////
    var blocks = []
    data.forEach(function(line) {

      var transcript = line[0].split("|");
      var block = { 
          "geneName" : transcript[1],
          "transcript" : transcript[2], 
          "geneTranscript" : transcript[1] + "-" + transcript[2] + "-Chr" + line[1],
          "ensg" : transcript[0],
          "chromosome" : line[1],
          "type" : line[6],
          "realLength" : parseInt(line[5]),
          "normalizedLength" : toNonZeroLogRounded(line[5])
      };
    
    if(block.type === "intron"){
        block.intronClasses = toIntronClassification(toNonZeroLogRounded(line[5]))
        if(block.intronClasses === "small") {
            block.normalizedLength = 1
        }else if(block.intronClasses === "medium") {
            block.normalizedLength = 3
        }else if(block.intronClasses === "large") {
            block.normalizedLength = 10
        }else if(block.intronClasses === "big") {
            block.normalizedLength = 20
        }else if(block.intronClasses === "huge") {
            block.normalizedLength = 100
        }
            
    }
    
    blocks.push(block);
    //console.log(JSON.stringify(block));

    });
    
    
    ////////////////// GENES (Objects) //////////////////////////////////////////////////////////
    var genes = []
    var currentTranscript = null;
    var currentGeneObject = null;
    for(var i=0; i<blocks.length; i++){
        var block = blocks[i];
        if(!currentTranscript || currentTranscript !== block.transcript){
            currentTranscript =  block.transcript
            currentGeneObject = {
                "id": block.geneTranscript,
                "geneName": block.geneName,
                "transcript": block.transcript,
                "chromosome": block.chromosome,
                "exonsCount" : 0,
                "levelData": []
            }
            genes.push(currentGeneObject);
        }
        
        if(block.type === "exon")
            currentGeneObject.exonsCount++;
    
        var level = {
            type: block.type,
            realLength: block.realLength,
            normalizedLength : block.normalizedLength
        }
        if(block.type === "intron"){
            level.intronClasses = block.intronClasses
        }
        currentGeneObject.levelData.push(level)

    }
    
    console.log(JSON.stringify(genes))
    
    fs.writeFile('data.json', JSON.stringify(genes, null, 2), 'utf8');

   
});
 
// read the inputFile, feed the contents to the parser
fs.createReadStream(inputFile).pipe(parser);