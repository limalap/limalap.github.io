let audioContext;
let analyser;
let mediaStream;
let source;
let processor;

let animationId;

let audioData = [];

let audioBase64 = null;

let currentAudio = null;

let timerInterval = null;
let elapsedSeconds = 0;

let currentMode = null;

const MODE_REC = "rec";
const MODE_PLAY = "play";
const MODE_ANALYZE = "analyze";

const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

canvas.width = canvas.offsetWidth;
canvas.height = 140;

const btnRec = document.getElementById("btnRec");
const btnPlay = document.getElementById("btnPlay");
const btnAnalyze = document.getElementById("btnAnalyze");

const textRec = document.getElementById("textRec");
const textPlay = document.getElementById("textPlay");
const textAnalyze = document.getElementById("textAnalyze");

const iconRec = document.getElementById("iconRec");
const iconPlay = document.getElementById("iconPlay");
const iconAnalyze = document.getElementById("iconAnalyze");

function svgRec(){

    return `
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8"></circle>
    </svg>
    `;
}

function svgPlay(){

    return `
    <svg viewBox="0 0 24 24">
        <polygon points="8,5 19,12 8,19"></polygon>
    </svg>
    `;
}

function svgStop(){

    return `
    <svg viewBox="0 0 24 24">
        <rect x="6" y="6" width="12" height="12"></rect>
    </svg>
    `;
}

function svgAnalyze(){

    return `
    <svg viewBox="0 0 24 24">
        <path d="M3 12h3l2-4 4 8 2-4h7"></path>
    </svg>
    `;
}

iconRec.innerHTML = svgRec();
iconPlay.innerHTML = svgPlay();
iconAnalyze.innerHTML = svgAnalyze();

function formatTime(seconds){

    const mins = String(
        Math.floor(seconds / 60)
    ).padStart(2,"0");

    const secs = String(
        seconds % 60
    ).padStart(2,"0");

    return `[${mins}:${secs}]`;
}

function updateStatus(message){

    const text =
        elapsedSeconds > 0
        ? `Status: ${formatTime(elapsedSeconds)} ${message}`
        : `Status: ${message}`;

    document.getElementById(
        "statusText"
    ).innerText = text;
}

function startTimer(message){

    clearInterval(timerInterval);

    elapsedSeconds = 0;

    updateStatus(message);

    timerInterval = setInterval(() => {

        elapsedSeconds++;

        updateStatus(message);

    },1000);
}

function stopTimer(){

    clearInterval(timerInterval);
}

function clearCanvas(){

    ctx.fillStyle = "#050608";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}

clearCanvas();

