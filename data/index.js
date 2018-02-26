var fs = require('fs')
var parse = require('csv-parse');
var syncparse = require('csv-parse/lib/sync');

var inputFile='gene_coordinates.txt';

// Read chromosome length
var chromosomeLengthMap = {};
var content = fs.readFileSync('chromosome-length.tsv', 'utf8');
var records = syncparse(content, {delimiter: '\t'});
records.forEach(function(line) {
    chromosomeLengthMap[line[0]] = line[1]
})

// Read stop codons
var transcriptStopCodonsMap = {};
var content = fs.readFileSync('stopcodons_transcript.txt', 'utf8');
var stopRecords = syncparse(content, {delimiter: '\t'});
stopRecords.forEach(function(line) {
    transcriptStopCodonsMap[line[0]] = line[2]
})

console.log(transcriptStopCodonsMap)

var parser = parse({delimiter: '\t'}, function (err, data) {

    var rejected = []
    ////////////////// FLAT FILE //////////////////////////////////////////////////////////
    var blocks = []
    data.forEach(function(line) {

        var transcriptToken = line[0].split("|");
        var chromosomeToken = line[1].split(":");

        if(rejected.indexOf(transcriptToken[2]) == -1){

            var chromosomeNumber = chromosomeToken[0];
            var transcriptStart = chromosomeToken[1];
            var transcriptEnd = chromosomeToken[2];
            var chromosomeLength = chromosomeLengthMap[chromosomeNumber];
            var transcriptDirection = chromosomeToken[3] == "+" ? "FORWARD_STRAND" : "REVERSE_STRAND"
            var stopCodon = transcriptStopCodonsMap[transcriptToken[2]]

            var relativePositionPercentage = Math.round((transcriptStart * 100) / chromosomeLength) / 100.0
        
            var block = { 
                "geneName" : transcriptToken[1],
                "transcript" : transcriptToken[2], 
                "geneTranscript" : transcriptToken[1] + "-" + transcriptToken[2] + "-Chr" + chromosomeNumber,
                "stopCodon" : stopCodon,
                "ensg" : transcriptToken[0],
                "chromosome" : chromosomeNumber,
                "chromosomeLength" : chromosomeLength,
                "transcriptStartPosition" : transcriptStart,
                "transcriptEndPosition" : transcriptEnd,
                "transcriptDirection" : transcriptDirection,
                "relativePositionPercentage" : relativePositionPercentage,
                "type" : line[5],
                "realLength" : parseInt(line[4])
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
                "stopCodon": block.stopCodon,
                "chromosome": block.chromosome,
                "chromosomeLength": Number(block.chromosomeLength),
                "transcriptStartPosition": Number(block.transcriptStartPosition),
                "transcriptEndPosition": Number(block.transcriptEndPosition),
                "relativePositionPercentage": block.relativePositionPercentage,
                "transcriptDirection": block.transcriptDirection,
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
