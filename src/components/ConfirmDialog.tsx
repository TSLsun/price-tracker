'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
    variant?: 'danger' | 'primary'
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = '確定',
    cancelText = '取消',
    onConfirm,
    onCancel,
    variant = 'primary'
}: ConfirmDialogProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm glass-card border-white/20 p-6 overflow-hidden"
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full ${variant === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-brand-primary/20 text-brand-primary'
                                }`}>
                                <AlertCircle size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
                                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                                    {message}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 text-text-primary font-bold hover:bg-white/10 transition-colors"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onConfirm();
                                            onCancel();
                                        }}
                                        className={`flex-1 px-4 py-2 rounded-xl text-white font-bold transition-all shadow-lg ${variant === 'danger'
                                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                                : 'bg-brand-primary hover:bg-brand-primary/80 shadow-brand-primary/20'
                                            }`}
                                    >
                                        {confirmText}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
