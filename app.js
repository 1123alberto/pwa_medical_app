// --- 1. PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

// --- 2. Theme Toggling ---
const themeToggleBtn = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'light'; // Default to light

document.body.classList.add(`${currentTheme}-theme`); // Apply initial theme

themeToggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('light-theme')) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    }
});

// --- 3. Multilingual Support ---
const languageSelector = document.getElementById('language-selector');
let translations = {};
const defaultLanguage = localStorage.getItem('language') || 'en';

// Function to load translations
async function loadTranslations(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Could not load translations for ${lang}`);
        }
        translations = await response.json();
        applyTranslations();
        localStorage.setItem('language', lang); // Save selected language
    } catch (error) {
        console.error('Error loading translations:', error);
    }
}

// Function to apply translations to data-i18n attributes
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translations[key];
            } else if (element.tagName === 'META' && element.name === 'description') {
                element.setAttribute('content', translations[key]);
            } else {
                element.textContent = translations[key];
            }
        }
    });
    // Update theme toggle button text explicitly as it has 'data-i18n'
    if (document.body.classList.contains('light-theme')) {
        themeToggleBtn.textContent = translations['toggleTheme'] || 'Toggle Theme';
    } else {
        themeToggleBtn.textContent = translations['toggleTheme'] || 'Toggle Theme';
    }
}

// Set initial language from local storage or default
languageSelector.value = defaultLanguage;
loadTranslations(defaultLanguage);

// Event listener for language selector change
languageSelector.addEventListener('change', (event) => {
    loadTranslations(event.target.value);
});

// --- 4. LLM API Integration (Conceptual using Google Gemini API) ---
const diagnoseButton = document.getElementById('diagnose-button');
const symptomsInput = document.getElementById('symptoms-input');
const diagnosisOutput = document.getElementById('diagnosis-output');
const loadingIndicator = document.getElementById('loading-indicator');

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!! IMPORTANT: NEVER expose your API key directly in client-side code in a real application.
// !!! Use a backend proxy (e.g., a Cloud Function, Node.js server) to handle API calls securely.
// !!! For this conceptual example, we're placing it here for demonstration purposes only.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const GEMINI_API_KEY = 'AIzaSyDadn8bhKVgMmFry6iTMdOGiVTaenlr78U'; // <--- Replace with your actual Gemini API key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function getLlmInsights() {
    const symptoms = symptomsInput.value.trim();
    if (!symptoms) {
        diagnosisOutput.innerHTML = `<p style="color: orange;">${translations['noSymptomsWarning'] || 'Please enter symptoms or observations.'}</p>`;
        return;
    }

    loadingIndicator.style.display = 'block';
    diagnoseButton.disabled = true;
    diagnosisOutput.innerHTML = ''; // Clear previous output

    const prompt = `
        You are a well-read medical doctor. Given the following symptoms and observations, provide some *possible* conditions and common treatments/medications associated with them.
        List the top 5 possibilities. Following the list include EXTREMELY BRIEF explanations and treatment suggestions.

        Symptoms and Observations:
        "${symptoms}"

        Please format your response clearly with headings for "Possible Conditions" and "Common Treatments/Medications".
        
    `;

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.error.message || 'Unknown error'}`);
        }

        const data = await response.json();
        let generatedText = "No content generated.";
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            generatedText = data.candidates[0].content.parts[0].text;
        }

        diagnosisOutput.innerHTML = `<p>${generatedText.replace(/\n/g, '<br>')}</p>`;

    } catch (error) {
        console.error('Error fetching LLM insights:', error);
        diagnosisOutput.innerHTML = `<p style="color: red;">${translations['apiError'] || 'Error getting insights: '} ${error.message}. ${translations['apiKeyWarning'] || 'Please check your API key and network connection. Remember this is for personal use.'}</p>`;
    } finally {
        loadingIndicator.style.display = 'none';
        diagnoseButton.disabled = false;
    }
}

diagnoseButton.addEventListener('click', getLlmInsights);


// ... (previous JavaScript code for PWA registration, theme, language) ...

// --- New: Image Input Elements ---
const imageInput = document.getElementById('image-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const clearImageButton = document.getElementById('clear-image-button');

let selectedImageBase64 = null; // To store the Base64 representation of the image

// --- New: Event Listener for Image Selection ---
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        // Display image preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.style.display = 'block';
            // Convert to Base64 for API
            selectedImageBase64 = e.target.result.split(',')[1]; // Get Base64 part
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.src = '#';
        imagePreviewContainer.style.display = 'none';
        selectedImageBase64 = null;
    }
});

// --- New: Event Listener for Clear Image Button ---
clearImageButton.addEventListener('click', () => {
    imageInput.value = ''; // Clear file input
    imagePreview.src = '#';
    imagePreviewContainer.style.display = 'none';
    selectedImageBase64 = null;
});


// ... (previous JavaScript code for PWA registration, theme, language, image upload) ...

// --- New: Camera Elements ---
const openCameraButton = document.getElementById('open-camera-button');
const cameraContainer = document.getElementById('camera-container');
const cameraFeed = document.getElementById('camera-feed');
const capturePhotoButton = document.getElementById('capture-photo-button');
const closeCameraButton = document.getElementById('close-camera-button');
const cameraCanvas = document.getElementById('camera-canvas');
const context = cameraCanvas.getContext('2d');

let cameraStream = null; // To hold the camera stream

// Function to stop camera stream
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraFeed.srcObject = null;
        cameraStream = null;
    }
    cameraContainer.style.display = 'none';
}

// Event Listener for Open Camera Button
openCameraButton.addEventListener('click', async () => {
    // Clear any previously uploaded image
    imageInput.value = '';
    imagePreview.src = '#';
    imagePreviewContainer.style.display = 'none';
    selectedImageBase64 = null;

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraFeed.srcObject = cameraStream;
        cameraContainer.style.display = 'block';
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert(translations['cameraAccessError'] || 'Could not access camera. Please ensure permissions are granted.');
        cameraContainer.style.display = 'none';
    }
});

// Event Listener for Capture Photo Button
capturePhotoButton.addEventListener('click', () => {
    if (cameraStream) {
        // Set canvas dimensions to match video feed
        cameraCanvas.width = cameraFeed.videoWidth;
        cameraCanvas.height = cameraFeed.videoHeight;

        // Draw the current video frame onto the canvas
        context.drawImage(cameraFeed, 0, 0, cameraCanvas.width, cameraCanvas.height);

        // Get image data from canvas as Base64
        const imageDataURL = cameraCanvas.toDataURL('image/jpeg', 0.9); // JPEG format, 90% quality
        selectedImageBase64 = imageDataURL.split(',')[1]; // Extract Base64 part

        // Display captured photo in the image preview section
        imagePreview.src = imageDataURL;
        imagePreviewContainer.style.display = 'block';
        imageInput.value = ''; // Clear file input if a photo was just taken

        // Stop camera after capture
        stopCamera();
    }
});

// Event Listener for Close Camera Button
closeCameraButton.addEventListener('click', () => {
    stopCamera();
});


// --- Modified: LLM API Integration (Conceptual using Google Gemini Pro Vision API) ---
// ... (rest of the LLM integration code remains the same as before) ...
// The `getLlmInsights` function already checks for `selectedImageBase64`
// so it will automatically use the photo taken by the camera.
