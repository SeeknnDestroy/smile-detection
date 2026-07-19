import { FaceApiSmileDetector } from "./faceApiDetector.js";
import {
  getStreamDeviceId,
  listCameras,
  openCamera,
  openCameraByDeviceId,
  stopStream,
} from "./camera.js";
import { APP_CONFIG, APP_STATES } from "./config.js";
import {
  createErrorState,
  createInitialState,
  createReadyState,
  finishRound,
  startRound,
  updateScores,
} from "./game.js";
import { createTrackerState, updateTracker } from "./smileTracker.js";
import { createUi } from "./ui.js";

class SmileDetectionApp {
  constructor({ documentRef = document, windowRef = window, faceapi, cameraIndex = null }) {
    this.document = documentRef;
    this.window = windowRef;
    this.faceapi = faceapi;
    this.cameraIndex = cameraIndex;
    this.ui = createUi(documentRef);
    this.video = documentRef.getElementById("video");
    this.overlay = documentRef.getElementById("overlay");
    this.detector = new FaceApiSmileDetector(faceapi);
    this.state = createInitialState();
    this.tracker = createTrackerState();
    this.stream = null;
    this.loopTimerId = null;
    this.roundTimerId = null;
    this.processingFrame = false;
    this.disposed = false;
  }

  async init() {
    this.bindEvents();
    this.ui.render(this.state);

    try {
      if (!this.faceapi) {
        throw new Error("face-api.js failed to load.");
      }

      await this.detector.loadModels();
      this.stream = await openCamera(this.window.navigator.mediaDevices, {
        cameraIndex: this.cameraIndex,
      });
      this.video.srcObject = this.stream;
      await this.waitForVideo();

      this.state = createReadyState();
      this.ui.setProgress(0);
      this.ui.closeResult();
      this.ui.render(this.state);
      await this.refreshCameraOptions();
    } catch (error) {
      this.handleFatalError(error);
    }
  }

  bindEvents() {
    this.ui.elements.startButton.addEventListener("click", () => {
      this.beginRound();
    });
    this.ui.elements.restartButton.addEventListener("click", () => {
      this.beginRound();
    });
    this.ui.elements.playAgainButton.addEventListener("click", () => {
      this.beginRound();
    });
    this.ui.elements.cameraSelect.addEventListener("change", (event) => {
      void this.switchCamera(event.target.value);
    });
    this.window.addEventListener("beforeunload", () => {
      this.dispose();
    });
  }

  async refreshCameraOptions() {
    try {
      const cameras = await listCameras(this.window.navigator.mediaDevices);
      this.ui.setCameraOptions(cameras, getStreamDeviceId(this.stream));
    } catch {
      this.ui.setCameraOptions([], "");
    }
  }

  async switchCamera(deviceId) {
    if (
      this.disposed ||
      this.state.status === APP_STATES.LOADING ||
      this.state.status === APP_STATES.RUNNING ||
      this.state.status === APP_STATES.ERROR ||
      !deviceId ||
      deviceId === getStreamDeviceId(this.stream)
    ) {
      return;
    }

    const previousStream = this.stream;
    let nextStream = null;

    this.ui.setCameraBusy(true);
    this.ui.setRuntimeStatus("Switching camera...");

    try {
      nextStream = await openCameraByDeviceId(this.window.navigator.mediaDevices, deviceId);
      this.video.srcObject = nextStream;
      await this.waitForVideo();

      this.stream = nextStream;
      stopStream(previousStream);
      await this.refreshCameraOptions();
      this.ui.render(this.state);
    } catch (error) {
      stopStream(nextStream);
      this.video.srcObject = previousStream;
      this.ui.selectCamera(getStreamDeviceId(previousStream));

      try {
        await this.video.play();
      } catch {
        // The existing stream remains attached; a later user gesture can resume playback.
      }

      const message =
        error?.name === "NotAllowedError"
          ? "Camera access was denied. Keep using the current camera or update browser permissions."
          : "That camera could not be opened. The current camera is still active.";
      this.ui.setRuntimeStatus(message, "error");
    } finally {
      this.ui.setCameraBusy(false);
    }
  }

