document.addEventListener('DOMContentLoaded', () => {
    const itemTitleInput = document.getElementById('itemTitle');
    const itemStatusSelect = document.getElementById('itemStatus');
    const itemImgInput = document.getElementById('itemImg');
    const itemFeedDiv = document.getElementById('itemFeed');
    const submitBtn = document.getElementById('submitBtn');

    // --- HELPER: Compress Image to Text (Base64) ---
    const processImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500; // Resize to max 500px width
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress to 60% quality
                };
            };
        });
    };

    // --- UPLOAD FUNCTION ---
    window.uploadItem = async () => {
        const title = itemTitleInput.value.trim();
        const status = itemStatusSelect.value;
        const file = itemImgInput.files[0];

        if (!title) { alert('Please enter a description'); return; }

        submitBtn.innerText = "Saving...";
        submitBtn.disabled = true;

        try {
            let imageString = null;
            if (file) {
                imageString = await processImage(file);
            }

            // Save to Firestore Database
            await db.collection('items').add({
                title: title,
                status: status,
                imageUrl: imageString, // Saving image as text string
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                reportedBy: 'Anonymous'
            });

            alert('Report Saved!');
            itemTitleInput.value = '';
            itemImgInput.value = '';

        } catch (error) {
            console.error("Error:", error);
            alert("Error: " + error.message);
        } finally {
            submitBtn.innerText = "Submit Report";
            submitBtn.disabled = false;
        }
    };

    // --- LOAD ITEMS ---
    db.collection('items').orderBy('timestamp', 'desc').limit(20).onSnapshot(snapshot => {
        let html = '';
        if (snapshot.empty) {
            itemFeedDiv.innerHTML = '<p class="text-gray-500">No items reported yet.</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString() : 'Just now';
            const colorClass = data.status === 'lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
            
            // If image exists, use it. If not, show placeholder.
            const imgHtml = data.imageUrl 
                ? `<img src="${data.imageUrl}" class="w-full h-48 object-cover">` 
                : `<div class="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">No Photo</div>`;

            html += `
                <div class="item-card bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                    ${imgHtml}
                    <div class="p-4">
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-lg text-gray-800">${data.title}</h3>
                            <span class="text-xs font-bold px-2 py-1 rounded uppercase ${colorClass}">${data.status}</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">Date: ${date}</p>
                    </div>
                </div>
            `;
        });
        itemFeedDiv.innerHTML = html;
    });
});