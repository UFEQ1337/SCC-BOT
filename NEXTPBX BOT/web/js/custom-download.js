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

// Pobieranie listy obiektów custom
async function fetchCustomObjects(websiteUrl, apiKey, selectedTenantName) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&format=json&object=custom&action=list&tenant=${selectedTenantName}`;
    const response = await fetchData(url);
    if (response) {
        return response;
    } else {
        console.error('Niepoprawny format odpowiedzi dla obiektów custom:', response);
        return {};
    }
}

// Pobieranie szczegółów obiektu custom
async function fetchCustomObjectDetails(
    websiteUrl,
    apiKey,
    selectedTenantName,
    objectId
) {
    const url = `${websiteUrl}/pbx/proxyapi.php?key=${apiKey}&reqtype=MANAGEDB&format=json&object=custom&action=get&tenant=${selectedTenantName}&objectid=${objectId}`;
    const response = await fetchData(url);
    if (response) {
        return response;
    } else {
        console.error(
            'Niepoprawny format odpowiedzi dla szczegółów obiektu custom:',
            response
        );
        return {};
    }
}

// Eksportowanie danych do pliku Excel
function exportToExcel(data, sheetName, fileName) {
    try {
        const workbook = xlsx
            .utils
            .book_new();

        // Przygotowanie nagłówków
        const headers = [
            'NAZWA',
            'TYP',
            'PARAM_1',
            'PARAM_2',
            'PARAM_3',
            'PARAM_4',
            'PARAM_5',
            'PARAM_6',
            'PARAM_7',
            'PARAM_8',
            'PARAM_9',
            'PARAM_10',
            'PARAM_11',
            'PARAM_12',
            'PARAM_13',
            'PARAM_14',
            'PARAM_15',
            'PARAM_16',
            'PARAM_17',
            'PARAM_18',
            'PARAM_19',
            'PARAM_20'
        ];

        // Przygotowanie danych do arkusza
        const worksheetData = data.map(({name, type, params}) => ({
            NAZWA: name,
            TYP: type,
            PARAM_1: params[0] || '',
            PARAM_2: params[1] || '',
            PARAM_3: params[2] || '',
            PARAM_4: params[3] || '',
            PARAM_5: params[4] || '',
            PARAM_6: params[5] || '',
            PARAM_7: params[6] || '',
            PARAM_8: params[7] || '',
            PARAM_9: params[8] || '',
            PARAM_10: params[9] || '',
            PARAM_11: params[10] || '',
            PARAM_12: params[11] || '',
            PARAM_13: params[12] || '',
            PARAM_14: params[13] || '',
            PARAM_15: params[14] || '',
            PARAM_16: params[15] || '',
            PARAM_17: params[16] || '',
            PARAM_18: params[17] || '',
            PARAM_19: params[18] || '',
            PARAM_20: params[19] || ''
        }));

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

        // Pobieranie obiektów custom
        const customObjects = await fetchCustomObjects(websiteUrl, apiKey, tenantName);
        console.log('Pobrane obiekty custom:', customObjects);

        // Pobieranie szczegółów każdego obiektu custom
        const customObjectDetails = await Promise.all(
            Object.entries(customObjects).map(async ([
                objectId, {
                    cu_name,
                    ct_name
                }
            ]) => {
                const details = await fetchCustomObjectDetails(
                    websiteUrl,
                    apiKey,
                    tenantName,
                    objectId
                );
                const params = [];
                for (let i = 1; i <= 20; i++) {
                    params.push(details[`cu_param${i}`] || '');
                }
                return {name: cu_name, type: ct_name, params: params};
            })
        );

        // Eksportowanie danych do Excela
        const fileName = `Custom Destination - ${tenantName}.xlsx`;
        exportToExcel(customObjectDetails, 'CustomObjects', fileName);

        // Przekierowanie po zakończeniu
        window.location.href = '../choose.html';
    } catch (error) {
        console.error('Błąd:', error);
    }
}
