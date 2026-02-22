'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { TrackedItem, Category } from '@/types'
import AddItemForm from '@/components/AddItemForm'
import TrackedItemCard from '@/components/TrackedItemCard'
import ConfirmDialog from '@/components/ConfirmDialog'
import EditItemDialog from '@/components/EditItemDialog'
import { Package, Search, Loader2, PlusCircle, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/utils/AuthContext'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'

export default function Dashboard() {
  const [items, setItems] = useState<TrackedItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [editingItem, setEditingItem] = useState<TrackedItem | null>(null)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  // Keep track of all active Realtime channels so we can clean them up
  const realtimeChannelsRef = useRef<RealtimeChannel[]>([])

  // Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'primary'
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user) {
      fetchData()
    }
  }, [user, authLoading, router])

  async function fetchData() {
    try {
      setLoading(true)

      const { data: itemsData, error: itemsError } = await supabase
        .from('tracked_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (itemsError) throw itemsError
      setItems(itemsData || [])

      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (catError) throw catError
      setCategories(catData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function addItem(url: string, name: string, unitSize?: string, categoryId?: string) {
    // Step 1: Insert a 'pending' row immediately so the card appears right away
    const placeholderName = name || '抓取中...'
    const { data, error } = await supabase
      .from('tracked_items')
      .insert([
        {
          url,
          name: placeholderName,
          unit_size: unitSize || null,
          category_id: categoryId || null,
          user_id: user?.id,
          current_price: 0,
          status: 'pending',
          last_checked_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      alert('新增失敗: ' + error.message)
      return
    }

    const newItem: TrackedItem = data![0]

    // Step 2: Optimistically add the pending card to the UI
    setItems(prev => [newItem, ...prev])

    // Step 3: Kick off the background scrape (fire-and-forget from the frontend's POV)
    fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, item_id: newItem.id })
    }).catch(err => console.error('[scrape] Failed to start scraper:', err))

    // Step 4: Subscribe to Realtime updates for THIS specific row
    // When the scraper finishes and updates the DB, this fires automatically.
    const channel = supabase
      .channel(`item-update-${newItem.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tracked_items',
          filter: `id=eq.${newItem.id}`
        },
        (payload) => {
          const updated = payload.new as TrackedItem
          setItems(prev =>
            prev.map(item => item.id === updated.id ? { ...item, ...updated } : item)
          )
          // Once the scrape is done (success or error), unsubscribe
          if (updated.status === 'done' || updated.status === 'error') {
            supabase.removeChannel(channel)
            realtimeChannelsRef.current = realtimeChannelsRef.current.filter(c => c !== channel)
          }
        }
      )
      .subscribe()

    realtimeChannelsRef.current.push(channel)
  }

  async function updateItem(id: string, updates: Partial<TrackedItem>) {
    const { error } = await supabase
      .from('tracked_items')
      .update(updates)
      .eq('id', id)

    if (error) {
      alert('更新失敗: ' + error.message)
      return
    }

    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  async function addCategory(name?: string) {
    const targetName = name || newCategoryName
    if (!targetName) return
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: targetName, user_id: user?.id }])
      .select()

    if (error) {
      alert('新增分類失敗: ' + error.message)
      return
    }

    if (data) {
      setCategories(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName('')
      return data[0].id
    }
  }

  async function updateCategory(id: string, newName: string) {
    const { error } = await supabase
      .from('categories')
      .update({ name: newName })
      .eq('id', id)

    if (error) {
      alert('更新失敗: ' + error.message)
      return
    }

    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c).sort((a, b) => a.name.localeCompare(b.name)))
    setEditingCategoryId(null)
  }

  const triggerDeleteCategory = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: '刪除分類',
      message: '確定要刪除此分類嗎？該分類下的商品將變為「未分類」。',
      variant: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('categories').delete().eq('id', id)
        if (error) {
          alert('刪除失敗: ' + error.message)
          return
        }
        setCategories(prev => prev.filter(c => c.id !== id))
        if (selectedCategory === id) setSelectedCategory(null)
      }
    })
  }

  async function updateItemCategory(itemId: string, categoryId: string | undefined) {
    const { error } = await supabase
      .from('tracked_items')
      .update({ category_id: categoryId || null })
      .eq('id', itemId)

    if (error) {
      alert('更新分類失敗: ' + error.message)
      return
    }

    setItems(prev => prev.map(item => item.id === itemId ? { ...item, category_id: categoryId } : item))
  }

  const triggerDeleteItem = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: '停止追蹤',
      message: '確定要停止追蹤此商品嗎？所有的歷史價格紀錄也將被移除。',
      variant: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('tracked_items').delete().eq('id', id)
        if (error) {
          alert('刪除失敗: ' + error.message)
          return
        }
        setItems(prev => prev.filter(item => item.id !== id))
      }
    })
  }

  // Calculate best deals
  const getBestDealItems = () => {
    const deals: Record<string, string> = {}

    const categoryGroups: Record<string, TrackedItem[]> = {}
    items.forEach(item => {
      const catId = item.category_id || 'uncategorized'
      if (!categoryGroups[catId]) categoryGroups[catId] = []
      categoryGroups[catId].push(item)
    })

    Object.entries(categoryGroups).forEach(([catId, group]) => {
      let minUnitPrice = Infinity
      let bestItemId = ''

      group.forEach(item => {
        if (!item.unit_size) return
        const match = item.unit_size.match(/(\d+(\.\d+)?)/)
        if (!match) return
        const val = parseFloat(match[0])
        if (val === 0) return
        const unitPrice = item.current_price / val
        if (unitPrice < minUnitPrice) {
          minUnitPrice = unitPrice
          bestItemId = item.id
        }
      })

      if (bestItemId) deals[catId] = bestItemId
    })

    return deals
  }

  const bestDealMap = getBestDealItems()

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchFilter.toLowerCase())
    const matchesCategory = selectedCategory ? item.category_id === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={48} />
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-12 min-h-screen">
      <ConfirmDialog
        {...confirmState}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

      <EditItemDialog
        isOpen={!!editingItem}
        item={editingItem}
        categories={categories}
        onClose={() => setEditingItem(null)}
        onSave={updateItem}
        onAddCategory={addCategory}
      />

      <header className="mb-12 flex justify-between items-start">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-text-primary mb-2 flex items-center gap-3">
            <Package className="text-brand-primary" size={32} />
            Price Tracker
          </h1>
          <p className="text-text-secondary">追蹤台灣電商平台價格，做出最划算的採買策略。</p>
        </motion.div>

        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
          className="flex items-center gap-2 text-text-secondary hover:text-red-400 transition-colors bg-surface-dark px-4 py-2 rounded-xl border border-white/5"
        >
          <LogOut size={18} />
          <span className="text-sm font-bold">登出</span>
        </button>
      </header>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            追蹤新商品
          </h2>
          <button
            type="button"
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="text-brand-primary text-sm font-bold flex items-center gap-1 hover:underline"
          >
            <PlusCircle size={16} />
            管理分類
          </button>
        </div>

        {showAddCategory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="glass-card p-6 mb-8 border-brand-primary/20"
          >
            <div className="flex flex-col gap-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="新分類名稱..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-surface-dark border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-brand-primary/50 outline-none"
                />
                <button
                  type="button"
                  onClick={() => addCategory()}
                  className="bg-brand-primary px-6 py-2 rounded-lg text-white font-bold text-sm hover:bg-brand-primary/80 transition-colors"
                >
                  新增
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-white/5">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3 group">
                    {editingCategoryId === cat.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          autoFocus
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateCategory(cat.id, editingCategoryName)
                            if (e.key === 'Escape') setEditingCategoryId(null)
                          }}
                          className="flex-1 bg-surface-dark border border-brand-primary/50 rounded px-2 py-1 text-sm text-text-primary outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateCategory(cat.id, editingCategoryName)}
                          className="text-green-400 hover:text-green-300 font-bold text-xs"
                        >
                          儲存
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-text-primary text-sm font-medium">{cat.name}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryId(cat.id);
                              setEditingCategoryName(cat.name);
                            }}
                            className="text-text-secondary hover:text-brand-primary transition-colors text-xs"
                          >
                            編輯
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerDeleteCategory(cat.id);
                            }}
                            className="text-text-secondary hover:text-red-400 transition-colors text-xs"
                          >
                            刪除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AddItemForm onAdd={addItem} onAddCategory={addCategory} categories={categories} />
      </section>

      <section className="mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          <div className="flex items-center gap-2 bg-surface-dark/50 p-1.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${!selectedCategory ? 'bg-brand-primary text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              全部顯示
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-brand-primary text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-brand-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="搜尋商品..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-surface-dark border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-text-primary focus:outline-none focus:border-brand-primary/50 transition-all focus:ring-4 focus:ring-brand-primary/5"
          />
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-brand-primary" size={48} />
          <p className="text-text-secondary font-medium">同步資料中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => (
              <TrackedItemCard
                key={item.id}
                item={item}
                categories={categories}
                onDelete={triggerDeleteItem}
                onUpdateCategory={(catId) => updateItemCategory(item.id, catId)}
                onEdit={setEditingItem}
                isBestDeal={bestDealMap[item.category_id || 'uncategorized'] === item.id}
              />
            ))}
          </AnimatePresence>
          {filteredItems.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-text-secondary">目前沒有商品。請在上方新增連結！</p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
