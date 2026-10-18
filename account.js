/* FapXXXTime account integration. Publishable key is safe in client code; never use service_role here. */
(() => {
'use strict';
const PROJECT_URL = 'https://ekmcnhylmzegxljdkpqr.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_ri7mlWpb1o2A5QYn2lrbDw_f2qqsuim';
const $a = id => document.getElementById(id);
const i18n = {
 en:['Log in','My account','Create account','Log in','Already have an account? Log in','New here? Create account','Confirm your email using the link we sent you.','Save my watch history (optional)','History is off by default. Only enable it if you want it saved to your account.','Clear watch history','Log out','Your history was cleared.','Settings saved.','Email','Password','Account created. Check your email before signing in.'],
 ru:['Войти','Мой аккаунт','Создать аккаунт','Войти','Уже есть аккаунт? Войти','Нет аккаунта? Зарегистрироваться','Подтверди почту по ссылке из письма.','Сохранять историю просмотров (необязательно)','История по умолчанию выключена. Включай её только по желанию.','Очистить историю','Выйти','История очищена.','Настройки сохранены.','Электронная почта','Пароль','Аккаунт создан. Проверь почту перед входом.'],
 de:['Anmelden','Mein Konto','Konto erstellen','Anmelden','Schon registriert? Anmelden','Noch kein Konto? Registrieren','Bestätige deine E-Mail.','Wiedergabeverlauf speichern (optional)','Standardmäßig deaktiviert.','Verlauf löschen','Abmelden','Verlauf gelöscht.','Einstellungen gespeichert.','E-Mail','Passwort','Konto erstellt. Prüfe deine E-Mail.'],
 es:['Iniciar sesión','Mi cuenta','Crear cuenta','Iniciar sesión','¿Ya tienes cuenta? Entrar','¿Sin cuenta? Registrarse','Confirma tu correo.','Guardar historial (opcional)','Desactivado por defecto.','Borrar historial','Cerrar sesión','Historial borrado.','Ajustes guardados.','Correo','Contraseña','Cuenta creada. Revisa tu correo.'],
 fr:['Connexion','Mon compte','Créer un compte','Connexion','Déjà inscrit ? Connexion','Pas de compte ? Inscription','Confirmez votre e-mail.','Enregistrer l’historique (facultatif)','Désactivé par défaut.','Effacer l’historique','Déconnexion','Historique effacé.','Paramètres enregistrés.','E-mail','Mot de passe','Compte créé. Vérifiez votre e-mail.'],
 pt:['Entrar','Minha conta','Criar conta','Entrar','Já tem conta? Entrar','Sem conta? Cadastre-se','Confirme seu e-mail.','Salvar histórico (opcional)','Desativado por padrão.','Limpar histórico','Sair','Histórico limpo.','Configurações salvas.','E-mail','Senha','Conta criada. Verifique seu e-mail.']
};
let db=null, user=null, signup=false, historyEnabled=false, busy=false;
const tr=n=>(i18n[typeof lang==='string'?lang:'en']||i18n.en)[n];
const status=s=>$a('auth-status').textContent=s||'';
const message=s=>$a('auth-message').textContent=s||'';
function paint(){
 $a('account-btn').textContent=user?tr(1):tr(0);
 $a('auth-title').textContent=user?tr(1):signup?tr(2):tr(3);
 $a('auth-guest').hidden=!!user;$a('auth-user').hidden=!user;
 $a('auth-submit').textContent=signup?tr(2):tr(3);
 $a('auth-switch').textContent=signup?tr(4):tr(5);
 $a('auth-note').textContent=tr(6);
 $a('history-label').textContent=tr(7);$a('history-note').textContent=tr(8);
 $a('history-clear').textContent=tr(9);$a('auth-logout').textContent=tr(10);
 $a('email-label').textContent=tr(13);$a('password-label').textContent=tr(14);
 $a('history-consent').checked=historyEnabled;
 $a('auth-user-email').textContent=user?.email||'';
}
function open(){paint();$a('auth-overlay').classList.add('open');$a('auth-overlay').setAttribute('aria-hidden','false');$a('auth-close').focus()}
function close(){$a('auth-overlay').classList.remove('open');$a('auth-overlay').setAttribute('aria-hidden','true');message('')}
function guestFavs(){try{const x=JSON.parse(localStorage.getItem('fapxxxtime-favorites-v3')||'[]');return Array.isArray(x)?x:[]}catch{return []}}
async function refreshUser(){
 const {data:{user:next},error}=await db.auth.getUser();if(error)status(error.message);
 user=next||null;
 if(!user){historyEnabled=false;favs=guestFavs();paint();render();return}
 const [pref,fs]=await Promise.all([
 db.from('user_preferences').select('language,theme,save_watch_history').eq('user_id',user.id).maybeSingle(),
 db.from('user_favorites').select('video_id').eq('user_id',user.id)
 ]);
 if(pref.error)status(pref.error.message);
 if(fs.error)status(fs.error.message);
 if(pref.data){historyEnabled=!!pref.data.save_watch_history;if(pref.data.language&&labels[pref.data.language]){lang=pref.data.language;try{localStorage.setItem('fapxxxtime-language',lang)}catch{}}}
 else {const {error:e}=await db.from('user_preferences').upsert({user_id:user.id,language:lang,theme:'dark',save_watch_history:false},{onConflict:'user_id'});if(e)status(e.message)}
 favs=(fs.data||[]).map(x=>x.video_id);paint();render();
}
async function setFavorite(id){
 if(busy)return;
 if(!user){oldToggle(id);return}
 busy=true;const was=favs.includes(id);
 const request=was?db.from('user_favorites').delete().eq('user_id',user.id).eq('video_id',id):db.from('user_favorites').insert({user_id:user.id,video_id:id});
 const {error}=await request;
 if(error){message(error.message)}else{favs=was?favs.filter(x=>x!==id):[...favs,id];render();if($a('watch').classList.contains('active'))renderWatch(idFromHash())}
 busy=false;
}
const oldToggle=toggle;
toggle=id=>{void setFavorite(id)};
// The original app saves guest favorites in localStorage. Cloud favorites are never written there.
const oldSave=save;
save=()=>{if(!user)oldSave()};
$a('account-btn').addEventListener('click',open);
$a('auth-close').addEventListener('click',close);
$a('auth-overlay').addEventListener('click',e=>{if(e.target===$a('auth-overlay'))close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
$a('auth-switch').addEventListener('click',()=>{signup=!signup;message('');paint()});
$a('auth-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!db)return;message('');
 const email=$a('auth-email').value.trim(),password=$a('auth-password').value;
 $a('auth-submit').disabled=true;
 try{
  const redirect=location.origin+location.pathname;
  const r=signup?await db.auth.signUp({email,password,options:{emailRedirectTo:redirect}}):await db.auth.signInWithPassword({email,password});
  if(r.error)throw r.error;
  if(signup){message(tr(15));signup=false;paint()}else{await refreshUser();close()}
 }catch(err){message(err.message||String(err))}finally{$a('auth-submit').disabled=false}
});
$a('auth-logout').addEventListener('click',async()=>{if(!db)return;const {error}=await db.auth.signOut();if(error)message(error.message);else{await refreshUser();close()}});
$a('history-consent').addEventListener('change',async e=>{
 if(!user||!db)return;
 const requested=e.target.checked;
 const {error}=await db.from('user_preferences').update({save_watch_history:requested,updated_at:new Date().toISOString()}).eq('user_id',user.id);
 if(error){message(error.message);e.target.checked=historyEnabled;return}
 historyEnabled=requested;message(tr(12));
});
$a('history-clear').addEventListener('click',async()=>{
 if(!user||!db)return;
 const {error}=await db.from('user_watch_history').delete().eq('user_id',user.id);
 message(error?error.message:tr(11));
});
$a('language').addEventListener('change',async()=>{
 paint();if(!user||!db)return;
 const {error}=await db.from('user_preferences').update({language:lang,updated_at:new Date().toISOString()}).eq('user_id',user.id);
 if(error)status(error.message);
});
// Record a view only after actual video playback, and only when user explicitly opted in.
$a('player').addEventListener('play',async()=>{
 if(!user||!db||!historyEnabled)return;
 const id=$a('player').dataset.id;
 if(!id)return;
 const {error}=await db.from('user_watch_history').upsert({user_id:user.id,video_id:id,last_watched_at:new Date().toISOString()},{onConflict:'user_id,video_id'});
 if(error)status(error.message);
});
paint();
if(!window.supabase?.createClient){status('Account service unavailable. Check internet access and reload.');return}
db=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
db.auth.onAuthStateChange(()=>{setTimeout(()=>{void refreshUser()},0)});
void refreshUser();
})();
