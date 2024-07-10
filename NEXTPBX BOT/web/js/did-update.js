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

function showFinalMessage({ addedCount, updatedCount, skippedCount, skippedDIDs, duration }) {
    const modalText = document.getElementById("progressText");
    let message = `Dodano DID-ów: ${addedCount}<br>`;
    message += `Zaktualizowano DID-ów: ${updatedCount}<br>`;
    if (skippedCount > 0) {
        message += `Pominięto (błędy lub już istnieją): ${skippedCount}<br>`;
        message += `Pominięte DID-y: ${skippedDIDs.join(", ")}<br>`;
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
        ? fileInput.files[0].name
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
            const workbook = xlsx.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            json = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

            const didValues = json.map(row => row.DID);
            const duplicates = didValues.filter(
                (value, index, self) => self.indexOf(value) !== index && value !== ""
            );

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

async function fetchData(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();

    try {
        const data = JSON.parse(text);
        return data;
    } catch (error) {
        return text;
    }
}

async function fetchQueues(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=INFO&info=queues&tenant=${selectedTenantName}`;
    console.log(`Fetching queues from URL: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log(`Raw response text: ${text}`);

    const queues = {};
    text.split('|').forEach(queue => {
        const [id, ...nameParts] = queue.split(':');
        if (id && nameParts.length) {
            const queueName = nameParts.join(':').trim();
            queues[queueName] = id.trim();
            console.log(`Processed queue - ID: ${id.trim()}, Name: ${queueName}`);
        }
    });

    console.log('Final queues object:', queues);
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
        if (!key) return '';
        const entry = Object.values(collection).find(item => item[nameField].trim() === key.trim());
        return entry ? `${type}-${entry[idField]}` : null;
    };

    for (let i = 1; i <= 5; i++) {
        const destinationKey = `DESTINATION${i}`;
        const destinationValue = branch[destinationKey];
        if (!destinationValue) continue;

        const [type, ...keyParts] = destinationValue.split('-').map(part => part.trim());
        const key = keyParts.join('-');
        let destinationEntry = null;

        console.log(`Processing destination - Type: ${type}, Key: ${key}`);

        switch (type) {
            case 'PLAYBACK':
                destinationEntry = findEntry(type, key, mediaFiles, 'me_id', 'me_name');
                break;
            case 'IVR':
                destinationEntry = findEntry(type, key, ivrs, 'iv_id', 'iv_name');
                break;
            case 'EXT':
                const foundExtension = Object.values(extensions).find(ext => ext.ex_name.trim() === key.trim() || ext.ex_number.trim() === key.trim());
                destinationEntry = foundExtension ? `EXT-${foundExtension.ex_id}` : null;
                break;
            case 'QUEUE':
                if (queues.hasOwnProperty(key)) {
                    destinationEntry = `QUEUE-${queues[key]}`;
                } else {
                    console.error(`Nie znaleziono kolejki dla: ${key}`);
                }
                break;
            case 'CUSTOM':
                destinationEntry = findEntry(type, key, customizations, 'cu_id', 'cu_name');
                break;
            case 'CONDITION':
                destinationEntry = findEntry(type, key, conditions, 'co_id', 'co_name');
                break;
            default:
                destinationEntry = destinationValue || '';
        }

        if (!destinationEntry) {
            console.error(`Nie znaleziono ${type.toLowerCase()} dla ${destinationValue}`);
        } else {
            console.log(`Found destination entry: ${destinationEntry}`);
        }

        destinations[i] = destinationEntry;
    }

    return destinations;
}

function parseSQLFeedback(feedbackString) {
    const regex = /update di_dids set .+ where .+di_id='(\d+)'/;
    const match = feedbackString.match(regex);

    if (match) {
        const diId = match[1];
        return { operation: "update", diId };
    } else {
        console.error("Nierozpoznany format:", feedbackString);
        return null;
    }
}

async function addOrUpdateDID(
    branch,
    extensions,
    queues,
    customizations,
    conditions,
    ivrs,
    mediaFiles,
    websiteUrl,
    apiKey,
    selectedTenantName,
    existingDIDs
) {
    console.log(`Przetwarzanie DID: ${branch.DID}`, branch);

    const destinations = calculateDestinations(
        branch,
        extensions,
        queues,
        customizations,
        conditions,
        ivrs,
        mediaFiles
    );

    let apiUrl = `${websiteUrl}/pbx/proxyapi.php`;
    let actionParams;
    let actionPerformed = 'error';

    const didRecord = existingDIDs.find(
        did => did.di_number.toString() === branch.DID.toString()
    );

    if (didRecord) {
        actionPerformed = 'update';
        actionParams = new URLSearchParams({
            key: apiKey,
            reqtype: 'MANAGEDB',
            object: 'DID',
            action: 'UPDATE',
            tenant: selectedTenantName,
            objectid: didRecord.di_id.toString(),
            jsondata: JSON.stringify({ di_comment: branch.KOMENTARZ, di_recording: branch.NAGRANIA })
        });
    } else {
        actionPerformed = 'add';
        actionParams = new URLSearchParams({
            key: apiKey,
            reqtype: 'MANAGEDB',
            object: 'DID',
            action: 'ADD',
            tenant: selectedTenantName,
            jsondata: JSON.stringify({ di_number: branch.DID, di_comment: branch.KOMENTARZ, di_recording: branch.NAGRANIA })
        });
    }

    const bodyParams = actionParams.toString();

    try {
        const rawResponse = await fetchData(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: bodyParams
        });

        console.log(`Odpowiedź serwera dla DID ${branch.DID}:`, rawResponse);

        let didId = null;
        if (rawResponse && typeof rawResponse === 'object' && rawResponse.di_id) {
            didId = rawResponse.di_id;
        } else if (typeof rawResponse === 'string' && rawResponse.startsWith("update di_dids set")) {
            const parsedResponse = parseSQLFeedback(rawResponse);
            if (parsedResponse && parsedResponse.diId) {
                didId = parsedResponse.diId;
            }
        }

        if (didId !== null) {
            await addDestinations(didId, destinations, websiteUrl, apiKey, selectedTenantName);
        }

        return {
            action: actionPerformed,
            success: !!didId
        };
    } catch (error) {
        console.error('Error in addOrUpdateDID:', error);
        return { action: 'error', success: false };
    }
}

