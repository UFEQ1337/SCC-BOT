async function fetchVersion() {
    try {
        const response = await fetch('../package.json');
        const data = await response.json();
        return data.version;
    } catch (error) {
        console.error('Error fetching version:', error);
        return 'unknown';
    }
}

async function displayVersion() {
    const version = await fetchVersion();
    const versionElement = document.createElement('div');
    versionElement.textContent = `Wersja: ${version}`;
    versionElement.style.position = 'fixed';
    versionElement.style.bottom = '10px';
    versionElement.style.right = '10px';
    versionElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    versionElement.style.color = 'white';
    versionElement.style.padding = '5px';
    versionElement.style.borderRadius = '5px';
    document.body.appendChild(versionElement);
}

document.addEventListener('DOMContentLoaded', displayVersion);
