import { useState, useEffect } from 'react'
import { Modal, Button, Input, Select } from './ui'
import { CATEGORIES } from '../utils/helpers'
import { budgetApi } from '../api'
import toast from 'react-hot-toast'

export default function BudgetForm({ isOpen, onClose, onSuccess, editData }) {
  const now = new Date()
  const [form, setForm] = useState({ category: 'Food', monthlyLimit: '', month: now.getMonth() + 1, year: now.getFullYear() })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editData) {
      setForm({ category: editData.category, monthlyLimit: editData.monthlyLimit, month: editData.month, year: editData.year })
    } else {
      setForm({ category: 'Food', monthlyLimit: '', month: now.getMonth() + 1, year: now.getFullYear() })
    }
    setErrors({})
  }, [editData, isOpen])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.category) e.category = 'Required'
    if (!form.monthlyLimit || Number(form.monthlyLimit) <= 0) e.monthlyLimit = 'Enter a valid limit'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await budgetApi.createOrUpdate({ ...form, monthlyLimit: parseFloat(form.monthlyLimit), month: Number(form.month), year: Number(form.year) })
      toast.success(editData ? 'Budget updated' : 'Budget set!')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Edit budget' : 'Set budget'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Select label="Category" value={form.category} onChange={set('category')} error={errors.category}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Monthly limit (₹)" placeholder="e.g. 5000" type="number" min="1" prefix="₹" value={form.monthlyLimit} onChange={set('monthlyLimit')} error={errors.monthlyLimit} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Select label="Month" value={form.month} onChange={set('month')}>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </Select>
          <Input label="Year" type="number" min="2020" max="2030" value={form.year} onChange={set('year')} />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>{editData ? 'Save changes' : 'Set budget'}</Button>
        </div>
      </div>
    </Modal>
  )
}
