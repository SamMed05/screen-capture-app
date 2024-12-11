const { ipcRenderer } = require('electron');

const recordingButton = document.getElementById('recording-button');
const videoElement = document.getElementById('screen-video');
const zoomToolButton = document.getElementById('zoom-tool');
const panToolButton = document.getElementById('pan-tool');
const smoothToolButton = document.getElementById('smooth-tool');

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let mediaStream;

// Disable the recording button initially
recordingButton.disabled = true;

// Function to create and display the select box
async function createSelectBox() {
  const inputSources = await ipcRenderer.invoke('get-sources');

  // Create a menu to select the screen source
  const videoOptionsMenu = document.createElement('select');
  inputSources.forEach(source => {
    const option = document.createElement('option');
    option.value = source.id;
    option.text = source.name;
    videoOptionsMenu.appendChild(option);
  });

  // Append the menu to the body and wait for user selection
  document.body.appendChild(videoOptionsMenu);
  videoOptionsMenu.addEventListener('change', () => {
    recordingButton.disabled = false;
  });
}

// Call the function to create the select box on startup
createSelectBox();

recordingButton.addEventListener('click', async () => {
  if (isRecording) {
    mediaRecorder.stop();
    recordingButton.textContent = 'Start Recording';
    isRecording = false;
  } else {
    const selectedSourceId = document.querySelector('select').value;
    const inputSources = await ipcRenderer.invoke('get-sources');
    const screenSource = inputSources.find(source => source.id === selectedSourceId);

    if (!screenSource) {
      console.error('No screen source selected or source is not capturable.');
      return;
    }

    // Remove the selection box after a source is selected
    document.querySelector('select').remove();

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenSource.id,
            minWidth: 1280,
            maxWidth: 1280,
            minHeight: 720,
            maxHeight: 720
          }
        }
      });
      videoElement.srcObject = mediaStream;
      videoElement.play();

      // Set up MediaRecorder to record the stream
      mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 5000000 // Set bitrate
      });
      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.onstop = handleStop;
      mediaRecorder.start();

      recordingButton.textContent = 'Stop Recording';
      isRecording = true;
    } catch (err) {
      console.error('Error capturing screen:', err);
    }
  }
});

function handleDataAvailable(event) {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

function handleStop() {
  const blob = new Blob(recordedChunks, {
    type: 'video/webm'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = url;
  a.download = 'recording.webm';
  a.click();
  window.URL.revokeObjectURL(url);

  // Stop the media stream
  mediaStream.getTracks().forEach(track => track.stop());

  // Reset recorded chunks for the next recording
  recordedChunks = [];

  // Reset the video element to remove black screen
  videoElement.srcObject = null;

  // Recreate the select box for the next recording
  createSelectBox();
}

zoomToolButton.addEventListener('click', () => {
  // TODO: Implement zoom feature
  alert('Zoom tool selected');
});

panToolButton.addEventListener('click', () => {
  // TODO: Implement pan feature
  alert('Pan tool selected');
});

smoothToolButton.addEventListener('click', () => {
  // TODO: Implement cursor smoothing feature
  alert('Smooth cursor tool selected');
});

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