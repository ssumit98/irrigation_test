// Cloudinary configuration
const cloudName = 'ml_default';
const apiKey = '828344228488878';
const uploadPreset = 'ML_image';

// Initialize variables for location
let userLocation = null;

// Get device information
const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
    language: navigator.language
};

// Constants for localStorage
const STORAGE_KEYS = {
    NAME: 'attendance_name',
    SUBDIVISION: 'attendance_subdivision',
    EXPIRY: 'attendance_data_expiry'
};

// Function to get location
function getLocation() {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    resolve(userLocation);
                },
                error => {
                    console.error("Error getting location:", error);
                    resolve(null);
                }
            );
        } else {
            console.log("Geolocation not supported");
            resolve(null);
        }
    });
}

// Function to upload image to Cloudinary
async function uploadToCloudinary(file) {
    const timestamp = Math.round((new Date).getTime()/1000);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('timestamp', timestamp);
    formData.append('api_key', apiKey);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        console.log('Upload response:', data);  // Add this for debugging
        
        if (!response.ok) {
            console.error('Cloudinary Error:', data);
            throw new Error(data.error?.message || 'Upload failed');
        }
        
        return data.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }
}

// Handle image preview
const photoInput = document.getElementById('photo');
const imagePreview = document.getElementById('imagePreview');

photoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Create an image element if it doesn't exist
            let previewImg = imagePreview.querySelector('img');
            if (!previewImg) {
                previewImg = document.createElement('img');
                imagePreview.appendChild(previewImg);
            }
            
            // Set the image source and display the preview
            previewImg.src = e.target.result;
            imagePreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
});

