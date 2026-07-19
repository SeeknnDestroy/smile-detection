import { APP_STATES, PLAYER_LABELS } from "./config.js";

export function createUi(documentRef = document) {
  const elements = {
    app: documentRef.querySelector("[data-app-root]"),
    status: documentRef.getElementById("status"),
    startButton: documentRef.getElementById("start-button"),
    restartButton: documentRef.getElementById("restart-button"),
    playAgainButton: documentRef.getElementById("play-again"),
    cameraSelect: documentRef.getElementById("camera-select"),
    progressBar: documentRef.getElementById("progress-bar"),
    counters: [
      documentRef.getElementById("smile-counter-1"),
      documentRef.getElementById("smile-counter-2"),
    ],
    modal: documentRef.getElementById("result-modal"),
    winner: documentRef.getElementById("winner"),
    resultSummary: documentRef.getElementById("result-summary"),
  };
  let currentState = APP_STATES.LOADING;
  let cameraCount = 0;
  let cameraBusy = false;

  function updateCameraControl() {
    const canSelectCamera =
      currentState === APP_STATES.READY || currentState === APP_STATES.FINISHED;
    elements.cameraSelect.disabled = cameraBusy || cameraCount < 2 || !canSelectCamera;
  }

  function setState(state, message, tone = "info") {
    elements.app.dataset.state = state;
    elements.status.dataset.tone = tone;
    elements.status.textContent = message;
  }

  function setScores(scores) {
    scores.forEach((score, index) => {
      elements.counters[index].textContent = `${PLAYER_LABELS[index]} Smiles: ${score}`;
    });
  }

  function setProgress(progressFraction) {
    const clamped = Math.min(1, Math.max(0, progressFraction));
    elements.progressBar.style.width = `${Math.round(clamped * 100)}%`;
    elements.progressBar.setAttribute("aria-valuenow", String(Math.round(clamped * 100)));
  }

  function setControls(state) {
    currentState = state;
    const canStart = state === APP_STATES.READY;
    const canRestart = state === APP_STATES.RUNNING;

    elements.startButton.disabled = !canStart;
    elements.restartButton.disabled = !canRestart;
    updateCameraControl();
  }

  function setCameraOptions(cameras, activeDeviceId) {
    elements.cameraSelect.replaceChildren();
    cameraCount = cameras.length;

    if (cameras.length === 0) {
      const option = documentRef.createElement("option");
      option.textContent = "Camera selection unavailable";
      option.value = "";
      elements.cameraSelect.append(option);
      updateCameraControl();
      return;
    }

    cameras.forEach((camera, index) => {
      const option = documentRef.createElement("option");
      option.value = camera.deviceId;
      option.textContent = camera.label || `Camera ${index + 1}`;
      elements.cameraSelect.append(option);
    });

    const hasActiveCamera = cameras.some((camera) => camera.deviceId === activeDeviceId);
    elements.cameraSelect.value = hasActiveCamera ? activeDeviceId : cameras[0].deviceId;
    updateCameraControl();
  }

  function openResult(winner, scores) {
    const summary =
      winner === "Tie"
        ? `Both players finished with ${scores[0]} smile${scores[0] === 1 ? "" : "s"}.`
        : `Person 1: ${scores[0]} smile${scores[0] === 1 ? "" : "s"}. Person 2: ${scores[1]} smile${scores[1] === 1 ? "" : "s"}.`;

    elements.winner.textContent = winner === "Tie" ? "It's a tie." : `${winner} wins.`;
    elements.resultSummary.textContent = summary;
    elements.modal.hidden = false;
  }

  function closeResult() {
    elements.modal.hidden = true;
  }

  return {
    elements,
    render(state) {
      setScores(state.scores);
      setControls(state.status);

      if (state.status === APP_STATES.ERROR) {
        setState(state.status, state.errorMessage, "error");
        return;
      }

      if (state.status === APP_STATES.FINISHED) {
        setState(state.status, state.statusMessage, "success");
        return;
      }

      if (state.status === APP_STATES.RUNNING) {
        setState(state.status, state.statusMessage, "warning");
        return;
      }

      setState(state.status, state.statusMessage, "info");
    },
    setScores,
    setProgress,
    setCameraOptions,
    selectCamera(deviceId) {
      elements.cameraSelect.value = deviceId;
    },
    setCameraBusy(isBusy) {
      cameraBusy = isBusy;
      updateCameraControl();
    },
    setRuntimeStatus(message, tone = "info") {
      elements.status.dataset.tone = tone;
      elements.status.textContent = message;
    },
    openResult,
    closeResult,
  };
}
