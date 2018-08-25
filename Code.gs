/*
README FIRST:

ORIGINAL VERSION by Grostim.
https://github.com/grostim/HiveOS-MPH-Autoswitch
Feel free to Fork and redistribute !


DISCLAIMER: 
I am not a coder.
This script was made with the good-old "quick and dirty" way of programming.
I may (and most probably will) not work on some occasion. It has been only partially tested.
It may also cause some security breach. 
If you notice something, please open a github ticket.

I AM NOT RESPONSIBLE IF YOU LOOSE MINING TIME, PROFIT OPPORTUNITY, COINS, SLEEP, VIRGINITY OR WHATEVER BECAUSE OF THIS SCRIPT. 

Feel free to pay my next beer:
ETH: 0x513E9DBA26685c26f14045d2156fAdcE4f4B42C0
LTC: LbkqWEgG6GvcuwYDE6a9g6s8SgJ9cQrszp
ZCL: t1LbHFDD5SiQ4rtZHyqBeA4KQZSY4ZMeWwA


This script is designed for people mining with MiningPoolHub and HiveOS. It gives you the opportunity to switch automatically to the most profitable alorithm for your rig.
At this stage, this script is able to control only one of your rig, but it could be easily improved to control a whole farm.

This script runs on Google script App engine. You need a google account.
It use also Telegram for notification and control. You will need a telegram account and the telegram app installed on one of your mobile phone.

1) Go to https://script.google.com/ . Create a new script, give it the name you want and paste this scripT.

2) Sign in your HiveOs acount, and create a personnal Token on your account page (https://the.hiveos.farm/account), copy and paste it below: 

3) Set below the farm-id and worker_id of the rig that you want to control. You can easily get those values by going by going to the worker page on hiveos website. These id are in the url. 
Exemple: https://the.hiveos.farm/farms/11111/workers/22222/ => farm_id=111111 and worker_id=222222

Once this is done, follow instructions in the next comment block below.
*/

//API url & API key
var baseUrl = 'https://the.hiveos.farm/api/v2'; // Should not be modified, unless a new version of the API is deployed.
var accessToken = "PASTE_YOUR_TOKEN_HERE";
//farm_id and control_id to be controlled.
var farm_id = 11111;
var worker_id = 33333;

/*
INSTRUCTIONS CONTINUE HERE:

4) We need to create a Telegram bot.  
Open Telegram and open a new chat with user @BotFather .
Start a discussion by typing: /newbot 
Then follow instructions given by BotFather.
at the end of the process, you will be given an API Token that you need to copy/paste below.

5) We need also to know the chat_id of your Telegram account.
Open Telegram and open a new chat with user @get_id_bot  .
Start a discussion by typing: /my_id
you will be given you chat_id that you need to copy/paste below.

6) We need now to deploy this script as a web app to make it reachable by our telegram bot. Let's do that by selecting the "Publish" drop down menu. then "Deploy as web app". 
In the settings pop-up window, Make sure to use "new" version and to allow acces to everyone, including anonymous users.

7) once it is done, run the setWebhook function of the script. (Drop down menu "Run" , then select the setWebHook function.)

8) Check the log, It should say that the Webhook is now set.

9) Now, we shoul be able to check that the Telegram bot is working: open a discussion with your newly created bot  - (search by the name you set at step #4 ) . 
Start a discussion by typing: /help.
It should reply with a list of available commands. 
Try also /infomining  . If the connection with HiveOS API is working, you should get a summary of the current mining operation.

Optional: Look at the available commands of @BotFather, you can customize your bot avatar, description, etc... 

Once this is done, follow instruction in the next comment block below.
*/


//TelegramAPI Parameters:
var API_TOKEN = 'PASTE_TELEGRAM_BOT_KEY_HERE'; //given by @BotFather
var TelegramChatID = 495000000 // given by @get_id_bot 

/*
INSTRUCTIONS CONTINUE HERE:

10) You need now to create Flightsheets in HiveOs for each algorithm you want to run.
Test each of the flighsheets, make sure they run flawlessly and write down the corresponding hashrate. 

11) Now, you can update the array below according to your real hashrate for each alorithm. 
Make sure to convert each hashrate to GH/s . 
If you want to make sure to never run one of the algorithm, you just need to set the corresponding Hashrate to 0 . 

12) For each algorithm, you need also to set the corresponding "FlightSheet ID". 
It is not easy to get the flightsheet ID from the hiveOS site, so i have added an helper function to the bot. 
Just ask your bot /getFS .
You will be replied with a list of your flightsheets and corresponding ID. 

13) OK, let's save all the modifications made to the script. 

14) Re-Deploy the web app as "new" version . IMPORTANT : you have to redo that after each modification.

15) ask your bot: /optimize . The script will check if you are running the most profitable algorithm, and if not, it will run the new one.

16) ask your bot : /runAutoswitch and it will try to switch your mining every 60 minutes.

THIS IS IT. There are no more instructions below, but feel free to continue reading and enjoy my dirty javascript !

*/

