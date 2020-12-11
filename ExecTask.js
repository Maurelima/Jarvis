const electron = require('electron')
const path = require('path')
const fs = require('fs')
//const cron = require("node-cron");
const { ipcRenderer } = require('electron')
const CronJob = require('cron').CronJob;
const StoreTasks = require('./StoreTasks')
const procs = require("find-process");
const { spawn, exec } = require('child_process');
const { isAfter, isBefore, isEqual, getDate } = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz')
var kill = require('tree-kill');
const Store = require('./Store')
const log = require('electron-log');
const { exception } = require('console');
const timeZone = 'America/Sao_Paulo'
let crons = {}

class ExecTask{

    constructor(options){
        const userDataPath = (electron.app || electron.remote.app).getPath('userData')

        this.path = path.join(userDataPath, 'tasks.json')
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
        }   
    }

    

    updateData(){
            const storetasks = new StoreTasks();
            this.data = storetasks.get()
            //console.log(this.data)
    }

    get(){
        return this.data
    }

    testeTask(){

        try{ 

        let data = this.get()                      

        let jobsToDoList = []

          for(let i = 0; i < data.length; i++){  
                                       
            var active = data[i]['active'];
            var id = data[i]['_id'];
            var start = data[i]['start'];
            var end = data[i]['end'];
            var interv = data[i]['intTime'];
            var envpath = data[i]['envpath'];
            var onlyopen = data[i]['onlyopen']
            var proc = data[i]['proc']
            var pathfile = data[i]['pathfile'];


            jobsToDoList.push({
                //params: [id, proc, active, onlyopen],
                id: id,
                proc: proc,
                active: active,
                onlyopen: onlyopen,
                start: start,
                end: end,
                pathfile: pathfile,
                envpath: envpath,
                cron: '*/'+interv+' * * * * *'
            })

            
    
        }         

        jobsToDoList.forEach( (job, idx) => {
            crons[idx] = new CronJob(job.cron, () => {

                if(job.active){

                    // let datenow = new Date().toJSON().slice(0,10);          
                    // let date1 = utcToZonedTime(new Date(datenow+' ' + start), timeZone)
                    // let date2 = utcToZonedTime(new Date(datenow+' ' + end), timeZone)             
                    // let date3 = utcToZonedTime(new Date(), timeZone); 

                    if(job.onlyopen){
                        if(inTime(job.start, job.end)){
                            exec('TASKLIST /FI "IMAGENAME eq '+job.proc+'"', (err, stdout, stderr) => {
                                if (err) {
                                return;
                                }                          
                                //se não encontrar tarefa, à abre (-1 significa que encontrou / diferente de -1 não encontrou)
                                if(stdout.indexOf("nenhuma tarefa") != -1 || stdout.indexOf("No tasks") != -1){
                                    let opts={
                                        env: {
                                            PATH: job.envpath+process.env.path
                                        },
                                        detached: true,
                                        stdio: 'ignore'
                                    }
                                    spawn('cmd.exe', ['/C', 'start /B '+job.pathfile], opts); 
                                    console.log(job.proc+ ' iniciado')
                
                                }else{
                                    console.log(job.proc+' já está em execução')
                                }
                            });
                        }
                    }else{
                        if(inTime(job.start, job.end)){
                            exec('TASKLIST /FI "IMAGENAME eq '+job.proc+'"', (err, stdout, stderr) => {
                                if (err) {
                                return;
                                }                          
                                //se não encontrar tarefa, à abre (-1 significa que encontrou / diferente de -1 não encontrou)
                                if(stdout.indexOf("nenhuma tarefa") != -1 || stdout.indexOf("No tasks") != -1){
                                    let opts={
                                        env: {
                                            PATH: job.envpath+process.env.path
                                        },
                                        detached: true,
                                        stdio: 'ignore'
                                    }
                                    spawn('cmd.exe', ['/C', 'start /B '+job.pathfile], opts); 
                                    console.log(job.proc+ ' iniciado')
                
                                }else{
                                    console.log(job.proc+' já está em execução')
                                }
                            });
                        }else{
                            if(ofTime(job.end)){
                                exec('tasklist /FI "ImageName eq '+job.proc+'" /FI "Status eq Running" /FO LIST', (err, stdout, stderr) => {
                                    if (err) {
                                    return;
                                    } 
                                    //se encontrar tarefa, fecha ela (-1 significa que encontrou / diferente de -1 não encontrou)
                                    if(stdout.indexOf("nenhuma tarefa") != -1 || stdout.indexOf("No tasks") != -1){                                                          
                                        //console.log(job.proc+ 'está fechado')
                                    }else{ 
                                        //let tmp = stdout.split('\n')
                                        //let pid = tmp[2].split(':')                        
                                        exec('taskkill /F /IM '+job.proc, (err, stdout, stderr) => {
                                            console.log(stdout)
                                        });
                                    }
                                });                                
                            }
                        }
                    }

                }   

            }, null, true, 'America/Sao_Paulo')
        })

        
    }catch(err){
        getLog(err)
    }

    
    }

    stopTasks(proc){

        for (let prop in crons) {
            crons[prop].stop()            
        }
        crons = {}

        exec('taskkill /F /IM '+proc, (err, stdout, stderr) => {
            console.log(stdout)
        });

        this.updateData() 
        
        //  let data = this.get()                      

        //  for(let i = 0; i < data.length; i++){         
        //       var id = data[i]['_id'];
        //       vet[id].stop()
        //  }
        //  vet = []

        //dar um kill nos processos (ou apenas no processo editado)        

    }

}

