class FileUploader {
    constructor() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.browseBtn = document.getElementById('browseBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultContainer = document.getElementById('resultContainer');
        this.fileUrl = document.getElementById('fileUrl');
        this.copyBtn = document.getElementById('copyBtn');
        this.newUploadBtn = document.getElementById('newUploadBtn');
        this.filePreview = document.getElementById('filePreview');

        this.initEventListeners();
    }

    initEventListeners() {
        // Browse button click
        this.browseBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('drag-over');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('drag-over');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // Copy button
        this.copyBtn.addEventListener('click', () => {
            this.copyToClipboard();
        });

        // New upload button
        this.newUploadBtn.addEventListener('click', () => {
            this.resetUploader();
        });
    }

    handleFiles(files) {
        if (files.length === 0) return;

        const file = files[0];
        
        // Validate file size (100MB)
        if (file.size > 100 * 1024 * 1024) {
            alert('File size must be less than 100MB');
            return;
        }

        this.uploadFile(file);
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showProgress();
            
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.updateProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    this.showResult(response.url, file);
                } else {
                    const error = JSON.parse(xhr.responseText);
                    this.showError(error.error || 'Upload failed');
                }
            });

            xhr.addEventListener('error', () => {
                this.showError('Upload failed. Please try again.');
            });

            xhr.open('POST', '/upload');
            xhr.send(formData);

        } catch (error) {
            this.showError('Upload failed. Please try again.');
        }
    }

    showProgress() {
        this.uploadArea.style.display = 'none';
        this.progressContainer.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.updateProgress(0);
    }

    updateProgress(percent) {
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = Math.round(percent) + '%';
    }

    showResult(url, file) {
        this.progressContainer.style.display = 'none';
        this.resultContainer.style.display = 'block';
        
        this.fileUrl.value = url;
        this.createFilePreview(file, url);
    }

    createFilePreview(file, url) {
        this.filePreview.innerHTML = '';

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;
            this.filePreview.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            this.filePreview.appendChild(video);
        } else if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.controls = true;
            this.filePreview.appendChild(audio);
        } else {
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.innerHTML = `
                <i class="fas fa-file" style="font-size: 4rem; color: #667eea;"></i>
                <p><strong>${file.name}</strong></p>
                <p>${this.formatFileSize(file.size)}</p>
            `;
            this.filePreview.appendChild(fileInfo);
        }
    }

    showError(message) {
        alert('Error: ' + message);
        this.resetUploader();
    }

    resetUploader() {
        this.uploadArea.style.display = 'block';
        this.progressContainer.style.display = 'none';
        this.resultContainer.style.display = 'none';
        this.fileInput.value = '';
        this.filePreview.innerHTML = '';
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.fileUrl.value);
            this.copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            this.copyBtn.style.background = '#4CAF50';
            
            setTimeout(() => {
                this.copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                this.copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            this.fileUrl.select();
            document.execCommand('copy');
            this.copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            this.copyBtn.style.background = '#4CAF50';
            
            setTimeout(() => {
                this.copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                this.copyBtn.style.background = '';
            }, 2000);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize uploader when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FileUploader();
});
