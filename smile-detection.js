// Store references to DOM elements
const video = document.getElementById("video");
const popup = document.querySelector("#popup");
const winnerElement = document.querySelector("#winner");
const playAgainButton = document.querySelector("#play-again");
const smileCounterElement1 = document.querySelector("#smile-counter-1");
const smileCounterElement2 = document.querySelector("#smile-counter-2");

// Initialize the smile counters
const MIN_CONSECUTIVE_FRAMES = 3;
let smileCounter1 = 0;
let smileCounter2 = 0;
let consecutiveSmiles1 = 0;
let consecutiveSmiles2 = 0;
let isSmiling1 = false;
let isSmiling2 = false;
// Add a variable to keep track of whether the setInterval function has been called
let intervalStarted = false;
// Add a variable to keep track of whether the game is over
let gameOver = false;
// Add a startGame function
function startGame() {
  // Reset the game state
  smileCounter1 = 0;
  smileCounter2 = 0;
  gameOver = false;
  // Update the text content of the smileCounterElement1 and smileCounterElement2 elements
  smileCounterElement1.textContent = `Person 1 Smiles: ${smileCounter1}`;
  smileCounterElement2.textContent = `Person 2 Smiles: ${smileCounter2}`;
  // Hide the pop-up
  popup.style.display = "none";

  // Add a setTimeout function that runs after 10 seconds
  setTimeout(() => {
    // Display the pop-up
    popup.style.display = "block";
    // Determine the winner
    let winner;
    if (smileCounter1 > smileCounter2) {
      winner = "Person 1";
    } else if (smileCounter2 > smileCounter1) {
      winner = "Person 2";
    } else {
      winner = "Tie";
    }
    // Update the text content of the winnerElement
    winnerElement.textContent = `Winner: ${winner}`;
    // Set the gameOver variable to true
    gameOver = true;
  }, 10000);
}

async function startSmileDetection() {
  try {
    // Load the models
    await faceapi.nets.ssdMobilenetv1.loadFromUri("./weights");
    await faceapi.nets.faceLandmark68Net.loadFromUri("./weights");
    await faceapi.nets.faceExpressionNet.loadFromUri("./weights");

    // Start the video stream
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch((error) => {
        console.error("Could not access the webcam:", error);
      });

    video.addEventListener("play", () => {
      const canvas = faceapi.createCanvasFromMedia(video);
      document.body.append(canvas);
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);

      if (!intervalStarted) {
        intervalStarted = true;
        setInterval(async () => {
          if (!video.paused && !video.ended) {
            const detections = await faceapi
              .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
              .withFaceLandmarks()
              .withFaceExpressions();
            const resizedDetections = faceapi.resizeResults(
              detections,
              displaySize
            );
            canvas
              .getContext("2d")
              .clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

            if (resizedDetections.length >= 1) {
              if (resizedDetections[0].expressions.happy > 0.7) {
                consecutiveSmiles1++;
                if (
                  consecutiveSmiles1 >= MIN_CONSECUTIVE_FRAMES &&
                  !isSmiling1
                ) {
                  smileCounter1++;
                  isSmiling1 = true;
                  consecutiveSmiles1 = 0;
                }
              } else {
                isSmiling1 = false;
                consecutiveSmiles1 = 0;
              }
              smileCounterElement1.textContent = `Person 1 Smiles: ${smileCounter1}`;
            }
            if (resizedDetections.length >= 2) {
              if (resizedDetections[1].expressions.happy > 0.7) {
                consecutiveSmiles2++;
                if (
                  consecutiveSmiles2 >= MIN_CONSECUTIVE_FRAMES &&
                  !isSmiling2
                ) {
                  smileCounter2++;
                  isSmiling2 = true;
                  consecutiveSmiles2 = 0;
                }
              } else {
                isSmiling2 = false;
                consecutiveSmiles2 = 0;
              }
              smileCounterElement2.textContent = `Person 2 Smiles: ${smileCounter2}`;
            }
          }
        }, 100);
      }

      // Call startGame when starting smile detection
      startGame();
    });
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

document
  .getElementById("start-button")
  .addEventListener("click", startSmileDetection);

document.getElementById("stop-button").addEventListener("click", () => {
  video.pause();
});

document.getElementById("reset-button").addEventListener("click", () => {
  smileCounter1 = 0;
  smileCounter2 = 0;
  smileCounterElement1.textContent = `Person 1 Smiles: ${smileCounter1}`;
  smileCounterElement2.textContent = `Person 2 Smiles: ${smileCounter2}`;
});

// Call startGame when playAgainButton is clicked
playAgainButton.addEventListener("click", startGame);
