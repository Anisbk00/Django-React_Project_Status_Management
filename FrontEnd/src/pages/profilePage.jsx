/* eslint-disable no-empty */
/* eslint-disable no-useless-catch */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { PencilSquareIcon, ArrowPathIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../utils/api'; // axios instance that adds auth header
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user: ctxUser } = useAuth();
  const [user, setUser] = useState(ctxUser || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // editable fields
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [avatarFile, setAvatarFile] = useState(null);            // original File or cropped File
  const [avatarPreview, setAvatarPreview] = useState(null);      // preview URL (blob or remote)
  const [tempImageUrl, setTempImageUrl] = useState(null);        // raw file preview for cropping

  // cropping modal
  const [isCropOpen, setIsCropOpen] = useState(false);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(50);
  const [offsetY, setOffsetY] = useState(50);

  // recent activity
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // phone validation state
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/users/me/');
        if (!mounted) return;
        setUser(data);
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
        });
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
      } catch (err) {
        console.error('Failed to load user', err);
        setError('Failed to load profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    (async () => {
      setRecentLoading(true);
      try {
        const { data } = await api.get(`/reports/user_responsibilities/?user_id=${user.id}`);
        if (!mounted) return;
        setRecent(Array.isArray(data) ? data.slice(0,6) : []);
      } catch (err) {
        /* ignore if endpoint not available */
      } finally {
        if (mounted) setRecentLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  // Simple E.164-ish validator: + and digits, 7..15 digits
  const validatePhone = (value) => {
    if (!value || !String(value).trim()) return { ok: true, message: '' }; // optional
    const v = String(value).replace(/\s+/g, '');
    const e164 = /^\+?[1-9]\d{6,14}$/;
    if (!e164.test(v)) return { ok: false, message: 'Use international format, e.g. +15551234567' };
    return { ok: true, message: '' };
  };

  useEffect(() => {
    const res = validatePhone(form.phone);
    setPhoneError(res.ok ? '' : res.message);
  }, [form.phone]);

  const openEdit = () => {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    });
    setAvatarFile(null);
    setAvatarPreview(user?.avatar_url || null);
    setTempImageUrl(null);
    setIsEditOpen(true);
  };

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  /* ------------- Avatar cropping logic (same strategy as before) ------------- */
  const handleFileSelect = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Unsupported file type for avatar.');
      return;
    }
    const url = URL.createObjectURL(f);
    setTempImageUrl(url);
    setAvatarFile(f);
    setIsCropOpen(true);
    setZoom(1);
    setOffsetX(50);
    setOffsetY(50);
  };

  const drawCropPreview = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const ctx = canvas.getContext('2d');
    const OUT_SIZE = 400;
    canvas.width = OUT_SIZE;
    canvas.height = OUT_SIZE;
    ctx.clearRect(0,0,OUT_SIZE,OUT_SIZE);

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return;

    const baseScale = Math.max(OUT_SIZE / iw, OUT_SIZE / ih);
    const scale = baseScale * zoom;
    const drawW = iw * scale;
    const drawH = ih * scale;
    const centerX = (offsetX / 100) * drawW;
    const centerY = (offsetY / 100) * drawH;
    const dx = OUT_SIZE/2 - centerX;
    const dy = OUT_SIZE/2 - centerY;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,OUT_SIZE,OUT_SIZE);
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1,1,OUT_SIZE-2,OUT_SIZE-2);
  }, [zoom, offsetX, offsetY]);

  useEffect(() => {
    drawCropPreview();
  }, [tempImageUrl, zoom, offsetX, offsetY, drawCropPreview]);

  const onCropImageLoad = () => drawCropPreview();

  const getCroppedBlob = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  };

  /* ------------- Backend update helper: PATCH/PUT to /users/:id/ ------------- */
  const tryPatchThenPut = async (url, data, config) => {
    // try PATCH first
    try {
      return await api.patch(url, data, config);
    } catch (err) {
      const status = err?.response?.status;
      // If server forbids PATCH, try PUT
      if (status === 405 || status === 501) {
        try {
          return await api.put(url, data, config);
        } catch (err2) {
          // If PUT also fails, rethrow
          throw err2;
        }
      }
      // otherwise rethrow original
      throw err;
    }
  };

  const validateForm = () => {
    if (!form.first_name || !String(form.first_name).trim()) {
      setError('First name is required');
      return false;
    }
    if (!form.last_name || !String(form.last_name).trim()) {
      setError('Last name is required');
      return false;
    }
    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.ok) {
      setError(phoneCheck.message);
      return false;
    }
    return true;
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!validateForm()) return;

    setSaving(true);
    try {
      let response;
      const payloadObj = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone || '',
      };

      // Prepare target URL: use /users/:id/ for update (router registers users)
      const targetUrl = user?.id ? `/users/${user.id}/` : '/users/me/';

      // If cropping used and we have a cropped canvas blob, attach it
      if (avatarFile && tempImageUrl === null) {
        // user already applied crop -> avatarFile is the cropped File
        const fd = new FormData();
        Object.entries(payloadObj).forEach(([k,v]) => fd.append(k,v));
        fd.append('avatar', avatarFile);
        // do not set Content-Type; axios will set multipart boundary
        response = await tryPatchThenPut(targetUrl, fd);
      } else if (avatarFile && tempImageUrl) {
        // avatar selected but NOT cropped yet: attempt to use original file (server may accept)
        // Prefer user to crop; but attempt upload of original
        const fd = new FormData();
        Object.entries(payloadObj).forEach(([k,v]) => fd.append(k,v));
        fd.append('avatar', avatarFile);
        response = await tryPatchThenPut(targetUrl, fd);
      } else {
        // JSON patch (no avatar)
        response = await tryPatchThenPut(targetUrl, payloadObj);
      }

      const updated = response.data;
      setUser(updated);
      setSuccessMsg('Profile updated');
      setIsEditOpen(false);
      setTempImageUrl(null);

      // cleanup preview blob URL if needed
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        try { URL.revokeObjectURL(avatarPreview); } catch(e) {}
      }
      setAvatarFile(null);

      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Failed to save profile', err);
      const msg = err?.response?.data?.detail || err?.response?.data || 'Failed to update profile';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const DefaultAvatar = ({ name, size=96 }) => {
    const initials = (name || '').split(/\s+/).map(n => n[0]).slice(0,2).join('').toUpperCase() || '?';
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" className="rounded-full" role="img" aria-label="User avatar">
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="60" fill="url(#g1)" />
        <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize="44" fill="#fff" fontFamily="Inter, Roboto, sans-serif" fontWeight="700">
          {initials}
        </text>
      </svg>
    );
  };

  if (loading) return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 bg-gray-200 rounded" />
        <div className="h-56 bg-gray-100 rounded" />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* header with centered avatar */}
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(90deg,#4f46e5 0%, #06b6d4 100%)' }}>
        <div className="p-6 md:p-8 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-32 w-32 md:h-36 md:w-36 rounded-full overflow-hidden ring-4 ring-white shadow-xl bg-white flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="User avatar" className="h-full w-full object-cover" />
              ) : (
                <DefaultAvatar name={`${user?.first_name} ${user?.last_name}`} size={128} />
              )}
            </div>
          </div>

          <div className="text-center text-white">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {user?.first_name || ''} {user?.last_name || ''}
            </h1>
            <div className="mt-1 text-indigo-100 text-sm">
              {user?.role || 'User'} {user?.department ? `• ${user.department}` : ''}
            </div>
            <div className="mt-2 text-indigo-100 text-sm">
              {user?.location || ''}
            </div>
          </div>
        </div>
      </div>

      {/* main page */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <main className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-medium text-gray-900">Contact</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-1 gap-4">
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="font-medium text-gray-900 break-all">{user?.email || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Phone</div>
                <div className="font-medium text-gray-900">{user?.phone || '-'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent activity</h3>
              <button onClick={() => setRecent([])} className="text-sm text-gray-500 hover:underline">Clear</button>
            </div>

            <div className="mt-3">
              {recentLoading ? (
                <div className="text-sm text-gray-600">Loading activity…</div>
              ) : recent.length === 0 ? (
                <div className="text-sm text-gray-600">No recent activity to show.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recent.map(item => (
                    <li key={item.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500">Project: {item.project_code || '-'} • Status: {item.status}</div>
                        </div>
                        <div className="text-xs text-gray-400">{item.status_date ? new Date(item.status_date).toLocaleDateString() : '-'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>

        <aside className="space-y-6">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-xs text-gray-500">Role</div>
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold">{user?.role || 'User'}</div>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-xs text-gray-500">Quick actions</div>
            <div className="mt-3 flex flex-col gap-2">
              <a href="/settings" className="px-3 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50">Account settings</a>
              <a href="/reports/status" className="px-3 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50">View reports</a>
              <button onClick={openEdit} className="px-3 py-2 rounded text-sm bg-indigo-600 text-white hover:bg-indigo-700">Edit profile</button>
            </div>
          </div>
        </aside>
      </div>

      {/* ---------------- Edit Modal ---------------- */}
      <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
            <form onSubmit={handleSave} className="p-6">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold text-gray-900">Edit profile</Dialog.Title>
                <div className="flex items-center gap-3">
                  {saving && <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />}
                  <button type="button" onClick={() => setIsEditOpen(false)} className="text-sm text-gray-500">Close</button>
                </div>
              </div>

              {error && <div className="mt-3 p-2 bg-red-50 text-red-700 rounded">{error}</div>}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First name <span className="text-red-500">*</span></label>
                  <input
                    value={form.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className="mt-1 w-full border rounded px-3 py-2 text-gray-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last name <span className="text-red-500">*</span></label>
                  <input
                    value={form.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    className="mt-1 w-full border rounded px-3 py-2 text-gray-700"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="mt-1 w-full border rounded px-3 py-2 text-gray-700"
                    placeholder="+1 555 123 4567"
                  />
                  {phoneError ? <p className="mt-1 text-xs text-red-600">{phoneError}</p> : <p className="mt-1 text-xs text-gray-500">International format recommended (e.g. +15551234567)</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Avatar</label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="avatar preview" className="h-full w-full object-cover" />
                      ) : (
                        <DefaultAvatar name={`${form.first_name} ${form.last_name}`} size={64} />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center px-3 py-2 border rounded text-sm bg-white hover:bg-gray-50">
                        <PhotoIcon className="h-4 w-4 mr-2 text-gray-600" />
                        <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        Upload
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(user?.avatar_url || null);
                          setTempImageUrl(null);
                        }}
                        className="text-sm text-gray-500"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded text-gray-700">Cancel</button>
                <button
                  type="submit"
                  disabled={saving || !!phoneError}
                  className={`px-4 py-2 rounded ${saving || !!phoneError ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* ---------------- Crop Modal ---------------- */}
      <Dialog open={isCropOpen} onClose={() => setIsCropOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Crop avatar</h3>
                <button onClick={() => setIsCropOpen(false)} className="text-gray-500">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 flex flex-col items-center">
                  <div className="w-full max-w-md bg-gray-50 rounded overflow-hidden shadow-inner">
                    <canvas ref={canvasRef} className="w-full h-auto bg-white" style={{ width: '100%', maxHeight: 420 }} />
                    {tempImageUrl && <img ref={imgRef} src={tempImageUrl} alt="crop source" onLoad={onCropImageLoad} style={{ display: 'none' }} />}
                  </div>

                  <div className="mt-3 w-full max-w-md">
                    <div className="text-xs text-gray-500">Zoom</div>
                    <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500">Horizontal</div>
                        <input type="range" min="0" max="100" step="1" value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} className="w-full" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Vertical</div>
                        <input type="range" min="0" max="100" step="1" value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} className="w-full" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2 md:p-0">
                  <div className="text-sm text-gray-700">Preview</div>
                  <div className="mt-2 w-40 h-40 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    <canvas id="preview-small" width="160" height="160" ref={(node) => {
                      if (!node) return;
                      const main = canvasRef.current;
                      if (!main) return;
                      const ctx = node.getContext('2d');
                      ctx.clearRect(0,0,node.width,node.height);
                      ctx.drawImage(main, 0, 0, node.width, node.height);
                    }} />
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <button onClick={async () => {
                      const blob = await getCroppedBlob();
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        setAvatarPreview(url);
                        const file = new File([blob], 'avatar.jpg', { type: blob.type });
                        setAvatarFile(file);
                        setTempImageUrl(null);
                      }
                      setIsCropOpen(false);
                    }} className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Apply crop</button>

                    <button onClick={() => {
                      if (tempImageUrl) try { URL.revokeObjectURL(tempImageUrl); } catch(e){}
                      setTempImageUrl(null);
                      setAvatarFile(null);
                      setAvatarPreview(user?.avatar_url || null);
                      setIsCropOpen(false);
                    }} className="px-3 py-2 rounded border text-gray-700">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
