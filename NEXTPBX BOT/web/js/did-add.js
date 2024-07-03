const xlsx = require('xlsx');
let json = null;

const websiteUrlInput = localStorage.getItem('websiteUrl');
const apiKeyInput = localStorage.getItem('apiKey');
const selectedTenantName = localStorage.getItem('selectedTenantName');

console.log(websiteUrlInput);
console.log(apiKeyInput);
console.log(selectedTenantName);

function showModalWithProgress() {
    var modal = document.getElementById("myModal");
    var span = document.getElementsByClassName("close")[0];
    var okBtn = document.getElementById("modalOkBtn");

    modal.style.display = "flex";

    span.onclick = function () {
        modal.style.display = "none";
    }

    okBtn.onclick = function () {
        modal.style.display = "none";
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function updateProgress(progress) {
    var elem = document.getElementById("myProgress");
    elem.style.width = progress + '%';
    elem.textContent = progress + '%';
}

function showFinalMessage({addedCount, skippedCount, skippedDIDs, skippedDestinations, duration}) {
    const modalText = document.getElementById("progressText");
    let message = `Dodano DID-ów: ${addedCount}<br>`;
    if (skippedCount > 0) {
        message += `Pominięto (już istnieją lub błędy): ${skippedCount}<br>`;
        message += `Pominięte DID-y: ${skippedDIDs.join(", ")}<br>`;
    }
    if (skippedDestinations.length > 0) {
        message += `Pominięte destynacje dla DID-ów: ${skippedDestinations.join(", ")}<br>`;
    }
    message += `Czas trwania: ${duration} sekund`;
    modalText.innerHTML = message;
    document
        .getElementById("modalOkBtn")
        .style
        .display = "block";
}

function handleFileSelection(event) {
    const fileInput = event.target;
    const fileInputLabel = document.querySelector('.fileInputLabel');
    fileInputLabel.textContent = fileInput.files.length > 0
        ? fileInput
            .files[0]
            .name
        : 'Wybierz plik';
}

function loadFile() {
    const fileInput = document.getElementById('fileInput');
    const excelDataContainer = document.getElementById('excelData');

    if (!fileInput.files.length) {
        alert('Proszę wybrać plik przed wykonaniem.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = xlsx.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            json = xlsx
                .utils
                .sheet_to_json(worksheet, {defval: ""});

            const didValues = json.map(row => row.DID);
            const seen = new Set();
            const duplicates = [];

            didValues.forEach(value => {
                if (value !== "" && seen.has(value)) {
                    duplicates.push(value);
                } else {
                    seen.add(value);
                }
            });

            if (duplicates.length > 0) {
                alert('Wykryto duplikaty w DID: ' + [...new Set(duplicates)].join(', '));
                return;
            }

            let html = "<table><thead><tr>";
            const keysWithValues = Object.keys(json[0]);
            keysWithValues.forEach(key => {
                html += `<th>${key}</th>`;
            });
            html += "</tr></thead><tbody>";

            json
                .slice(0, 5)
                .forEach(row => {
                    html += "<tr>";
                    keysWithValues.forEach(key => {
                        const value = row.hasOwnProperty(key)
                            ? row[key]
                            : "";
                        html += `<td>${value}</td>`;
                    });
                    html += "</tr>";
                });
            html += "</tbody></table>";
            excelDataContainer.innerHTML = html;

            console.log(json);
        } catch (error) {
            console.error('Wystąpił błąd podczas przetwarzania pliku Excel:', error);
            alert(
                'Wystąpił błąd podczas przetwarzania pliku. Sprawdź konsolę dla szczegółów.'
            );
        }
    };
    reader.onerror = function (error) {
        console.error('Wystąpił błąd podczas odczytu pliku:', error);
        alert('Nie można odczytać pliku. Sprawdź konsolę dla szczegółów.');
    };
    reader.readAsArrayBuffer(file);
}

function initializeEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const loadButton = document.getElementById('loadButton');

    fileInput.addEventListener('change', handleFileSelection);
    loadButton.addEventListener('click', loadFile);
}

document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', main);
});

document.addEventListener('DOMContentLoaded', initializeEventListeners);

