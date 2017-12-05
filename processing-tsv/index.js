var fs = require('fs');
var parse = require('csv-parse');

function getMaxForType(blocks, type){
    return Math.max.apply(Math,blocks.filter(g => g.type === type).map(function(o){return o.length;}))
}

function getMinForType(blocks, type){
    return Math.min.apply(Math,blocks.filter(g => g.type === type).map(function(o){return o.length;}))
}

function getNormalizedLength(number){ 
    //Based on histogram in R
    //hist(log(exons$V6), breaks=5, col="lightgreen")
    if (number < 50) 
        return {class: "small-", length: 1} 
    else if (number < 75) 
        return {class: "small", length: 2} 
    else if (number < 100) 
        return {class: "small+", length: 3} 
    else if (number < 125) 
        return {class: "medium-", length: 4} 
    else if (number < 150) 
        return {class: "medium", length: 5} 
    else if (number < 175) 
        return {class: "medium+", length: 6} 
    else if (number < 200) 
        return {class: "large-", length: 7} 
    else if (number < 225) 
        return {class: "large", length: 8} 
    else if (number < 250) 
        return {class: "large+", length: 9} 
    else if (number < 350) 
        return {class: "big-", length: 10} 
    else if (number < 1000) 
        return {class: "big", length: 20} 
    //Huge exons (bigger than 1000)
    else return {class: "huge", length: 40} 
        
};

function getNormalizedLengthForIntrons(number){ 
    //Based on histogram in R
    //hist(log(exons$V6), breaks=5, col="lightgreen")
    if (number < 5000) 
        return {class: "small-intron: The avatar can easily jump", length: 1} //simple jump --> most of them end up in this category
    if (number < 10000) 
        return {class: "medium-intron: need an easy spliceosome, can be small 1,2 rocks that needs to jump", length: 5} //mutiple jumps (kind of rocks) 
    if (number < 15000) 
        return {class: "large-intron: need a more complicated spliceosome", length: 10} //spliceosome
    if (number < 20000) 
        return {class: "big-intron: need a difficult spliceosome", length: 20} //Complicated spliceosome
    return {class: "huge-intron: we need a SR protein before, like a catapult", length: 100} //SR protein (Catapult)
};

function groupBy(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

var inputFile='gene_coordinates.txt';
var parser = parse({delimiter: '\t'}, function (err, data) {


    var rejected = ["ENST00000368804", "ENST00000445772"]
    
    ////////////////// FLAT FILE //////////////////////////////////////////////////////////
    var blocks = []
    data.forEach(function(line) {

        var transcript = line[0].split("|");
        if(rejected.indexOf(transcript[2]) == -1){
            
          var block = { 
              "geneName" : transcript[1],
              "transcript" : transcript[2], 
              "geneTranscript" : transcript[1] + "-" + transcript[2] + "-Chr" + line[1],
              "ensg" : transcript[0],
              "chromosome" : line[1],
              "type" : line[6],
              "realLength" : parseInt(line[5]),
              "normalizedLength" : getNormalizedLength(line[5])
          };
    
            if(block.type === "intron"){
                var normalizedIntron = getNormalizedLengthForIntrons(block.realLength);
                block.class = normalizedIntron.class
                block.normalizedLength = normalizedIntron.length
            }else {
                var normalized = getNormalizedLength(block.realLength);
                block.class = normalized.class
                block.normalizedLength = normalized.length
            }

            blocks.push(block);
            //console.log(JSON.stringify(block));
        }

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
            normalizedLength : block.normalizedLength,
            class: block.class
        }
        currentGeneObject.levelData.push(level)

    }
    
    console.log(JSON.stringify(genes))
    
    fs.writeFile('data.json', JSON.stringify(genes, null, 2), 'utf8');

   
});
 
// read the inputFile, feed the contents to the parser
fs.createReadStream(inputFile).pipe(parser);