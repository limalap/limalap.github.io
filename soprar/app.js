let audioContext;

let analyser;

let mediaStream;

let source;

let processor;

let audioData = [];

let isRecording = false;

let captureMethod =
    localStorage.getItem(
        "captureMethod"
    ) || "finger";

let selectedDeviceId =
    localStorage.getItem(
        "selectedMicrophone"
    ) || null;

const btnRec =
    document.getElementById(
        "btnRec"
    );

const btnPlay =
    document.getElementById(
        "btnPlay"
    );

const btnAnalyze =
    document.getElementById(
        "btnAnalyze"
    );

const btnConfig =
    document.getElementById(
        "btnConfig"
    );

const microphoneSelect =
    document.getElementById(
        "microphoneSelect"
    );

const captureMethodSelect =
    document.getElementById(
        "captureMethodSelect"
    );

const btnApplyConfig =
    document.getElementById(
        "btnApplyConfig"
    );

const configModal =
    new bootstrap.Modal(
        document.getElementById(
            "configModal"
        )
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
            .forEach(track=>{

                track.stop();
            });

        updateStatus(
            "Microfone pronto"
        );

        await loadMicrophones();

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
        devices.filter(device=>{

            return device.kind ===
                   "audioinput";
        });

    microphoneSelect.innerHTML =
        "";

    microphones.forEach(
        (mic,index)=>{

        const option =
            document
            .createElement(
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
                exact:
                selectedDeviceId
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

    processor.onaudioprocess =
        event=>{

        const channel =
            event
            .inputBuffer
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

    btnPlay.disabled = true;

    btnAnalyze.disabled = true;

    isRecording = true;

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
            .forEach(track=>{

                track.stop();
            });
    }

    resetIcons();

    isRecording = false;

    btnPlay.disabled = false;

    btnAnalyze.disabled = false;

    updateStatus(
        "Gravação concluída"
    );
}

function runAnalysis(){

    if(audioData.length === 0){

        return;
    }

    setAnalyzeStop();

    updateStatus(
        "Analisando..."
    );

    const resultado =
        detectarSopro(
            audioData,
            audioContext.sampleRate,
            captureMethod
        );

    showDebug(
`Método:
${resultado.method}

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

    resetIcons();

    updateStatus(
        "Análise concluída"
    );
}

btnRec.onclick =
    async ()=>{

    if(isRecording){

        stopRecording();

        return;
    }

    await startRecording();
};

btnAnalyze.onclick =
    ()=>{

    runAnalysis();
};

btnConfig.onclick =
    ()=>{

    configModal.show();
};

btnApplyConfig.onclick =
    ()=>{

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

    updateStatus(
        "Configuração aplicada"
    );
};

requestMicrophone();