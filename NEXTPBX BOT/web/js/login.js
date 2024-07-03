document.getElementById('apiQueryForm').addEventListener('submit', function(event) {
    event.preventDefault();

    let websiteUrlValue = document.getElementById('websiteUrl').value;
    const apiKey = document.getElementById('apiKey').value;
    let apiUrl;

    try {
        apiUrl = new URL(websiteUrlValue);
    } catch (error) {
        websiteUrlValue = 'http://' + websiteUrlValue;
        try {
            apiUrl = new URL(websiteUrlValue);
        } catch (error) {
            alert('Wprowadzony adres URL jest niepoprawny.');
            return;
        }
    }

    if (!apiUrl.pathname.endsWith('pbx/proxyapi.php')) {
        apiUrl.pathname += 'pbx/proxyapi.php';
    }

    apiUrl.searchParams.set('key', apiKey);
    apiUrl.searchParams.set('reqtype', 'MANAGEDB');
    apiUrl.searchParams.set('object', 'TENANT');
    apiUrl.searchParams.set('action', 'list');

    fetch(apiUrl.toString())
    .then(response => response.text())
    .then(text => {
        try {
            const data = JSON.parse(text);
            localStorage.setItem('tenants', JSON.stringify(data));

            const websiteUrlInput = document.getElementById('websiteUrl');
            const apiKeyInput = document.getElementById('apiKey');
        
            localStorage.setItem('websiteUrl', websiteUrlInput.value);
            localStorage.setItem('apiKey', apiKeyInput.value);

            window.location.href = 'tenants.html';
        } catch (error) {
            alert('Wystąpił błąd z zapytaniem API: ' + text);
        }
    })
    .catch(error => {
        alert('Wystąpił błąd sieciowy: ' + error.message);
    });

});


