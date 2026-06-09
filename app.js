// Memory Collector JavaScript
const scriptURL = 'https://script.google.com/macros/s/AKfycbz1C9G7lUwelSsgA-lzlYvCv3FaxCpJojBeQQHCSuV0otprwKhnkFDnfdPRO5QGoOM/exec';

const form = document.getElementById('memoryForm');
const submitBtn = document.getElementById('submitBtn');
const statusDiv = document.getElementById('statusMessage');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';
  statusDiv.textContent = '';

  const term = document.getElementById('term').value;
  const date = document.getElementById('date').value;
  const senderName = document.getElementById('senderName').value.trim();
  const message = document.getElementById('message').value.trim();
  const files = document.getElementById('images').files;

  const images = [];               // keep all images for possible future use
  const readFilePromises = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();
    const promise = new Promise((resolve, reject) => {
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        images.push({
          filename: file.name,
          mimeType: file.type,
          imageB64: base64,
        });
        resolve();
      };
      reader.onerror = () => reject(reader.error);
    });
    reader.readAsDataURL(file);
    readFilePromises.push(promise);
  }

  try {
    await Promise.all(readFilePromises);
  } catch (err) {
    statusDiv.textContent = 'Error reading files.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
    return;
  }

  // Send one request per image with unique filenames
  let successCount = 0;
  let errorMsg = '';

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const ext = (img.filename || '').split('.').pop();
    const base = date + (senderName ? '_' + senderName : '');
    const filename = (images.length > 1)
      ? base + '_' + (i + 1) + (ext ? '.' + ext : '')
      : base + (ext ? '.' + ext : '');

    const payload = {
      term,
      date,
      message: (i === 0) ? message : '',   // only attach message to first image
      filename,
      mimeType: img.mimeType || '',
      imageB64: img.imageB64 || '',
    };

    statusDiv.textContent = 'Uploading ' + (i + 1) + ' of ' + images.length + '...';

    try {
      const response = await fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          successCount++;
        } else {
          errorMsg = result.message || 'Server error';
        }
      } else {
        errorMsg = 'Network error: ' + response.statusText;
      }
    } catch (err) {
      errorMsg = 'Unexpected error: ' + err.message;
    }
  }

  if (successCount === images.length) {
    statusDiv.textContent = '✅ All ' + successCount + ' photo(s) uploaded!';
    form.reset();
  } else {
    statusDiv.textContent = '❌ ' + successCount + '/' + images.length + ' uploaded. ' + errorMsg;
  }

  // Re-enable button
  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit';
});
