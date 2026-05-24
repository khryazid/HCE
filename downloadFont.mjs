/* eslint-disable @typescript-eslint/no-require-imports */
const https = require('https');
const fs = require('fs');
https.get('https://fonts.gstatic.com/s/spacegrotesk/v15/V8mDoQDjQSkGz11stGaxLRre41Ucl-wT.ttf', (res) => {
    let chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
        const b64 = Buffer.concat(chunks).toString('base64');
        fs.mkdirSync('src/features/consultations/lib/pdf/fonts', {recursive:true});
        fs.writeFileSync('src/features/consultations/lib/pdf/fonts/SpaceGrotesk.ts', "export const SpaceGroteskBase64 = '" + b64 + "';\n");
        console.log('Done SpaceGrotesk');
    });
});
