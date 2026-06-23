const fs=require('fs');
const s=fs.readFileSync('webfonts/google.css','utf8');
const re=/\/\*\s*latin\s*\*\/\s*@font-face\s*{([^}]*)}/g;let m;
while((m=re.exec(s))){const b=m[1];
  const fam=(b.match(/font-family:\s*'([^']+)'/)||[])[1];
  const w=(b.match(/font-weight:\s*(\d+)/)||[])[1];
  const u=(b.match(/url\(([^)]+)\)/)||[])[1];
  console.log(fam, w, '...'+u.slice(-26));
}
