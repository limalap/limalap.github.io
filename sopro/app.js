let audioContext;

let analyser;

let mediaStream;

let source;

let processor;

let audioData = [];

let captureMethod =
    loadStorage(
        "captureMethod",
        "finger"
    );

let selectedDeviceId =
    loadStorage(
        "selectedMicrophone",
        null
    );

setupButtonIcons();

const btnRec =
    document.getElementById(
        "btnRec"
    );

const btnAnalyze =
    document.getElementById(
        "btnAnalyze"
    );

const btnApplyConfig =
    document.getElementById(
        "btnApplyConfig"
    );

const microphoneSelect =
    document.getElementById(
        "microphoneSelect"
    );

const captureMethodSelect =
    document.getElementById(
        "captureMethodSelect"
    );

async function requestMicrophone(){

    try{

        const stream =
            await navigator
            .mediaDevices
            .getUserMedia({
                audio:true
            });

        stream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        updateStatus(
            "Microfone pronto"
        );

        loadMicrophones();

    }catch(err){

        updateStatus(
            "Permissão negada"
        );
    }
}

async function loadMicrophones(){

    const devices =
        await navigator
        .mediaDevices
        .enumerateDevices();

    const microphones =
        devices.filter(
            d => d.kind === "audioinput"
        );

    microphoneSelect.innerHTML = "";

    microphones.forEach((mic,index)=>{

        const option =
            document.createElement(
                "option"
            );

        option.value =
            mic.deviceId;

        option.text =
            mic.label ||
            `Microfone ${index+1}`;

        microphoneSelect
            .appendChild(option);
    });

    if(selectedDeviceId){

        microphoneSelect.value =
            selectedDeviceId;
    }

    captureMethodSelect.value =
        captureMethod;
}

async function startRecording(){

    audioData = [];

    const constraints = {

        audio:selectedDeviceId
        ? {
            deviceId:{
                exact:selectedDeviceId
            }
        }
        : true
    };

    mediaStream =
        await navigator
        .mediaDevices
        .getUserMedia(
            constraints
        );

    audioContext =
        new(
            window.AudioContext ||
            window.webkitAudioContext
        )();

    analyser =
        audioContext
        .createAnalyser();

    analyser.fftSize = 2048;

    source =
        audioContext
        .createMediaStreamSource(
            mediaStream
        );

    processor =
        audioContext
        .createScriptProcessor(
            4096,
            1,
            1
        );

    source.connect(analyser);

    analyser.connect(processor);

    processor.connect(
        audioContext.destination
    );

    processor.onaudioprocess = e => {

        const channel =
            e.inputBuffer
            .getChannelData(0);

        for(
            let i=0;
            i<channel.length;
            i++
        ){

            audioData.push(
                channel[i]
            );
        }
    };

    drawVisualizer(
        analyser,
        "#ff3b30"
    );

    setRecStop();

    updateStatus(
        "Gravando..."
    );
}

function stopRecording(){

    if(processor){

        processor.disconnect();
    }

    if(source){

        source.disconnect();
    }

    if(mediaStream){

        mediaStream
            .getTracks()
            .forEach(
                track => track.stop()
            );
    }

    setupButtonIcons();

    updateStatus(
        "Gravação concluída"
    );
}

function runAnalysis(){

    const resultado =
        detectarSopro(
            audioData,
            audioContext.sampleRate,
            captureMethod
        );

    showDebug(
`Método: ${resultado.method}

Threshold:
${resultado.threshold}

RMS máximo:
${resultado.rmsMax}

Início:
${resultado.inicio}s

Fim:
${resultado.fim}s

Duração:
${resultado.duracao}s`
    );

    updateStatus(
        "Análise concluída"
    );
}

btnRec.onclick = async ()=>{

    await startRecording();
};

btnAnalyze.onclick = ()=>{

    runAnalysis();
};

btnApplyConfig.onclick = ()=>{

    selectedDeviceId =
        microphoneSelect.value;

    captureMethod =
        captureMethodSelect.value;

    saveStorage(
        "selectedMicrophone",
        selectedDeviceId
    );

    saveStorage(
        "captureMethod",
        captureMethod
    );

    updateStatus(
        "Configuração aplicada"
    );
};

requestMicrophone();