// Get the video element
const video = document.getElementById('video')

async function startSmileDetection() {
  try {
    // Load the models
    // await faceapi.nets.tinyFaceDetector.loadFromUri('./weights')
    await faceapi.nets.ssdMobilenetv1.loadFromUri('./weights')
    await faceapi.nets.faceLandmark68Net.loadFromUri('./weights')
    await faceapi.nets.faceExpressionNet.loadFromUri('./weights')

    // Start the video stream
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream
      })
      .catch(error => {
        console.error('Could not access the webcam:', error);
        // Display an error message to the user
      });

    // Initialize the smile counters
    const MIN_CONSECUTIVE_FRAMES = 10;
    let smileCounter1 = 0
    let smileCounter2 = 0
    let consecutiveSmiles1 = 0;
    let consecutiveSmiles2 = 0; 
    let isSmiling1 = false;
    let isSmiling2 = false; 
    // Store references to DOM elements
    const smileCounterElement1 = document.querySelector('#smile-counter-1')
    const smileCounterElement2 = document.querySelector('#smile-counter-2')

    video.addEventListener('play', () => {
      // Create a canvas element that matches the size of the video element
      const canvas = faceapi.createCanvasFromMedia(video)
      // Append the canvas element to the document body
      document.body.append(canvas)
      // Display the canvas element above the video element
      const displaySize = { width: video.width, height: video.height }
      faceapi.matchDimensions(canvas, displaySize)
      // Detect faces and their expressions in real-time
      setInterval(async () => {
        // Check if the video is playing before performing face detection
        if (!video.paused && !video.ended) {
          // const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
          const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options()).withFaceLandmarks().withFaceExpressions()
          // Resize the detected boxes to match the video element
          const resizedDetections = faceapi.resizeResults(detections, displaySize)
          // Clear the canvas
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
          // Draw the bounding boxes on the canvas
          faceapi.draw.drawDetections(canvas, resizedDetections)
          // Draw the face expressions on the canvas
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
                  
          // Count the number of smiles for each person
          if (resizedDetections.length >= 1) {
            if (resizedDetections[0].expressions.happy > 0.7) {
              consecutiveSmiles1++;
              if (consecutiveSmiles1 >= MIN_CONSECUTIVE_FRAMES && !isSmiling1) {
                smileCounter1++;
                isSmiling1 = true;
                consecutiveSmiles1 = 0;
              }
            } else {
              isSmiling1 = false;
              consecutiveSmiles1 = 0;
            }
            // Update the smile counter display using the stored reference to the DOM element
            smileCounterElement1.textContent = `Person 1 Smiles: ${smileCounter1}`
          }
          if (resizedDetections.length >= 2) {
            if (resizedDetections[1].expressions.happy > 0.7) {
              consecutiveSmiles2++;
              if (consecutiveSmiles2 >= MIN_CONSECUTIVE_FRAMES && !isSmiling2) {
                smileCounter2++;
                isSmiling2 = true;
                consecutiveSmiles2 = 0;
              }
            } else {
              isSmiling2 = false;
              consecutiveSmiles2 = 0;
            }
            // Update the smile counter display using the stored reference to the DOM element
            smileCounterElement2.textContent = `Person 2 Smiles: ${smileCounter2}`
          }          
        }
      }, 100)
    })
  } catch (error) {
    console.error('An error occurred:', error);
    // Display an error message to the user
  }
}
