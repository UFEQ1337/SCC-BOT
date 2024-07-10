async function fetchVersion() {
    let response;
    try {
        // Najpierw spróbuj pobrać z ../package.json
        response = await fetch('../package.json');
        if (!response.ok) {
            throw new Error('Response not ok');
        }
    } catch (error) {
        // Pomiń błąd, tylko ostrzeżenie w konsoli
        console.warn('Failed to fetch from ../package.json');
        try {
            // Jeśli nie uda się, spróbuj z ../../package.json
            response = await fetch('../../package.json');
            if (!response.ok) {
                throw new Error('Response not ok');
            }
        } catch (error) {
            // Pomiń błąd, tylko ostrzeżenie w konsoli
            console.warn('Failed to fetch from ../../package.json');
            return 'błąd';
        }
    }

    const data = await response.json();
    return data.version;
}

async function displayVersion() {
    const version = await fetchVersion();
    const versionElement = document.createElement('div');
    versionElement.textContent = `Wersja: ${version}`; // Zmieniono na polski
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
