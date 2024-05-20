import { RemoteMessageManager } from "./RemoteMessageManager.js";
import EventEmitter from "events";
import {Buffer} from "buffer";
import * as jsEnv from "../utils/utils.js";

class RemoteManager extends EventEmitter {
    constructor(host, port, certs, systeminfo) {
        super();
        this.host = host;
        this.port = port;
        this.certs = certs;
        this.chunks = Buffer.from([]);
        this.error = null;
        this.remoteMessageManager = new RemoteMessageManager(systeminfo);
    }

    async start() {
        
        let clientConnector;
        if (jsEnv.isNodeOrDeno) {
            const tls = await import('tls');
            clientConnector = (options, callback) => tls.connect(options, callback);
        } else if (jsEnv.isReactNative) {
            const TcpSockets = await import('react-native-tcp-socket');
            clientConnector = (options, callback) => TcpSockets.connectTLS(options, callback);
        } else {
            throw new Error("Unsupported environment");
        }

        return new Promise((resolve, reject) => {
            let options = {
                port: this.port,
                host: this.host,
                key: this.certs.key,
                cert: this.certs.cert,
                rejectUnauthorized: false
            };
            
            if (jsEnv.isNodeOrDeno) {
                console.debug('connecting using node:tls');
                this.client = clientConnector(options, () => {
                    console.debug("Remote connected")
                });
                
            } else if (jsEnv.isReactNative) {
                console.debug('connecting using react-native-tcp-socket');
                options.tls = true;
                options.tlsCheckValidity = false;

                this.client = clientConnector(options, () => {
                    console.debug("Remote connected")
                });
            }

            console.debug("Start Remote Connect");

           
            
            
            this.client.on('timeout', () => {
                console.debug('timeout');
                this.client.destroy();
            });

            // Le ping est reçu toutes les 5 secondes
            this.client.setTimeout(10000);

            this.client.on("secureConnect", () => {
                console.debug(this.host + " Remote secureConnect");
                resolve(true);
            });

            this.client.on('data', (data) => {
                let buffer = Buffer.from(data);
                this.chunks = Buffer.concat([this.chunks, buffer]);

                if(this.chunks.length > 0 && this.chunks.readInt8(0) === this.chunks.length - 1){

                    let message = this.remoteMessageManager.parse(this.chunks);

                    if(!message.remotePingRequest){
                        //console.debug(this.host + " Receive : " + Array.from(this.chunks));
                        console.debug(this.host + " Receive : " + JSON.stringify(message.toJSON()));
                    }

                    if(message.remoteConfigure){
                        this.client.write(this.remoteMessageManager.createRemoteConfigure(
                            622,
                            "Build.MODEL",
                            "Build.MANUFACTURER",
                            1,
                            "Build.VERSION.RELEASE",
                            ));
                        this.emit('ready');
                    }
                    else if(message.remoteSetActive){
                        this.client.write(this.remoteMessageManager.createRemoteSetActive(622));
                    }
                    else if(message.remotePingRequest){
                        this.client.write(this.remoteMessageManager.createRemotePingResponse(message.remotePingRequest.val1));
                    }
                    else if(message.remoteImeKeyInject){
                        this.emit('current_app', message.remoteImeKeyInject.appInfo.appPackage);
                    }
                    else if(message.remoteImeBatchEdit){
                        console.debug("Receive IME BATCH EDIT" + message.remoteImeBatchEdit);
                    }
                    else if(message.remoteImeShowRequest){
                        console.debug("Receive IME SHOW REQUEST" + message.remoteImeShowRequest);
                    }
                    else if(message.remoteVoiceBegin){
                        //console.debug("Receive VOICE BEGIN" + message.remoteVoiceBegin);
                    }
                    else if(message.remoteVoicePayload){
                        //console.debug("Receive VOICE PAYLOAD" + message.remoteVoicePayload);
                    }
                    else if(message.remoteVoiceEnd){
                        //console.debug("Receive VOICE END" + message.remoteVoiceEnd);
                    }
                    else if(message.remoteStart){
                        this.emit('powered', message.remoteStart.started);
                    }
                    else if(message.remoteSetVolumeLevel){
                        this.emit('volume', {
                            level : message.remoteSetVolumeLevel.volumeLevel,
                            maximum : message.remoteSetVolumeLevel.volumeMax,
                            muted : message.remoteSetVolumeLevel.volumeMuted,
                        });
                        //console.debug("Receive SET VOLUME LEVEL" + message.remoteSetVolumeLevel.toJSON().toString());
                    }
                    else if(message.remoteSetPreferredAudioDevice){
                        //console.debug("Receive SET PREFERRED AUDIO DEVICE" + message.remoteSetPreferredAudioDevice);
                    }
                    else if(message.remoteError){
                        //console.debug("Receive REMOTE ERROR");
                        this.emit('error', {error : message.remoteError});
                    }
                    else{
                        console.log("What else ?");
                    }
                    this.chunks = Buffer.from([]);
                }
            });

            this.client.on('close', async (hasError) => {
                console.info(this.host + " Remote Connection closed ", hasError);
                if(hasError){
                    reject(this.error.code);
                    if(this.error.code === "ECONNRESET"){
                        this.emit('unpaired');
                    }
                    else if(this.error.code === "ECONNREFUSED"){
                        // L'appareil n'est pas encore prêt : on relance
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await this.start().catch((error) => {
                            console.error(error);
                        });
                    }
                    else if(this.error.code === "EHOSTDOWN"){
                        // L'appareil est down, on ne fait rien
                    }
                    else{
                        // Dans le doute on redémarre
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await this.start().catch((error) => {
                            console.error(error);
                        });
                    }
                }
                else {
                    // Si pas d'erreur on relance. Si elle s'est éteinte alors une erreur empéchera de relancer encore
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.start().catch((error) => {
                        console.error(error);
                    });
                }
            });

            this.client.on('error', (error) => {
                console.error(this.host, error);
                this.error = error;
            });
        });

    }

    sendPower(){
        this.client.write(this.remoteMessageManager.createRemoteKeyInject(
            this.remoteMessageManager.RemoteDirection.SHORT,
            this.remoteMessageManager.RemoteKeyCode.KEYCODE_POWER));
    }

    sendKey(key, direction){
        this.client.write(this.remoteMessageManager.createRemoteKeyInject(
            direction,
            key));
    }

    sendAppLink(app_link){
        this.client.write(this.remoteMessageManager.createRemoteRemoteAppLinkLaunchRequest(app_link));
    }

    stop(){
        this.client.destroy();
    }
}

export { RemoteManager };