//List of the hashrate corresponding to each protocol + corresponding flightsheet
var MesHash = {
//  Algorithm: { HashRate: in GH/s, fs_id: Hiveos flighsheet number} 
    "Equihash-BTG": {HashRate: 0.000000300,fs_id: 2229551},
    "Equihash": {HashRate: 0.000003250,fs_id: 2229804 },
    "Skein": {HashRate:4.050*0 , fs_id: 2229804 },
    "Ethash": {HashRate:0.207, fs_id: 2242022},
    "Lyra2z": {HashRate:0.0139, fs_id: 2242223 },
    "Cryptonight-Monero": {HashRate:0.00000465, fs_id: 2242105 },
    "Sia": {HashRate:0, fs_id: 0 },
    "Yescrypt": {HashRate:0, fs_id: 0 },
    "Lyra2RE2": {HashRate:0.275, fs_id: 2229819 },
    "Qubit": {HashRate:0, fs_id: 0 },
    "NeoScrypt": {HashRate:0.0075, fs_id: 2242031 },
    "X11": {HashRate:0, fs_id: 0 },
    "Myriad-Groestl": {HashRate:0, fs_id: 0 },
    "Groestl": {HashRate:0, fs_id: 0 },
    "Keccak": {HashRate:0, fs_id: 0 },
    "Scrypt": {HashRate:0, fs_id: 0 },
};

//Mininimum increase of profit to allow change of algorithm.
var minProfitDiff = 0.05; // will switch if there is an increase of profit of 5% minimum


//Initialisation de la variable globale de Journalisation.
var Journal = "";

function log(string) {
  Journal = String(Journal) + "\n" + string;
  Logger.log(string);
}

function getMaxProfit() {

  var url = 'https://miningpoolhub.com/index.php?page=api&action=getautoswitchingandprofitsstatistics'

  var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
  var json = response.getContentText();
  var obj = JSON.parse(json);
    //Logger.log(obj["return"])
  
  var calculatedPerformance = [];
  
  // On parcours le tableau JSON de MPH, et on calcule le profit pour chaque algo.
  for(var element in obj["return"]){
    //Logger.log(obj["return"][element].algo);
    //Logger.log(MesHash[(obj["return"][element].algo)].HashRate * obj["return"][element].profit);
    
    calculatedPerformance.push([obj["return"][element].algo.toString() , MesHash[(obj["return"][element].algo)].HashRate * obj["return"][element].profit ,MesHash[(obj["return"][element].algo)].fs_id])
    }
    
   // On tri les algos par ordre de perfo.
   calculatedPerformance.sort(function(a, b) {
    return b[1] - a[1];
   });
   
   var currentAlgo = getCurrentAlgo().toLowerCase().capitalize()
   if ( currentAlgo == "Lyra2rev2" ) {currentAlgo = "Lyra2re2"};
   if ( currentAlgo == "Cryptonight" ) {currentAlgo = "Cryptonight-monero"};
  
   if ( currentAlgo == calculatedPerformance[0][0].toLowerCase().capitalize() ) {
     log("Current Algo ("+currentAlgo+") is still the most profitable ( "+ calculatedPerformance[0][1]+")")
     }
           
     else {
                
     //Let's check what is the profit of the current algo.
     for(var element in calculatedPerformance){
       if (calculatedPerformance[element][0].toLowerCase().capitalize() == currentAlgo ) {
         var currentAlgoProfit = calculatedPerformance[element][1]; 
         break;
       }
     }
       log("Your Current algo is: "+currentAlgo+", its profit is :"+currentAlgoProfit);
       log("Most profitable algo is: "+calculatedPerformance[0][0]+", its profit is :"+calculatedPerformance[0][1]);

       //OK, let's check if the most profitable algo is at least 5% more profitable than the current algo:
       if (calculatedPerformance[0][1] > currentAlgoProfit *(1+minProfitDiff)) {
         log("Profit increase above Treshold: LET'S CHANGE ALGORITHM");
         changeFlightSheet(farm_id, worker_id, calculatedPerformance[0][2] )
       } else {
         log("Profit increase below Treshold");
       }
   //Logger.log(calculatedPerformance);
   }
  
  //On finit par envoyer le log:
  //MailApp.sendEmail({to:myMail,subject: "HiveOS AutoSwitch",body: Logger.getLog()});
  TelegramPostMessage(Journal);
  Journal="";
}
   
String.prototype.capitalize = function(){
       return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
      };


function getCurrentAlgo() {
    var response = UrlFetchApp.fetch(baseUrl+"/farms/"+farm_id+"/workers", {
        method: 'GET',
        headers: {
            'Authorization': "Bearer "+accessToken
        }})
    var json = response.getContentText();
    var obj = JSON.parse(json);
  Logger.log(obj.data[0].miners_summary);
  if (obj.data[0].miners_summary.hashrates[0].coin == "BTG") {return ("Equihash-BTG")} else { 
    return(obj.data[0].miners_summary.hashrates[0].algo) }
}

