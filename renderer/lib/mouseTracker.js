const { ipcRenderer } = require('electron');

const mouseEvents = [];

document.addEventListener('mousemove', (event) => {
  const mouseEvent = {
    type: 'move',
    timestamp: Date.now(),
    x: event.clientX,
    y: event.clientY
  };
  mouseEvents.push(mouseEvent);
  ipcRenderer.send('mouse-event', mouseEvent);
});

document.addEventListener('click', (event) => {
  mouseEvents.push({
    type: 'click',
    timestamp: Date.now(),
    x: event.clientX,
    y: event.clientY
  });
});

document.addEventListener('mousedown', (event) => {
  mouseEvents.push({
    type: 'mousedown',
    timestamp: Date.now(),
    x: event.clientX,
    y: event.clientY
  });
});

document.addEventListener('mouseup', (event) => {
  mouseEvents.push({
    type: 'mouseup',
    timestamp: Date.now(),
    x: event.clientX,
    y: event.clientY
  });
});