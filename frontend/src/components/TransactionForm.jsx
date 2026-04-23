import { useState, useEffect } from 'react'
import { Modal, Button, Input, Select } from './ui'
import { CATEGORIES } from '../utils/helpers'
import { transactionApi } from '../api'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

export default function TransactionForm({ isOpen, onClose, onSuccess, editData }) {
  const [form, setForm] = useState({ merchant: '', amount: '', category: '', transactionDate: today(), notes: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const isEdit = !!editData

  useEffect(() => {
    if (editData) {
      setForm({
        merchant: editData.merchant || '',
        amount: editData.amount || '',
        category: editData.category || '',
        transactionDate: editData.transactionDate || today(),
        notes: editData.notes || '',
      })
    } else {
      setForm({ merchant: '', amount: '', category: '', transactionDate: today(), notes: '' })
    }
    setErrors({})
  }, [editData, isOpen])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.merchant.trim()) e.merchant = 'Merchant is required'
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Enter a valid amount'
    if (!form.transactionDate) e.transactionDate = 'Date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount) }
      if (!payload.category) delete payload.category
      if (isEdit) {
        await transactionApi.update(editData.id, payload)
        toast.success('Transaction updated')
      } else {
        await transactionApi.create(payload)
        toast.success('Transaction added!')
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit transaction' : 'Add transaction'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input label="Merchant / Description" placeholder="e.g. Swiggy, Amazon, BMTC" value={form.merchant} onChange={set('merchant')} error={errors.merchant} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input label="Amount" placeholder="0.00" type="number" min="0.01" step="0.01" prefix="₹" value={form.amount} onChange={set('amount')} error={errors.amount} />
          <Input label="Date" type="date" value={form.transactionDate} onChange={set('transactionDate')} error={errors.transactionDate} />
        </div>
        <Select label="Category (optional — ML will auto-detect)" value={form.category} onChange={set('category')}>
          <option value="">Auto-detect</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Notes (optional)" placeholder="Any extra details..." value={form.notes} onChange={set('notes')} />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>{isEdit ? 'Save changes' : 'Add transaction'}</Button>
        </div>
      </div>
    </Modal>
  )
}
