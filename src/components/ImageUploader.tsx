import React, { useEffect, useState } from 'react';
import { Upload, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { checkCloudinaryStatus, uploadToCloudinary } from '../lib/cloudinary';

interface ImageUploaderProps {
  label: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  folder?: string;
  accept?: string;
  helperText?: string;
}

export function ImageUploader({
  label,
  urls,
  onChange,
  maxFiles = 8,
  folder = 'car-depot',
  accept = 'image/*',
  helperText,
}: ImageUploaderProps) {
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');

  useEffect(() => {
    checkCloudinaryStatus()
      .then((res) => setCloudinaryConfigured(res.configured))
      .catch(() => setCloudinaryConfigured(false));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError(null);

    if (urls.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const res = await uploadToCloudinary(file, folder);
        uploaded.push(res.url);
      }
      onChange([...urls, ...uploaded]);
    } catch (err: any) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddManualUrl = () => {
    const trimmed = manualUrl.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setError('Please enter a valid HTTPS image or document URL.');
      return;
    }
    if (urls.length >= maxFiles) {
      setError(`Maximum ${maxFiles} items allowed.`);
      return;
    }
    setError(null);
    onChange([...urls, trimmed]);
    setManualUrl('');
  };

  const removeUrl = (index: number) => {
    onChange(urls.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-800">{label}</label>
        <span className="text-xs font-mono-num text-slate-500">
          {urls.length}/{maxFiles}
        </span>
      </div>

      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}

      {cloudinaryConfigured && (
        <label className="flex items-center justify-center gap-2 w-full border border-dashed border-slate-300 hover:border-red-500 rounded-xl p-4 bg-slate-50 cursor-pointer transition-colors">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              <span className="text-sm text-slate-700">Uploading to Cloudinary...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                Upload files to Cloudinary
              </span>
            </>
          )}
          <input
            type="file"
            multiple={maxFiles > 1}
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading || urls.length >= maxFiles}
            className="hidden"
          />
        </label>
      )}

      {cloudinaryConfigured === false && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Cloudinary media credentials are not configured on the server yet. Paste direct HTTPS media URLs below, or add Cloudinary environment secrets to enable direct file uploads.
        </p>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Paste image/document URL (https://...)"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
          />
        </div>
        <button
          type="button"
          onClick={handleAddManualUrl}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
        >
          Add URL
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {urls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative aspect-[4/3] bg-slate-100 border border-slate-200 rounded-lg overflow-hidden group"
            >
              <img
                src={url}
                alt={`Uploaded media ${i + 1}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeUrl(i)}
                aria-label="Remove media"
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
