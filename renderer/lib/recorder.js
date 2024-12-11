const { ipcRenderer } = require('electron');

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let mediaStream;

const recordingButton = document.getElementById('recording-button');
const videoElement = document.getElementById('screen-video');
const videoSourceSelect = document.getElementById('video-source-select');

// Initialize the recording button appearance
recordingButton.textContent = 'Start Recording 🎥';
recordingButton.classList.add('start');
recordingButton.style.backgroundColor = '#6c757d'; // Grey background
recordingButton.style.border = '2px solid #6c757d'; // Grey border

// Disable the recording button initially
recordingButton.disabled = true;

// Function to create and display the select box
async function createSelectBox() {
  const inputSources = await ipcRenderer.invoke('get-sources');

  // Create a menu to select the screen source
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.text = '--- Select video source ---';
  videoSourceSelect.appendChild(defaultOption);

  inputSources.forEach(source => {
    const option = document.createElement('option');
    option.value = source.id;
    option.text = source.name;
    videoSourceSelect.appendChild(option);
  });

  videoSourceSelect.addEventListener('change', async () => {
    const selectedSourceId = videoSourceSelect.value;
    const isValid = await validateSource(selectedSourceId);
    if (isValid) {
      recordingButton.disabled = false;
      recordingButton.style.backgroundColor = 'var(--primary-color)'; // Green background
      recordingButton.style.border = '2px solid var(--primary-color)'; // Green border
    } else {
      recordingButton.disabled = true;
      recordingButton.style.backgroundColor = '#6c757d'; // Grey background
      recordingButton.style.border = '2px solid #6c757d'; // Grey border
    }
  });
}

// Function to validate the selected video source
async function validateSource(sourceId) {
  if (!sourceId) {
    return false;
  }
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720,
          cursor: 'never' // Hide the cursor from the recording
        }
      }
    });
    mediaStream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.error('Error validating source:', err);
    return false;
  }
}

// Call the function to create the select box on startup
document.addEventListener('DOMContentLoaded', createSelectBox);

recordingButton.addEventListener('click', async () => {
  if (isRecording) {
    mediaRecorder.stop();
    ipcRenderer.send('stop-recording');
    recordingButton.textContent = 'Start Recording 🎥';
    recordingButton.classList.remove('stop');
    recordingButton.classList.add('start');
    recordingButton.style.backgroundColor = 'var(--primary-color)'; // Reset to initial color
    recordingButton.style.border = '2px solid var(--primary-color)'; // Reset to initial border
    isRecording = false;
  } else {
    const selectedSourceId = videoSourceSelect.value;
    const inputSources = await ipcRenderer.invoke('get-sources');
    const screenSource = inputSources.find(source => source.id === selectedSourceId);

    if (!screenSource) {
      console.error('No screen source selected or source is not capturable.');
      return;
    }

    // Remove the selection box after a source is selected
    videoSourceSelect.remove();

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
            maxHeight: 720,
            cursor: 'never' // Hide the cursor from the recording
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

      ipcRenderer.send('start-recording');
      recordingButton.textContent = 'Stop Recording ⏹️';
      recordingButton.classList.remove('start');
      recordingButton.classList.add('stop');
      recordingButton.style.backgroundColor = 'var(--secondary-color)'; // Red background
      recordingButton.style.border = '2px solid var(--secondary-color)'; // Red border
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

  // Reset the recording button appearance
  recordingButton.textContent = 'Start Recording 🎥';
  recordingButton.classList.remove('stop');
  recordingButton.classList.add('start');
  recordingButton.style.backgroundColor = '#6c757d'; // Grey background
  recordingButton.style.border = '2px solid #6c757d'; // Grey border
}

function init(ipc) {
  ipcRenderer = ipc;
}

module.exports = { init };