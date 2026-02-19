import { NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getStorage, ref, getBytes } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export async function GET() {
  try {
    const storage = getStorage(app, 'gs://triplox-contas.firebasestorage.app')
    const fileRef = ref(storage, 'trainings/lista-atual.xls')
    const bytes = await getBytes(fileRef)

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': 'inline; filename="lista-atual.xls"',
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Não foi possível carregar o arquivo.' },
      { status: 500 }
    )
  }
}