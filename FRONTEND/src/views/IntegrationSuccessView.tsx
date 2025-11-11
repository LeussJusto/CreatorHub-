import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getIntegrationAccounts } from '../services/integrations'
import Loader from '../components/Loader'

export default function IntegrationSuccessView(){
  const [searchParams] = useSearchParams();
  const provider = searchParams.get('connected') || searchParams.get('provider') || 'youtube';
  const { token, initialized } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // wait until auth context finishes restoring from localStorage
    if (!initialized) return;

    // if no token after initialization, don't force redirect to login — show success page and allow user to go to dashboard manually
    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const data = await getIntegrationAccounts(token);
        // assume backend returns { accounts: [...] } or an array
        const list = Array.isArray(data) ? data : (data?.accounts || []);
        setAccounts(list);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'No se pudieron obtener las cuentas conectadas');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, initialized, navigate]);

  if (!initialized || loading) return <Loader />;

  return (
    <div style={{padding:20}}>
      <h2>Conexión con {provider} completada</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      {!error && (
        <div>
          <p>Se han conectado las siguientes cuentas (si las hay):</p>
          {accounts.length === 0 && <div>No hay cuentas conectadas todavía.</div>}
          <ul>
            {accounts.map((a, i) => (
              <li key={i}>{a?.displayName || a?.id || JSON.stringify(a)}</li>
            ))}
          </ul>
          <div style={{marginTop:16}}>
            <button onClick={() => {
              // navigate to dashboard; if user isn't authenticated the dashboard's RequireAuth will redirect to login
              navigate('/dashboard');
            }}>Ir al dashboard</button>
          </div>
        </div>
      )}
    </div>
  )
}
