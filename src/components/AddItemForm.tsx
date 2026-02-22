'use client'

import { useState } from 'react'
import { Plus, Link as LinkIcon, Loader2, Save } from 'lucide-react'

interface AddItemFormProps {
    onAdd: (url: string, name: string, unitSize?: string, categoryId?: string) => Promise<void>
    onAddCategory: (name: string) => Promise<string | undefined>
    categories: { id: string, name: string }[]
}

export default function AddItemForm({ onAdd, onAddCategory, categories }: AddItemFormProps) {
    const [url, setUrl] = useState('')
    const [name, setName] = useState('')
    const [unitSize, setUnitSize] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [loading, setLoading] = useState(false)

    // Inline category creation state
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [addingCategory, setAddingCategory] = useState(false)

    const handleQuickAddCategory = async () => {
        if (!newCategoryName) {
            setIsAddingNewCategory(false)
            return
        }
        setAddingCategory(true)
        try {
            const newId = await onAddCategory(newCategoryName)
            if (newId) {
                setCategoryId(newId)
                setIsAddingNewCategory(false)
                setNewCategoryName('')
            }
        } finally {
            setAddingCategory(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return

        setLoading(true)
        try {
            await onAdd(url, name, unitSize, categoryId || undefined)
            setUrl('')
            setName('')
            setUnitSize('')
            setCategoryId('')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="glass-card p-6 mb-12 flex flex-col gap-5 border-brand-primary/10">
            {/* Primary Action Row */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary/60">
                        <LinkIcon size={20} />
                    </div>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="在此貼上 momo 或 PChome 商品連結..."
                        className="w-full bg-surface-dark/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-primary focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all text-lg"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !url}
                    className="md:w-48 bg-brand-primary hover:bg-brand-primary/90 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-xl shadow-brand-primary/20 h-[60px] md:h-auto"
                >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                    立即追蹤
                </button>
            </div>

            {/* Optional Metadata Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                            分類
                        </label>
                        {!isAddingNewCategory && (
                            <button
                                type="button"
                                onClick={() => setIsAddingNewCategory(true)}
                                className="text-[10px] font-bold text-brand-primary hover:text-brand-primary/80 flex items-center gap-0.5"
                            >
                                <Plus size={10} /> 新增
                            </button>
                        )}
                    </div>

                    <div className="relative flex gap-2">
                        {isAddingNewCategory ? (
                            <div className="flex w-full gap-1">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="輸入新分類..."
                                    className="flex-1 bg-surface-dark border border-brand-primary/50 rounded-xl py-2 px-3 text-text-primary text-sm focus:outline-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleQuickAddCategory()
                                        }
                                        if (e.key === 'Escape') setIsAddingNewCategory(false)
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleQuickAddCategory}
                                    disabled={addingCategory}
                                    className="bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary px-3 rounded-xl transition-colors"
                                >
                                    {addingCategory ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                </button>
                            </div>
                        ) : (
                            <div className="relative w-full">
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors appearance-none cursor-pointer text-sm"
                                >
                                    <option value="">未分類</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">
                        規格 (選填)
                    </label>
                    <input
                        type="text"
                        value={unitSize}
                        onChange={(e) => setUnitSize(e.target.value)}
                        placeholder="例如: 500ml, 30入"
                        className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors text-sm"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">
                        顯示名稱 (選填)
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="不填則自動抓取品名"
                        className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors text-sm"
                    />
                </div>
            </div>
        </form>
    )
}
