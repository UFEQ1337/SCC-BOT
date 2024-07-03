const websiteUrlInput = localStorage.getItem('websiteUrl');
const apiKeyInput = localStorage.getItem('apiKey');
const selectedTenantName = localStorage.getItem('selectedTenantName');

document
    .getElementById('didButton')
    .addEventListener('click', function () {
        const selectedTenantName = localStorage.getItem('selectedTenantName');
        if (selectedTenantName) {
            window.location.href = 'did.html';
        } else {
            alert('Nie wybrano tenant. Przechodzenie do did.html');
            window.location.href = 'did.html';
        }
    });

// document
//     .getElementById('etxButton')
//     .addEventListener('click', function () {
//         const selectedTenantName = localStorage.getItem('selectedTenantName');
//         if (selectedTenantName) {
//             window.location.href = 'ext.html';
//         } else {
//             alert('Nie wybrano tenant. Przechodzenie do did.html');
//             window.location.href = 'ext.html';
//         }
//     });

document
    .getElementById('queueButton')
    .addEventListener('click', function () {
        const selectedTenantName = localStorage.getItem('selectedTenantName');
        if (selectedTenantName) {
            window.location.href = 'queue.html';
        } else {
            alert('Nie wybrano tenant. Przechodzenie do did.html');
            window.location.href = 'ext.html';
        }
    });

document
    .getElementById('customButton')
    .addEventListener('click', function () {
        const selectedTenantName = localStorage.getItem('selectedTenantName');
        if (selectedTenantName) {
            window.location.href = 'custom.html';
        } else {
            alert('Nie wybrano tenant. Przechodzenie do did.html');
            window.location.href = 'ext.html';
        }
    });