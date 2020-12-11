const electron = require('electron')
const path = require('path')
const fs = require('fs')
const cron = require("node-cron");
const procs = require("find-process");
const { execFile, spawn } = require('child_process');
const { isAfter } = require('date-fns');
const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz')
var kill = require('tree-kill');
const timeZone = 'America/Sao_Paulo'
let vet = [];


class ExecTask{

    constructor(options){
        const userDataPath = (electron.app || electron.remote.app).getPath('userData')

        this.path = path.join(userDataPath, 'tasks.json')
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
        }   
    }

    updateData(){
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
        } 
    }

    testeTask(){

        let data = this.data

          for(let i = 0; i < data.length; i++){
                    
            var id = data[i]['_id'];
            var start = data[i]['start'];
            var end = data[i]['end'];
            var interv = data[i]['intTime'];
            var onlyopen = data[i]['onlyopen']
             
    
            let datenow = new Date().toJSON().slice(0,10);
            //let date1 = new Date(datenow+' ' + start);
            //let date2 = new Date(datenow+' ' + end);               
            let date1 = utcToZonedTime(new Date(datenow+' ' + start), timeZone)
            let date2 = utcToZonedTime(new Date(datenow+' ' + end), timeZone)             
            let date3 = new Date();   
    
            vet[id] = cron.schedule("*/"+interv+" * * * * *", function() {                                             
                

                if(onlyopen){
                    if(date3.getTime() > date1.getTime()){
    
                        //console.log("Verifico se o processo está aberto")
                        procs('name', data[i]['proc'], true)
                        .then(function (list) {
                            //console.log(list);
                            if(list.length <= 0){       
                                let opts={
                                    env: {PATH: "C:\\oracle\\app\\product\\11.2.0\\client_1\\BIN;"+process.env.path},
                                    detached: true,
                                    stdio: 'ignore'
                                }
                                console.log(opts)
                                const bat = spawn('cmd.exe', ['/C', 'set "PATH=C:\\oracle\\app\\product\\11.2.0\\client_1\\BIN;%PATH%" && start /B '+data[i]['pathfile']], opts);  
                                console.log(bat)    
                                  bat.stdout.on('data', (data) => {
                                    console.log(data.toString());
                                  });
                                  
                                  bat.stderr.on('data', (data) => {
                                    console.error(data.toString());
                                  });
                                  
                                  bat.on('exit', (code) => {
                                    console.log(`Child exited with code ${code}`);
                                  });                                     
                            }else{
                                console.log(data[i]['proc']  +' Já está em execução')
                            }
                            
                        })
                        .catch(error =>{
                            console.log(error);
                        })
                    }

                }else{  
                    //hora atual maior que hora de inicio e hora final maior que hora atual
                    if(date3.getTime() > date1.getTime() && date2.getTime() > date3.getTime()){
    
                        //console.log("Verifico se o processo está aberto")
                        procs('name', data[i]['proc'], true)
                        .then(function (list) {
                            //console.log(list);
                            if(list.length <= 0){       
                                const bat = spawn('cmd', ['/C', 'set "PATH=C:\\oracle\\app\\product\\11.2.0\\client_1\\BIN;%PATH%" && start '+data[i]['pathfile']]);      
                                bat.stdout.on('data', (data) => {
                                    console.log(data.toString());
                                  });
                                  
                                  bat.stderr.on('data', (data) => {
                                    console.error(data.toString());
                                  });
                                  
                                  bat.on('exit', (code) => {
                                    console.log(`Child exited with code ${code}`);
                                  });                       
                                // spawn(data[i]['pathfile'],  {
                                //     detached: true,
                                //     stdio: 'ignore'
                                // });
                                // spawn.stdout.on('data', function (data) {
                                //     console.log('stdout: ' + data);
                                // });        
        
                            }else{
                                console.log(data[i]['proc']  +' Já está em execução')
                            }
                            
                        })
                        .catch(error =>{
                            console.log(error);
                        })
                    }
                    else if(date2.getTime() < date3.getTime()){  
                        console.log(n2, date2, date3)                                                      
                        procs('name', data[i]['proc'], true)
                        .then(function (list){
                            if(list.length >= 1){
                                console.log('fechar ' + data[i]['proc']);   
                                kill(list[0]['pid'], 'SIGKILL', function(err) {
                                    console.log('should be closed')
                                });                                    
                            }else{
                                console.log(data[i]['proc'] + ' está fechado');   
                            }
                        })
                        .catch(error =>{
                            console.log(error);
                        })
        
                    }  

                }
  
            }); 
    
        }

        
        for(let i = 0; i< this.data.length; i++){
            vet[this.data[i]['_id']].start();
        }        
    
    }

    stopTasks(){
        for(let i = 0; i< this.data.length; i++){ 
            vet[this.data[i]['_id']].stop() 
            vet = [];
        } //vet['5f971e51e65228354412b234'].stop();
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