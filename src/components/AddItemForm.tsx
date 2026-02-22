'use client'

import { useState } from 'react'
import { Plus, Link as LinkIcon, Loader2 } from 'lucide-react'

interface AddItemFormProps {
    onAdd: (url: string, name: string, unitSize?: string, categoryId?: string) => Promise<void>
    categories: { id: string, name: string }[]
}

export default function AddItemForm({ onAdd, categories }: AddItemFormProps) {
    const [url, setUrl] = useState('')
    const [name, setName] = useState('')
    const [unitSize, setUnitSize] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [loading, setLoading] = useState(false)

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
        <form onSubmit={handleSubmit} className="glass-card p-6 mb-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                    <label className="block text-text-secondary text-xs font-bold mb-2 uppercase tracking-widest">
                        Product URL
                    </label>
                    <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Paste momo or PChome link..."
                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-10 pr-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors"
                            required
                        />
                    </div>
                </div>

                <div className="w-full">
                    <label className="block text-text-secondary text-xs font-bold mb-2 uppercase tracking-widest">
                        Display Name (Optional)
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Leave blank to auto-fetch title"
                        className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                <div className="w-full">
                    <label className="block text-text-secondary text-xs font-bold mb-2 uppercase tracking-widest">
                        Category
                    </label>
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors appearance-none"
                    >
                        <option value="">No Category</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full">
                    <label className="block text-text-secondary text-xs font-bold mb-2 uppercase tracking-widest">
                        Unit Size (Target Comparison)
                    </label>
                    <input
                        type="text"
                        value={unitSize}
                        onChange={(e) => setUnitSize(e.target.value)}
                        placeholder="e.g. 1 year, 500ml, 30pcs"
                        className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors"
                    />
                </div>

                <div className="flex items-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-bold h-[50px] rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                        Tracking Product
                    </button>
                </div>
            </div>
        </form>
    )
}
