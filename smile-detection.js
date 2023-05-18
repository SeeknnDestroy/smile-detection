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
      
      // Get the canvas element
      const canvas = document.querySelector('#canvas')

      // Set the canvas size to match the video size
      canvas.width = video.offsetWidth
      canvas.height = video.offsetHeight

      // Draw the bounding boxes on the canvas
      faceapi.draw.drawDetections(canvas, detections)

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
  