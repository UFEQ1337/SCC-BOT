const websiteUrlInput = localStorage.getItem('websiteUrl');
const apiKeyInput = localStorage.getItem('apiKey');
const selectedTenantName = localStorage.getItem('selectedTenantName');

document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.actionButton');

    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const url = `ext/ext-${action}.html`;
            window.location.href = url;
        });
    });
});
