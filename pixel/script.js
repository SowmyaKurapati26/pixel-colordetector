// DOM Elements
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const colorDisplay = document.getElementById('colorDisplay');
const colorValue = document.getElementById('colorValue');
const imageUpload = document.getElementById('imageUpload');
const webcam = document.getElementById('webcam');
const webcamTab = document.getElementById('webcamTab');
const uploadTab = document.getElementById('uploadTab');
const uploadControls = document.getElementById('uploadControls');
const zoomLens = document.getElementById('zoomLens');
const freezeBtn = document.getElementById('freezeBtn');
const captureBtn = document.getElementById('captureBtn');
const downloadBtn = document.getElementById('downloadBtn');
const colorList = document.getElementById('colorList');
const formatBtns = document.querySelectorAll('.format-btn');
const complementaryDiv = document.querySelector('#complementary .harmony-swatches');
const analogousDiv = document.querySelector('#analogous .harmony-swatches');
const aboutLink = document.getElementById('aboutLink');
const aboutModal = document.getElementById('aboutModal');
const closeBtn = document.querySelector('.close-btn');

// State variables
let currentSource = "webcam";
let isFrozen = false;
let colorFormat = "rgb";
let colorHistory = [];
let lastDetectedColor = { r: 0, g: 0, b: 0 };
let zoomActive = false;

// Initialize canvas size
function initializeCanvas() {
  // Set canvas size to match webcam aspect ratio (16:9)
  const containerWidth = canvas.parentElement.clientWidth;
  canvas.width = containerWidth;
  canvas.height = containerWidth * (9 / 16);
}

