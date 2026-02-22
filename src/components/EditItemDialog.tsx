'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Tag, Folder, Type } from 'lucide-react'
import { TrackedItem, Category } from '@/types'

interface EditItemDialogProps {
    isOpen: boolean
    item: TrackedItem | null
    categories: Category[]
    onSave: (id: string, updates: Partial<TrackedItem>) => Promise<void>
    onClose: () => void
}

export default function EditItemDialog({
    isOpen,
    item,
    categories,
    onSave,
    onClose
}: EditItemDialogProps) {
    const [name, setName] = useState('')
    const [unitSize, setUnitSize] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (item) {
            setName(item.name)
            setUnitSize(item.unit_size || '')
            setCategoryId(item.category_id || '')
        }
    }, [item, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!item) return

        setLoading(true)
        try {
            await onSave(item.id, {
                name,
                unit_size: unitSize,
                category_id: categoryId || null as any
            })
            onClose()
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && item && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md glass-card border-white/20 p-8 overflow-hidden"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                                <Tag className="text-brand-primary" size={24} />
                                編輯商品資訊
                            </h3>
                            <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div>
                                <label className="block text-text-secondary text-xs font-bold mb-2 uppercase tracking-widest">
                                    顯示名稱
                                </label>
                                <div className="relative">
                                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-10 pr-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-secondary text-xs font-bold mb-2 uppercase tracking-widest">
                                        分類
                                    </label>
                                    <div className="relative">
                                        <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-10 pr-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors appearance-none"
                                        >
                                            <option value="">未分類</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-text-secondary text-xs font-bold mb-2 uppercase tracking-widest">
                                        規格 (單位)
                                    </label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                        <input
                                            type="text"
                                            value={unitSize}
                                            onChange={(e) => setUnitSize(e.target.value)}
                                            placeholder="例: 500ml"
                                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-10 pr-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-text-primary font-bold hover:bg-white/10 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-brand-primary hover:bg-brand-primary/80 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                                >
                                    {loading ? '儲存中...' : (
                                        <>
                                            <Save size={20} />
                                            確認儲存
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
