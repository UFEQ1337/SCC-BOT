const websiteUrlInput = localStorage.getItem('websiteUrl');
const apiKeyInput = localStorage.getItem('apiKey');
console.log(websiteUrlInput);
console.log(apiKeyInput);

document.addEventListener('DOMContentLoaded', function() {
    const tenantsData = localStorage.getItem('tenants');
    let tenants;


    try {
        tenants = JSON.parse(tenantsData);
        if (typeof tenants !== 'object' || tenants === null) {
            throw new Error('Dane tenantów nie są w oczekiwanym formacie');
        }
    } catch (error) {
        console.error('Błąd podczas przetwarzania danych tenantów:', error);
        tenants = {};
    }

    const select = document.getElementById('tenantSelect');

    for (const [id, data] of Object.entries(tenants)) {
        const option = document.createElement('option');
        option.value = data.te_id;
        option.textContent = data.te_name;
        select.appendChild(option);
    }

    document.getElementById('tenantForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const selectedTenantId = select.value;
        const selectedTenantName = select.options[select.selectedIndex].text;
        localStorage.setItem('selectedTenantName', selectedTenantName);
        window.location.href = 'choose.html';
    });
});

document.getElementById('tenantSelect').addEventListener('click', function() {
    const container = this.parentNode;
    
    if (container.classList.contains('open')) {
        container.classList.remove('open');
    } else {
        container.classList.add('open');
    }
});
