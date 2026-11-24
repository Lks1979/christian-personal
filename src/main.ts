import {Component, OnInit} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {createClient} from '@supabase/supabase-js';
const config=(window as any).CP_CONFIG;
const db=createClient(config.url,config.key);
type Field={key:string,label:string,type?:string,options?:string[]};
const fields:Record<string,Field[]>={
 students:[{key:'name',label:'Nome'},{key:'email',label:'E-mail',type:'email'},{key:'phone',label:'WhatsApp'},{key:'birth',label:'Nascimento',type:'date'},{key:'goal',label:'Objetivo'},{key:'restrictions',label:'Restrições'},{key:'plan',label:'Plano'},{key:'status',label:'Situação',options:['Ativo','Inativo','Suspenso']}],
 workouts:[{key:'title',label:'Treino'},{key:'exercise',label:'Exercício'},{key:'sets',label:'Séries',type:'number'},{key:'reps',label:'Repetições'},{key:'load',label:'Carga'},{key:'notes',label:'Orientações'}],
 assessments:[{key:'date',label:'Data',type:'date'},...['Peso (kg)','Altura (cm)','Gordura (%)','Massa magra (kg)','VO₂ estimado','Força 10RM','Potência','Flexibilidade','Perímetros'].map((label,i)=>({key:'m'+i,label,type:'number'}))],
 classes:[{key:'title',label:'Aula'},{key:'starts_at',label:'Data e horário',type:'datetime-local'},{key:'capacity',label:'Vagas',type:'number'}],
 finance:[{key:'title',label:'Descrição'},{key:'kind',label:'Tipo',options:['Entrada','Saída']},{key:'amount',label:'Valor (R$)',type:'number'},{key:'date',label:'Vencimento',type:'date'},{key:'status',label:'Situação',options:['Pendente','Pago']}],
 recovery:[...['Sono','Energia','Ausência de dor','Baixo estresse','Motivação'].map((label,i)=>({key:'q'+i,label,options:['1','2','3','4','5']}))]};
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.html'})
class App implements OnInit {
 email='';password=''; user:any=null; admin=false; page='home'; error=''; busy=false; rows:any[]=[]; students:any[]=[]; classes:any[]=[]; bookings:any[]=[]; draft:any=null; search=''; recoveryDone=false;
 nav=[['home','Painel'],['students','Alunos'],['classes','Agenda'],['workouts','Treinos'],['assessments','Avaliações'],['recovery','Recovery'],['finance','Financeiro']];
 get menu(){return this.nav.filter(x=>this.admin||x[0]!=='students')} get title(){return this.nav.find(x=>x[0]===this.page)?.[1]} get formFields(){return fields[this.page]||[]} get filtered(){return this.rows.filter(r=>JSON.stringify(r).toLowerCase().includes(this.search.toLowerCase()))} get needsStudent(){return ['workouts','assessments','finance','recovery'].includes(this.page)} get total(){return [0,1,2,3,4].reduce((a,i)=>a+Number(this.draft?.data?.['q'+i]||0),0)}
 async ngOnInit(){const {data}=await db.auth.getSession();if(data.session)await this.enter(data.session.user)}
 async login(signup=false){this.error='';this.busy=true;try{const r=signup?await db.auth.signUp({email:this.email,password:this.password}):await db.auth.signInWithPassword({email:this.email,password:this.password});if(r.error)throw r.error;if(r.data.session)await this.enter(r.data.session.user);else this.error='Confirme seu e-mail e aguarde a vinculação pelo personal.'}catch(e:any){this.error=e.message}finally{this.busy=false}}
 async enter(u:any){this.user=u;const r=await db.from('admins').select('id').eq('id',u.id).maybeSingle();this.admin=!!r.data;await this.go('home')}
 async logout(){await db.auth.signOut();this.user=null;this.draft=null;this.rows=[];this.students=[];this.bookings=[]}
 async go(p:string){this.page=p;this.draft=null;this.error='';this.search='';const s=await db.from('students').select('*');this.students=s.data||[];if(s.error)this.error=s.error.message;const c=await db.from('classes').select('*');this.classes=c.data||[];const b=await db.from('bookings').select('*');this.bookings=b.data||[];if(p==='home')return;const r=await db.from(p).select('*').order('created_at',{ascending:false});this.rows=r.data||[];if(r.error)this.error=r.error.message}
 name(id:string){return this.students.find(s=>s.id===id)?.data.name||'—'}
 add(){this.draft={data:{},student_id:this.admin?'':this.students[0]?.id};for(const f of this.formFields)if(f.options)this.draft.data[f.key]=f.options[0];if(this.page==='classes')this.draft.data.capacity=6}
 edit(r:any){this.draft=JSON.parse(JSON.stringify(r))}
 async save(){this.error='';const payload:any={data:this.draft.data};if(this.needsStudent)payload.student_id=this.draft.student_id||null;if(this.page==='students')payload.email=this.draft.data.email.trim().toLowerCase();if(this.page==='classes'){payload.starts_at=new Date(this.draft.data.starts_at).toISOString();payload.capacity=Number(this.draft.data.capacity)}const r=this.draft.id?await db.from(this.page).update(payload).eq('id',this.draft.id):await db.from(this.page).insert(payload);if(r.error)this.error=r.error.message;else await this.go(this.page)}
 async remove(r:any){if(!confirm('Excluir este registro?'))return;const x=await db.from(this.page).delete().eq('id',r.id);if(x.error)this.error=x.error.message;else await this.go(this.page)}
 async book(id:string,action:string){const r=await db.rpc('manage_booking',{class_key:id,action});if(r.error)this.error=r.error.message;else await this.go('classes')}
 booking(id:string){return this.bookings.find(b=>b.class_id===id&&b.student_id===this.students[0]?.id)}
 count(id:string){return this.bookings.filter(b=>b.class_id===id&&b.status!=='Cancelado').length}
 async presence(id:string,status:string){const r=await db.from('bookings').update({status}).eq('id',id);if(r.error)this.error=r.error.message;else await this.go('classes')}
}
bootstrapApplication(App);
