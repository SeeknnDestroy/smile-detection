async function startSmileDetection() {
    // Load the models
    await faceapi.nets.ssdMobilenetv1.loadFromUri('./weights')
    await faceapi.nets.faceLandmark68Net.loadFromUri('./weights')
    await faceapi.nets.faceExpressionNet.loadFromUri('./weights')
  
    // Get the video element
    const video = document.querySelector('#video')
  
    // Start the video stream
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream
      })
  
    // Initialize the smile counter
    let smileCounter = 0
  
    // Detect faces and their expressions in real-time
    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options()).withFaceLandmarks().withFaceExpressions()
  
      // Count the number of smiles
      detections.forEach(detection => {
        if (detection.expressions.happy > 0.7) {
          smileCounter++
        }
      })
  
      // Update the smile counter display
      document.querySelector('#smile-counter').textContent = `Smiles: ${smileCounter}`
    }, 100)
  }
  