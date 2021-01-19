const electron = require('electron')
const path = require('path')
const fs = require('fs')
const CronJob = require('cron').CronJob;
const StoreTasks = require('./StoreTasks')
const StoreLog = require('./StoreLog')
const { exec } = require('child_process');
const { isAfter, isBefore, isEqual, getDate } = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz')
const Store = require('./Store')
const log = require('electron-log');
const timeZone = 'America/Sao_Paulo'
const notifier = require('node-notifier');
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
    }

    get(){
        return this.data
    }

    schedTask(){

        try{ 
            
        let data = this.get()   
        
        if(data != null && data != 'undefined'){        

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

                    if(job.onlyopen){
                        if(inTime(job.start, job.end)){
                            exec('TASKLIST /FI "IMAGENAME eq '+job.proc+'"', (err, stdout, stderr) => {
                                if (err) {
                                    this.setLog(err)  
                                }                          
                                //se não encontrar tarefa, à abre (-1 significa que encontrou / diferente de -1 não encontrou)
                                if(stdout.indexOf("nenhuma tarefa") != -1 || stdout.indexOf("No tasks") != -1){
                                    let opts={  env: { PATH: job.envpath+process.env.path } }
                                    //spawn('cmd.exe', ['/C', 'start /B '+job.pathfile], opts); 
                                    exec('cmd.exe /C start /B '+job.pathfile, opts, (err, stdout, stderr) => {
                                        if(err){this.setLog(err)}
                                        //console.log(stdout)
                                    })
                                    //console.log(job.proc+ ' iniciado')
                
                                }else{
                                    //console.log(job.proc+' já está em execução')
                                }
                            });
                        }
                    }else{
                        if(inTime(job.start, job.end)){
                            exec('TASKLIST /FI "IMAGENAME eq '+job.proc+'"', (err, stdout, stderr) => {
                                if (err) {
                                    this.setLog(err)  
                                }                          
                                //se não encontrar tarefa, à abre (-1 significa que encontrou / diferente de -1 não encontrou)
                                if(stdout.indexOf("nenhuma tarefa") != -1 || stdout.indexOf("No tasks") != -1){
                                    let opts={  env: { PATH: job.envpath+process.env.path } }
                                    //spawn('cmd.exe', ['/C', 'start /B '+job.pathfile], opts); 
                                    exec('cmd.exe /C start /B '+job.pathfile, opts, (err, stdout, stderr) => {
                                        if(err){this.setLog(err)}
                                        console.log(stdout)
                                    })
                                    //console.log(job.proc+ ' iniciado')
                
                                }else{
                                    //console.log(job.proc+' já está em execução')
                                }
                            });
                        }else{
                            if(ofTime(job.end)){
                                exec('tasklist /FI "ImageName eq '+job.proc+'" /FI "Status eq Running" /FO LIST', (err, stdout, stderr) => {
                                    if (err) {
                                        this.setLog(err)  
                                    } 
                                    //se encontrar tarefa, fecha ela (-1 significa que encontrou / diferente de -1 não encontrou)
                                    if(stdout.indexOf("nenhuma tarefa") != -1 || stdout.indexOf("No tasks") != -1){                                                          
                                        //console.log(job.proc+ 'está fechado')
                                    }else{                      
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
        
    }


    }catch(err){
        this.setLog(err)   
    }
    }

    setLog(err){
        let configs = this.getLog()
        if(this.runNotify(configs['alertFrequency'], 'notfytime.json')){ 
            notifier.notify({
                title: 'Falha ao executar a Tarefa',
                message: `Erro: ${err}%`,
                icon: path.join(__dirname, 'app/img', 'robot.png'),
            });
        }

        if(configs['makeLog']){
            if(this.runNotify(configs['alertFrequency'], 'logtime.json')){
                console.log(err.stack)
                if(err.stack != 'undefined'){
                    log.warn(err+"_break_")
                }else{                    
                    let logs = err.stack + "_break_"; 
                    log.warn(logs);
                }
                               
                
                // if(configs['sendLog']){
                //     //envia para o email
                //     sendLogMail(String(logs))
                // }
            } 
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

    }


    getLog(){
        let store = new Store({
            configName: 'user-settings',
            defaults: {
              cpusettings: {
                cpuOverload: 80,
                alertFrequency: 5,
                cpuEmail: 'mariocelso@customdata.com.br',
                sendEmail: 1
              },
              logsettings:{
                logEmail: 'mariocelso@customdata.com.br',
                alertFrequency: '10',
                makeLog: 1,
                sendLog: 1
              }
            }
          });
    
        return store.get('logsettings')
    }


     runNotify(frequency, file) {
          let storelog = new StoreLog(file);
          if(storelog.get() == null || storelog.get() == 'undefined'){
            storelog.set(+new Date())
            return true
          }
          const notifyTime = new Date(parseInt(storelog.get()))
          const now = new Date()
          const diffTime = Math.abs(now - notifyTime)
          const minutesPassed = Math.ceil(diffTime / (1000 * 60))
          if(minutesPassed > frequency){
              storelog.set(+new Date())
              return true
          }else{
              false
          }
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


module.exports = ExecTask