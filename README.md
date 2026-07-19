# Smile Detection Game

Smile Detection Game is a static browser demo that uses a webcam feed and `face-api.js` expression scores to run a 10-second smile-counting round for two players.

The app is intentionally lightweight:

- no backend
- no build step
- deployable to GitHub Pages or any static host

## Demo

Live demo: [seeknndestroy.github.io/smile-detection](https://seeknndestroy.github.io/smile-detection/)

## What It Does

- loads face detection, landmark, and expression models from the local `weights/` directory
- opens the user's webcam in the browser
- lets the user choose among available cameras before starting a round
- tracks two on-screen player lanes from left to right
- counts smile onsets instead of incrementing on every positive frame
- declares the winner after a 10-second round

This is a browser interaction demo, not a production-grade facial analysis system.

## Quick Start

Because webcam access generally requires a secure context, run the project from `localhost` or from an HTTPS static host rather than opening `index.html` directly from disk.

```bash
git clone https://github.com/SeeknnDestroy/smile-detection.git
cd smile-detection
npx serve .
```

Then open the local URL printed by `serve`.

## Requirements

- a modern desktop browser with webcam support
- camera permission enabled for the page
- Node.js 20+ if you want to run the test suite

## Development

The project is a native-ES-module static app. The main code lives under `src/`.

```bash
npm test
```

There is no production build pipeline. `index.html` is the entrypoint for both local development and static hosting.

## Runtime Notes

- The current detector stack uses `face-api.js` and local model weights already checked into the repository.
- Camera switching is available before and between rounds, and is disabled while a round is running.
- Player identity is based on screen position within a round, not biometric identity.
- The tracker assumes players stay roughly in their left/right lanes during the round.
- If more than two faces appear, the app uses the two leftmost detected lanes.

## Limitations

- Expression classification is approximate and can vary by lighting, webcam quality, head pose, and occlusion.
- The app uses "happy" expression confidence as a proxy for smiling; that is not equivalent to a robust smile detector.
- Results should not be used for any high-stakes or fairness-sensitive purpose.
- `face-api.js` remains a practical legacy choice here, but it is not the most modern browser vision stack available in 2026.

## Future Improvement Direction

The current structure keeps the detector behind an adapter so the runtime can be migrated to a newer browser-side vision stack, such as MediaPipe Face Landmarker, without rewriting the game logic.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