function drawVisualizer(color){

    if(!analyser) return;

    const bufferLength = analyser.fftSize;

    const dataArray = new Uint8Array(bufferLength);

    function draw(){

        animationId = requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

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

            const v = dataArray[i] / 128.0;

            const y =
                v * canvas.height / 2;

            if(i === 0){
                ctx.moveTo(x,y);
            }else{
                ctx.lineTo(x,y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(
            canvas.width,
            canvas.height / 2
        );

        ctx.stroke();
    }

    draw();
}

function stopAll(){

    stopTimer();

    cancelAnimationFrame(animationId);

    if(currentAudio){

        currentAudio.pause();

        currentAudio.currentTime = 0;

        currentAudio = null;
    }

    if(processor){

        processor.disconnect();
    }

    if(source){

        source.disconnect();
    }

    if(mediaStream){

        mediaStream
            .getTracks()
            .forEach(track => track.stop());
    }

    currentMode = null;

    textRec.innerText = "REC";
    textPlay.innerText = "PLAY";
    textAnalyze.innerText = "ANÁLISE";

    iconRec.innerHTML = svgRec();
    iconPlay.innerHTML = svgPlay();
    iconAnalyze.innerHTML = svgAnalyze();

    btnPlay.disabled = !audioBase64;
    btnAnalyze.disabled = !audioBase64;

    clearCanvas();

    updateStatus("Pronto");
}

async function startRecording(){

    stopAll();

    audioBase64 = null;

    btnPlay.disabled = true;
    btnAnalyze.disabled = true;

    audioData = [];

    mediaStream =
        await navigator.mediaDevices.getUserMedia({
            audio:true
        });

    audioContext =
        new(
            window.AudioContext ||
            window.webkitAudioContext
        )();

    analyser =
        audioContext.createAnalyser();

    analyser.fftSize = 2048;

    source =
        audioContext.createMediaStreamSource(
            mediaStream
        );

    processor =
        audioContext.createScriptProcessor(
            4096,
            1,
            1
        );

    source.connect(analyser);

    analyser.connect(processor);

    processor.connect(audioContext.destination);

    processor.onaudioprocess = e => {

        const channel =
            e.inputBuffer.getChannelData(0);

        audioData.push(
            new Float32Array(channel)
        );
    };

    currentMode = MODE_REC;

    textRec.innerText = "STOP";

    iconRec.innerHTML = svgStop();

    startTimer("Gravando...");

    drawVisualizer("#ff3b30");
}

function stopRecording(){

    if(currentMode !== MODE_REC) return;

    processor.disconnect();

    source.disconnect();

    mediaStream
        .getTracks()
        .forEach(track => track.stop());

    const wavBlob =
        exportWAV(
            audioData,
            audioContext.sampleRate
        );

    const reader = new FileReader();

    reader.onloadend = () => {

        audioBase64 = reader.result;

        localStorage.setItem(
            "audioResp",
            audioBase64
        );

        stopAll();

        btnPlay.disabled = false;
        btnAnalyze.disabled = false;

        updateStatus(
            "Gravação concluída"
        );
    };

    reader.readAsDataURL(wavBlob);
}

function connectAudio(audio){

    const playContext =
        new(
            window.AudioContext ||
            window.webkitAudioContext
        )();

    analyser =
        playContext.createAnalyser();

    analyser.fftSize = 2048;

    const track =
        playContext.createMediaElementSource(
            audio
        );

    track.connect(analyser);

    analyser.connect(
        playContext.destination
    );
}

function playAudio(mode){

    stopAll();

    if(!audioBase64) return;

    currentAudio =
        new Audio(audioBase64);

    connectAudio(currentAudio);

    currentMode = mode;

    if(mode === MODE_PLAY){

        textPlay.innerText = "STOP";

        iconPlay.innerHTML = svgStop();

        startTimer("Reproduzindo...");

        drawVisualizer("#0d6efd");
    }

    if(mode === MODE_ANALYZE){

        textAnalyze.innerText = "STOP";

        iconAnalyze.innerHTML = svgStop();

        startTimer("Analisando...");

        drawVisualizer("#20c997");
    }

    currentAudio.play();

    currentAudio.onended = () => {

        stopAll();
    };
}

btnRec.onclick = async () => {

    if(currentMode === MODE_REC){

        stopRecording();

        return;
    }

    await startRecording();
};

btnPlay.onclick = () => {

    if(btnPlay.disabled) return;

    if(currentMode === MODE_PLAY){

        stopAll();

        return;
    }

    playAudio(MODE_PLAY);
};

btnAnalyze.onclick = () => {

    if(btnAnalyze.disabled) return;

    if(currentMode === MODE_ANALYZE){

        stopAll();

        return;
    }

    playAudio(MODE_ANALYZE);
};

function exportWAV(buffers, sampleRate){

    let length = 0;

    buffers.forEach(
        b => length += b.length
    );

    const merged =
        new Float32Array(length);

    let offset = 0;

    buffers.forEach(b => {

        merged.set(b, offset);

        offset += b.length;
    });

    const wavBuffer =
        encodeWAV(
            merged,
            sampleRate
        );

    return new Blob(
        [wavBuffer],
        {
            type:'audio/wav'
        }
    );
}

function encodeWAV(samples, sampleRate){

    const buffer =
        new ArrayBuffer(
            44 + samples.length * 2
        );

    const view =
        new DataView(buffer);

    writeString(view,0,'RIFF');

    view.setUint32(
        4,
        36 + samples.length * 2,
        true
    );

    writeString(view,8,'WAVE');

    writeString(view,12,'fmt ');

    view.setUint32(16,16,true);

    view.setUint16(20,1,true);

    view.setUint16(22,1,true);

    view.setUint32(
        24,
        sampleRate,
        true
    );

    view.setUint32(
        28,
        sampleRate * 2,
        true
    );

    view.setUint16(32,2,true);

    view.setUint16(34,16,true);

    writeString(view,36,'data');

    view.setUint32(
        40,
        samples.length * 2,
        true
    );

    floatTo16BitPCM(
        view,
        44,
        samples
    );

    return view;
}

function floatTo16BitPCM(
    output,
    offset,
    input
){

    for(
        let i=0;
        i<input.length;
        i++,
        offset +=2
    ){

        let s =
            Math.max(
                -1,
                Math.min(1, input[i])
            );

        output.setInt16(
            offset,
            s < 0
            ? s * 0x8000
            : s * 0x7FFF,
            true
        );
    }
}

function writeString(
    view,
    offset,
    string
){

    for(
        let i=0;
        i<string.length;
        i++
    ){

        view.setUint8(
            offset + i,
            string.charCodeAt(i)
        );
    }
}