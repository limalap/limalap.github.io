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

let selectedDeviceId = null;

let captureMethod =
    localStorage.getItem(
        "captureMethod"
    ) || "finger";

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

const btnConfig = document.getElementById("btnConfig");

const microphoneSelect =
    document.getElementById("microphoneSelect");

const captureMethodSelect =
    document.getElementById("captureMethodSelect");

const btnApplyConfig =
    document.getElementById("btnApplyConfig");

const debugOutput =
    document.getElementById("debugOutput");

const configModal =
    new bootstrap.Modal(
        document.getElementById("configModal")
    );

const iconRec = document.getElementById("iconRec");
const iconPlay = document.getElementById("iconPlay");
const iconAnalyze = document.getElementById("iconAnalyze");

/* SVG */

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

function updateStatus(message){

    document.getElementById(
        "statusText"
    ).innerText =
        `Status: ${message}`;
}

/* DEBUG */

function showDebug(data){

    debugOutput.textContent =
`Método: ${data.method}

Sopro detectado:
${data.soproDetectado ? "SIM" : "NÃO"}

Threshold:
${data.threshold}

RMS máximo:
${data.rmsMax}

Início:
${data.inicio}s

Fim:
${data.fim}s

Duração:
${data.duracao}s`;
}

/* MICROFONES */

async function requestMicrophonePermission(){

    try{

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio:true
            });

        stream
            .getTracks()
            .forEach(track => track.stop());

        updateStatus("Microfone pronto");

        await loadMicrophones();

    }catch(err){

        updateStatus("Permissão negada");
    }
}

async function loadMicrophones(){

    const devices =
        await navigator.mediaDevices.enumerateDevices();

    const microphones =
        devices.filter(
            d => d.kind === "audioinput"
        );

    microphoneSelect.innerHTML = "";

    microphones.forEach((mic,index) => {

        const option =
            document.createElement("option");

        option.value = mic.deviceId;

        option.text =
            mic.label ||
            `Microfone ${index+1}`;

        microphoneSelect.appendChild(option);
    });

    const savedMic =
        localStorage.getItem(
            "selectedMicrophone"
        );

    if(savedMic){

        selectedDeviceId = savedMic;

        microphoneSelect.value = savedMic;
    }

    captureMethodSelect.value =
        captureMethod;
}

/* RESET */

function stopAll(){

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

/* REC */

async function startRecording(){

    stopAll();

    audioBase64 = null;

    btnPlay.disabled = true;
    btnAnalyze.disabled = true;

    audioData = [];

    const constraints = {

        audio: selectedDeviceId
            ? {
                deviceId:{
                    exact:selectedDeviceId
                }
            }
            : true
    };

    mediaStream =
        await navigator.mediaDevices.getUserMedia(
            constraints
        );

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
            ...channel
        );
    };

    currentMode = MODE_REC;

    iconRec.innerHTML = svgStop();

    updateStatus("Gravando...");

    drawVisualizer("#ff3b30");
}

function stopRecording(){

    if(currentMode !== MODE_REC) return;

    stopAll();

    updateStatus("Gravação concluída");

    btnPlay.disabled = false;
    btnAnalyze.disabled = false;
}

/* PLAY */

function playAudio(){

    updateStatus("Reproduzindo...");
}

/* ANALISE */

function runAnalysis(){

    updateStatus("Analisando...");

    const resultado =
        detectarSopro(
            audioData,
            audioContext.sampleRate,
            captureMethod
        );

    showDebug(resultado);

    updateStatus("Análise concluída");
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

    playAudio();
};

btnAnalyze.onclick = () => {

    runAnalysis();
};

btnConfig.onclick = () => {

    configModal.show();
};

btnApplyConfig.onclick = () => {

    selectedDeviceId =
        microphoneSelect.value;

    captureMethod =
        captureMethodSelect.value;

    localStorage.setItem(
        "selectedMicrophone",
        selectedDeviceId
    );

    localStorage.setItem(
        "captureMethod",
        captureMethod
    );

    configModal.hide();

    updateStatus("Configuração aplicada");
};

/* INIT */

requestMicrophonePermission();