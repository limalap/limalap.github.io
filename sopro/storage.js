function saveStorage(key,value){

    localStorage.setItem(
        key,
        JSON.stringify(value)
    );
}

function loadStorage(key,defaultValue){

    const value =
        localStorage.getItem(key);

    if(value === null){

        return defaultValue;
    }

    return JSON.parse(value);
}