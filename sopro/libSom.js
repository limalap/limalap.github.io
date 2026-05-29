function calcularRMS(samples){

    let soma = 0;

    for(let i=0; i<samples.length; i++){

        soma += samples[i] * samples[i];
    }

    return Math.sqrt(
        soma / samples.length
    );
}

function detectarSopro(
    audioData,
    sampleRate,
    method
){

    let threshold = 0.02;

    if(method === "whistle1"){

        threshold = 0.015;
    }

    if(method === "whistle2"){

        threshold = 0.012;
    }

    const bloco = 2048;

    let iniciou = false;

    let inicio = 0;
    let fim = 0;

    let maiorRMS = 0;

    for(
        let i=0;
        i<audioData.length;
        i += bloco
    ){

        const slice =
            audioData.slice(i, i + bloco);

        const rms =
            calcularRMS(slice);

        if(rms > maiorRMS){

            maiorRMS = rms;
        }

        const tempo =
            i / sampleRate;

        if(rms >= threshold){

            if(!iniciou){

                iniciou = true;

                inicio = tempo;
            }

            fim = tempo;
        }
    }

    const duracao =
        Math.max(0, fim - inicio);

    return {

        method,

        threshold,

        rmsMax:
            maiorRMS.toFixed(4),

        inicio:
            inicio.toFixed(2),

        fim:
            fim.toFixed(2),

        duracao:
            duracao.toFixed(2),

        soproDetectado:
            duracao > 0.5
    };
}