  async waitForVideo() {
    if (this.video.readyState >= this.window.HTMLMediaElement.HAVE_METADATA) {
      await this.video.play();
      return;
    }

    await new Promise((resolve, reject) => {
      const onLoadedMetadata = async () => {
        cleanup();
        try {
          await this.video.play();
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      const onError = () => {
        cleanup();
        reject(new Error("The webcam stream could not be started."));
      };
      const cleanup = () => {
        this.video.removeEventListener("loadedmetadata", onLoadedMetadata);
        this.video.removeEventListener("error", onError);
      };

      this.video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
      this.video.addEventListener("error", onError, { once: true });
    });
  }

  beginRound() {
    if (this.disposed || this.state.status === APP_STATES.LOADING || this.state.status === APP_STATES.ERROR) {
      return;
    }

    this.clearTimers();
    this.tracker = createTrackerState();
    this.state = startRound();
    this.ui.closeResult();
    this.ui.render(this.state);
    this.ui.setProgress(0);
    this.scheduleLoop(0);
    this.roundTimerId = this.window.setTimeout(() => {
      this.completeRound();
    }, APP_CONFIG.ROUND_DURATION_MS);
  }

  async processFrame() {
    if (this.processingFrame || this.state.status !== APP_STATES.RUNNING) {
      return;
    }

    this.processingFrame = true;

    try {
      const displaySize = this.detector.syncOverlay(this.overlay, this.video);

      if (!displaySize) {
        this.scheduleLoop(APP_CONFIG.DETECTION_INTERVAL_MS);
        return;
      }

      const { detections, faces } = await this.detector.detect(this.video);
      const now = Date.now();
      const update = updateTracker(this.tracker, faces, now, {
        frameWidth: displaySize.width,
      });

      this.tracker = update.state;
      this.state = updateScores(this.state, this.tracker.players.map((player) => player.score));
      this.ui.render(this.state);
      this.ui.setProgress((now - this.state.startedAt) / APP_CONFIG.ROUND_DURATION_MS);
      this.ui.setRuntimeStatus(getRuntimeMessage(update.visibleFaceCount), getRuntimeTone(update.visibleFaceCount));
      this.detector.draw(this.overlay, detections, displaySize);
    } catch (error) {
      this.handleFatalError(error);
      return;
    } finally {
      this.processingFrame = false;
    }

    if (this.state.status === APP_STATES.RUNNING) {
      this.scheduleLoop(APP_CONFIG.DETECTION_INTERVAL_MS);
    }
  }

  scheduleLoop(delayMs) {
    this.window.clearTimeout(this.loopTimerId);
    this.loopTimerId = this.window.setTimeout(() => {
      void this.processFrame();
    }, delayMs);
  }

  completeRound() {
    if (this.state.status !== APP_STATES.RUNNING) {
      return;
    }

    this.clearTimers();
    this.state = finishRound(updateScores(this.state, this.tracker.players.map((player) => player.score)));
    this.ui.render(this.state);
    this.ui.setProgress(1);
    this.ui.openResult(this.state.winner, this.state.scores);
  }

  clearTimers() {
    this.window.clearTimeout(this.loopTimerId);
    this.window.clearTimeout(this.roundTimerId);
    this.loopTimerId = null;
    this.roundTimerId = null;
  }

  handleFatalError(error) {
    this.clearTimers();
    this.detector.clear(this.overlay);
    this.ui.closeResult();

    let message = "An unexpected runtime error occurred.";

    if (error?.name === "NotAllowedError") {
      message = "Camera access was denied. Allow webcam access and reload the page.";
    } else if (error?.name === "NotFoundError") {
      message = "No camera was found. Connect a webcam and try again.";
    } else if (error?.message) {
      message = error.message;
    }

    this.state = createErrorState(message);
    this.ui.render(this.state);
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.clearTimers();
    this.detector.clear(this.overlay);

    if (this.stream) {
      stopStream(this.stream);
    }
  }
}

function getRuntimeMessage(visibleFaceCount) {
  if (visibleFaceCount === 0) {
    return "No faces detected. Center both players in frame.";
  }

  if (visibleFaceCount === 1) {
    return "One face detected. The second counter will remain idle until another face appears.";
  }

  if (visibleFaceCount > 2) {
    return "More than two faces detected. The game uses the two leftmost lanes.";
  }

  return "Two faces detected. Hold your left/right positions while the round is running.";
}

function getRuntimeTone(visibleFaceCount) {
  if (visibleFaceCount === 2) {
    return "success";
  }

  return visibleFaceCount === 0 ? "error" : "warning";
}

const app = new SmileDetectionApp({
  faceapi: window.faceapi,
});

void app.init();
