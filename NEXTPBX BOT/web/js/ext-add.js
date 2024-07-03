const xlsx = require('xlsx');
let json = null;

const websiteUrlInput = localStorage.getItem('websiteUrl');
const apiKeyInput = localStorage.getItem('apiKey');
const selectedTenantName = localStorage.getItem('selectedTenantName');

console.log(websiteUrlInput);
console.log(apiKeyInput);
console.log(selectedTenantName);

document.addEventListener('DOMContentLoaded', initializeEventListeners);

function showModalWithProgress() {
    var modal = document.getElementById("myModal");
    var span = document.getElementsByClassName("close")[0];
    var okBtn = document.getElementById("modalOkBtn");

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
    var elem = document.getElementById("myProgress");
    elem.style.width = progress + '%'; 
    elem.textContent = progress + '%'; 
}

function showFinalMessage({ addedCount, skippedCount, skippedEXTs, duration }) {
    const modalText = document.getElementById("progressText");
    let message = `Dodano EXT: ${addedCount}<br>`;
    if (skippedCount > 0) {
        message += `Pominięto (już istnieją): ${skippedCount}<br>`;
        message += `Pominięte EXT: ${skippedEXTs.join(", ")}<br>`;
    }
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
            const workbook = xlsx.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            json = xlsx.utils.sheet_to_json(worksheet, {defval:""});

            const didValues = json.map(row => row.EXT);
            const duplicates = didValues.filter((value, index, self) => self.indexOf(value) !== index && value !== "");

            if (duplicates.length > 0) {
                alert('Wykryto duplikaty w EXT: ' + [...new Set(duplicates)].join(', '));
                return;
            }

            let html = "<table><thead><tr>";
            const keysWithValues = Object.keys(json[0]);
            keysWithValues.forEach(key => {
                html += `<th>${key}</th>`;
            });
            html += "</tr></thead><tbody>";

            json.slice(0, 3).forEach(row => {
                html += "<tr>";
                keysWithValues.forEach(key => {
                    const value = row.hasOwnProperty(key) ? row[key] : "";
                    html += `<td>${value}</td>`;
                });
                html += "</tr>";
            });
            html += "</tbody></table>";
            excelDataContainer.innerHTML = html;

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

async function fetchData(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    try {
        const json = await response.json();
        return json;
    } catch (error) {
        console.error('Błąd podczas przetwarzania JSON:', error);
        throw error;
    }
}


async function fetchExtensions(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&action=list&object=extension&tenant=${selectedTenantName}`;
    return await fetchData(url);
}
async function fetchQueues(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=INFO&info=queues&tenant=${selectedTenantName}&format=json`;
    return await fetchData(url);
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

function generatePassword() {
    const length = 16;
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  }

  