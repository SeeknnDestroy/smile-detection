import test from "node:test";
import assert from "node:assert/strict";

import {
  getStreamDeviceId,
  listCameras,
  openCamera,
  openCameraByDeviceId,
} from "../src/camera.js";

function createStream(deviceId) {
  const track = {
    stopped: false,
    getSettings() {
      return { deviceId };
    },
    stop() {
      this.stopped = true;
    },
  };

  return {
    track,
    getTracks() {
      return [track];
    },
    getVideoTracks() {
      return [track];
    },
  };
}

function videoInput(deviceId, label = "") {
  return { kind: "videoinput", deviceId, label };
}

test("opens the default front-facing camera when no index is configured", async () => {
  const defaultStream = createStream("default-camera");
  const calls = [];
  const mediaDevices = {
    async getUserMedia(constraints) {
      calls.push(constraints);
      return defaultStream;
    },
    async enumerateDevices() {
      assert.fail("default camera selection should not enumerate devices");
    },
  };

  const stream = await openCamera(mediaDevices);

  assert.equal(stream, defaultStream);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].video.facingMode, "user");
});

test("opens a valid indexed camera and stops the temporary default stream", async () => {
  const defaultStream = createStream("default-camera");
  const selectedStream = createStream("camera-2");
  const calls = [];
  const mediaDevices = {
    async getUserMedia(constraints) {
      calls.push(constraints);
      return calls.length === 1 ? defaultStream : selectedStream;
    },
    async enumerateDevices() {
      return [videoInput("camera-1"), { kind: "audioinput", deviceId: "mic" }, videoInput("camera-2")];
    },
  };

  const stream = await openCamera(mediaDevices, { cameraIndex: 1 });

  assert.equal(stream, selectedStream);
  assert.equal(calls[1].video.deviceId.exact, "camera-2");
  assert.equal(defaultStream.track.stopped, true);
});

test("falls back to the default stream when the requested index is unavailable", async () => {
  const defaultStream = createStream("camera-1");
  let requestCount = 0;
  const mediaDevices = {
    async getUserMedia() {
      requestCount += 1;
      return defaultStream;
    },
    async enumerateDevices() {
      return [videoInput("camera-1")];
    },
  };

  const stream = await openCamera(mediaDevices, { cameraIndex: 1 });

  assert.equal(stream, defaultStream);
  assert.equal(requestCount, 1);
  assert.equal(defaultStream.track.stopped, false);
});

test("falls back to the default stream when no cameras are enumerated", async () => {
  const defaultStream = createStream("default-camera");
  let requestCount = 0;
  const mediaDevices = {
    async getUserMedia() {
      requestCount += 1;
      return defaultStream;
    },
    async enumerateDevices() {
      return [];
    },
  };

  const stream = await openCamera(mediaDevices, { cameraIndex: 0 });

  assert.equal(stream, defaultStream);
  assert.equal(requestCount, 1);
  assert.equal(defaultStream.track.stopped, false);
});

test("falls back to the default stream when camera enumeration fails", async () => {
  const defaultStream = createStream("default-camera");
  const mediaDevices = {
    async getUserMedia() {
      return defaultStream;
    },
    async enumerateDevices() {
      throw new Error("enumeration failed");
    },
  };

  const stream = await openCamera(mediaDevices, { cameraIndex: 0 });

  assert.equal(stream, defaultStream);
  assert.equal(defaultStream.track.stopped, false);
});

test("falls back without stopping the default stream when indexed selection fails", async () => {
  const defaultStream = createStream("camera-1");
  let requestCount = 0;
  const mediaDevices = {
    async getUserMedia() {
      requestCount += 1;
      if (requestCount === 2) {
        throw new Error("camera is busy");
      }
      return defaultStream;
    },
    async enumerateDevices() {
      return [videoInput("camera-1"), videoInput("camera-2")];
    },
  };

  const stream = await openCamera(mediaDevices, { cameraIndex: 1 });

  assert.equal(stream, defaultStream);
  assert.equal(defaultStream.track.stopped, false);
});

test("uses the injected mediaDevices object for direct device selection", async () => {
  const selectedStream = createStream("camera-2");
  let receivedConstraints;
  const mediaDevices = {
    async getUserMedia(constraints) {
      receivedConstraints = constraints;
      return selectedStream;
    },
  };

  const stream = await openCameraByDeviceId(mediaDevices, "camera-2");

  assert.equal(stream, selectedStream);
  assert.equal(receivedConstraints.video.deviceId.exact, "camera-2");
  assert.equal(receivedConstraints.video.width.ideal, 1280);
  assert.equal(receivedConstraints.video.height.ideal, 720);
});

test("lists only video inputs and reads the active stream device id", async () => {
  const mediaDevices = {
    async enumerateDevices() {
      return [videoInput("camera-1", "Built-in Camera"), { kind: "audioinput", deviceId: "mic" }];
    },
  };

  const cameras = await listCameras(mediaDevices);

  assert.deepEqual(cameras, [videoInput("camera-1", "Built-in Camera")]);
  assert.equal(getStreamDeviceId(createStream("camera-1")), "camera-1");
});
