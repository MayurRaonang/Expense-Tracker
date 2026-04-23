import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify({ email: data.email, fullName: data.fullName, currency: data.currency }))
      setUser({ email: data.email, fullName: data.fullName, currency: data.currency })
      toast.success(`Welcome back, ${data.fullName.split(' ')[0]}!`)
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (email, password, fullName, currency = 'INR') => {
    setLoading(true)
    try {
      const { data } = await authApi.register({ email, password, fullName, currency })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify({ email: data.email, fullName: data.fullName, currency: data.currency }))
      setUser({ email: data.email, fullName: data.fullName, currency: data.currency })
      toast.success('Account created!')
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
