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
let db=null, user=null, signup=false, historyEnabled=false, busy=false, nickname='',commentToken=0;
const tr=n=>(i18n[typeof lang==='string'?lang:'en']||i18n.en)[n];
const status=s=>$a('auth-status').textContent=s||'';
const message=s=>$a('auth-message').textContent=s||'';
function paint(){
 $a('account-btn').textContent=user?tr(1):tr(0);
 $a('auth-title').textContent=user?tr(1):signup?tr(2):tr(3);
 $a('auth-guest').hidden=!!user;$a('auth-user').hidden=!user;
 const signupWrap=$a('signup-nick-wrap');if(signupWrap)signupWrap.hidden=!signup;
 $a('auth-submit').textContent=signup?tr(2):tr(3);
 $a('auth-switch').textContent=signup?tr(4):tr(5);
 $a('auth-note').textContent=tr(6);
 $a('history-label').textContent=tr(7);$a('history-note').textContent=tr(8);
 $a('history-clear').textContent=tr(9);$a('auth-logout').textContent=tr(10);
 $a('email-label').textContent=tr(13);$a('password-label').textContent=tr(14);
 $a('history-consent').checked=historyEnabled;
 $a('auth-user-email').textContent=user?.email||'';
 const field=$a('nickname-input'),button=$a('nickname-save'),hint=$a('nickname-hint');
 if(field){field.value=nickname;field.readOnly=!!nickname;field.setAttribute('aria-readonly',nickname?'true':'false');field.style.opacity=nickname?'0.72':'1';}
 if(button)button.hidden=!!nickname;
 if(hint)hint.textContent=nickname?lockedLabel():tx('format');
}
function open(){paint();$a('auth-overlay').classList.add('open');$a('auth-overlay').setAttribute('aria-hidden','false');$a('auth-close').focus()}
function close(){$a('auth-overlay').classList.remove('open');$a('auth-overlay').setAttribute('aria-hidden','true');message('')}
function guestFavs(){try{const x=JSON.parse(localStorage.getItem('fapxxxtime-favorites-v3')||'[]');return Array.isArray(x)?x:[]}catch{return []}}
async function refreshUser(){
 const {data:{user:next},error}=await db.auth.getUser();if(error)status(error.message);
 user=next||null;
 if(!user){historyEnabled=false;nickname='';favs=guestFavs();paint();render();void loadComments();return}
 const [pref,fs]=await Promise.all([
 db.from('user_preferences').select('language,theme,save_watch_history,nickname').eq('user_id',user.id).maybeSingle(),
 db.from('user_favorites').select('video_id').eq('user_id',user.id)
 ]);
 if(pref.error)status(pref.error.message);
 if(fs.error)status(fs.error.message);
 if(pref.data){nickname=pref.data.nickname||'';historyEnabled=!!pref.data.save_watch_history;if(pref.data.language&&labels[pref.data.language]){lang=pref.data.language;try{localStorage.setItem('fapxxxtime-language',lang)}catch{}}}
 else {const {error:e}=await db.from('user_preferences').upsert({user_id:user.id,language:lang,theme:'dark',save_watch_history:false},{onConflict:'user_id'});if(e)status(e.message)}
 favs=(fs.data||[]).map(x=>x.video_id);paint();render();void loadComments();
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
  if(signup){
     if(r.data?.session&&r.data?.user){
       const x=await db.from('user_preferences').upsert({user_id:r.data.user.id,nickname:nick,language:lang,theme:'dark',save_watch_history:false},{onConflict:'user_id'});
       if(x.error)message(x.error.message);else{await refreshUser();close()}
     }else{message(tr(15));signup=false;paint()}
   }else{await refreshUser();close()}
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

 const translations={
 ru:{nickname:'Никнейм',save:'Сохранить никнейм',format:'Никнейм: 3–24 латинские буквы, цифры или _',saved:'Никнейм сохранён',comments:'Комментарии',login:'Войди, чтобы комментировать',choose:'Сначала укажи никнейм в личном кабинете',write:'Напиши комментарий (до 1000 символов)',send:'Опубликовать',empty:'Пока нет комментариев',remove:'Удалить'},
 en:{nickname:'Nickname',save:'Save nickname',format:'Nickname: 3–24 Latin letters, digits or _',saved:'Nickname saved',comments:'Comments',login:'Log in to comment',choose:'Set a nickname in your account first',write:'Write a comment (max 1000 characters)',send:'Post',empty:'No comments yet',remove:'Delete'}
 };
 const tx=k=>(translations[typeof lang==='string'?lang:'en']||translations.en)[k]||translations.en[k];
 const validNick=n=>/^[a-zA-Z0-9_]{3,24}$/.test(n);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 $a('nickname-save').addEventListener('click',async()=>{
   if(!user||!db)return;
   const n=$a('nickname-input').value.trim();
   if(!validNick(n)){message(tx('format'));return}
   const {error}=await db.from('user_preferences').update({nickname:n,updated_at:new Date().toISOString()}).eq('user_id',user.id);
   if(error){message(error.message);return}
   nickname=n;paint();message(tx('saved'));void loadComments();
 });
 async function loadComments(){
   if(!db)return;
   const id=location.hash.startsWith('#watch/')?idFromHash():null,token=++commentToken;
   if(!videos.some(v=>v.id===id))return;
   $a('comments-title').textContent=tx('comments');
   $a('comments-hint').textContent=!user?tx('login'):!nickname?tx('choose'):'';
   $a('comment-form').hidden=!user||!nickname;
   $a('comment-body').placeholder=tx('write');$a('comment-send').textContent=tx('send');
   const {data,error}=await db.from('video_comments').select('id,user_id,body,created_at').eq('video_id',id).order('created_at',{ascending:false}).limit(100);
   if(token!==commentToken)return;
   if(error){$a('comment-error').textContent=error.message;return}
   const {data:authors}=await db.rpc('comment_authors_for_video',{p_video_id:id});
   if(token!==commentToken)return;
   const names=new Map((authors||[]).map(a=>[a.user_id,a.nickname]));
   $a('comments-list').innerHTML=data?.length?data.map(c=>`<div class="comment"><strong>${esc(names.get(c.user_id)||'User')}</strong><small>${new Date(c.created_at).toLocaleDateString(lang)}</small><p>${esc(c.body)}</p>${user?.id===c.user_id?`<button data-comment-delete="${c.id}">${tx('remove')}</button>`:''}</div>`).join(''):`<p class="community-hint">${tx('empty')}</p>`;
 }
 $a('comment-form').addEventListener('submit',async e=>{
   e.preventDefault();if(!user||!nickname||!db)return;
   const body=$a('comment-body').value.trim(),id=idFromHash();
   if(!body||body.length>1000||!videos.some(v=>v.id===id))return;
   $a('comment-send').disabled=true;
   const {error}=await db.from('video_comments').insert({user_id:user.id,video_id:id,body});
   $a('comment-send').disabled=false;
   if(error){$a('comment-error').textContent=error.message;return}
   $a('comment-body').value='';$a('comment-error').textContent='';void loadComments();
 });
 $a('comments-list').addEventListener('click',async e=>{
   const b=e.target.closest('[data-comment-delete]');if(!b||!user||!db)return;
   b.disabled=true;
   const {error}=await db.from('video_comments').delete().eq('id',b.dataset.commentDelete).eq('user_id',user.id);
   if(error){$a('comment-error').textContent=error.message;b.disabled=false}else void loadComments();
 });
 window.addEventListener('hashchange',()=>void loadComments());
 $a('language').addEventListener('change',()=>{paint();void loadComments()});

paint();
if(!window.supabase?.createClient){status('Account service unavailable. Check internet access and reload.');return}
db=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
db.auth.onAuthStateChange(()=>{setTimeout(()=>{void refreshUser()},0)});
void refreshUser();
})();