// ===== Webcam Setup =====
async function setupWebcam() {
  try {
    const constraints = { 
      video: { 
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      } 
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    webcam.srcObject = stream;

    webcam.addEventListener('loadeddata', () => {
      initializeCanvas();
      if (!isFrozen) {
        drawWebcamToCanvas();
      }
    });

    return true;
  } catch (err) {
    console.error("Webcam error:", err);
    alert("Webcam access denied or unavailable.");
    return false;
  }
}

function drawWebcamToCanvas() {
  if (currentSource === "webcam" && !isFrozen) {
    ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(drawWebcamToCanvas);
  }
}

// ===== Tab Switching =====
webcamTab.addEventListener('click', () => {
  if (currentSource !== "webcam") {
    currentSource = "webcam";
    updateTabUI();
    isFrozen = false;
    updateFreezeButtonUI();
    webcam.style.display = "block";
    setupWebcam();
  }
});

uploadTab.addEventListener('click', () => {
  if (currentSource !== "image") {
    currentSource = "image";
    updateTabUI();
    webcam.style.display = "none";
    // Stop webcam stream if running
    if (webcam.srcObject) {
      const tracks = webcam.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      webcam.srcObject = null;
    }
  }
});

function updateTabUI() {
  if (currentSource === "webcam") {
    webcamTab.classList.add('active');
    uploadTab.classList.remove('active');
    uploadControls.classList.add('hidden');
  } else {
    webcamTab.classList.remove('active');
    uploadTab.classList.add('active');
    uploadControls.classList.remove('hidden');
  }
}

// ===== Image Upload =====
imageUpload.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate aspect ratio to fit image within canvas
      const imgRatio = img.width / img.height;
      const canvasRatio = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgRatio > canvasRatio) {
        // Image is wider than canvas
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        // Image is taller than canvas
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgRatio;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ===== Freeze/Unfreeze Video =====
freezeBtn.addEventListener('click', () => {
  if (currentSource === "webcam") {
    isFrozen = !isFrozen;
    updateFreezeButtonUI();
    
    if (!isFrozen) {
      drawWebcamToCanvas();
    }
  }
});

function updateFreezeButtonUI() {
  if (isFrozen) {
    freezeBtn.classList.add('active');
    freezeBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
  } else {
    freezeBtn.classList.remove('active');
    freezeBtn.innerHTML = '<i class="fas fa-pause"></i> Freeze';
  }
}

// ===== Capture Screenshot =====
captureBtn.addEventListener('click', () => {
  isFrozen = true;
  updateFreezeButtonUI();
  
  // Vibration feedback if available
  if (navigator.vibrate) {
    navigator.vibrate(100);
  }
  
  // Visual feedback
  const flashEffect = document.createElement('div');
  flashEffect.style.position = 'absolute';
  flashEffect.style.top = '0';
  flashEffect.style.left = '0';
  flashEffect.style.width = '100%';
  flashEffect.style.height = '100%';
  flashEffect.style.backgroundColor = 'white';
  flashEffect.style.opacity = '0.7';
  flashEffect.style.pointerEvents = 'none';
  flashEffect.style.zIndex = '20';
  flashEffect.style.transition = 'opacity 0.5s';
  
  canvas.parentElement.appendChild(flashEffect);
  
  setTimeout(() => {
    flashEffect.style.opacity = '0';
    setTimeout(() => {
      flashEffect.remove();
    }, 500);
  }, 50);
});

// ===== Download Canvas Image =====
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `chromacapture-${new Date().toISOString().slice(0,10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// ===== Pixel Color Detection with Zoom =====
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseenter', () => {
  zoomActive = true;
  zoomLens.style.display = 'block';
});
canvas.addEventListener('mouseleave', () => {
  zoomActive = false;
  zoomLens.style.display = 'none';
});

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);
  
  // Update zoom lens position
  if (zoomActive) {
    const lensSize = parseInt(getComputedStyle(zoomLens).width);
    zoomLens.style.left = `${e.clientX - rect.left - lensSize/2}px`;
    zoomLens.style.top = `${e.clientY - rect.top - lensSize/2}px`;
    
    // Create zoom effect
    const zoomFactor = 3;
    const zoomContext = document.createElement('canvas').getContext('2d');
    zoomContext.canvas.width = zoomLens.offsetWidth * zoomFactor;
    zoomContext.canvas.height = zoomLens.offsetHeight * zoomFactor;
    
    // Draw zoomed portion of the canvas
    const zoomSize = lensSize / zoomFactor;
    zoomContext.drawImage(
      canvas, 
      x - zoomSize/2, y - zoomSize/2, zoomSize, zoomSize,
      0, 0, zoomContext.canvas.width, zoomContext.canvas.height
    );
    
    // Draw crosshair
    zoomContext.strokeStyle = 'rgba(255,255,255,0.7)';
    zoomContext.lineWidth = 2;
    zoomContext.beginPath();
    zoomContext.moveTo(zoomContext.canvas.width/2, 0);
    zoomContext.lineTo(zoomContext.canvas.width/2, zoomContext.canvas.height);
    zoomContext.moveTo(0, zoomContext.canvas.height/2);
    zoomContext.lineTo(zoomContext.canvas.width, zoomContext.canvas.height/2);
    zoomContext.stroke();
    
    zoomLens.style.backgroundImage = `url(${zoomContext.canvas.toDataURL()})`;
    zoomLens.style.backgroundPosition = 'center';
    zoomLens.style.backgroundSize = 'cover';
  }
  
  try {
    // Get pixel color data
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const [r, g, b] = pixel;
    
    // Update last detected color
    lastDetectedColor = { r, g, b };
    
    // Display color
    updateColorDisplay(lastDetectedColor);
  } catch (err) {
    // Handle out of bounds errors silently
    console.log("Color detection error:", err);
  }
}

// ===== Color Handling =====
function updateColorDisplay(color) {
  const { r, g, b } = color;
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  
  colorDisplay.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  
  // Update color value based on format
  switch (colorFormat) {
    case "rgb":
      colorValue.textContent = `RGB: (${r}, ${g}, ${b})`;
      break;
    case "hex":
      colorValue.textContent = `HEX: ${hex}`;
      break;
    case "hsl":
      colorValue.textContent = `HSL: (${hsl.h}°, ${hsl.s}%, ${hsl.l}%)`;
      break;
  }
  
  // Update color harmonies
  updateColorHarmonies(color);
}

// ===== Color Format Toggle =====
formatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    formatBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    colorFormat = btn.dataset.format;
    updateColorDisplay(lastDetectedColor);
  });
});

// ===== Color Sampling (Click) =====
canvas.addEventListener('click', () => {
  // Add current color to history
  if (lastDetectedColor.r !== undefined) {
    addColorToHistory(lastDetectedColor);
  }
});

// ===== Color History Functions =====
function addColorToHistory(color) {
  // Check if color already exists in history
  const hexColor = rgbToHex(color.r, color.g, color.b);
  const exists = colorHistory.some(c => rgbToHex(c.r, c.g, c.b) === hexColor);
  
  if (!exists) {
    // Add to beginning of array (most recent first)
    colorHistory.unshift(color);
    
    // Limit history to 10 colors
    if (colorHistory.length > 10) {
      colorHistory.pop();
    }
    
    updateColorHistoryUI();
  }
}

function updateColorHistoryUI() {
  // Clear existing swatches
  colorList.innerHTML = '';
  
  // Add color swatches
  colorHistory.forEach(color => {
    const swatch = document.createElement('div');
    swatch.classList.add('color-swatch');
    swatch.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.classList.add('swatch-tooltip');
    tooltip.textContent = rgbToHex(color.r, color.g, color.b);
    swatch.appendChild(tooltip);
    
    // Click to select color
    swatch.addEventListener('click', () => {
      lastDetectedColor = color;
      updateColorDisplay(color);
    });
    
    colorList.appendChild(swatch);
  });
}

// ===== Color Harmony Functions =====
function updateColorHarmonies(color) {
  const { r, g, b } = color;
  const hsl = rgbToHsl(r, g, b);
  
  // Clear existing swatches
  complementaryDiv.innerHTML = '';
  analogousDiv.innerHTML = '';
  
  // Add complementary color
  const complementaryHue = (hsl.h + 180) % 360;
  const complementaryColor = hslToRgb(complementaryHue, hsl.s, hsl.l);
  addHarmonySwatch(complementaryDiv, complementaryColor);
  
  // Add analogous colors (30° apart)
  const analogous1 = hslToRgb((hsl.h + 330) % 360, hsl.s, hsl.l);
  const analogous2 = hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l);
  
  addHarmonySwatch(analogousDiv, analogous1);
  addHarmonySwatch(analogousDiv, { r, g, b }); // Original color
  addHarmonySwatch(analogousDiv, analogous2);
}

function addHarmonySwatch(container, color) {
  const swatch = document.createElement('div');
  swatch.classList.add('color-swatch');
  swatch.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
  
  // Add tooltip
  const tooltip = document.createElement('div');
  tooltip.classList.add('swatch-tooltip');
  tooltip.textContent = rgbToHex(color.r, color.g, color.b);
  swatch.appendChild(tooltip);
  
  // Click to select this color
  swatch.addEventListener('click', () => {
    lastDetectedColor = color;
    updateColorDisplay(color);
  });
  
  container.appendChild(swatch);
}

// ===== Color Conversion Utilities =====
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h /= 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToRgb(h, s, l) {
  // Convert HSL percentages to decimal
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

// ===== Modal Handling =====
aboutLink.addEventListener('click', (e) => {
  e.preventDefault();
  aboutModal.style.display = 'flex';
});

closeBtn.addEventListener('click', () => {
  aboutModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === aboutModal) {
    aboutModal.style.display = 'none';
  }
});

// ===== Window Resize Handling =====
window.addEventListener('resize', () => {
  initializeCanvas();
  
  // If using webcam and not frozen, need to redraw
  if (currentSource === "webcam" && !isFrozen) {
    // No need to call drawWebcamToCanvas() as it uses requestAnimationFrame
  } else {
    // For uploaded images, we'd need to redraw from the original image
    // This would require storing the original image data
  }
});

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
  initializeCanvas();
  setupWebcam().then(success => {
    if (!success) {
      // If webcam fails, switch to upload mode automatically
      uploadTab.click();
    }
  });
  
  // Set initial color format
  formatBtns.forEach(btn => {
    if (btn.dataset.format === colorFormat) {
      btn.classList.add('active');
    }
  });
});
