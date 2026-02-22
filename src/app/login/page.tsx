'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Package, Mail, Lock, Loader2, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isLogin) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (signInError) throw signInError
                router.push('/')
            } else {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (signUpError) throw signUpError
                alert('註冊成功！請檢查您的信箱並驗證信件。')
                setIsLogin(true)
            }
        } catch (err: any) {
            setError(err.message || '發生錯誤，請稍後再試')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        try {
            setLoading(true)
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`
                }
            })
            if (error) throw error
        } catch (err: any) {
            setError(err.message || '發生錯誤，請稍後再試')
            setLoading(false)
        }
    }

    const handleAnonymousLogin = async () => {
        try {
            setLoading(true)
            setError(null)
            const { error } = await supabase.auth.signInAnonymously()
            if (error) throw error
            router.push('/')
        } catch (err: any) {
            setError(err.message || '匿名登入失敗 (提示：請確認 Supabase Dashboard > Authentication > Providers 是否有开启 Anonymous)')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card max-w-md w-full p-8 rounded-2xl border border-white/10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl flex items-center justify-center mb-4 text-brand-primary">
                        <Package size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-text-primary">
                        {isLogin ? '登入 Price Tracker' : '註冊 Price Tracker'}
                    </h1>
                    <p className="text-text-secondary text-sm mt-2 text-center">
                        追蹤電商商品價格，掌握最佳買點
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-brand-primary transition-colors" size={18} />
                        <input
                            type="email"
                            required
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-10 pr-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-all focus:ring-4 focus:ring-brand-primary/10"
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-brand-primary transition-colors" size={18} />
                        <input
                            type="password"
                            required
                            placeholder="密碼"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-10 pr-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-all focus:ring-4 focus:ring-brand-primary/10"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : isLogin ? '登入' : '註冊'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-surface-dark text-text-secondary">或是</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white text-gray-900 border hover:bg-gray-100 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        使用 Google 登入
                    </button>

                    <button
                        type="button"
                        onClick={handleAnonymousLogin}
                        disabled={loading}
                        className="w-full bg-surface-dark/50 text-text-primary border border-white/10 hover:bg-surface-dark font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <User size={20} className="text-brand-primary" />
                        匿名使用 (不需登入)
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin)
                            setError(null)
                        }}
                        className="text-text-secondary hover:text-brand-primary text-sm transition-colors"
                    >
                        {isLogin ? '沒有帳號嗎？點此註冊' : '已經有帳號了？點此登入'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
