'use client'

import { TrackedItem, Category } from '@/types'
import { ExternalLink, Trash2, Tag, Folder } from 'lucide-react'
import { motion } from 'framer-motion'

interface TrackedItemCardProps {
    item: TrackedItem
    categories: Category[]
    onDelete: (id: string) => void
    onUpdateCategory: (categoryId: string | undefined) => void
    onEdit: (item: TrackedItem) => void
    isBestDeal?: boolean
}

export default function TrackedItemCard({
    item,
    categories,
    onDelete,
    onUpdateCategory,
    onEdit,
    isBestDeal
}: TrackedItemCardProps) {
    const isMomo = item.url.includes('momoshop.com.tw')
    const platformName = isMomo ? 'momo' : 'PChome'

    // Helper to extract numeric value from strings like "1 year", "500ml", "30pcs"
    const calculateUnitPrice = (price: number, unitSize: string) => {
        const match = unitSize.match(/(\d+(\.\d+)?)/)
        if (!match) return null
        const value = parseFloat(match[0])
        if (value === 0) return null
        return (price / value)
    }

    const unitPrice = item.unit_size ? calculateUnitPrice(item.current_price, item.unit_size) : null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            layout
            className={`glass-card p-5 hover-glow flex flex-col h-full group relative ${isBestDeal ? 'border-brand-primary/50' : ''}`}
        >
            {isBestDeal && (
                <div className="absolute -top-3 left-4 bg-brand-primary text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg shadow-brand-primary/20 z-10 flex items-center gap-1">
                    <Tag size={10} />
                    最划算
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${isMomo ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                    {platformName}
                </span>
                <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item);
                        }}
                        className="text-text-secondary hover:text-brand-primary p-1"
                    >
                        <Tag size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                        }}
                        className="text-text-secondary hover:text-red-400 p-1"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <h3 className="text-text-primary font-semibold text-lg line-clamp-2 mb-2">
                {item.name}
            </h3>

            <div className="mb-4">
                <div className="flex items-center gap-2 group/cat relative">
                    <Folder size={14} className="text-text-secondary" />
                    <select
                        value={item.category_id || ''}
                        onChange={(e) => onUpdateCategory(e.target.value || undefined)}
                        className="bg-transparent text-xs text-text-secondary hover:text-brand-primary outline-none cursor-pointer appearance-none pr-4"
                    >
                        <option value="" className="bg-surface-dark text-text-primary">未分類</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id} className="bg-surface-dark text-text-primary">
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex items-end justify-between mt-auto">
                <div>
                    <p className="text-text-secondary text-sm mb-1">目前價格</p>
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-brand-primary">
                            ${item.current_price.toLocaleString()}
                        </span>
                        {unitPrice !== null && (
                            <span className={`text-xs font-medium mt-1 ${isBestDeal ? 'text-green-400' : 'text-brand-secondary'}`}>
                                平均 ${unitPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })} / 單位
                            </span>
                        )}
                    </div>
                </div>

                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-surface-accent rounded-lg text-text-primary hover:bg-brand-primary/20 transition-colors"
                >
                    <ExternalLink size={18} />
                </a>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-text-secondary">
                <div className="flex items-center gap-1">
                    <Tag size={12} />
                    <span>{item.unit_size || '尚無規格資訊'}</span>
                </div>
                <span>{new Date(item.last_checked_at).toLocaleDateString()}</span>
            </div>
        </motion.div>
    )
}
