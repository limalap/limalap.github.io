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