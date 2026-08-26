let mediaRecorder;
let recordingChunks = [];
let screenStream;
let audioContext;
let timerInterval;
let startedAt;
let totalPausedMs = 0;
let pauseStartedAt = 0;
let captureMode = 'screen';
let selectedSource;
let cameraStream;
let cameraAnimation;
let cropAnimation;

const $ = id => document.getElementById(id);
const showToast = message => { const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };
const setPlansVisible = visible => $('plans-modal').classList.toggle('hidden', !visible);

async function getVideoStream() {
  let region;
  if (captureMode === 'region') region = await window.chequetto.selectRegion();
  const sources = await window.chequetto.getSources();
  selectedSource = captureMode === 'window' ? sources.find(source => source.name !== 'Screen 1') || sources[0] : sources.find(source => source.name.startsWith('Screen')) || sources[0];
  if (!selectedSource) throw new Error('Nenhuma fonte de tela disponível.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: selectedSource.id, minWidth: 1280, minHeight: 720, maxFrameRate: 30 } } });
  if (!region || !region.width || !region.height) return stream;
  const video = document.createElement('video'); video.srcObject = stream; await video.play(); const canvas = document.createElement('canvas'); canvas.width = region.width; canvas.height = region.height; const context = canvas.getContext('2d');
  const draw = () => { context.drawImage(video, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height); cropAnimation = requestAnimationFrame(draw); }; draw(); const cropped = canvas.captureStream(30); stream.getTracks().forEach(track => track.stop()); return cropped;
}

async function getAudioStream() {
  const tracks = [];
  if ($('system-audio').checked) {
    try { tracks.push(...(await navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'desktop' } }, video: false })).getAudioTracks()); } catch { showToast('Som do sistema indisponível nesta plataforma.'); }
  }
  if ($('microphone').checked) tracks.push(...(await navigator.mediaDevices.getUserMedia({ audio: true, video: false })).getAudioTracks());
  return tracks;
}

function updateTimer() {
  if (!startedAt) return;
  const elapsed = Math.floor((Date.now() - startedAt - totalPausedMs) / 1000);
  $('timer').textContent = new Date(elapsed * 1000).toISOString().slice(11, 19);
}
async function startRecording() {
  const license = await window.chequetto.getLicense();
  if (license.expired) { setPlansVisible(true); return; }
  try {
    screenStream = await getVideoStream();
    if ($('camera').checked) {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const screenVideo = document.createElement('video'); const cameraVideo = document.createElement('video');
      screenVideo.srcObject = screenStream; cameraVideo.srcObject = cameraStream;
      await Promise.all([screenVideo.play(), cameraVideo.play()]);
      const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
      const context = canvas.getContext('2d');
      const draw = () => { context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height); const size = Math.round(canvas.width * .2); context.drawImage(cameraVideo, canvas.width - size - 24, canvas.height - Math.round(size * .75) - 24, size, Math.round(size * .75)); cameraAnimation = requestAnimationFrame(draw); };
      draw();
      const composedStream = canvas.captureStream(30); screenStream.getVideoTracks().forEach(track => track.stop()); screenStream = composedStream;
    }
    const audioTracks = await getAudioStream();
    audioTracks.forEach(track => screenStream.addTrack(track));
    mediaRecorder = new MediaRecorder(screenStream, { mimeType: 'video/webm; codecs=vp9,opus' });
    recordingChunks = []; mediaRecorder.ondataavailable = event => event.data.size && recordingChunks.push(event.data);
    mediaRecorder.onstop = async () => { const blob = new Blob(recordingChunks, { type: 'video/webm' }); const path = await window.chequetto.saveRecording(await blob.arrayBuffer(), `chequetto-${Date.now()}.webm`); if (path) showToast(`Gravação salva em ${path}`); };
    mediaRecorder.start(1000); startedAt = Date.now(); totalPausedMs = 0; pauseStartedAt = 0; timerInterval = setInterval(updateTimer, 1000);
    $('record-button').classList.add('recording'); $('record-button b').textContent = 'Parar gravação'; $('pause-button').disabled = false; $('pause-button').textContent = 'Ⅱ';
  } catch (error) { showToast(`Não foi possível iniciar: ${error.message}`); }
}
function stopRecording() { if (!mediaRecorder) return; mediaRecorder.stop(); cancelAnimationFrame(cameraAnimation); cancelAnimationFrame(cropAnimation); screenStream.getTracks().forEach(track => track.stop()); cameraStream?.getTracks().forEach(track => track.stop()); cameraStream = null; clearInterval(timerInterval); mediaRecorder = null; startedAt = null; totalPausedMs = 0; pauseStartedAt = 0; $('record-button').classList.remove('recording'); $('record-button b').textContent = 'Iniciar gravação'; $('pause-button').disabled = true; $('pause-button').textContent = 'Ⅱ'; $('timer').textContent = '00:00:00'; }
function togglePause() { if (!mediaRecorder) return; if (mediaRecorder.state === 'recording') { mediaRecorder.pause(); pauseStartedAt = Date.now(); $('pause-button').textContent = '▶'; } else if (mediaRecorder.state === 'paused') { totalPausedMs += Date.now() - pauseStartedAt; pauseStartedAt = 0; mediaRecorder.resume(); $('pause-button').textContent = 'Ⅱ'; } }
async function screenshot() { try { const stream = await getVideoStream(); const video = document.createElement('video'); video.srcObject = stream; await video.play(); await new Promise(resolve => setTimeout(resolve, 100)); const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext('2d').drawImage(video, 0, 0); stream.getTracks().forEach(track => track.stop()); const path = await window.chequetto.saveScreenshot(canvas.toDataURL('image/png')); if (path) showToast(`Captura salva em ${path}`); } catch (error) { showToast(`Captura indisponível: ${error.message}`); } }

$('record-button').addEventListener('click', () => mediaRecorder ? stopRecording() : startRecording());
$('pause-button').addEventListener('click', togglePause);
$('screenshot-button').addEventListener('click', screenshot); $('bar-screenshot').addEventListener('click', screenshot);
$('plans-button').addEventListener('click', () => setPlansVisible(true)); $('close-plans').addEventListener('click', () => setPlansVisible(false));
$('capture-mode').addEventListener('click', event => { if (event.target.tagName !== 'BUTTON') return; captureMode = event.target.dataset.mode; document.querySelectorAll('#capture-mode button').forEach(button => button.classList.toggle('active', button === event.target)); $('preview-title').textContent = { screen: 'Tela inteira', window: 'Janela específica', region: 'Área personalizada' }[captureMode]; $('source-label').textContent = { screen: 'Todo o seu desktop', window: 'Escolha uma janela ao gravar', region: 'Selecione com o mouse ao gravar' }[captureMode]; });
$('plans').addEventListener('click', async event => { const button = event.target.closest('[data-plan]'); if (!button) return; await window.chequetto.activatePlan(button.dataset.plan); $('license-label').textContent = 'Chequetto Pro'; setPlansVisible(false); showToast('Plano ativado localmente.'); });
window.chequetto.onHotkey(command => command === 'toggle-recording' ? (mediaRecorder ? stopRecording() : startRecording()) : togglePause());
window.chequetto.getLicense().then(license => { $('license-label').textContent = license.plan ? 'Chequetto Pro' : license.expired ? 'Teste expirado' : 'Teste gratuito'; if (license.expired) setPlansVisible(true); });