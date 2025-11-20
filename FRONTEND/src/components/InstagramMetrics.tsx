import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getIntegrationAccounts } from '../services/integrations';

export default function InstagramMetrics({ mode }:{ mode?: 'static'|'live' }) {
  // If mode is 'static', render a static design-only view (no API calls).
  if (mode === 'static') {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <div style={{width:72,height:72,borderRadius:999,overflow:'hidden',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <img src="https://via.placeholder.com/150" alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}} />
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:18}}>Creativos Studio</div>
              <div className="muted" style={{marginTop:6}}>Creadores de contenido digital • Tips & Tutoriales</div>
              <a href="https://creativosstudio.com" style={{display:'inline-block',marginTop:8,color:'#8b5cf6'}}>https://creativosstudio.com</a>
            </div>
          </div>
          <div>
            <button className="ch-btn" style={{marginRight:8}}>Análisis Detallado</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,alignItems:'stretch'}}>
          {/* Left: area chart for follower_count */}
          <div style={{padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            <div style={{fontWeight:700}}>Crecimiento de Seguidores</div>
            <div className="muted" style={{fontSize:12,marginTop:6}}>follower_count (time_series)</div>
            <div style={{height:180,marginTop:12,borderRadius:6,background:'#faf5ff',position:'relative',overflow:'hidden'}}>
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
                <defs>
                  <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <path d="M0,30 L10,28 L20,27 L30,26 L40,25 L50,24 L60,23 L70,22 L80,21 L90,20 L100,19 L100,40 L0,40 Z" fill="url(#g1)" stroke="#8b5cf6" strokeWidth="0.5" />
              </svg>
              <div style={{position:'absolute',left:8,bottom:8,fontSize:12,color:'#6b7280'}}>15 Nov</div>
              <div style={{position:'absolute',right:8,bottom:8,fontSize:12,color:'#6b7280'}}>21 Nov</div>
            </div>
          </div>

          {/* Right: bar chart for online_followers */}
          <div style={{padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            <div style={{fontWeight:700}}>Seguidores Online</div>
            <div className="muted" style={{fontSize:12,marginTop:6}}>online_followers (time_series)</div>
            <div style={{height:180,marginTop:12,display:'flex',alignItems:'end',gap:8}}>
              {[1200,800,1500,3500,6000,7000,8200,7200].map((v,i)=> (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center'}}>
                  <div style={{width:'70%',height:`${(v/9000)*100}%`,background:'#f472b6',borderRadius:4}} />
                  <div style={{fontSize:11,marginTop:8,color:'#6b7280'}}>{['00:00','03:00','06:00','09:00','12:00','15:00','18:00','21:00'][i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: extra activity section */}
        <div style={{marginTop:12,padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:700}}>Actividad Adicional del Perfil</div>
              <div className="muted" style={{marginTop:6}}>Extras / best-effort</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginTop:18}}>
            <div>
              <div className="muted" style={{fontSize:12}}>Clicks al Sitio Web</div>
              <div style={{fontWeight:700,fontSize:22,marginTop:8}}>3.2K</div>
              <div className="muted" style={{marginTop:8,fontSize:12}}>website_clicks</div>
            </div>
            <div>
              <div className="muted" style={{fontSize:12}}>Actividad del Perfil</div>
              <div style={{fontWeight:700,fontSize:22,marginTop:8}}>12.4K</div>
              <div className="muted" style={{marginTop:8,fontSize:12}}>profile_activity</div>
            </div>
          </div>
        </div>
      
          {/* Demografía de Audiencia Interactuada */}
          <div style={{padding:16,background:'#fff',borderRadius:8,boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700}}>Demografía de Audiencia Interactuada</div>
                <div className="muted" style={{fontSize:12,marginTop:6}}>engaged_audience_demographics (best-effort)</div>
              </div>
              <div>
                <button className="ch-btn">Análisis Detallado</button>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginTop:18,alignItems:'start'}}>
              {/* Pie: gender */}
              <div>
                <div style={{fontSize:14,fontWeight:700}}>Distribución por Género</div>
                <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12}}>
                  <div style={{width:160,height:160,borderRadius:999,overflow:'hidden'}}>
                    <svg viewBox="0 0 36 36" style={{width:'100%',height:'100%'}}>
                      <circle r="16" cx="18" cy="18" fill="#fce7f3" />
                      <path d="M18 18 L 18 2 A 16 16 0 0 1 33.3 10.6 Z" fill="#f472b6" />
                      <path d="M18 18 L 33.3 10.6 A 16 16 0 0 1 9.2 31.2 Z" fill="#3b82f6" />
                    </svg>
                  </div>
                  <div>
                    <div style={{color:'#f472b6',fontWeight:700,fontSize:16}}>Mujeres: 62.4%</div>
                    <div style={{color:'#3b82f6',fontWeight:700,fontSize:16,marginTop:10}}>Hombres: 36.8%</div>
                    <div className="muted" style={{marginTop:8}}>No especificado: 357</div>
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Mujeres</div><div>26.4K</div></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div className="muted">Hombres</div><div>15.6K</div></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div className="muted">No especificado</div><div>357</div></div>
                </div>
              </div>

              {/* Age distribution */}
              <div>
                <div style={{fontSize:14,fontWeight:700}}>Distribución por Edad</div>
                <div className="muted" style={{fontSize:12,marginTop:6}}> </div>
                <div style={{height:160,marginTop:12,display:'flex',alignItems:'end',gap:8}}>
                  {[820,3600,3200,1800,900,120].map((v,i)=> (
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center'}}>
                      <div style={{width:'70%',height:`${(v/3600)*100}%`,background:'#8b5cf6',borderRadius:4}} />
                      <div style={{fontSize:12,marginTop:8,color:'#6b7280'}}>{['13-17','18-24','25-34','35-44','45-54','55-64'][i]}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">13-17</div><div>8.2% (3.5K)</div></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div className="muted">18-24</div><div>34.6% (14.6K)</div></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div className="muted">25-34</div><div>29.8% (12.6K)</div></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div className="muted">35-44</div><div>16.4% (6.9K)</div></div>
                </div>
              </div>

              {/* Top Countries */}
              <div>
                <div style={{fontSize:14,fontWeight:700}}>Top Países</div>
                <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:12}}>
                  {[{c:'Perú',pct:'45.2%',users:'19.1K'},{c:'México',pct:'18.6%',users:'7.9K'},{c:'Colombia',pct:'12.3%',users:'5.2K'},{c:'Argentina',pct:'9.7%',users:'4.1K'},{c:'España',pct:'8.4%',users:'3.6K'},{c:'Chile',pct:'5.8%',users:'2.5K'}].map((it,idx)=> (
                    <div key={idx} style={{display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:14,height:14,borderRadius:14,background:'#8b5cf6'}} /> <div style={{fontWeight:600}}>{it.c}</div></div>
                        <div style={{fontWeight:700}}>{it.pct}</div>
                      </div>
                      <div style={{height:8,background:'#f3f4f6',borderRadius:999,overflow:'hidden'}}>
                        <div style={{width: it.pct, height:'100%', background:'#8b5cf6'}} />
                      </div>
                      <div className="muted" style={{fontSize:12}}>{it.users} usuarios</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
      </div>
    );
  }

  // Live mode (existing behavior) — keep for future use. Minimal implementation to avoid breaking imports.
  const { token } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [account, setAccount] = React.useState<any | null>(null);
  const [profile, setProfile] = React.useState<any | null>(null);
  const [media, setMedia] = React.useState<any[] | null>(null);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!token) return;
      await loadDetails();
    })();
  }, [token]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const accounts = await getIntegrationAccounts(token!);
      const ig = (accounts || []).find((a:any)=>String(a.platform).toLowerCase() === 'instagram');
      if (!ig) {
        setAccount(null);
        setProfile(null);
        return;
      }
      setAccount(ig);

      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/integrations/accounts/${ig.id}/videos`, {
        headers: { Authorization: `Bearer ${token!}`, Accept: 'application/json' }
      });
      if (!res.ok) {
        setProfile(null);
        setMedia(null);
        return;
      }
      const body = await res.json();
      setProfile(body.profile || null);
      setMedia(body.media || []);
    } catch (e) {
      setAccount(null);
      setProfile(null);
      setMedia(null);
    } finally {
      setLoading(false);
    }
  };

  const picture = () => {
    const p = profile && (profile.profile_picture_url || (profile.raw && (profile.raw.profile_picture_url || (profile.raw.raw && profile.raw.raw.profile_picture_url) || profile.raw.profile_picture)) || profile.profile_picture || null);
    if (p) return p;
    if (media && media.length > 0) return media[0].media_url || media[0].thumbnail_url || null;
    if (account && account.raw) {
      const r = account.raw;
      return r && (r.profile_picture_url || r.picture || r.image) || null;
    }
    return null;
  };

  if (loading) return <div className="muted">Cargando métricas de Instagram…</div>;
  if (!account) return <div className="muted">Instagram no conectado</div>;

  return (
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
        {picture() && !imgError ? (
          <img src={picture() as string} alt="Foto de perfil Instagram" style={{width:80,height:80,borderRadius:'50%',objectFit:'cover'}} onError={() => setImgError(true)} />
        ) : (
          <div style={{width:80,height:80,borderRadius:'50%',background:'#eee',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{color:'#999'}}>No foto</span>
          </div>
        )}
      </div>
      <div>
        <div style={{fontWeight:700,fontSize:18}}>{profile?.username || account.displayName || 'Cuenta Instagram'}</div>
        <div className="muted">Publicaciones: {profile?.media_count ?? account?.metadata?.media_count ?? 0}</div>
      </div>
    </div>
  );
}
