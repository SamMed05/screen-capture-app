const { ipcRenderer } = require('electron');

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let mediaStream;

const recordingButton = document.getElementById('recording-button');
const videoElement = document.getElementById('screen-video');

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
  const videoOptionsMenu = document.createElement('select');
  inputSources.forEach(source => {
    const option = document.createElement('option');
    option.value = source.id;
    option.text = source.name;
    videoOptionsMenu.appendChild(option);
  });

  // Append the menu to the body before the video element
  document.body.insertBefore(videoOptionsMenu, videoElement);
  videoOptionsMenu.addEventListener('change', () => {
    recordingButton.disabled = false;
    recordingButton.style.backgroundColor = 'var(--primary-color)'; // Green background
    recordingButton.style.border = '2px solid var(--primary-color)'; // Green border
  });
}

// Call the function to create the select box on startup
createSelectBox();

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
            maxHeight: 720,
            cursor: 'never' // Hide the cursor from the recording (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/cursor)
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
  recordingButton.style.backgroundColor = 'var(--primary-color)'; // Reset to initial color
  recordingButton.style.border = '2px solid var(--primary-color)'; // Reset to initial border
}