const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorDisplay = document.getElementById('colorDisplay');
const colorValue = document.getElementById('colorValue');
const imageUpload = document.getElementById('imageUpload');
const webcam = document.getElementById('webcam');

let currentSource = "webcam"; // can be "webcam" or "image"

// ===== Webcam Feed Setup =====
async function setupWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcam.srcObject = stream;

    webcam.addEventListener('loadeddata', () => {
      drawWebcamToCanvas();
    });
  } catch (err) {
    alert("Webcam access denied or unavailable.");
    console.error(err);
  }
}

function drawWebcamToCanvas() {
  if (currentSource === "webcam") {
    ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(drawWebcamToCanvas);
  }
}

// ===== Image Upload Setup =====
imageUpload.addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentSource = "image";
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ===== Pixel Color Detection =====
canvas.addEventListener('mousemove', function (e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(e.clientX - rect.left);
  const y = Math.floor(e.clientY - rect.top);

  const pixel = ctx.getImageData(x, y, 1, 1).data;
  const [r, g, b] = pixel;

  const hex = rgbToHex(r, g, b);
  colorDisplay.style.backgroundColor = hex;
  colorValue.textContent = `RGB: (${r}, ${g}, ${b}) | HEX: ${hex}`;
});

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x =>
    x.toString(16).padStart(2, '0')
  ).join('');
}

// ===== Start Webcam by Default =====
setupWebcam();
