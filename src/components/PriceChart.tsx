'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/utils/supabase'
import { PriceHistory } from '@/types'
import { Loader2 } from 'lucide-react'

interface PriceChartProps {
    itemId: string
}

export default function PriceChart({ itemId }: PriceChartProps) {
    const [history, setHistory] = useState<PriceHistory[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('price_history')
                .select('*')
                .eq('item_id', itemId)
                .order('created_at', { ascending: true })

            if (error) {
                console.error('Error fetching price history:', error)
            } else if (data) {
                setHistory(data)
            }
            setLoading(false)
        }

        fetchHistory()
    }, [itemId])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin text-brand-primary" size={24} />
            </div>
        )
    }

    if (history.length === 0) {
        return (
            <div className="flex justify-center items-center h-48 text-text-secondary text-sm">
                目前尚無歷史價格資料
            </div>
        )
    }

    // Format data for Recharts
    const chartData = history.map(h => ({
        date: new Date(h.created_at).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
        price: h.price
    }))

    return (
        <div className="w-full h-48 mt-4 pt-4 border-t border-white/5">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#ffffff40"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#ffffff40"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${val}`}
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1E1E2E',
                            border: '1px solid #ffffff10',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: any) => {
                            if (typeof value === 'number') return [`$${value.toLocaleString()}`, '價格']
                            return [value, '價格']
                        }}
                        labelStyle={{ color: '#a0a0b0', marginBottom: '4px' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#60A5FA"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#60A5FA', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#60A5FA', stroke: '#1E1E2E', strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