// Function to save data to localStorage with expiration
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
        // Set expiry date to 30 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        localStorage.setItem(STORAGE_KEYS.EXPIRY, expiryDate.toISOString());
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Function to get data from localStorage
function getFromLocalStorage(key) {
    try {
        // Check if data has expired
        const expiryDate = localStorage.getItem(STORAGE_KEYS.EXPIRY);
        if (expiryDate) {
            const now = new Date();
            const expiry = new Date(expiryDate);
            if (now > expiry) {
                // Clear expired data
                localStorage.removeItem(STORAGE_KEYS.NAME);
                localStorage.removeItem(STORAGE_KEYS.SUBDIVISION);
                localStorage.removeItem(STORAGE_KEYS.EXPIRY);
                return null;
            }
        }
        return localStorage.getItem(key);
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
}

// Function to auto-fill form
function autoFillForm() {
    const name = getFromLocalStorage(STORAGE_KEYS.NAME);
    const subdivision = getFromLocalStorage(STORAGE_KEYS.SUBDIVISION);

    if (name) {
        document.getElementById('name').value = name;
    }
    if (subdivision) {
        document.getElementById('subdivision').value = subdivision;
    }
}

// Call autoFillForm when page loads
document.addEventListener('DOMContentLoaded', autoFillForm);

// Function to get IST timestamp
function getISTTimestamp() {
    const now = new Date();
    
    // Get UTC time and add IST offset
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();
    
    // Add 5 hours and 30 minutes for IST
    let istHours = utcHours + 5;
    let istMinutes = utcMinutes + 30;
    let istSeconds = utcSeconds;
    
    // Handle overflow in minutes
    if (istMinutes >= 60) {
        istHours += Math.floor(istMinutes / 60);
        istMinutes = istMinutes % 60;
    }
    
    // Handle overflow in hours
    if (istHours >= 24) {
        istHours = istHours % 24;
    }
    
    // Get the date components
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1;
    let day = now.getUTCDate();
    
    // Check if we need to roll over to the next day
    if (utcHours >= 18) { // If UTC time is 6 PM or later
        // Add one day
        const nextDay = new Date(year, month - 1, day + 1);
        year = nextDay.getFullYear();
        month = nextDay.getMonth() + 1;
        day = nextDay.getDate();
    }
    
    // Format the date and time
    const formattedMonth = String(month).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const formattedHours = String(istHours % 12 || 12).padStart(2, '0');
    const formattedMinutes = String(istMinutes).padStart(2, '0');
    const formattedSeconds = String(istSeconds).padStart(2, '0');
    const ampm = istHours >= 12 ? 'PM' : 'AM';
    
    // Format the final string
    return `${year}-${formattedMonth}-${formattedDay} ${formattedHours}:${formattedMinutes}:${formattedSeconds} ${ampm} IST`;
}

// Handle form submission
document.getElementById('attendanceForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get elements
    const submitButton = document.querySelector('.submit-btn');
    const btnText = submitButton.querySelector('.btn-text');
    const loader = submitButton.querySelector('.loader');
    const formCard = document.querySelector('.form-card');
    const notification = document.getElementById('notification');

    // Show loading state
    const setLoading = (loading) => {
        if (loading) {
            submitButton.classList.add('loading');
            formCard.classList.add('processing');
            btnText.textContent = 'Submitting...';
            submitButton.disabled = true;
        } else {
            submitButton.classList.remove('loading');
            formCard.classList.remove('processing');
            btnText.textContent = 'Submit';
            submitButton.disabled = false;
        }
    };

    // Show notification
    const showNotification = (message, type) => {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.className = 'notification';
        }, 5000);
    };

    try {
        setLoading(true);  // Start loading immediately when form is submitted

        // Get location first
        await getLocation();

        // Get form values
        const name = document.getElementById('name').value;
        const subdivision = document.getElementById('subdivision').value;
        const attendanceType = document.querySelector('input[name="attendanceType"]:checked').value;
        const photoFile = document.getElementById('photo').files[0];

        // Save name and subdivision to localStorage
        saveToLocalStorage(STORAGE_KEYS.NAME, name);
        saveToLocalStorage(STORAGE_KEYS.SUBDIVISION, subdivision);

        // Set in/out time based on radio selection
        const inTime = attendanceType === 'in' ? 'Yes' : '';
        const outTime = attendanceType === 'out' ? 'Yes' : '';

        // Upload photo to Cloudinary
        console.log('Uploading photo to Cloudinary...');
        const photoUrl = await uploadToCloudinary(photoFile);
        console.log('Photo uploaded successfully:', photoUrl);

        // Prepare data for Google Sheets with IST timestamp
        const timestamp = getISTTimestamp();
        const formData = {
            timestamp,
            name,
            subdivision,
            inTime,
            outTime,
            photoUrl,
            location: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : 'Not available',
            deviceInfo: JSON.stringify(deviceInfo)
        };

        // Send to Google Sheets
        const scriptURL = 'https://script.google.com/macros/s/AKfycbwYy_hRrCfJEO56whfNAxbmVLg6jByVpcMY6dxyGa-mnvG5nWjhYL_W-WeX1VGAlO9_/exec';
        
        console.log('Submitting data to Google Sheets:', formData);
        const response = await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        console.log('Response received:', response);
        
        // Since we're using no-cors mode, we won't get a proper response
        // We'll consider it successful if we reach this point
        showNotification('Form submitted successfully!', 'success');
        this.reset();
        imagePreview.style.display = 'none';

        // Re-fill the form with saved data after reset
        autoFillForm();

    } catch (error) {
        console.error('Error:', error);
        showNotification('Error submitting form. Please try again.', 'error');
    } finally {
        setLoading(false);  // Stop loading regardless of success or failure
    }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('ServiceWorker registration successful:', registration);
        } catch (err) {
            console.error('ServiceWorker registration failed:', err);
        }
    });
}

// PWA Install Prompt
let deferredPrompt;
let installButton = null;

function createInstallButton() {
    if (installButton) return;
    
    installButton = document.createElement('button');
    installButton.className = 'install-btn';
    installButton.innerHTML = '⬇️ Install App';
    installButton.style.display = 'none';
    document.body.appendChild(installButton);

    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // Clear the deferredPrompt variable
        deferredPrompt = null;
        // Hide the install button
        installButton.style.display = 'none';
    });
}

// Create the install button when the page loads
document.addEventListener('DOMContentLoaded', () => {
    createInstallButton();
    autoFillForm();
});

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt event fired');
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install button
    if (installButton) {
        installButton.style.display = 'flex';
        console.log('Install button shown');
    }
});

// Listen for successful installation
window.addEventListener('appinstalled', () => {
    console.log('App installed successfully');
    // Clear the deferredPrompt variable
    deferredPrompt = null;
    // Hide the install button
    if (installButton) {
        installButton.style.display = 'none';
    }
});