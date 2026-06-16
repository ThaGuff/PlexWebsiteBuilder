import { useAuthStore } from '../store/auth'
import { useState } from 'react'
import { User, Key, Bell, CreditCard, Save, Eye, EyeOff, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [apiKeys, setApiKeys] = useState({
    anthropicKey: '',
    openaiKey: '',
  })

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.patch('/auth/me', { name })
      updateUser({ name })
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (!newPw || newPw.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    setSaving(true)
    try {
      await api.patch('/auth/password', { currentPassword: currentPw, newPassword: newPw })
      toast.success('Password updated')
      setCurrentPw('')
      setNewPw('')
    } catch {
      toast.error('Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const saveApiKeys = async () => {
    setSaving(true)
    try {
      await api.post('/settings/api-keys', apiKeys)
      toast.success('API keys saved securely')
      setApiKeys({ anthropicKey: '', openaiKey: '' })
    } catch {
      toast.error('Failed to save API keys')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">Settings</h1>
        <p className="text-white/40 text-sm">Manage your account and integrations</p>
      </div>

      {/* Profile */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-lime" />
          <h2 className="font-semibold text-white">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Email</label>
            <input
              value={user?.email || ''}
              disabled
              className="input opacity-50 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Plan</label>
            <div className="flex items-center gap-2">
              <span className="badge-lime capitalize">{user?.plan || 'starter'}</span>
              <button className="text-xs text-lime hover:text-lime-300 transition-colors">
                Upgrade →
              </button>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Profile
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-5">
          <Key size={16} className="text-lime" />
          <h2 className="font-semibold text-white">Change Password</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Current Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="input pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">New Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="input"
              placeholder="Min. 6 characters"
            />
          </div>
          <button onClick={savePassword} disabled={saving} className="btn-secondary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Key size={15} />}
            Update Password
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={16} className="text-lime" />
          <h2 className="font-semibold text-white">AI API Keys</h2>
        </div>
        <p className="text-xs text-white/35 mb-5">
          Bring your own keys for higher usage limits. Keys are stored encrypted.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Anthropic Claude API Key</label>
            <input
              type="password"
              value={apiKeys.anthropicKey}
              onChange={(e) => setApiKeys(k => ({ ...k, anthropicKey: e.target.value }))}
              className="input font-mono text-xs"
              placeholder="sk-ant-…"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">OpenAI API Key</label>
            <input
              type="password"
              value={apiKeys.openaiKey}
              onChange={(e) => setApiKeys(k => ({ ...k, openaiKey: e.target.value }))}
              className="input font-mono text-xs"
              placeholder="sk-…"
            />
          </div>
          <button onClick={saveApiKeys} disabled={saving} className="btn-secondary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Keys
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border border-red-500/15 bg-red-500/3">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-red-400" />
          <h2 className="font-semibold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-xs text-white/35 mb-4">
          Permanently delete your account and all associated data.
        </p>
        <button className="btn-danger text-sm">
          Delete Account
        </button>
      </div>
    </div>
  )
}
