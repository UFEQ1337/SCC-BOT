const xlsx = require('xlsx');
let json = null;

const websiteUrlInput = localStorage.getItem('websiteUrl');
const apiKeyInput = localStorage.getItem('apiKey');
const selectedTenantName = localStorage.getItem('selectedTenantName');

console.log(websiteUrlInput);
console.log(apiKeyInput);
console.log(selectedTenantName);

function showModalWithProgress() {
    const modal = document.getElementById("myModal");
    const span = document.getElementsByClassName("close")[0];
    const okBtn = document.getElementById("modalOkBtn");

    modal.style.display = "flex";

    span.onclick = function() {
        modal.style.display = "none";
    }

    okBtn.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function updateProgress(progress) {
    const elem = document.getElementById("myProgress");
    elem.style.width = progress + '%';
    elem.textContent = progress + '%';
}

function showFinalMessage({ addedCount, duration }) {
    const modalText = document.getElementById("progressText");
    let message = `Dodano użytkowników: ${addedCount}<br>`;
    message += `Czas trwania: ${duration} sekund`;
    modalText.innerHTML = message;
    document.getElementById("modalOkBtn").style.display = "block";
}

function handleFileSelection(event) {
    const fileInput = event.target;
    const fileInputLabel = document.querySelector('.fileInputLabel');
    fileInputLabel.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : 'Wybierz plik';
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
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = xlsx.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            json = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

            const queueNames = json.map(row => row.KOLEJKA);
            const seen = new Set();
            const duplicates = [];

            queueNames.forEach(value => {
                if (value !== "" && seen.has(value)) {
                    duplicates.push(value);
                } else {
                    seen.add(value);
                }
            });

            if (duplicates.length > 0) {
                alert('Wykryto duplikaty w KOLEJKA: ' + [...new Set(duplicates)].join(', '));
                return;
            }

            let html = "<table><thead><tr>";
            const keysWithValues = Object.keys(json[0]);
            keysWithValues.forEach(key => {
                html += `<th>${key}</th>`;
            });
            html += "</tr></thead><tbody>";

            json.slice(0, 5).forEach(row => {
                html += "<tr>";
                keysWithValues.forEach(key => {
                    const value = row.hasOwnProperty(key) ? row[key] : "";
                    html += `<td>${value}</td>`;
                });
                html += "</tr>";
            });
            html += "</tbody></table>";
            excelDataContainer.innerHTML = html;

            document.getElementById('submitButton').hidden = false;

            console.log(json);
        } catch (error) {
            console.error('Wystąpił błąd podczas przetwarzania pliku Excel:', error);
            alert('Wystąpił błąd podczas przetwarzania pliku. Sprawdź konsolę dla szczegółów.');
        }
    };
    reader.onerror = function(error) {
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

document.addEventListener('DOMContentLoaded', function() {
    const submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', main);
});

document.addEventListener('DOMContentLoaded', initializeEventListeners);

async function fetchData(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    console.log(`Odpowiedź z ${url}:`, text);  // Logowanie odpowiedzi
    try {
        const json = JSON.parse(text.trim());
        return json;
    } catch (error) {
        return text.trim();
    }
}

async function fetchExtensions(websiteUrl, apiKey, tenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&action=list&object=extension&tenant=${tenantName}`;
    return await fetchData(url);
}

function getExtensionNumberByNameOrNumber(extensions, agentExtension) {
    const extension = Object.values(extensions).find(ext => ext.ex_name === agentExtension || ext.ex_number === agentExtension);
    return extension ? extension.ex_number : null;
}

async function getQueueIdByName(websiteUrl, apiKey, tenantName, queueName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=INFO&info=queues&tenant=${tenantName}`;
    const response = await fetchData(url);

    if (typeof response === 'string') {
        const queues = response.split('|').reduce((acc, item) => {
            const [id, name] = item.split(':');
            if (id && name) {
                acc[name.trim()] = id.trim();
            }
            return acc;
        }, {});

        console.log('Parsed queues:', queues); // Logowanie przetworzonych kolejek
        return queues[queueName.trim()] || null;
    }

    return null;
}

async function isAgentAlreadyInQueue(websiteUrl, apiKey, tenantName, queueId, extensionNumber) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=QUEUE&tenant=${tenantName}&id=${queueId}&action=list&format=json`;
    const response = await fetchData(url);

    if (response === null) {
        console.log(`Kolejka ${queueId} jest pusta.`);
        return false;
    }

    if (!response || response === 'null' || !Array.isArray(response)) {
        console.error('Nieprawidłowa odpowiedź z API dla sprawdzania agenta:', response);
        return false;
    }

    const agents = response.map(agent => agent.split('-')[0]);
    return agents.includes(extensionNumber);
}

async function addAgentToQueue(websiteUrl, apiKey, tenantName, queueId, extensionNumber) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=QUEUE&tenant=${tenantName}&id=${queueId}&extension=${extensionNumber}&action=add`;
    console.log(`Dodawanie agenta: URL: ${url}`);
    const response = await fetchData(url);
    if (response !== 'OK') {
        throw new Error(response);
    }
}

async function main() {
    try {
        const websiteUrl = websiteUrlInput;
        const apiKey = apiKeyInput;
        const tenantName = selectedTenantName;
        const startTime = performance.now();

        showModalWithProgress();

        let addedCount = 0;

        const extensions = await fetchExtensions(websiteUrl, apiKey, tenantName);

        for (const row of json) {
            const queueName = row['KOLEJKA'];
            const queueId = await getQueueIdByName(websiteUrl, apiKey, tenantName, queueName);
            console.log(`Przetwarzanie kolejki: ${queueName}, ID: ${queueId}`);
            if (!queueId) {
                console.error(`Nie znaleziono ID dla kolejki ${queueName}`);
                continue;
            }

            const agentCount = row['ILOŚĆ'];

            for (let i = 1; i <= agentCount; i++) {
                const agentExtension = row[`EXT_${i}`];
                if (agentExtension) {
                    const extensionNumber = getExtensionNumberByNameOrNumber(extensions, agentExtension);
                    if (extensionNumber) {
                        if (await isAgentAlreadyInQueue(websiteUrl, apiKey, tenantName, queueId, extensionNumber)) {
                            console.log(`Agent ${extensionNumber} jest już w kolejce ${queueName}`);
                        } else {
                            try {
                                await addAgentToQueue(websiteUrl, apiKey, tenantName, queueId, extensionNumber);
                                addedCount++;
                            } catch (error) {
                                console.error(`Błąd podczas dodawania agenta ${agentExtension} do kolejki ${queueName}:`, error);
                            }
                        }
                    } else {
                        console.error(`Nie znaleziono rozszerzenia dla ${agentExtension}`);
                    }
                }
            }

            updateProgress(Math.round(((addedCount) / json.length) * 100));
        }

        updateProgress(100);

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        showFinalMessage({
            addedCount,
            duration
        });

        document.getElementById("modalOkBtn").onclick = function() {
            document.getElementById("myModal").style.display = "none";
            window.location.href = '../choose.html';
        };
    } catch (error) {
        console.error('Błąd:', error);
    }
}
