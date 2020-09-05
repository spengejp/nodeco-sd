/*jshint esversion: 8 */
const lib = {
    crypto: require('crypto'),
    bs58check: require('bs58check'),
    bip39: require('bip39'),
    sodium: require('libsodium-wrappers')
};

const prefix = {
    tz1: new Uint8Array([6, 161, 159]), // ed25519
    tz2: new Uint8Array([6, 161, 161]), // secp256k1
    tz3: new Uint8Array([6, 161, 164]), // p256
    KT: new Uint8Array([2, 90, 121]),

    edpk: new Uint8Array([13, 15, 37, 217]),
    edsk2: new Uint8Array([13, 15, 58, 7]),
    spsk: new Uint8Array([17, 162, 224, 201]),
    p2sk: new Uint8Array([16, 81, 238, 189]),

    sppk: new Uint8Array([3, 254, 226, 86]),
    p2pk: new Uint8Array([3, 178, 139, 127]),

    edesk: new Uint8Array([7, 90, 60, 179, 41]),

    edsk: new Uint8Array([43, 246, 78, 7]),
    edsig: new Uint8Array([9, 245, 205, 134, 18]),
    spsig1: new Uint8Array([13, 115, 101, 19, 63]),
    p2sig: new Uint8Array([54, 240, 44, 52]),
    sig: new Uint8Array([4, 130, 43]),

    Net: new Uint8Array([87, 82, 0]),
    nce: new Uint8Array([69, 220, 169]),
    b: new Uint8Array([1, 52]),
    o: new Uint8Array([5, 116]),
    Lo: new Uint8Array([133, 233]),
    LLo: new Uint8Array([29, 159, 109]),
    P: new Uint8Array([2, 170]),
    Co: new Uint8Array([79, 179]),
    id: new Uint8Array([153, 103]),
};

const util = {
    b58cencode: function (payload, prefix) {
        const n = new Uint8Array(prefix.length + payload.length);
        n.set(prefix);
        n.set(payload, prefix.length);
        return lib.bs58check.encode(Buffer.from(n, 'hex'));
    },

    b58cdecode: function (enc, prefix) {
        return lib.bs58check.decode(enc).slice(prefix.length);
    },

    buf2hex: function (buffer) {
        const byteArray = new Uint8Array(buffer),
            hexParts = [];
        for (let i = 0; i < byteArray.length; i++) {
            let hex = byteArray[i].toString(16);
            let paddedHex = ('00' + hex).slice(-2);
            hexParts.push(paddedHex);
        }
        return hexParts.join('');
    },

    hex2buf: function (hex) {
        return new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
            return parseInt(h, 16);
        }));
    },

    mergebuf: function (b1, b2) {
        var r = new Uint8Array(b1.length + b2.length);
        r.set(b1);
        r.set(b2, b1.length);
        return r;
    },
};


(() => {
    function generateRandomMnemonic() {
        return lib.bip39.generateMnemonic(256);
    }

    async function extractEncryptedKeys(esk, password) {
        await lib.sodium.ready;

        const esb = util.b58cdecode(esk, prefix.edesk);
        const salt = esb.slice(0, 8);
        const esm = esb.slice(8);

        var key = lib.crypto.pbkdf2Sync(password, salt, 32768, 32, 'sha512');

        const kp = lib.sodium.crypto_sign_seed_keypair(lib.sodium.crypto_secretbox_open_easy(esm, new Uint8Array(24), key));

        return {
            passphrase: password,
            sk: util.b58cencode(kp.privateKey, prefix.edsk),
            esk: esk,
            pk: util.b58cencode(kp.publicKey, prefix.edpk),
            pkh: util.b58cencode(lib.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
        };
    }

    async function generateKeys(mnemonic, password) {
        await lib.sodium.ready;

        var seed = await lib.bip39.mnemonicToSeed(mnemonic, '');

        const s = seed.slice(0, 32);
        const salt = s.slice(0, 8);

        var key = lib.crypto.pbkdf2Sync(password, salt, 32768, 32, 'sha512');
        var secretbox = lib.sodium.crypto_secretbox_easy(s, new Uint8Array(24), key);

        const esk = new Uint8Array(salt.length + secretbox.length);
        esk.set(salt);
        esk.set(secretbox, salt.length);

        const kp = lib.sodium.crypto_sign_seed_keypair(s);

        return Promise.resolve({
            mnemonic: mnemonic,
            passphrase: password,
            sk: util.b58cencode(kp.privateKey, prefix.edsk),
            esk: util.b58cencode(esk, prefix.edesk),
            pk: util.b58cencode(kp.publicKey, prefix.edpk),
            pkh: util.b58cencode(lib.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
        });
    }

    function sign(bytes, sk, waterMark) {
        var bb = util.hex2buf(bytes);
        bb = util.mergebuf(waterMark, bb);

        const sig = lib.sodium.crypto_sign_detached(lib.sodium.crypto_generichash(32, bb), util.b58cdecode(sk, prefix.edsk));
        const edsig = util.b58cencode(sig, prefix.edsig);
        const sbytes = bytes + util.buf2hex(sig);
        return {
            bytes: bytes,
            sig: sig,
            edsig: edsig,
            sbytes: sbytes
        };
    }

    exports.generateRandomMnemonic = generateRandomMnemonic;
    exports.extractEncryptedKeys = extractEncryptedKeys;
    exports.generateKeys = generateKeys;
    exports.sign = sign;
})();