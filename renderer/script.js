const { ipcRenderer } = require('electron');
const mouseTracker = require('./lib/mouseTracker.js');
const recorder = require('./lib/recorder.js');
const toolButtons = require('./lib/toolButtons.js');

mouseTracker.init(ipcRenderer);
recorder.init(ipcRenderer);
toolButtons.init();