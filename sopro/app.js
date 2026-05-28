let audioContext;
let analyser;
let mediaStream;
let source;
let processor;

let animationId;

let audioData = [];

let audioBase64 = null;

let currentAudio = null;

let isRecording = false;
let isPlaying = false;
let isAnalyzing = false;

let timerInterval = null;
let elapsedSeconds = 0;

const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

canvas.width = canvas.offsetWidth;
canvas.height = 140;

const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const btnPlay = document.getElementById("btnPlay");
const btnAnalyze = document.getElementById("btnAnalyze");

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

    timerInterval = null;
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

function stopCurrentAudio(){

    if(currentAudio){

        currentAudio.pause();

        currentAudio.currentTime = 0;

        currentAudio = null;
    }

    isPlaying = false;
    isAnalyzing = false;
}

function drawVisualizer(){

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

        if(isRecording){
            ctx.strokeStyle = "#00ff88";
        }
        else if(isAnalyzing){
            ctx.strokeStyle = "#ff9900";
        }
        else{
            ctx.strokeStyle = "#00d4ff";
        }

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

async function startRecording(){

    stopCurrentAudio();

    cancelAnimationFrame(animationId);

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

    isRecording = true;

    btnStart.disabled = true;
    btnStop.disabled = false;

    startTimer("Gravando...");

    drawVisualizer();
}

function stopRecording(){

    if(!isRecording) return;

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

        btnPlay.disabled = false;
        btnAnalyze.disabled = false;

        stopTimer();

        updateStatus(
            "Gravação concluída"
        );
    };

    reader.readAsDataURL(wavBlob);

    isRecording = false;

    btnStart.disabled = false;
    btnStop.disabled = true;
}

function connectAudioToAnalyzer(audio){

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

    drawVisualizer();
}

function playAudio(analyze=false){

    if(!audioBase64) return;

    stopCurrentAudio();

    cancelAnimationFrame(animationId);

    currentAudio =
        new Audio(audioBase64);

    connectAudioToAnalyzer(currentAudio);

    if(analyze){

        isAnalyzing = true;
        isPlaying = false;

        startTimer("Analisando...");
    }
    else{

        isPlaying = true;
        isAnalyzing = false;

        startTimer("Reproduzindo...");
    }

    currentAudio.play();

    currentAudio.onended = () => {

        isPlaying = false;
        isAnalyzing = false;

        cancelAnimationFrame(animationId);

        stopTimer();

        clearCanvas();

        updateStatus("Pronto");
    };
}

btnStart.onclick = async () => {

    await startRecording();
};

btnStop.onclick = () => {

    stopRecording();
};

btnPlay.onclick = () => {

    if(isPlaying) return;

    playAudio(false);
};

btnAnalyze.onclick = () => {

    if(isAnalyzing) return;

    playAudio(true);
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