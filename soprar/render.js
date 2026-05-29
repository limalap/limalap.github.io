const canvas =
    document.getElementById(
        "visualizer"
    );

const ctx =
    canvas.getContext("2d");

canvas.width =
    canvas.offsetWidth;

canvas.height = 140;

/* SVG */

function svgRec(){

    return `
    <svg viewBox="0 0 24 24">
        <circle cx="12"
                cy="12"
                r="7">
        </circle>
    </svg>
    `;
}

function svgPlay(){

    return `
    <svg viewBox="0 0 24 24">
        <polygon points="8,5 19,12 8,19">
        </polygon>
    </svg>
    `;
}

function svgStop(){

    return `
    <svg viewBox="0 0 24 24">
        <rect x="6"
              y="6"
              width="12"
              height="12">
        </rect>
    </svg>
    `;
}

function svgAnalyze(){

    return `
    <svg viewBox="0 0 24 24">

        <circle cx="12"
                cy="12"
                r="9">
        </circle>

        <circle cx="12"
                cy="12"
                r="3"
                fill="#198754">
        </circle>

    </svg>
    `;
}

/* STATUS */

function updateStatus(message){

    document
        .getElementById(
            "statusText"
        )
        .innerText =
            `Status: ${message}`;
}

/* DEBUG */

function showDebug(text){

    document
        .getElementById(
            "debugOutput"
        )
        .textContent = text;
}

/* CANVAS */

function clearCanvas(){

    ctx.fillStyle = "#050608";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}

function drawVisualizer(
    analyser,
    color
){

    const bufferLength =
        analyser.fftSize;

    const dataArray =
        new Uint8Array(
            bufferLength
        );

    function draw(){

        requestAnimationFrame(draw);

        analyser
            .getByteTimeDomainData(
                dataArray
            );

        ctx.fillStyle =
            "#050608";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.lineWidth = 2;

        ctx.strokeStyle = color;

        ctx.beginPath();

        let sliceWidth =
            canvas.width /
            bufferLength;

        let x = 0;

        for(
            let i=0;
            i<bufferLength;
            i++
        ){

            const v =
                dataArray[i] / 128.0;

            const y =
                v *
                canvas.height / 2;

            if(i === 0){

                ctx.moveTo(x,y);

            }else{

                ctx.lineTo(x,y);
            }

            x += sliceWidth;
        }

        ctx.stroke();
    }

    draw();
}

/* BOTÕES */

function resetIcons(){

    document
        .getElementById(
            "iconRec"
        )
        .innerHTML =
            svgRec();

    document
        .getElementById(
            "iconPlay"
        )
        .innerHTML =
            svgPlay();

    document
        .getElementById(
            "iconAnalyze"
        )
        .innerHTML =
            svgAnalyze();
}

function setRecStop(){

    document
        .getElementById(
            "iconRec"
        )
        .innerHTML =
            svgStop();
}

function setPlayStop(){

    document
        .getElementById(
            "iconPlay"
        )
        .innerHTML =
            svgStop();
}

function setAnalyzeStop(){

    document
        .getElementById(
            "iconAnalyze"
        )
        .innerHTML =
            svgStop();
}

resetIcons();

clearCanvas();