import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as eks from '@aws-cdk/aws-eks';


export function readYamlFromDir(dir: string, cluster: eks.Cluster) {
  fs.readdirSync(dir, "utf8").forEach(file => {
    if (file!=undefined && file.split('.').pop()=='yaml') {
      let data = fs.readFileSync(dir+file, 'utf8');
      if (data != undefined) {
        let i=0;
        yaml.loadAll(data).forEach((item) => {
          cluster.addResource(file.substr(0,file.length-5)+i, item);
          i++;
        })
      }
    }
  })
}