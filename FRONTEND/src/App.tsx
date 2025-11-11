import React, { useState } from 'react'
import LoginView from './views/LoginView'
import RegisterView from './views/RegisterView'

export default function App(){
  const [mode, setMode] = useState<'login'|'register'>('login');
  return mode === 'login'
    ? <LoginView onSwitch={() => setMode('register')} />
    : <RegisterView onSwitch={() => setMode('login')} />
}
