var fs = require('fs');
var parse = require('csv-parse');

var inputFile='gene_coordinates.txt';
var parser = parse({delimiter: '\t'}, function (err, data) {


    var rejected = []
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
              "realLength" : parseInt(line[5])
          };
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
                "exonsRealLength" : 0,
                "geneRealLength" : 0,
                "levelData": []
            }
            genes.push(currentGeneObject);
        }
        
        if(block.type === "exon") {
            currentGeneObject.exonsCount++;
            currentGeneObject.exonsRealLength += block.realLength;
        }
        currentGeneObject.geneRealLength += block.realLength;
        var level = {
            type: block.type,
            realLength: block.realLength,
        }
        currentGeneObject.levelData.push(level)

    }

    var selectedTranscripts = [];
    var currentGeneName;

    var selectedTranscript = genes[0];
    var currentGeneName = selectedTranscript.geneName;
    var maxLengthCurrentTranscript = selectedTranscript.geneRealLength;
    
    for(var i=0; i < genes.length; i++){
        var currentGene = genes[i];
        if(currentGene.geneName !== currentGeneName) //If a new gene, put the last gene selected 
        {
            selectedTranscripts.push(selectedTranscript)
            maxLengthCurrentTranscript = selectedTranscript.geneRealLength;
            selectedTranscript = currentGene;
            var currentGeneName = currentGene.geneName;
            
        }else {
            if(currentGene.geneRealLength > selectedTranscript.geneRealLength){
                selectedTranscript = currentGene;
            }
        }

    }

    selectedTranscripts.push(selectedTranscript)
    
    //console.log(JSON.stringify(selectedTranscripts))
    
    fs.writeFile('data.json', JSON.stringify(selectedTranscripts, null, 2), 'utf8');

   
});
 
// read the inputFile, feed the contents to the parser
fs.createReadStream(inputFile).pipe(parser);
