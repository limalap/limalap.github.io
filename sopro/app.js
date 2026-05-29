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

const iconRec = document.getElementById("iconRec");
const iconPlay = document.getElementById("iconPlay");
const iconAnalyze = document.getElementById("iconAnalyze");

/* SVGs */

function svgRec(){

    return `
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="7"></circle>
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

        <!-- ENGRENAGEM -->

        <path d="
            M12 2.8

            L13.6 3.2
            L14.4 5
            L16.2 5.6
            L17.8 4.8
            L19.2 6.2
            L18.4 7.8
            L19 9.6
            L20.8 10.4

            L20.8 13.6

            L19 14.4
            L18.4 16.2
            L19.2 17.8
            L17.8 19.2
            L16.2 18.4
            L14.4 19
            L13.6 20.8

            L10.4 20.8

            L9.6 19
            L7.8 18.4
            L6.2 19.2
            L4.8 17.8
            L5.6 16.2
            L5 14.4
            L3.2 13.6

            L3.2 10.4

            L5 9.6
            L5.6 7.8
            L4.8 6.2
            L6.2 4.8
            L7.8 5.6
            L9.6 5
            L10.4 3.2

            Z
        "></path>

        <!-- CÍRCULO CENTRAL -->

        <circle
            cx="12"
            cy="12"
            r="3.2"
            fill="#198754"
            stroke="white"
            stroke-width="1.8">
        </circle>

    </svg>
    `;
}

iconRec.innerHTML = svgRec();
iconPlay.innerHTML = svgPlay();
iconAnalyze.innerHTML = svgAnalyze();

/* STATUS */

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

/* RESET */

function stopAll(){

    stopTimer();

    cancelAnimationFrame(animationId);

    if(currentAudio){

        currentAudio.pause();

        currentAudio.currentTime = 0;

        currentAudio = null;
    }

    if(processor){

        try{
            processor.disconnect();
        }catch(e){}
    }

    if(source){

        try{
            source.disconnect();
        }catch(e){}
    }

    if(mediaStream){

        mediaStream
            .getTracks()
            .forEach(track => track.stop());
    }

    currentMode = null;

    iconRec.innerHTML = svgRec();
    iconPlay.innerHTML = svgPlay();
    iconAnalyze.innerHTML = svgAnalyze();

    btnPlay.disabled = !audioBase64;
    btnAnalyze.disabled = !audioBase64;

    clearCanvas();

    updateStatus("Pronto");
}

/* GRAVAÇÃO */

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

/* PLAY / ANALISE */

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

        iconPlay.innerHTML = svgStop();

        startTimer("Reproduzindo...");

        drawVisualizer("#0d6efd");
    }

    if(mode === MODE_ANALYZE){

        iconAnalyze.innerHTML = svgStop();

        startTimer("Analisando...");

        drawVisualizer("#20c997");
    }

    currentAudio.play();

    currentAudio.onended = () => {

        stopAll();
    };
}

/* EVENTOS */

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

/* WAV */

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