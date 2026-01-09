# Direct S3 upload example

Frontend example (uses presigned URL from backend):

```html
<input id="file" type="file" />
<button id="upload">Upload</button>
<script>
  document.getElementById('upload').addEventListener('click', async () => {
    const file = document.getElementById('file').files[0];
    if (!file) return alert('Select a file');

    // Request presigned URL from backend
    const res = await fetch(`/api/uploads/presign?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`);
    const data = await res.json();
    if (!data.url) return alert('Presign failed: ' + JSON.stringify(data));

    // Upload directly to S3
    const uploadRes = await fetch(data.url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type
      },
      body: file
    });

    if (uploadRes.ok) {
      alert('Uploaded. Key: ' + data.key);
      // Save 'data.key' or constructed URL to your backend for association
    } else {
      alert('Upload failed');
    }
  });
</script>
```

Notes:
- The backend presign endpoint is `GET /api/uploads/presign?filename=...&contentType=...` and returns `{ url, key }`.
- For private uploads, you should store the `key` in your DB and generate presigned GET URLs for downloads.
