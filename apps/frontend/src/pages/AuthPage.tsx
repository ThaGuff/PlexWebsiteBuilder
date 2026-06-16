import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowRight, Globe } from 'lucide-react'
import { authApi } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Logo } from '../components/ui/Logo'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const handleLogin = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.email, data.password)
      setAuth(res.user, res.token)
      toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (data: RegisterForm) => {
    setLoading(true)
    try {
      const res = await authApi.register(data.name, data.email, data.password)
      setAuth(res.user, res.token)
      toast.success('Account created! Let\'s build something amazing.')
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#121212] border-r border-white/8 flex-col justify-between p-12 relative overflow-hidden">
        {/* Web background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, transparent 48%, rgba(200,226,10,0.8) 49%, rgba(200,226,10,0.8) 50%, transparent 51%),
            radial-gradient(circle at 50% 50%, transparent 30%, rgba(200,226,10,0.8) 31%, rgba(200,226,10,0.8) 32%, transparent 33%),
            radial-gradient(circle at 50% 50%, transparent 14%, rgba(200,226,10,0.8) 15%, rgba(200,226,10,0.8) 16%, transparent 17%)
          `,
          backgroundSize: '300px 300px',
          backgroundPosition: 'center',
        }} />

        <Logo size={44} animate />

        <div>
          <h2 className="font-display font-bold text-4xl text-white mb-4 leading-tight">
            Build premium websites{' '}
            <span className="text-lime">with one hop.</span>
          </h2>
          <p className="text-white/50 text-lg leading-relaxed mb-8">
            Paste a URL or describe a business — WebHop does the rest. Brand analysis, WordPress build, SEO, schemas — fully delivered.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              'AI-powered website scraping & brand extraction',
              'WordPress themes built around your brand DNA',
              'Schema markup, SEO, and sitemaps auto-generated',
              'One-click export for client delivery',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-lime/15 border border-lime/30 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime" />
                </div>
                <span className="text-white/60 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/25 text-xs">
          <Globe size={12} />
          <span>Powered by PLEX Automation</span>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo size={36} />
          </div>

          <div className="mb-8">
            <h1 className="font-display font-bold text-2xl text-white mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-white/40 text-sm">
              {mode === 'login'
                ? "Sign in to your WebHop account"
                : "Start building premium websites today"}
            </p>
          </div>

          {mode === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Email</label>
                <input
                  {...loginForm.register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    {...loginForm.register('password')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-red-400 text-xs mt-1">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 mt-2"
              >
                {loading ? 'Signing in…' : (
                  <>Sign in <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Full Name</label>
                <input
                  {...registerForm.register('name')}
                  type="text"
                  placeholder="Ryan Smith"
                  className="input"
                />
                {registerForm.formState.errors.name && (
                  <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Email</label>
                <input
                  {...registerForm.register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    {...registerForm.register('password')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="input pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Confirm Password</label>
                <input
                  {...registerForm.register('confirmPassword')}
                  type="password"
                  placeholder="••••••••"
                  className="input"
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
                {loading ? 'Creating account…' : (
                  <>Create account <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-white/30 text-sm">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-lime hover:text-lime-300 font-medium transition-colors"
              >
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
