function updateStatus(message){

    document
        .getElementById("statusText")
        .innerText =
            `Status: ${message}`;
}

function showDebug(text){

    document
        .getElementById("debugOutput")
        .textContent = text;
}