function inTime(start, end){

    let datenow = new Date().toJSON().slice(0,10);             
    let date1 = utcToZonedTime(new Date(datenow+' ' + start), timeZone)
    let date2 = utcToZonedTime(new Date(datenow+' ' + end), timeZone)    

    let date3 = utcToZonedTime(new Date(), timeZone); 
    if(isBefore(date1, date3) && isAfter(date2, date3)){ 
        return true
    }else{
        return false
    }
    
}

function ofTime(end){

    let datenow = new Date().toJSON().slice(0,10);             
    let date2 = utcToZonedTime(new Date(datenow+' ' + end), timeZone)    

    let date3 = utcToZonedTime(new Date(), timeZone); 
    if(isAfter(date3, date2) || isEqual(date3, date2)){  
        return true
    }else{
        return false
    }
    
}

function parseDataFile(filePath, defaults){
    try{
        return JSON.parse(fs.readFileSync(filePath))
    }catch(err){
        return defaults
    }
}

function getLog(err){
    let store = new Store({
        configName: 'user-settings',
        defaults: {
          cpusettings: {
            cpuOverload: 80,
            alertFrequency: 5,
            cpuEmail: 'maurelima@gmail.com',
            sendEmail: 1
          },
          logsettings:{
            logEmail: 'maurelima@gmail.com',
            alertFrequency: '1',
            makeLog: 1,
            sendLog: 1
          }
        }
      });

    let configs = store.get('logsettings')

    if(configs['makeLog']){
        //if(runLog(configs['logFrequency'])){
            let logs = err.stack + "_break_";
            log.warn(logs);
            ipcRenderer.send('legtext:set', 'alterado')
            //localStorage.setItem('lastLog', +new Date())
            if(configs['sendLog']){
                //envia para o email
                //sendLogMail(String(logs))
                console.log('enviado')
            }
        //} 
    }     
}

function runLog(frequency) {
    if(localStorage.getItem('lastLog') === null){
        //Store TimeStamp 
        localStorage.setItem('lastLog', +new Date())
        return true
    }
   const logTime = new Date(parseInt(localStorage.getItem('lastLog')))
   const now = new Date()
   const diffTime = Math.abs(now - logTime)
   const minutesPassed = Math.ceil(diffTime / (1000 * 60))

   if(minutesPassed > frequency){
       return true
   }else{
       false
   }
 }

module.exports = ExecTask