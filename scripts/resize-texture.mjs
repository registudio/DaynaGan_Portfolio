// Separate process avoids conflicting libvips versions loaded by ndarray-pixels on Windows.
import sharp from 'sharp';
const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);
process.stdout.write(await sharp(Buffer.concat(chunks)).resize({width:Number(process.argv[2]),height:Number(process.argv[2]),fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer());
