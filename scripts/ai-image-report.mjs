import {prepareCatalog} from './ai-catalog.mjs';
import {imageLinkReport} from './ai-image-links.mjs';
const demo=process.argv.includes('--demo');
try{
  const report=imageLinkReport(await prepareCatalog({demo}));
  console.table(report.items.map(item=>({name:item.name,kind:item.kind,image:item.path || 'MISSING',id:item.id})));
  console.log(report.linked+'/'+report.total+' images linked');
  if(report.missing && process.argv.includes('--require-all'))process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=1;}
