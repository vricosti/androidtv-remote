import protobufjs from "protobufjs";
//import {system} from "systeminformation";
import pairingMessageProto from "./pairingmessage.proto.js";
import getBrowserInfo from "../common/getbrowserinfo.js";

class PairingMessageManager {
    constructor(options = {}){
        this.root = protobufjs.parse(pairingMessageProto).root;

        this.PairingMessage = this.root.lookupType("pairing.PairingMessage");
        this.Status = this.root.lookupEnum("pairing.PairingMessage.Status").values;
        this.RoleType = this.root.lookupEnum("RoleType").values;
        this.EncodingType = this.root.lookupEnum("pairing.PairingEncoding.EncodingType").values;

        this.manufacturer = options.manufacturer || 'Unknown Manufacturer';
        this.model = options.model || 'Unknown Model';

        // system().then((data) => {
        //     pairingMessageManager.manufacturer = data.manufacturer;
        //     pairingMessageManager.model = data.model;
        // });
    }

    create(payload){
        let errMsg = this.PairingMessage.verify(payload);
        if (errMsg)
            throw Error(errMsg);

        let message = this.PairingMessage.create(payload);

        return this.PairingMessage.encodeDelimited(message).finish();
    }

    createPairingRequest(service_name){
        return this.create({
            pairingRequest: {
                serviceName: service_name,
                clientName: this.model,
            },
            status: this.Status.STATUS_OK,
            protocolVersion: 2
        });
    }

    createPairingOption(){
        return this.create({
            pairingOption: {
                preferredRole : this.RoleType.ROLE_TYPE_INPUT,
                inputEncodings : [{
                    type : this.EncodingType.ENCODING_TYPE_HEXADECIMAL,
                    symbolLength : 6
                }]
            },
            status: this.Status.STATUS_OK,
            protocolVersion: 2
        });
    }

    createPairingConfiguration(){
        return this.create({
            pairingConfiguration: {
                clientRole : this.RoleType.ROLE_TYPE_INPUT,
                encoding : {
                    type : this.EncodingType.ENCODING_TYPE_HEXADECIMAL,
                    symbolLength : 6
                }
            },
            status: this.Status.STATUS_OK,
            protocolVersion: 2
        });
    }

    createPairingSecret(secret){
        return this.create({
            pairingSecret: {
                secret : secret
            },
            status: this.Status.STATUS_OK,
            protocolVersion: 2
        });
    }

    parse(buffer){
        return this.PairingMessage.decodeDelimited(buffer);
    }

}

const deviceInfo = getBrowserInfo();
let pairingMessageManager = new PairingMessageManager({
    manufacturer: browserInfo.os, 
    model: browserInfo.browser
});

export { pairingMessageManager };
