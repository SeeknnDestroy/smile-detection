// Get the video element
const video = document.getElementById("video");

async function startSmileDetection() {
  try {
    // Load the models
    await faceapi.nets.ssdMobilenetv1.loadFromUri("./weights");
    await faceapi.nets.faceLandmark68Net.loadFromUri("./weights");
    await faceapi.nets.faceExpressionNet.loadFromUri("./weights");

    // Start the video stream
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
    })
      .catch((error) => {
        console.error("Could not access the webcam: ",error);
    });

    // Initialize the smile counter
    let smileCounter = 0;

    video.addEventListener("play", () => {
      // Create a canvas element that matches the size of the video element
      const canvas = faceapi.createCanvasFromMedia(video);
      // Insert the canvas element after the video element
      document.body.insertBefore(canvas, document.getElementById("video").nextSibling);
      // Display the canvas element above the video element
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);
      // Detect faces and their expressions in real-time
      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceExpressions();
        // Resize the detected boxes to match the video element
        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );
        // Clear the canvas
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        // Draw the bounding boxes on the canvas
        faceapi.draw.drawDetections(canvas, resizedDetections);
        // Draw the face expressions on the canvas
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        // Count the number of smiles
        resizedDetections.forEach((detection) => {
          if (detection.expressions.happy > 0.7) {
            smileCounter++;
          }
        });

        // Update the smile counter display
        document.querySelector(
          "#smile-counter"
        ).textContent = `Smiles: ${smileCounter}`;
      }, 100);
    });
  } catch (error) {
    console.error("An error occured: ",error);
  }
}

// Add event listener to the start button
document.getElementById('start-button').addEventListener('click', startSmileDetection);