async function main() {
    try {
        const websiteUrl = websiteUrlInput;
        const apiKey = apiKeyInput;
        const startTime = performance.now();

        // Logowanie przed pobraniem danych
        console.log('Pobieranie danych z serwera...');
        const [queues, extensions, customizations, conditions, didData, ivrs, mediaFiles] = await Promise.all(
            [
                fetchQueues(websiteUrl, apiKey, selectedTenantName),
                fetchExtensions(websiteUrl, apiKey, selectedTenantName),
                fetchCustomizations(websiteUrl, apiKey, selectedTenantName),
                fetchConditions(websiteUrl, apiKey, selectedTenantName),
                fetchDIDData(websiteUrl, apiKey, selectedTenantName),
                fetchIVRs(websiteUrl, apiKey, selectedTenantName),
                fetchMediaFiles(websiteUrl, apiKey, selectedTenantName)
            ]
        );

        const existingDIDs = new Set(
            Object.values(didData).map(item => item.di_number)
        );
        console.log('Istniejące DID-y:', existingDIDs);

        const didsToAdd = json.filter(
            branch => !existingDIDs.has(branch.DID.toString())
        );
        const skippedDIDs = json.filter(
            branch => existingDIDs.has(branch.DID.toString())
        );

        showModalWithProgress();
        updateProgress(0);

        let addedCount = 0;
        const skippedDestinations = [];

        // Logowanie liczby DID-ów do dodania
        console.log('Liczba DID-ów do dodania:', didsToAdd.length);

        for (const [index, didToAdd] of didsToAdd.entries()) {
            try {
                const destinations = calculateDestinations(
                    didToAdd,
                    extensions,
                    queues,
                    customizations,
                    conditions,
                    ivrs,
                    mediaFiles
                );

                const validDestinations = {};
                let hasInvalidDestination = false;

                // Logowanie destynacji dla bieżącego DID-a
                console.log(`Destynacje dla DID ${didToAdd.DID}:`, destinations);

                for (const [destIndex, destination] of Object.entries(destinations)) {
                    if (destination) {
                        validDestinations[destIndex] = destination;
                    } else {
                        skippedDestinations.push(`${didToAdd.DID}: ${destIndex}`);
                        hasInvalidDestination = true;
                        console.error(`Niepoprawna destynacja dla DID ${didToAdd.DID}: ${destination}`);
                    }
                }

                if (hasInvalidDestination) {
                    console.error(`Pominięto DID: ${didToAdd.DID} ze względu na niepoprawne destynacje`);
                    skippedDIDs.push(didToAdd);
                    continue;
                }

                // Dodawanie DID-a tylko, gdy wszystkie destynacje są poprawne
                console.log(`Dodawanie DID ${didToAdd.DID}`);
                const addDIDUrl = `${websiteUrl}/pbx/proxyapi.php`;
                const addDIDParams = new URLSearchParams({
                    key: apiKey,
                    reqtype: 'MANAGEDB',
                    object: 'DID',
                    action: 'ADD',
                    tenant: selectedTenantName,
                    jsondata: JSON.stringify(
                        {di_number: didToAdd.DID, di_comment: didToAdd.KOMENTARZ, di_recording: didToAdd.NAGRANIA}
                    )
                }).toString();

                const addDIDResponse = await fetchData(addDIDUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: addDIDParams
                });

                // Logowanie odpowiedzi po dodaniu DID-a
                console.log(`Odpowiedź po dodaniu DID ${didToAdd.DID}:`, addDIDResponse);

                if (Object.keys(validDestinations).length > 0) {
                    await addDestinations(
                        addDIDResponse.di_id,
                        validDestinations,
                        websiteUrl,
                        apiKey,
                        selectedTenantName
                    );
                }

                addedCount++;
                updateProgress(Math.round(((index + 1) / didsToAdd.length) * 100));
            } catch (error) {
                console.error(`Błąd podczas dodawania DID: ${didToAdd.DID}`, error);
                skippedDIDs.push(didToAdd);
            }
        }

        updateProgress(100);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        showFinalMessage({
            addedCount,
            skippedCount: skippedDIDs.length,
            skippedDIDs: skippedDIDs.map(did => did.DID),
            skippedDestinations: [...new Set(skippedDestinations)],
            duration
        });

        document
            .getElementById("modalOkBtn")
            .onclick = function () {
            document
                .getElementById("myModal")
                .style
                .display = "none";
            window.location.href = '../choose.html';
        };
    } catch (error) {
        console.error('Błąd:', error);
    }
}