async function main() {
    try {
        const websiteUrl = websiteUrlInput;
        const apiKey = apiKeyInput;
        const startTime = performance.now();

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

        const existingDIDs = Object.values(didData).map(item => ({ di_number: item.di_number, di_id: item.di_id }));

        const didsToProcess = json;
        const skippedDIDs = [];

        showModalWithProgress();
        updateProgress(0);

        let addedCount = 0;
        let updatedCount = 0;

        for (const [index, didToProcess] of didsToProcess.entries()) {
            try {
                const result = await addOrUpdateDID(
                    didToProcess,
                    extensions,
                    queues,
                    customizations,
                    conditions,
                    ivrs,
                    mediaFiles,
                    websiteUrl,
                    apiKey,
                    selectedTenantName,
                    existingDIDs
                );
                if (result.action === 'add') {
                    addedCount++;
                } else if (result.action === 'update') {
                    updatedCount++;
                }
            } catch (error) {
                console.error(`Błąd podczas przetwarzania DID: ${didToProcess.DID}`, error);
                skippedDIDs.push(didToProcess.DID);
            }
            updateProgress(Math.round(((index + 1) / didsToProcess.length) * 100));
        }

        updateProgress(100);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        showFinalMessage({
            addedCount,
            updatedCount,
            skippedCount: didsToProcess.length - addedCount - updatedCount,
            skippedDIDs,
            duration
        });

        document.getElementById("modalOkBtn").onclick = function () {
            document.getElementById("myModal").style.display = "none";
            window.location.href = '../choose.html';
        };
    } catch (error) {
        console.error('Error:', error);
    }
}
