const electron = require('electron')
const { exec } = require('child_process');
const path = require('path')
const fs = require('fs')
const StoreServices = require('./StoreServices')
const StoreLog = require('./StoreLog')
const log = require('electron-log');
const CronJob = require('cron').CronJob;
const { ipcMain } = require('electron')
const Store = require('./Store')
const notifier = require('node-notifier');
let crons = {}

class ExecServices{

    constructor(options){
        const userDataPath = (electron.app || electron.remote.app).getPath('userData')

        this.path = path.join(userDataPath, 'services.json')
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
        }   
    }

    updateData(){
        const storeServices = new StoreServices();
        this.data = storeServices.get()
        //console.log(this.data)
    }

    get(){
        return this.data
    }

    servicesTask(){        
       
        try{ 

            let data = this.get()   
            
            if(data != null && data != 'undefined'){

            let jobsToDoList = []

            for(let i = 0; i < data.length; i++){

            var name = data[i]['serviceName'];
            var interv = data[i]['intTime'];
            var active = data[i]['active'];
            var id = data[i]['_id'];

            jobsToDoList.push({
                id: id,
                name: name,
                active: active,
                cron: '*/'+interv+' * * * * *'
            })

            jobsToDoList.forEach( (job, idx) => {
                crons[idx] = new CronJob(job.cron, () => {
    
                    if(job.active){
                        exec('sc query '+job.name, (err, stdout, stderr) => {
                            if (err) {  }    
                            if(stdout.indexOf("RUNNING") != -1 || stdout.indexOf("RUNNING") != -1){
                                //console.log('o serviço ' +'[' +job.name + ']' + ' está rodando')   
                            }else{
                                exec('sc start '+job.name, (err, stdout, stderr) => {
                                    if (err) { }  
                                    console.log('o serviço ' +'[' +job.name + ']' + ' está sendo iniciado') 
                                     if(stdout.indexOf("FALHA") != -1 || stdout.indexOf("ERROR") != -1){
                                         //console.log('Não foi possível iniciar o serviço: '+'[' +job.name + ']')  
                                         this.setLog(stdout)
                                     }else if(stdout.indexOf("RUNNING") != -1 || stdout.indexOf("RUNNING") != -1){
                                        //console.log('o serviço ' +'[' +job.name + ']' + ' está rodando')  
                                    }
                                });
                            }                            

                        });
                    } 
    
                }, null, true, 'America/Sao_Paulo')
            })

            }

        }

        }catch(err){
             this.setLog(err)
        }
    }

    setLog(err){
        let configs = this.getLog()
        if(this.runNotify(configs['alertFrequency'], 'notfytime.json')){ 
            notifier.notify({
                title: 'Falha ao executar Serviço',
                message: `Erro: ${err}%`,
                icon: path.join(__dirname, 'app/img', 'robot.png'),
            });
        }

        if(configs['makeLog']){
            if(this.runNotify(configs['alertFrequency'], 'logtime.json')){
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

    stopServices(serviceName){

        for (let prop in crons) {
            crons[prop].stop()            
        }
        crons = {}

        exec('sc stop '+serviceName, (err, stdout, stderr) => {
            if (err) { }   
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


function parseDataFile(filePath, defaults){
    try{
        return JSON.parse(fs.readFileSync(filePath))
    }catch(err){
        return defaults
    }
}


module.exports = ExecServices