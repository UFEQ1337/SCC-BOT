const xlsx = require('xlsx');

// Pobierz dane z localStorage
const websiteUrlInput = localStorage.getItem('websiteUrl');
const apiKeyInput = localStorage.getItem('apiKey');
const selectedTenantName = localStorage.getItem('selectedTenantName');

document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', main);
});

// Funkcja do pobierania danych z serwera
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        return json;
    } catch (error) {
        console.error('Błąd podczas pobierania danych:', error);
        throw error;
    }
}

// Pobieranie listy kolejek
async function fetchQueues(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=INFO&info=queues&tenant=${selectedTenantName}&format=json`;
    const response = await fetchData(url);
    if (response) {
        return response;
    } else {
        console.error('Niepoprawny format odpowiedzi dla kolejek:', response);
        return {};
    }
}

// Pobieranie członków kolejki
async function fetchQueueMembers(
    websiteUrl,
    apiKey,
    selectedTenantName,
    queueId
) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=queue&action=list&tenant=${selectedTenantName}&format=json&id=${queueId}`;
    const response = await fetchData(url);
    if (response && Array.isArray(response)) {
        return response;
    } else {
        console.warn('Brak członków dla kolejki o ID:', queueId);
        return [];
    }
}

// Pobieranie listy rozszerzeń
async function fetchExtensions(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=managedb&action=list&tenant=${selectedTenantName}&format=json&object=extension`;
    return await fetchData(url);
}

// Mapowanie członków kolejki na rozszerzenia
function mapExtensionsToQueueMembers(queueMembers, extensions) {
    const extensionsArray = Object.values(extensions); // Konwertowanie obiektu na tablicę
    return queueMembers.map(member => {
        const extensionNumber = member.split('-')[0];
        const extension = extensionsArray.find(
            ext => ext.ex_number === extensionNumber
        );
        return extension
            ? extension.ex_name
            : `Nieznane rozszerzenie ${extensionNumber}`;
    });
}

// Eksportowanie danych do pliku Excel
function exportToExcel(data, sheetName, fileName) {
    try {
        const workbook = xlsx
            .utils
            .book_new();

        // Przygotowanie nagłówków
        const headers = ['KOLEJKA', 'ILOŚĆ'];

        // Przygotowanie danych do arkusza
        const worksheetData = data.map(({queueName, members}) => {
            const memberList = members === 'Kolejka jest pusta'
                ? []
                : members.split(', ');
            const row = {
                KOLEJKA: queueName,
                ILOŚĆ: memberList.length
            };
            memberList.forEach((member, index) => {
                row[`EXT_${index + 1}`] = member; // Używamy dynamicznego klucza, aby kolumny miały unikalne nazwy
            });
            return row;
        });

        // Konwertowanie danych do formatu arkusza
        const worksheet = xlsx
            .utils
            .json_to_sheet(worksheetData, {header: headers});

        // Dodanie arkusza do workbooka
        xlsx
            .utils
            .book_append_sheet(workbook, worksheet, sheetName);

        // Zapisanie workbooka do bloba
        const workbookBlob = xlsx.write(workbook, {
            bookType: 'xlsx',
            type: 'array'
        });
        const blob = new Blob([workbookBlob], {type: "application/octet-stream"});

        // Funkcja do pobierania bloba jako pliku
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

        // Wywołanie funkcji pobierania pliku
        downloadBlob(blob, fileName);
    } catch (error) {
        console.error('Błąd podczas eksportowania do Excela:', error);
        throw error;
    }
}

// Główna funkcja wykonywana po kliknięciu przycisku
async function main() {
    try {
        const websiteUrl = websiteUrlInput;
        const apiKey = apiKeyInput;
        const tenantName = selectedTenantName;

        // Pobieranie kolejek
        const queues = await fetchQueues(websiteUrl, apiKey, tenantName);
        console.log('Pobrane kolejki:', queues);

        // Pobieranie rozszerzeń
        const extensions = await fetchExtensions(websiteUrl, apiKey, tenantName);
        console.log('Pobrane rozszerzenia:', extensions);

        // Pobieranie członków każdej kolejki i mapowanie na rozszerzenia
        const queueData = await Promise.all(
            Object.entries(queues).map(async ([queueId, queueName]) => {
                const queueMembers = await fetchQueueMembers(
                    websiteUrl,
                    apiKey,
                    tenantName,
                    queueId
                );
                if (!queueMembers.length) {
                    return {queueName, members: 'Kolejka jest pusta'};
                }
                const memberNames = mapExtensionsToQueueMembers(queueMembers, extensions);
                return {queueName, members: memberNames.join(', ')};
            })
        );

        // Eksportowanie danych do Excela
        const fileName = `Queue Agents - ${tenantName}.xlsx`;
        exportToExcel(queueData, 'Queues', fileName);

        // Przekierowanie po zakończeniu
        window.location.href = '../choose.html';
    } catch (error) {
        console.error('Błąd:', error);
    }
}
