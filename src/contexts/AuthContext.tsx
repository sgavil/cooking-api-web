import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

interface User extends FirebaseUser {
  isAdmin?: boolean
}

interface AuthContextType {
  currentUser: User | null
  currentUsername: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, username: string) => Promise<void>
  logout: () => Promise<void>
  updateUserPassword: (newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setCurrentUsername(userData.username)
          // Add admin status to the user object
          const userWithAdmin = user as User
          userWithAdmin.isAdmin = userData.isAdmin || false
          setCurrentUser(userWithAdmin)
        }
      } else {
        setCurrentUser(null)
        setCurrentUsername(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signup(email: string, password: string, username: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // Store username in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      username,
      email,
      isAdmin: false, // Default to non-admin
    })
    
    setCurrentUsername(username)
  }

  async function login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // Get username and admin status from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      setCurrentUsername(userData.username)
      // Add admin status to the user object
      const userWithAdmin = user as User
      userWithAdmin.isAdmin = userData.isAdmin || false
      setCurrentUser(userWithAdmin)
    }
  }

  async function logout() {
    await signOut(auth)
    setCurrentUsername(null)
  }

  async function updateUserPassword(newPassword: string) {
    if (!currentUser) throw new Error('No user logged in')
    await updatePassword(currentUser, newPassword)
  }

  const value = {
    currentUser,
    currentUsername,
    login,
    signup,
    logout,
    updateUserPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
} 