function changeFlightSheet(farm_id, worker_id, fs_id) {
    var response = UrlFetchApp.fetch(baseUrl+"/farms/"+farm_id+"/workers/"+worker_id, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': "Bearer "+accessToken
        },
        payload: JSON.stringify({"fs_id": fs_id}),
        //muteHttpExceptions: true
        })
    var json = response.getContentText();
    var obj = JSON.parse(json);
    log("Flightsheet changed to "+fs_id);
    //Logger.log(obj);
    return(obj)
}

function getWorkerStat(farm_id, worker_id) {
    var response = UrlFetchApp.fetch(baseUrl+"/farms/"+farm_id+"/workers/"+worker_id, {
        method: 'GET',
        headers: {
            'Authorization': "Bearer "+accessToken
        }})
    var json = response.getContentText();
    var obj = JSON.parse(json);
  log("Electrical Power: "+obj.stats.power_draw+"W");
  log("GPUS online: "+obj.stats.gpus_online);
  log("Active Flightsheet: "+obj.flight_sheet.id);
  log("Active Algorithm: "+obj.flight_sheet.items[0].coin);
  log("Current Hashrate: "+obj.miners_summary.hashrates[0].hash);
  TelegramPostMessage(Journal) 
}

function getflightsheetlist(farm_id) {
    var response = UrlFetchApp.fetch(baseUrl+"/farms/"+farm_id+"/fs", {
        method: 'GET',
        headers: {
            'Authorization': "Bearer "+accessToken
        }})
    var json = response.getContentText();
    var obj = JSON.parse(json);
    //Logger.log(obj.data)
    var message=""
    for(var element in obj.data){
    message = message + obj.data[element].id + " - " + obj.data[element].items[0].coin + "\n"; 
    }
    Logger.log(message)
    TelegramPostMessage(message)
}

//Fonction Réponse au Bot - PENSER A REPUBLIER L APPLI A CHAQUE MISE A JOUR.
function doPost(e) {
  
  var update = JSON.parse(e.postData.contents);

  // Make sure this is update is a type message
  if (update.hasOwnProperty('message')) {
    var msg = update.message;

    switch (msg.text)
    {
      case '/test': 
        TelegramPostMessage(msg) ;
        break;
      case '/help': 
        TelegramPostMessage(
        "/help : List of the available commands\n"+
        "/getFS : List of the flightsheeets\n"+
        "/optimize : Change Algorithm if necessary\n"+
        "/stopAutoswitch : Stop the Autoswitch\n"+
        "/runAutoswitch : run the Autoswitch every 60 minutes\n"+
        "/infoMining : Stats about current Mining operation\n");
        break;
      case '/getFS': 
        getflightsheetlist(farm_id) ;
        break;
      case '/optimize': 
        getMaxProfit();
        break;
      case '/infoMining': 
        getWorkerStat(farm_id, worker_id);
        break;
      case '/stopAutoswitch': 
        deleteTrigger();
        TelegramPostMessage(Journal)
        break;
      case '/runAutoswitch': 
        deleteTrigger();
        Journal=''
        createTimeDrivenTrigger(30);
        TelegramPostMessage(Journal)
        break;    
      default:
        TelegramPostMessage("Sorry, Command not found: "+msg.txt);
    }
  }
}

/**
 * Deletes a trigger.
 * @param {string} Texte The text message to be sent.
 */
function TelegramPostMessage(Texte) {
        var payload = {
          'method': 'sendMessage',
          'chat_id': String(TelegramChatID),
          'text': Texte,
          'parse_mode': 'HTML'
        }

        var data = {
          "method": "post",
          "payload": payload
        }

        // Replace with your token

        UrlFetchApp.fetch('https://api.telegram.org/bot' + API_TOKEN + '/', data);
}

/**
 * Set the Webhook for the Telegram Bot. Need to be run at least once, once the webapp is published.
 */
function setWebhook() {
  var payload = {
    'method': 'setWebhook',
    'url': ScriptApp.getService().getUrl()
    }
  var data = {
     "method": "post",
     "payload": payload
     }
  var result = UrlFetchApp.fetch('https://api.telegram.org/bot' + API_TOKEN + '/', data);
  Logger.log(result);
}

/**
 * Deletes all triggers.
 */
function deleteTrigger() {
  // Loop over all triggers.
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    ScriptApp.deleteTrigger(allTriggers[i]);
  }
  log('Auto switch desactivated')
}

/**
 * Creates a two time-driven triggers.
 * @param {int} minutes interval in minutes at which the autoswitching should be run. (5,10,15 or 30)
 */
function createTimeDrivenTrigger(minutes) {
  ScriptApp.newTrigger('getMaxProfit')
      .timeBased()
      .everyMinutes(minutes)
      .create();
    log('Auto switch activated every '+ minutes +' minutes')
}
