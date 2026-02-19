import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { useEffect, useState } from 'react'

function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false)
        setChecking(false)
        return
      }

      const snap = await getDoc(doc(db, 'users', user.uid))
      setIsAdmin(snap.exists() && snap.data()?.role === 'admin')
      setChecking(false)
    })

    return () => unsub()
  }, [])

  return { isAdmin, checking }
}