const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    // frame: false,
    // transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);

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

// Handle screen recording request
ipcMain.handle('get-sources', async (event) => {
  const inputSources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
  return inputSources;
});