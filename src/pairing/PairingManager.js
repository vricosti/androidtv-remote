import tls from "tls";
import {pairingMessageManager} from "./PairingMessageManager.js";
import forge from 'node-forge';
import EventEmitter from "events";

class PairingManager extends EventEmitter {

    constructor(host, port, certs, service_name) {
        super();
        this.host = host;
        this.port = port;
        this.chunks = Buffer.from([]);
        this.certs = certs;
        this.service_name = service_name;
    }

    sendCode(code) {
        console.debug("Sending code : ", code);
        let code_bytes = this.hexStringToBytes(code);

        let client_certificate = this.client.getCertificate();
        let server_certificate = this.client.getPeerCertificate();

        // Create a SHA-256 hash object
        let sha256 = forge.md.sha256.create();

        // Update hash with your data
        sha256.update(forge.util.hexToBytes(client_certificate.modulus), 'raw');
        sha256.update(forge.util.hexToBytes("0" + client_certificate.exponent.slice(2)), 'raw');
        sha256.update(forge.util.hexToBytes(server_certificate.modulus), 'raw');
        sha256.update(forge.util.hexToBytes("0" + server_certificate.exponent.slice(2)), 'raw');
        sha256.update(forge.util.hexToBytes(code.slice(2)), 'raw');

        // Finalize the hash and convert to a byte array
        let hash = sha256.digest().getBytes();
        let hash_array = Array.from(hash, c => c.charCodeAt(0) & 0xff);

        let check = hash_array[0];
        if (check !== code_bytes[0]) {
            this.client.destroy(new Error("Bad Code"));
            return false;
        } else {
            this.client.write(pairingMessageManager.createPairingSecret(new Uint8Array(hash_array)));
            return true;
        }
    }

    async start() {
        return new Promise((resolve, reject) => {
            let options = {
                key : this.certs.key,
                cert: this.certs.cert,
                port: this.port,
                host : this.host,
                rejectUnauthorized: false,
            }

            console.debug("Start Pairing Connect");
            this.client = tls.connect(options, () => {
                console.debug(this.host + " Pairing connected")
            });

            this.client.pairingManager = this;

            this.client.on("secureConnect", () => {
                console.debug(this.host + " Pairing secure connected ");
                this.client.write(pairingMessageManager.createPairingRequest(this.service_name));
            });

            this.client.on('data', (data) => {
                let buffer = Buffer.from(data);
                this.chunks = Buffer.concat([this.chunks, buffer]);

                if(this.chunks.length > 0 && this.chunks.readInt8(0) === this.chunks.length - 1){

                    let message = pairingMessageManager.parse(this.chunks);

                    console.debug("Receive : " + Array.from(this.chunks));
                    console.debug("Receive : " + JSON.stringify(message.toJSON()));

                    if (message.status !== pairingMessageManager.Status.STATUS_OK){
                        this.client.destroy(new Error(message.status));
                    }
                    else {
                        if(message.pairingRequestAck){
                            this.client.write(pairingMessageManager.createPairingOption());
                        }
                        else if(message.pairingOption){
                            this.client.write(pairingMessageManager.createPairingConfiguration());
                        }
                        else if(message.pairingConfigurationAck){
                            this.emit('secret');
                        }
                        else if(message.pairingSecretAck){
                            console.debug(this.host + " Paired!");
                            this.client.destroy();
                        }
                        else {
                            console.debug(this.host + " What Else ?")
                        }
                    }
                    this.chunks = Buffer.from([]);
                }
            });

            this.client.on('close', (hasError) => {
                console.debug(this.host + " Pairing Connection closed", hasError);
                if(hasError){
                    reject(false);
                }
                else{
                    resolve(true);
                }
            });

            this.client.on('error', (error) => {
                console.error(error);
            });
        });

    }

    hexStringToBytes(q){
        let bytes = [];
        for (let i = 0; i < q.length; i += 2) {
            let byte = parseInt(q.substring(i, i + 2), 16);
            if (byte > 127) {
                byte = -(~byte & 0xFF) - 1;
            }
            bytes.push(byte);
        }
        return bytes;
    }
}

export { PairingManager };
