function setupButtonIcons(){

    document
        .getElementById("iconRec")
        .innerHTML = svgRec();

    document
        .getElementById("iconPlay")
        .innerHTML = svgPlay();

    document
        .getElementById("iconAnalyze")
        .innerHTML = svgAnalyze();
}

function setRecStop(){

    document
        .getElementById("iconRec")
        .innerHTML = svgStop();
}

function setPlayStop(){

    document
        .getElementById("iconPlay")
        .innerHTML = svgStop();
}

function setAnalyzeStop(){

    document
        .getElementById("iconAnalyze")
        .innerHTML = svgStop();
}