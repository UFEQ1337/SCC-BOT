const {app, BrowserWindow} = require('electron');
const path = require('path');

function createWindow() {
    let win = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, 'web', 'img', 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.setMenu(null);

    win.loadFile('web/index.html');

    win.webContents.openDevTools();

}

app
    .whenReady()
    .then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
