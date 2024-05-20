import forge from "node-forge"
import * as jsEnv from "../utils/utils.js";

export class CertificateGenerator {

    static async generateFull(host, name, country, state, locality, organisation, OU){

        if (jsEnv.isReactNative) {
            console.log('react-native detected => patch to use react-native-modpow');

            const modPowModule = await import('react-native-modpow');
            const modPow = modPowModule.default;

            forge.jsbn.BigInteger.prototype.modPow = function nativeModPow(e, m) {
                const result = modPow({
                    target: this.toString(16),
                    value: e.toString(16),
                    modifier: m.toString(16)
                });
        
                return new forge.jsbn.BigInteger(result, 16);
            };
        }

        let keys = forge.pki.rsa.generateKeyPair(2048);
        let cert = forge.pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(19));
        cert.validity.notBefore = new Date();
        let date = new Date();
        date.setUTCFullYear(2099);
        cert.validity.notAfter = date;

        let attributes = [
            {name: 'commonName', value: name},
            {name: 'countryName', value: country},
            {shortName: 'ST', value: state},
            {name: 'localityName', value: locality},
            {name: 'organizationName', value: organisation},
            {shortName: 'OU', value: OU}
        ];
        cert.setSubject(attributes);

        // Determine if host is a hostname or an IP address
        let altNameType;
        if (host.match(/^\d{1,3}(\.\d{1,3}){3}$/)) {
            console.debug('host is an ip');
            altNameType = { type: 7, ip: host };
        } else {
            console.debug('host is a dns name');
            altNameType = { type: 2, value: host };
        }

        // Add subjectAltName extension with the determined host type
        cert.setExtensions([{
            name: 'subjectAltName',
            altNames: [altNameType]
        }]);
        
        cert.sign(keys.privateKey, forge.md.sha256.create());

        return {
            cert : forge.pki.certificateToPem(cert),
            key : forge.pki.privateKeyToPem(keys.privateKey),
        }
    }
}
