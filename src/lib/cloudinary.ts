export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export async function checkCloudinaryStatus(): Promise<{
  configured: boolean;
  mode: string;
  cloudName?: string;
}> {
  const res = await fetch('/api/cloudinary/status');
  if (!res.ok) return { configured: false, mode: 'unconfigured' };
  return res.json();
}

export async function uploadToCloudinary(
  file: File,
  folder = 'car-depot'
): Promise<CloudinaryUploadResult> {
  const signRes = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder }),
  });

  const signData = await signRes.json();
  if (!signRes.ok || !signData.configured) {
    throw new Error(
      signData.error ||
        'Cloudinary upload credentials are not configured. Configure CLOUDINARY_CLOUD_NAME in server secrets or provide a direct HTTPS image URL.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', signData.folder || folder);

  if (signData.mode === 'signed') {
    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', String(signData.timestamp));
    formData.append('signature', signData.signature);
  } else {
    formData.append('upload_preset', signData.uploadPreset);
  }

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signData.cloudName)}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok || !uploadJson.secure_url) {
    throw new Error(uploadJson?.error?.message || 'Cloudinary upload failed.');
  }

  return {
    url: uploadJson.secure_url,
    publicId: uploadJson.public_id,
  };
}
