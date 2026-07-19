const PREFERRED_WIDTH = 1280;
const PREFERRED_HEIGHT = 720;

function createVideoConstraints(deviceId = null) {
  return {
    audio: false,
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
      width: { ideal: PREFERRED_WIDTH },
      height: { ideal: PREFERRED_HEIGHT },
    },
  };
}

export function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function getStreamDeviceId(stream) {
  return stream?.getVideoTracks?.()[0]?.getSettings?.().deviceId ?? "";
}

export async function listCameras(mediaDevices) {
  const devices = await mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

export function openCameraByDeviceId(mediaDevices, deviceId) {
  return mediaDevices.getUserMedia(createVideoConstraints(deviceId));
}

export async function openCamera(mediaDevices, { cameraIndex = null } = {}) {
  const defaultStream = await mediaDevices.getUserMedia(createVideoConstraints());

  if (cameraIndex === null) {
    return defaultStream;
  }

  try {
    const cameras = await listCameras(mediaDevices);
    const selectedCamera =
      Number.isInteger(cameraIndex) && cameraIndex >= 0 ? cameras[cameraIndex] : null;

    if (!selectedCamera || getStreamDeviceId(defaultStream) === selectedCamera.deviceId) {
      return defaultStream;
    }

    const selectedStream = await openCameraByDeviceId(mediaDevices, selectedCamera.deviceId);
    stopStream(defaultStream);
    return selectedStream;
  } catch {
    return defaultStream;
  }
}
