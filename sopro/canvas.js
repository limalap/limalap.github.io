const canvas =
    document.getElementById(
        "visualizer"
    );

const ctx =
    canvas.getContext("2d");

canvas.width =
    canvas.offsetWidth;

canvas.height = 140;

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
        new Uint8Array(bufferLength);

    function draw(){

        requestAnimationFrame(draw);

        analyser
            .getByteTimeDomainData(
                dataArray
            );

        ctx.fillStyle = "#050608";

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
            canvas.width / bufferLength;

        let x = 0;

        for(let i=0; i<bufferLength; i++){

            const v =
                dataArray[i] / 128.0;

            const y =
                v * canvas.height / 2;

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

clearCanvas();