'use client'

import { TrackedItem } from '@/types'
import { ExternalLink, Trash2, Tag } from 'lucide-react'
import { motion } from 'framer-motion'

interface TrackedItemCardProps {
    item: TrackedItem
    onDelete: (id: string) => void
}

export default function TrackedItemCard({ item, onDelete }: TrackedItemCardProps) {
    const isMomo = item.url.includes('momoshop.com.tw')
    const platformName = isMomo ? 'momo' : 'PChome'

    // Helper to extract numeric value from strings like "1 year", "500ml", "30pcs"
    const calculateUnitPrice = (price: number, unitSize: string) => {
        const match = unitSize.match(/(\d+(\.\d+)?)/)
        if (!match) return 'N/A'
        const value = parseFloat(match[0])
        if (value === 0) return 'N/A'
        return (price / value).toLocaleString(undefined, { maximumFractionDigits: 1 })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            layout
            className="glass-card p-5 hover-glow flex flex-col h-full group"
        >
            <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${isMomo ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                    {platformName}
                </span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                    }}
                    className="text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <h3 className="text-text-primary font-semibold text-lg line-clamp-2 mb-2 flex-grow">
                {item.name}
            </h3>

            <div className="flex items-end justify-between mt-4">
                <div>
                    <p className="text-text-secondary text-sm mb-1">Current Price</p>
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-brand-primary">
                            ${item.current_price.toLocaleString()}
                        </span>
                        {item.unit_size && (
                            <span className="text-xs text-brand-secondary font-medium mt-1">
                                Avg. ${calculateUnitPrice(item.current_price, item.unit_size)} / unit
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
                    <span>{item.unit_size || 'No size info'}</span>
                </div>
                <span>{new Date(item.last_checked_at).toLocaleDateString()}</span>
            </div>
        </motion.div>
    )
}