async function fetchData(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    try {
        const json = JSON.parse(text.trim());
        return json;
    } catch (error) {
        console.error('Błąd parsowania JSON:', error);
        console.error('Odpowiedź, która spowodowała błąd:', text);
        throw error;
    }
}

async function fetchQueues(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=INFO&info=queues&tenant=${selectedTenantName}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const queues = {};
    text
        .split('|')
        .forEach(queue => {
            const [id, ...nameParts] = queue.split(':');
            if (id && nameParts.length) {
                queues[
                    nameParts
                        .join(':')
                        .trim()
                    ] = id.trim();
            }
        });
    return queues;
}

async function fetchExtensions(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&action=list&object=extension&tenant=${selectedTenantName}`;
    return await fetchData(url);
}

async function fetchCustomizations(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&object=custom&action=LIST&tenant=${selectedTenantName}`;
    return await fetchData(url);
}

async function fetchDIDData(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&object=DID&action=LIST&tenant=${selectedTenantName}`;
    return await fetchData(url);
}

async function fetchConditions(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&object=CONDITION&action=LIST&tenant=${selectedTenantName}`;
    return await fetchData(url);
}

async function fetchIVRs(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&object=IVR&action=LIST&tenant=${selectedTenantName}`;
    return await fetchData(url);
}

async function fetchMediaFiles(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&object=MEDIAFILE&action=LIST&tenant=${selectedTenantName}`;
    return await fetchData(url)
}

async function addDestinations(
    didId,
    destinations,
    websiteUrl,
    apiKey,
    selectedTenantName
) {
    const addDestinationUrl = `${websiteUrl}/pbx/proxyapi.php`;
    const addDestinationParams = new URLSearchParams({
        key: apiKey,
        reqtype: 'MANAGEDB',
        object: 'DESTINATION',
        action: 'replace',
        typesrc: 'DID',
        typeidsrc: didId,
        tenant: selectedTenantName,
        jsondata: JSON.stringify(destinations)
    }).toString();

    // Logowanie destynacji przed dodaniem
    console.log(`Dodawanie destynacji dla DID ${didId}:`, destinations);

    await fetchData(addDestinationUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: addDestinationParams
    });
}

function calculateDestinations(
    branch,
    extensions,
    queues,
    customizations,
    conditions,
    ivrs,
    mediaFiles
) {
    const destinations = {};

    const findEntry = (type, key, collection, idField, nameField) => {
        const entry = Object
            .values(collection)
            .find(item => item[nameField] === key);
        return entry
            ? `${type}-${entry[idField]}`
            : null;
    };

    for (let i = 1; i <= 5; i++) {
        const destinationKey = `DESTINATION${i}`;
        const destinationValue = branch[destinationKey];
        if (!destinationValue) continue;

        const [type, key] = destinationValue
            .split('-')
            .map(part => part.trim());
        let destinationEntry = null;

        switch (type) {
            case 'PLAYBACK':
                destinationEntry = findEntry(type, key, mediaFiles, 'me_id', 'me_name');
                break;
            case 'IVR':
                destinationEntry = findEntry(type, key, ivrs, 'iv_id', 'iv_name');
                break;
            case 'EXT':
                const foundExtension = Object
                    .values(extensions)
                    .find(ext => ext.ex_name === key || ext.ex_number === key);
                destinationEntry = foundExtension
                    ? `EXT-${foundExtension.ex_id}`
                    : null;
                break;
            case 'QUEUE':
                destinationEntry = queues[key]
                    ? `QUEUE-${queues[key]}`
                    : null;
                break;
            case 'CUSTOM':
                destinationEntry = findEntry(type, key, customizations, 'cu_id', 'cu_name');
                break;
            case 'CONDITION':
                destinationEntry = findEntry(type, key, conditions, 'co_id', 'co_name');
                break;
            default:
                destinationEntry = destinationValue;
        }

        if (!destinationEntry) {
            console.error(`Nie znaleziono ${type.toLowerCase()} dla ${destinationValue}`);
        }

        destinations[i] = destinationEntry;
    }

    return destinations;
}
