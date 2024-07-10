const xlsx = require('xlsx');
let json = null;

const websiteUrlInput = localStorage.getItem('websiteUrl');
const apiKeyInput = localStorage.getItem('apiKey');
const selectedTenantName = localStorage.getItem('selectedTenantName');

console.log(websiteUrlInput);
console.log(apiKeyInput);
console.log(selectedTenantName);

document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', main);
});

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

function showFinalMessage({addedCount, duration}) {
    const modalText = document.getElementById("progressText");
    let message = `Przygotowano DID-ów: ${addedCount}<br>`;
    message += `Czas trwania: ${duration} sekund`;
    modalText.innerHTML = message;
    document
        .getElementById("modalOkBtn")
        .style
        .display = "block";
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
            const [id, name] = queue.split(':');
            if (id && name) {
                queues[id.trim()] = name.trim();
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

async function fetchDestinationData(websiteUrl, apiKey, tenantName, typeIdSrc) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&object=destination&action=list&typesrc=DID&typeidsrc=${typeIdSrc}&tenant=${tenantName}`;
    const response = await fetchData(url);
    console.log(`Destination data for DID ${typeIdSrc}:`, response);
    return response;
}

async function fetchDIDRecording(websiteUrl, apiKey, tenantName, objectId) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&action=get&tenant=${tenantName}&object=DID&objectid=${objectId}`;
    const response = await fetchData(url);
    return response;
}

function reverseCalculateDestinations(
    destinationsData,
    extensions,
    queues,
    customizations,
    conditions,
    ivrs,
    mediaFiles
) {
    const readableDestinations = {};
    console.log("Raw destination data:", destinationsData);

    for (const [deId, destination] of Object.entries(destinationsData)) {
        const {type_dst, type_id_dst, de_ord} = destination;
        let readableValue;

        switch (type_dst) {
            case 'EXT':
                readableValue = extensions[type_id_dst]
                    ? `EXT-${extensions[type_id_dst].ex_number}`
                    : `EXT-${type_id_dst}`;
                break;
            case 'QUEUE':
                readableValue = queues[type_id_dst]
                    ? `QUEUE-${queues[type_id_dst]}`
                    : `QUEUE-${type_id_dst}`;
                break;
            case 'CUSTOM':
                readableValue = customizations[type_id_dst]
                    ? `CUSTOM-${customizations[type_id_dst].cu_name}`
                    : `CUSTOM-${type_id_dst}`;
                break;
            case 'CONDITION':
                readableValue = conditions[type_id_dst]
                    ? `CONDITION-${conditions[type_id_dst].co_name}`
                    : `CONDITION-${type_id_dst}`;
                break;
            case 'IVR':
                readableValue = ivrs[type_id_dst]
                    ? `IVR-${ivrs[type_id_dst].iv_name}`
                    : `IVR-${type_id_dst}`;
                break;
            case 'PLAYBACK':
                readableValue = mediaFiles[type_id_dst]
                    ? `PLAYBACK-${mediaFiles[type_id_dst].me_name}`
                    : `PLAYBACK-${type_id_dst}`;
                break;
            default:
                readableValue = ``;
                break;
        }
        readableDestinations[de_ord] = readableValue;
    }
    console.log(`Readable destinations for DID:`, readableDestinations);
    return readableDestinations;
}


function flattenDestinations(didDetails) {
    const flatData = didDetails.map(did => {
        const destinations = did.destinations;
        console.log('Processing DID:', did.di_number, 'with destinations:', destinations);

        const flattened = {
            DID: did.di_number,
            KOMENTARZ: did.di_comment,
            NAGRANIA: did.di_recording || ''
        };

        // Przypisujemy destynacje w odwrotnej kolejności do zawsze 5 pól
        const destinationKeys = Object.keys(destinations).sort((a, b) => b - a);
        for (let i = 0; i < 5; i++) {
            flattened[`DESTINATION${i + 1}`] = destinations[destinationKeys[i]] || '';
        }

        console.log('Flattened data:', flattened);
        return flattened;
    });

    return flatData;
}

function exportToExcel(data, sheetName, fileName) {
    console.log(`Data to be exported to Excel:`, data);
    const workbook = xlsx
        .utils
        .book_new();
    const worksheet = xlsx
        .utils
        .json_to_sheet(data);
    xlsx
        .utils
        .book_append_sheet(workbook, worksheet, sheetName);

    const workbookBlob = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
    });
    const blob = new Blob([workbookBlob], {type: "application/octet-stream"});

    function downloadBlob(blob, filename) {
        const url = window
            .URL
            .createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document
            .body
            .appendChild(a);
        a.click();
        a.remove();
        window
            .URL
            .revokeObjectURL(url);
    }

    downloadBlob(blob, fileName);
    console.log(
        `Excel file ${fileName} has been created and prompted for download.`
    );
}

async function main() {
    try {
        showModalWithProgress(); // Show modal as soon as the function starts
        updateProgress(0);

        const websiteUrl = websiteUrlInput;
        const apiKey = apiKeyInput;
        const tenantName = selectedTenantName;
        const startTime = performance.now();

        // Pobieranie niezbędnych danych
        const [queues, extensions, customizations, conditions, didData, ivrs, mediaFiles] = await Promise.all(
            [
                fetchQueues(websiteUrl, apiKey, tenantName),
                fetchExtensions(websiteUrl, apiKey, tenantName),
                fetchCustomizations(websiteUrl, apiKey, tenantName),
                fetchConditions(websiteUrl, apiKey, tenantName),
                fetchDIDData(websiteUrl, apiKey, tenantName),
                fetchIVRs(websiteUrl, apiKey, tenantName),
                fetchMediaFiles(websiteUrl, apiKey, tenantName)
            ]
        );

        // Update progress after fetching initial data
        updateProgress(20);

        // Przygotowanie danych DID do eksportu
        const didArray = Object.values(didData);

        // Pobieranie i przetwarzanie danych destination oraz recording dla każdego DID
        const detailedDIDData = await Promise.all(didArray.map(async (did, index) => {
            const destinationData = await fetchDestinationData(
                websiteUrl,
                apiKey,
                tenantName,
                did.di_id
            );
            const recordingData = await fetchDIDRecording(
                websiteUrl,
                apiKey,
                tenantName,
                did.di_id
            );
            let readableDestinations = {};
            if (Object.keys(destinationData).length !== 0) {
                readableDestinations = reverseCalculateDestinations(
                    destinationData,
                    extensions,
                    queues,
                    customizations,
                    conditions,
                    ivrs,
                    mediaFiles
                );
            } else {
                console.log(`No destination data for DID ${did.di_id}`);
            }
            
            // Update progress after each DID data is processed
            updateProgress(20 + (80 * (index + 1) / didArray.length));

            return {
                ...did,
                destinations: readableDestinations,
                di_recording: recordingData.di_recording
            };
        }));

        // Logowanie zebranych danych
        console.log("Detailed DID Data:", detailedDIDData);

        // Spłaszczanie danych przed eksportem do Excela
        const flattenedData = flattenDestinations(detailedDIDData);

        // Eksportowanie danych do Excela
        const fileName = `DID - ${tenantName}.xlsx`;
        exportToExcel(flattenedData, 'DIDs', fileName);
        updateProgress(100);

        // Kończenie pomiaru czasu i wyświetlanie wiadomości końcowej
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        showFinalMessage({addedCount: detailedDIDData.length, duration});

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
